import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IReviewHistoryEntry {
  _id: string;
  action: string;
  reason: string;
  reviewedBy: {
    _id: string;
    name: string;
    title?: string;
  };
  at: string;
}

export interface ISubmissionReview {
  submissionId: string;
  reviewStatus: "Accepted" | "Rejected";
  adminComment?: string;
}

export interface IReviewData {
  overallDecision: "Awaiting Super Admin" | "Rejected by Admin" | "Reviewed";
  adminOverallComments: string;
  documentReviews: ISubmissionReview[];
}

// Added for multi-file support
export interface IDocumentUI {
  _id?: string;
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
}

export interface ISubmission {
  _id: string;
  quarter: number;
  submittedAt: string;
  reviewStatus: "Accepted" | "Rejected" | "Pending";
  adminComment?: string;
  resubmissionCount?: number;
  isReviewed: boolean;
  achievedValue: number;
  notes?: string;
  // Updated: Documents array is now the primary source
  documents: IDocumentUI[]; 
  /** @deprecated Use documents array */
  evidenceUrl?: string;
  /** @deprecated Use documents array */
  fileType?: string;
}

export interface IAdminIndicator {
  _id: string;
  strategicPlanId: string;
  objectiveId: string;
  activityId: string;
  perspective: string;
  objectiveTitle: string;
  activityDescription: string;
  weight: number;
  unit: string;
  target: number;
  deadline: string;
  status: "Pending" | "Active" | "Partially Complete" | "Submitted" | "Rejected by Admin" | "Awaiting Super Admin" | "Reviewed";
  progress: number;
  currentTotalAchieved: number;
  instructions?: string;
  assignee?: any; 
  assigneeDisplayName: string;
  submissions: ISubmission[];
  latestSubmission?: ISubmission | null;
  totalSubmissions: number;
  reviewHistory: IReviewHistoryEntry[];
  isOverdue: boolean;
  isResubmission: boolean;
  updatedAt: string;
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

/* ---------------- HELPERS ---------------- */

const normalizeIndicator = (ind: any): IAdminIndicator => {
  let displayName = "Unassigned";
  
  if (Array.isArray(ind.assignee)) {
    displayName = ind.assignee
      .map((a: any) => a?.name || a?.groupName || "Team Member")
      .filter(Boolean)
      .join(", ");
  } else if (ind.assignee && typeof ind.assignee === "object") {
    displayName = ind.assignee.name || ind.assignee.groupName || "Unassigned";
  }

  // Ensure submissions always have a documents array for the UI
  const normalizedSubmissions = (ind.submissions || []).map((sub: any) => ({
    ...sub,
    documents: sub.documents && sub.documents.length > 0 
      ? sub.documents 
      : sub.evidenceUrl 
        ? [{ evidenceUrl: sub.evidenceUrl, fileType: sub.fileType || 'raw', fileName: "Legacy Attachment" }] 
        : []
  }));

  return {
    ...ind,
    _id: ind._id?.toString() || Math.random().toString(36),
    assigneeDisplayName: displayName,
    submissions: normalizedSubmissions,
    reviewHistory: ind.reviewHistory || [],
    isResubmission: !!(ind.isResubmission || normalizedSubmissions.some((s: any) => 
      (s.resubmissionCount || 0) > 0 && s.reviewStatus === "Pending"
    ))
  };
};

/* ---------------- ASYNC THUNKS ---------------- */

export const fetchAllAdminIndicators = createAsyncThunk(
  "adminIndicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/all`);
      const rawData = response.data?.data || response.data || [];
      if (!Array.isArray(rawData)) return [];
      return rawData.map(normalizeIndicator);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to sync registry");
    }
  }
);

export const getIndicatorByIdAdmin = createAsyncThunk(
  "adminIndicators/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/${id}`);
      const data = response.data?.data || response.data;
      return normalizeIndicator(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Indicator not found");
    }
  }
);

export const processAdminReview = createAsyncThunk(
  "adminIndicators/processReview",
  async ({ id, reviewData }: { id: string; reviewData: IReviewData }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/admin/review/${id}`, reviewData);
      const data = response.data?.data || response.data;
      return normalizeIndicator(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Review submission failed");
    }
  }
);

/* ---------------- SLICE ---------------- */

const adminIndicatorSlice = createSlice({
  name: "adminIndicators",
  initialState,
  reducers: {
    clearSelectedIndicator: (state) => {
      state.selectedIndicator = null;
    },
    clearAdminError: (state) => {
      state.error = null;
    },
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
        
        state.pendingReview = action.payload.filter((ind) => 
          ["Submitted", "Awaiting Super Admin", "Partially Complete"].includes(ind.status)
        );

        state.resubmittedWork = action.payload.filter((ind) => ind.isResubmission);
      })
      .addCase(fetchAllAdminIndicators.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedIndicator = action.payload;
      })

      .addCase(processAdminReview.pending, (state) => {
        state.isReviewing = true;
        state.error = null;
      })
      .addCase(processAdminReview.fulfilled, (state, action) => {
        state.isReviewing = false;
        const updated = action.payload;

        const idx = state.allAssignments.findIndex((i) => i._id === updated._id);
        if (idx !== -1) {
          state.allAssignments[idx] = updated;
        } else {
          state.allAssignments.unshift(updated);
        }

        if (state.selectedIndicator?._id === updated._id) {
          state.selectedIndicator = updated;
        }

        state.pendingReview = state.allAssignments.filter((ind) => 
          ["Submitted", "Awaiting Super Admin", "Partially Complete"].includes(ind.status)
        );
        state.resubmittedWork = state.allAssignments.filter((ind) => ind.isResubmission);
      })
      .addCase(processAdminReview.rejected, (state, action) => {
        state.isReviewing = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSelectedIndicator, clearAdminError } = adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;