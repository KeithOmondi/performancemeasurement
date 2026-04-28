import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface IDocument {
  id: string;
  submissionId: string;
  evidenceUrl: string;
  evidencePublicId?: string;
  fileType: string;
  fileName: string;
  // UPDATED: Documents now carry their own review state
  status?: "Accepted" | "Rejected" | "Pending";
  rejectionReason?: string;
  uploadedAt: string;
}

export interface ISubmission {
  id: string;
  indicatorId: string;
  quarter: 1 | 2 | 3 | 4;
  year: number;
  documents: IDocument[];
  notes: string;
  achievedValue: number;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  submittedAt: string;
  resubmissionCount: number;
  isReviewed: boolean;
}

// UPDATED: Interface for document-specific review actions
export interface IDocumentReviewUpdate {
  documentId: string;
  status: "Accepted" | "Rejected";
  reason?: string;
}

export interface ISubmissionReviewUpdate {
  submissionId: string;
  reviewStatus?: "Verified" | "Rejected" | "Pending";
  adminComment?: string;
}

export interface IAdminReviewPayload {
  decision: "Verified" | "Rejected";
  adminOverallComments: string;
  submissionUpdates?: ISubmissionReviewUpdate[];
  // ADDED: List of specific document review results
  documentUpdates?: IDocumentReviewUpdate[];
}

/* ... (Remaining Interfaces: IReviewHistoryEntry, IReopenPayload, IAdminIndicator, IAdminIndicatorState remain the same) ... */

export interface IReviewHistoryEntry {
  id: string;
  action: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewerName?: string;
  reason: string;
  at: string;
}

export interface IReopenPayload {
  newDeadline: string;
  reason?: string;
}

export interface IAdminIndicator {
  id: string;
  perspective: string;
  objective: { title: string };
  activity: { description: string };
  status: string;
  progress: number;
  weight: number;
  unit: string;
  target: number;
  assigneeName: string;
  assigneeEmail: string;
  pjNumber?: string;
  reportingCycle: "Quarterly" | "Annual";
  activeQuarter: number;
  deadline: string;
  submissions: ISubmission[];
  reviewHistory?: IReviewHistoryEntry[];
  updatedAt: string;
  adminOverallComments?: string;
}

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingAdminReview: IAdminIndicator[];
  resubmittedWork: IAdminIndicator[];
  selectedIndicator: IAdminIndicator | null;
  isLoading: boolean;
  isReviewing: boolean;
  isReopening: boolean;
  error: string | null;
}

/* ─── INITIAL STATE ────────────────────────────────────────────────── */

const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingAdminReview: [],
  resubmittedWork: [],
  selectedIndicator: null,
  isLoading: false,
  isReviewing: false,
  isReopening: false,
  error: null,
};

/* ─── HELPERS ──────────────────────────────────────────────────────── */

const refreshQueues = (state: IAdminIndicatorState) => {
  state.pendingAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Admin Approval"
  );

  state.resubmittedWork = state.allAssignments.filter((ind) =>
    (ind.submissions ?? []).some(
      (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
    )
  );
};

const upsertIntoAssignments = (
  state: IAdminIndicatorState,
  updated: IAdminIndicator
) => {
  const idx = state.allAssignments.findIndex((i) => i.id === updated.id);
  if (idx !== -1) {
    state.allAssignments[idx] = updated;
  } else {
    state.allAssignments.unshift(updated);
  }
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

export const fetchAllAdminIndicators = createAsyncThunk<
  IAdminIndicator[],
  { status?: string; search?: string } | undefined,
  { rejectValue: string }
>("adminIndicators/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { status, search } = params || {};
    const query = new URLSearchParams();
    if (status && status !== "all") query.set("status", status);
    if (search) query.set("search", search);

    const response = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      `/admin/all?${query.toString()}`
    );
    return response.data?.data ?? [];
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(
      err.response?.data?.message ?? err.message ?? "Failed to load indicators"
    );
  }
});

export const fetchResubmittedIndicators = createAsyncThunk<
  IAdminIndicator[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchResubmitted", async (_, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      "/admin/resubmitted"
    );
    return response.data?.data ?? [];
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(
      err.response?.data?.message ?? err.message ?? "Failed to load resubmissions"
    );
  }
});

export const getIndicatorByIdAdmin = createAsyncThunk<
  IAdminIndicator,
  string,
  { rejectValue: string }
>("adminIndicators/fetchById", async (id, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IAdminIndicator }>(
      `/admin/${id}`
    );
    return response.data?.data;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(
      err.response?.data?.message ?? err.message ?? "Record not found"
    );
  }
});

export const processAdminReview = createAsyncThunk<
  IAdminIndicator,
  { id: string; reviewData: IAdminReviewPayload },
  { rejectValue: string }
>("adminIndicators/processReview", async ({ id, reviewData }, { rejectWithValue }) => {
  try {
    // Hits the PATCH /admin/:id/review endpoint we set up
    await apiPrivate.patch(`/admin/${id}/review`, reviewData);
    
    // Refresh the local data to reflect document statuses and history
    const response = await apiPrivate.get<{ data: IAdminIndicator }>(
      `/admin/${id}`
    );
    return response.data?.data;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(
      err.response?.data?.message ?? err.message ?? "Review submission failed"
    );
  }
});

export const reopenIndicator = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IReopenPayload },
  { rejectValue: string }
>("adminIndicators/reopen", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.patch<{ data: IAdminIndicator }>(
      `/indicators/${id}/reopen`,
      payload
    );
    return response.data.data;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(
      err.response?.data?.message ?? err.message ?? "Failed to reopen indicator"
    );
  }
});

/* ─── SLICE ────────────────────────────────────────────────────────── */

const adminIndicatorSlice = createSlice({
  name: "adminIndicators",
  initialState,
  reducers: {
    setSelectedIndicator: (
      state,
      action: PayloadAction<IAdminIndicator | null>
    ) => {
      state.selectedIndicator = action.payload;
    },
    clearAdminError: (state) => {
      state.error = null;
    },
    resetAdminState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllAdminIndicators.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllAdminIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
        refreshQueues(state);
      })
      .addCase(fetchAllAdminIndicators.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })
      .addCase(fetchResubmittedIndicators.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        action.payload.forEach((updated) => upsertIntoAssignments(state, updated));
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })
      .addCase(getIndicatorByIdAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedIndicator = action.payload;
        upsertIntoAssignments(state, action.payload);
        refreshQueues(state);
      })
      .addCase(getIndicatorByIdAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })
      .addCase(processAdminReview.pending, (state) => {
        state.isReviewing = true;
        state.error = null;
      })
      .addCase(processAdminReview.fulfilled, (state, action) => {
        state.isReviewing = false;
        const updated = action.payload;
        upsertIntoAssignments(state, updated);
        if (state.selectedIndicator?.id === updated.id) {
          state.selectedIndicator = updated;
        }
        refreshQueues(state);
      })
      .addCase(processAdminReview.rejected, (state, action) => {
        state.isReviewing = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })
      .addCase(reopenIndicator.pending, (state) => {
        state.isReopening = true;
        state.error = null;
      })
      .addCase(reopenIndicator.fulfilled, (state, action) => {
        state.isReopening = false;
        const updated = action.payload;
        upsertIntoAssignments(state, updated);
        if (state.selectedIndicator?.id === updated.id) {
          state.selectedIndicator = updated;
        }
        refreshQueues(state);
      })
      .addCase(reopenIndicator.rejected, (state, action) => {
        state.isReopening = false;
        state.error = action.payload ?? "An unexpected error occurred";
      });
  },
});

export const { setSelectedIndicator, clearAdminError, resetAdminState } =
  adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;