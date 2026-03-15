import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate as api } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface ISubmission {
  _id: string;
  quarter: number;
  documents: Array<{
    evidenceUrl: string;
    fileType: string;
    fileName?: string;
  }>;
  notes: string;
  achievedValue: number;
  // UPDATED: Added 'Verified' to the status enum
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  adminDescriptionEdit?: string;
  submittedAt: string;
  resubmissionCount: number;
}

export interface IReviewHistoryEntry {
  _id: string;
  action:
    | "Approved"
    | "Rejected"
    | "Verified"
    | "Resubmitted"
    | "Correction Requested";
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy: {
    _id: string;
    name: string;
  };
  reason: string;
  at: string;
}

export interface ISubmissionReviewUpdate {
  submissionId: string;
  // UPDATED: Admin sets 'Verified' or 'Rejected'
  reviewStatus: "Verified" | "Rejected" | "Pending";
  adminComment?: string;
  adminDescriptionEdit?: string;
}

export interface IAdminReviewPayload {
  decision: "Verified" | "Rejected";
  adminOverallComments: string;
  submissionUpdates: ISubmissionReviewUpdate[];
}

export interface ISuperAdminCertifyPayload {
  decision: "Approved" | "Rejected";
  reason: string;
  progressOverride?: number;
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

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingAdminReview: IAdminIndicator[]; // For Registry Admin
  pendingSuperAdminReview: IAdminIndicator[]; // For Super Admin
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
  // 1. Queue for Registry Admin (Audit Phase)
  state.pendingAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Admin Approval",
  );

  // 2. Queue for Super Admin (Certification Phase)
  state.pendingSuperAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Super Admin",
  );

  // 3. Resubmissions (Priority items)
  state.resubmittedWork = state.allAssignments.filter((ind) =>
    ind.submissions.some(
      (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending",
    ),
  );
};

/* ---------------- ASYNC THUNKS ---------------- */

export const fetchAllAdminIndicators = createAsyncThunk(
  "adminIndicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/all`);
      return response.data?.data || [];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to sync ledger",
      );
    }
  },
);

export const getIndicatorByIdAdmin = createAsyncThunk(
  "adminIndicators/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/${id}`);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Record not found",
      );
    }
  },
);

export const processAdminReview = createAsyncThunk(
  "adminIndicators/processReview",
  async (
    { id, reviewData }: { id: string; reviewData: IAdminReviewPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch(`/admin/review/${id}`, reviewData);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Review submission failed",
      );
    }
  },
);

export const certifyPerformanceSuperAdmin = createAsyncThunk(
  "adminIndicators/certifySuperAdmin",
  async (
    { id, certData }: { id: string; certData: ISuperAdminCertifyPayload },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch(`/super-admin/certify/${id}`, certData);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Certification failed",
      );
    }
  },
);

/* ---------------- SLICE ---------------- */

const adminIndicatorSlice = createSlice({
  name: "adminIndicators",
  initialState,
  reducers: {
    setSelectedIndicator: (
      state,
      action: PayloadAction<IAdminIndicator | null>,
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
      })
      .addCase(
        fetchAllAdminIndicators.fulfilled,
        (state, action: PayloadAction<IAdminIndicator[]>) => {
          state.isLoading = false;
          state.allAssignments = action.payload;
          refreshQueues(state);
        },
      )
      .addCase(
        getIndicatorByIdAdmin.fulfilled,
        (state, action: PayloadAction<IAdminIndicator>) => {
          state.selectedIndicator = action.payload;
        },
      )
      /* Matchers for handling shared logic between Admin and Super Admin updates */
      .addMatcher(
        (action) =>
          action.type.endsWith("/processReview/fulfilled") ||
          action.type.endsWith("/certifySuperAdmin/fulfilled"),
        (state, action: PayloadAction<IAdminIndicator>) => {
          state.isReviewing = false;
          const updated = action.payload;
          const idx = state.allAssignments.findIndex(
            (i) => i._id === updated._id,
          );

          if (idx !== -1) {
            state.allAssignments[idx] = updated;
          } else {
            state.allAssignments.unshift(updated);
          }

          if (state.selectedIndicator?._id === updated._id) {
            state.selectedIndicator = updated;
          }
          refreshQueues(state);
        },
      )
      .addMatcher(
        (action) =>
          action.type.endsWith("/pending") &&
          (action.type.includes("processReview") ||
            action.type.includes("certifySuperAdmin")),
        (state) => {
          state.isReviewing = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action: any) => {
          state.isLoading = false;
          state.isReviewing = false;
          state.error = action.payload || "Operation failed.";
        },
      );
  },
});

export const { setSelectedIndicator, clearAdminError, resetAdminState } =
  adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;
