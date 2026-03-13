import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate as api } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IReviewHistoryEntry {
  _id: string;
  action: "Approved" | "Rejected" | "Verified" | "Resubmitted" | "Reviewed" | "Correction Requested";
  reason: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy: {
    _id: string;
    name: string;
    title?: string;
  };
  at: string;
}

export interface ISubmissionReview {
  submissionId: string;
  reviewStatus: "Accepted" | "Rejected" | "Pending";
  adminComment?: string;
  achievedValue?: number;
}

export interface IReviewPayload {
  status: "Awaiting Super Admin" | "Rejected by Admin";
  adminOverallComments: string;
  documentReviews: ISubmissionReview[];
}

export interface IAdminIndicator {
  _id: string;
  perspective: string;
  objectiveTitle: string;
  activityDescription: string;
  reportingCycle: "Quarterly" | "Annual";
  weight: number;
  unit: string;
  activityId: string;
  target: number;
  deadline: string;
  status:
    | "Pending"
    | "Awaiting Admin Approval"
    | "Rejected by Admin"
    | "Awaiting Super Admin"
    | "Rejected by Super Admin"
    | "Partially Approved"
    | "Completed";
  progress: number;
  currentTotalAchieved: number;
  assigneeDisplayName: string;
  assignee?: {
    _id: string;
    name: string;
    role?: string;
  };
  activeQuarter: number;
  submissions: any[]; 
  reviewHistory: IReviewHistoryEntry[];
  isOverdue: boolean;
  updatedAt: string;
  adminOverallComments?: string;
}

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingReview: IAdminIndicator[];
  resubmittedWork: IAdminIndicator[];
  selectedIndicator: IAdminIndicator | null;
  isLoading: boolean;
  isReviewing: boolean;
  error: string | null;
}

const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingReview: [],
  resubmittedWork: [],
  selectedIndicator: null,
  isLoading: false,
  isReviewing: false,
  error: null,
};

/* ---------------- HELPER: QUEUE REFRESH ---------------- */

const refreshQueues = (state: IAdminIndicatorState) => {
  // Admin only cares about items awaiting their specific level of review
  state.pendingReview = state.allAssignments.filter((ind) => 
    ind.status === "Awaiting Admin Approval"
  );
};

/* ---------------- ASYNC THUNKS ---------------- */

// Updated paths to include '/indicators' to match the backend router prefix
export const fetchAllAdminIndicators = createAsyncThunk(
  "adminIndicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/all`);
      return response.data?.data || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to sync registry ledger");
    }
  }
);

export const fetchResubmittedIndicators = createAsyncThunk(
  "adminIndicators/fetchResubmitted",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/resubmitted`);
      return response.data?.data || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch resubmissions");
    }
  }
);

export const getIndicatorByIdAdmin = createAsyncThunk(
  "adminIndicators/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/${id}`);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Indicator record not found");
    }
  }
);

export const processAdminReview = createAsyncThunk(
  "adminIndicators/processReview",
  async ({ id, reviewData }: { id: string; reviewData: IReviewPayload }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/review/${id}`, reviewData);
      return response.data?.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Registry review submission failed");
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
    clearSelectedIndicator: (state) => {
      state.selectedIndicator = null;
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
      .addCase(fetchAllAdminIndicators.fulfilled, (state, action: PayloadAction<IAdminIndicator[]>) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action: PayloadAction<IAdminIndicator[]>) => {
        state.resubmittedWork = action.payload;
      })
      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action: PayloadAction<IAdminIndicator>) => {
        state.selectedIndicator = action.payload;
      })
      .addCase(processAdminReview.fulfilled, (state, action: PayloadAction<IAdminIndicator>) => {
        state.isReviewing = false;
        const updated = action.payload;
        
        // Update main list
        const idx = state.allAssignments.findIndex((i) => i._id === updated._id);
        if (idx !== -1) state.allAssignments[idx] = updated;
        
        // Update detail view if open
        if (state.selectedIndicator?._id === updated._id) {
          state.selectedIndicator = updated;
        }
        
        refreshQueues(state);
      })
      .addMatcher(
        (action) => action.type.endsWith("/pending") && action.type.includes("processReview"),
        (state) => { 
          state.isReviewing = true; 
          state.error = null; 
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action: any) => { 
          state.isLoading = false; 
          state.isReviewing = false; 
          state.error = action.payload || "An unexpected error occurred."; 
        }
      );
  },
});

export const { 
  setSelectedIndicator, 
  clearSelectedIndicator, 
  clearAdminError,
  resetAdminState
} = adminIndicatorSlice.actions;

export default adminIndicatorSlice.reducer;