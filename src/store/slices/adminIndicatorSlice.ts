import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IDocument {
  id: string;
  submissionId: string;
  evidenceUrl: string;
  evidencePublicId?: string;
  fileType: string;
  fileName: string;
  status?: "Accepted" | "Rejected" | "Pending";
  rejectionReason?: string;
  uploadedAt: string;
}

export interface ISubmission {
  id: string;
  indicatorId: string;
  quarter: string; // e.g. "Q1", "Q2"
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

/**
 * Submissions are now grouped by quarter key (e.g. "Q1_2025").
 * Each key maps to an array of that quarter's submissions sorted newest-first,
 * so index 0 is always the latest (re)submission.
 */
export type ISubmissionsByQuarter = Record<string, ISubmission[]>;

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
  documentUpdates?: IDocumentReviewUpdate[];
}

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
  submissions: ISubmissionsByQuarter; // was ISubmission[]
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

// ─── Initial State ────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Flatten all quarterly submissions into a single array for filtering logic. */
const allSubmissions = (indicator: IAdminIndicator): ISubmission[] =>
  Object.values(indicator.submissions ?? {}).flat();

const refreshQueues = (state: IAdminIndicatorState) => {
  state.pendingAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Admin Approval"
  );

  state.resubmittedWork = state.allAssignments.filter((ind) =>
    allSubmissions(ind).some(
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

// ─── Thunks ───────────────────────────────────────────────────────────────────

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

const extractError = (error: unknown, fallback: string): string => {
  const err = error as KnownError;
  return err.response?.data?.message ?? err.message ?? fallback;
};

export const fetchAllAdminIndicators = createAsyncThunk<
  IAdminIndicator[],
  { status?: string; search?: string } | undefined,
  { rejectValue: string }
>("adminIndicators/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { status, search } = params ?? {};
    const query = new URLSearchParams();
    if (status && status !== "all") query.set("status", status);
    if (search) query.set("search", search);

    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      `/admin/all?${query.toString()}`
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load indicators"));
  }
});

export const fetchResubmittedIndicators = createAsyncThunk<
  IAdminIndicator[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchResubmitted", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      "/admin/resubmitted"
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load resubmissions"));
  }
});

export const getIndicatorByIdAdmin = createAsyncThunk<
  IAdminIndicator,
  string,
  { rejectValue: string }
>("adminIndicators/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Record not found"));
  }
});

export const processAdminReview = createAsyncThunk<
  IAdminIndicator,
  { id: string; reviewData: IAdminReviewPayload },
  { rejectValue: string }
>("adminIndicators/processReview", async ({ id, reviewData }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/review`, reviewData);

    // Re-fetch to get updated document statuses, submissions, and review history
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Review submission failed"));
  }
});

export const reopenIndicator = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IReopenPayload },
  { rejectValue: string }
>("adminIndicators/reopen", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IAdminIndicator }>(
      `/indicators/${id}/reopen`,
      payload
    );
    return res.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to reopen indicator"));
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

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
    const pending =
      (key: "isLoading" | "isReviewing" | "isReopening") =>
      (state: IAdminIndicatorState) => {
        state[key] = true;
        state.error = null;
      };

    const rejected =
      (key: "isLoading" | "isReviewing" | "isReopening") =>
      (state: IAdminIndicatorState, action: PayloadAction<string | undefined>) => {
        state[key] = false;
        state.error = action.payload ?? "An unexpected error occurred";
      };

    const upsertAndRefresh = (
      state: IAdminIndicatorState,
      updated: IAdminIndicator
    ) => {
      upsertIntoAssignments(state, updated);
      if (state.selectedIndicator?.id === updated.id) {
        state.selectedIndicator = updated;
      }
      refreshQueues(state);
    };

    builder
      // fetchAllAdminIndicators
      .addCase(fetchAllAdminIndicators.pending, pending("isLoading"))
      .addCase(fetchAllAdminIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
        refreshQueues(state);
      })
      .addCase(fetchAllAdminIndicators.rejected, rejected("isLoading"))

      // fetchResubmittedIndicators
      .addCase(fetchResubmittedIndicators.pending, pending("isLoading"))
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        action.payload.forEach((updated) => upsertIntoAssignments(state, updated));
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.rejected, rejected("isLoading"))

      // getIndicatorByIdAdmin
      .addCase(getIndicatorByIdAdmin.pending, pending("isLoading"))
      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedIndicator = action.payload;
        upsertIntoAssignments(state, action.payload);
        refreshQueues(state);
      })
      .addCase(getIndicatorByIdAdmin.rejected, rejected("isLoading"))

      // processAdminReview
      .addCase(processAdminReview.pending, pending("isReviewing"))
      .addCase(processAdminReview.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(processAdminReview.rejected, rejected("isReviewing"))

      // reopenIndicator
      .addCase(reopenIndicator.pending, pending("isReopening"))
      .addCase(reopenIndicator.fulfilled, (state, action) => {
        state.isReopening = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(reopenIndicator.rejected, rejected("isReopening"));
  },
});

export const { setSelectedIndicator, clearAdminError, resetAdminState } =
  adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;