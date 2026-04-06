import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IDocument {
  id: string;
  submissionId: string;
  evidenceUrl: string;
  evidencePublicId?: string;
  fileType: string;
  fileName: string;
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

export interface IReviewHistoryEntry {
  id: string;
  action: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewerName?: string;
  reason: string;
  at: string;
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
  submissions: ISubmission[];
  reviewHistory?: IReviewHistoryEntry[];
  updatedAt: string;
  adminOverallComments?: string;
}

/* ---------------- STATE ---------------- */

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingAdminReview: IAdminIndicator[];
  resubmittedWork: IAdminIndicator[];
  selectedIndicator: IAdminIndicator | null;
  isLoading: boolean;
  isReviewing: boolean;
  error: string | null;
}

const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingAdminReview: [],
  resubmittedWork: [],
  selectedIndicator: null,
  isLoading: false,
  isReviewing: false,
  error: null,
};

/* ---------------- HELPERS ---------------- */

/**
 * Derives pendingAdminReview and resubmittedWork from allAssignments.
 * Called after any mutation to allAssignments to keep queues in sync.
 */
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

/**
 * Upserts an indicator into allAssignments (updates in place, or prepends if new).
 */
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

/* ---------------- THUNKS ---------------- */

export const fetchAllAdminIndicators = createAsyncThunk(
  "adminIndicators/fetchAll",
  async (
    params: { status?: string; search?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const { status, search } = params || {};
      const query = new URLSearchParams();
      if (status && status !== "all") query.set("status", status);
      if (search) query.set("search", search);

      const response = await apiPrivate.get(`/admin/all?${query.toString()}`);
      return (response.data?.data ?? []) as IAdminIndicator[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ?? "Failed to load indicators"
      );
    }
  }
);

export const fetchResubmittedIndicators = createAsyncThunk(
  "adminIndicators/fetchResubmitted",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get("/admin/resubmitted");
      return (response.data?.data ?? []) as IAdminIndicator[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ?? "Failed to load resubmissions"
      );
    }
  }
);

export const getIndicatorByIdAdmin = createAsyncThunk(
  "adminIndicators/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get(`/admin/${id}`);
      return response.data?.data as IAdminIndicator;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ?? "Record not found"
      );
    }
  }
);

export const processAdminReview = createAsyncThunk(
  "adminIndicators/processReview",
  async (
    { id, reviewData }: { id: string; reviewData: IAdminReviewPayload },
    { rejectWithValue }
  ) => {
    try {
      await apiPrivate.patch(`/admin/${id}/review`, reviewData);
      // Re-fetch so the store always holds the authoritative server state
      const response = await apiPrivate.get(`/admin/${id}`);
      return response.data?.data as IAdminIndicator;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message ?? "Review submission failed"
      );
    }
  }
);

/* ---------------- SLICE ---------------- */

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
    // ── fetchAllAdminIndicators ──────────────────────────────────────────────
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
        state.error = (action.payload as string) ?? "An unexpected error occurred";
      });

    // ── fetchResubmittedIndicators ───────────────────────────────────────────
    builder
      .addCase(fetchResubmittedIndicators.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        // Merge returned items into allAssignments, then re-derive queues
        action.payload.forEach((updated) => upsertIntoAssignments(state, updated));
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "An unexpected error occurred";
      });

    // ── getIndicatorByIdAdmin ────────────────────────────────────────────────
    builder
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
        state.error = (action.payload as string) ?? "An unexpected error occurred";
      });

    // ── processAdminReview ───────────────────────────────────────────────────
    builder
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
        state.error = (action.payload as string) ?? "An unexpected error occurred";
      });
  },
});

export const { setSelectedIndicator, clearAdminError, resetAdminState } =
  adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;