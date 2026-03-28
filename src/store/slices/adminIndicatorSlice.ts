import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IDocument {
  evidenceUrl: string;
  evidencePublicId?: string;
  fileType: "image" | "video" | "raw";
  fileName: string;
  uploadedAt: string;
}

export interface ISubmission {
  _id: string;
  quarter: 1 | 2 | 3 | 4;
  documents: IDocument[]; // Updated to match backend deep-nesting
  notes: string;
  achievedValue: number;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  submittedAt: string;
  resubmissionCount: number;
  isReviewed: boolean;
}

export interface IReviewHistoryEntry {
  _id: string;
  action:
    | "Approved"
    | "Rejected"
    | "Verified"
    | "Resubmitted"
    | "Correction Requested"
    | "Submitted";
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy: { _id: string; name: string } | string;
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
  _id: string;
  perspective: string;
  objectiveTitle: string;
  activityDescription: string;
  reportingCycle: "Quarterly" | "Annual";
  status:
    | "Pending"
    | "Awaiting Admin Approval"
    | "Rejected by Admin"
    | "Awaiting Super Admin"
    | "Rejected by Super Admin"
    | "Completed";
  progress: number;
  currentTotalAchieved: number;
  assigneeDisplayName: string;
  activeQuarter: number;
  submissions: ISubmission[];
  reviewHistory: IReviewHistoryEntry[];
  isOverdue: boolean;
  updatedAt: string;
  adminOverallComments?: string;
  target: number;
  unit: string;
}

/* ---------------- STATE ---------------- */

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingAdminReview: IAdminIndicator[];
  pendingSuperAdminReview: IAdminIndicator[];
  resubmittedWork: IAdminIndicator[];
  selectedIndicator: IAdminIndicator | null;
  isLoading: boolean;
  isReviewing: boolean;
  error: string | null;
}

const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingAdminReview: [],
  pendingSuperAdminReview: [],
  resubmittedWork: [],
  selectedIndicator: null,
  isLoading: false,
  isReviewing: false,
  error: null,
};

/* ---------------- HELPERS ---------------- */

const refreshQueues = (state: IAdminIndicatorState) => {
  // 1. Items waiting for Admin
  state.pendingAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Admin Approval"
  );

  // 2. Items moved forward to Super Admin
  state.pendingSuperAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Super Admin"
  );

  // 3. Specifically flagged resubmissions
  state.resubmittedWork = state.allAssignments.filter((ind) =>
    ind.submissions?.some(
      (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
    )
  );
};

/* ---------------- THUNKS ---------------- */

export const fetchAllAdminIndicators = createAsyncThunk(
  "adminIndicators/fetchAll",
  async (statusFilter: string | undefined, { rejectWithValue }) => {
    try {
      const url = statusFilter && statusFilter !== "all"
        ? `/admin/all?status=${statusFilter}`
        : "/admin/all";
      const response = await apiPrivate.get(url);
      return (response.data?.data || []) as IAdminIndicator[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load indicators"
      );
    }
  }
);

// Added Thunk to leverage your new backend endpoint for resubmissions
export const fetchResubmittedIndicators = createAsyncThunk(
  "adminIndicators/fetchResubmitted",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get("/admin/resubmitted");
      return (response.data?.data || []) as IAdminIndicator[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load resubmissions"
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
        error.response?.data?.message || "Record not found"
      );
    }
  }
);

export const processAdminReview = createAsyncThunk(
  "adminIndicators/processReview",
  async ({ id, reviewData }: { id: string; reviewData: IAdminReviewPayload }, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.patch(
        `/admin/${id}/review`,
        reviewData
      );
      return response.data?.data as IAdminIndicator;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Review submission failed"
      );
    }
  }
);

/* ---------------- SLICE ---------------- */

const adminIndicatorSlice = createSlice({
  name: "adminIndicators",
  initialState,
  reducers: {
    setSelectedIndicator: (state, action: PayloadAction<IAdminIndicator | null>) => {
      state.selectedIndicator = action.payload;
    },
    clearAdminError: (state) => {
      state.error = null;
    },
    resetAdminState: () => initialState,
  },
 extraReducers: (builder) => {
    builder
      // 1. ALL .addCase CALLS FIRST
      .addCase(fetchAllAdminIndicators.fulfilled, (state, action: PayloadAction<IAdminIndicator[]>) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action: PayloadAction<IAdminIndicator[]>) => {
        state.isLoading = false;
        state.resubmittedWork = action.payload;
        action.payload.forEach((updated: IAdminIndicator) => {
          const idx = state.allAssignments.findIndex((i: IAdminIndicator) => i._id === updated._id);
          if (idx !== -1) state.allAssignments[idx] = updated;
        });
        refreshQueues(state);
      })
      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action: PayloadAction<IAdminIndicator>) => {
        state.isLoading = false;
        state.selectedIndicator = action.payload;
        const idx = state.allAssignments.findIndex((i: IAdminIndicator) => i._id === action.payload._id);
        if (idx !== -1) state.allAssignments[idx] = action.payload;
        refreshQueues(state);
      })
      .addCase(processAdminReview.pending, (state) => {
        state.isReviewing = true;
        state.error = null;
      })
      .addCase(processAdminReview.fulfilled, (state, action: PayloadAction<IAdminIndicator>) => {
        state.isReviewing = false;
        const updated = action.payload;
        if (updated) {
          const idx = state.allAssignments.findIndex((i: IAdminIndicator) => i._id === updated._id);
          if (idx !== -1) {
            state.allAssignments[idx] = updated;
          } else {
            state.allAssignments.unshift(updated);
          }
          if (state.selectedIndicator?._id === updated._id) {
            state.selectedIndicator = updated;
          }
          refreshQueues(state);
        }
      })

      // 2. ALL .addMatcher CALLS LAST
      .addMatcher(
        (action) => 
          [fetchAllAdminIndicators.pending, fetchResubmittedIndicators.pending, getIndicatorByIdAdmin.pending]
          .map(t => t.type)
          .includes(action.type),
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action: PayloadAction<string | undefined>) => {
          state.isLoading = false;
          state.isReviewing = false;
          state.error = action.payload || "An unexpected error occurred";
        }
      );
  },
});

export const { setSelectedIndicator, clearAdminError, resetAdminState } =
  adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;