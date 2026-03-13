import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IDocumentUI {
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
}

export interface IReviewHistoryEntryUI {
  action: "Approved" | "Rejected" | "Verified" | "Resubmitted" | "Correction Requested";
  reason: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy?: {
    _id: string;
    name: string;
  };
  at: string;
}

export interface ISubmissionUI {
  _id: string;
  // 🔹 Updated: Now supports 0 for Annual dossiers
  quarter: 0 | 1 | 2 | 3 | 4; 
  documents: IDocumentUI[];
  notes: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Accepted" | "Rejected";
  adminComment?: string;
  resubmissionCount: number;
}

export interface IIndicatorUI {
  _id: string;
  strategicPlanId: any;
  objectiveId: string;
  activityId: string;
  objectiveTitle: string;
  activityDescription: string;
  perspective: string;
  reportingCycle: "Quarterly" | "Annual"; 
  status:
    | "Pending"
    | "Awaiting Admin Approval"
    | "Rejected by Admin"
    | "Awaiting Super Admin"
    | "Rejected by Super Admin"
    | "Partially Approved"
    | "Completed";
  progress: number;
  target: number;
  unit: string;
  weight: number;
  submissions: ISubmissionUI[];
  reviewHistory: IReviewHistoryEntryUI[];
  deadline: string;
  instructions?: string;
  currentTotalAchieved: number;
  // 🔹 Updated: Aligning with the backend's activeQuarter 0-4
  activeQuarter: 0 | 1 | 2 | 3 | 4; 
}

interface UserIndicatorState {
  myIndicators: IIndicatorUI[];
  currentIndicator: IIndicatorUI | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

const initialState: UserIndicatorState = {
  myIndicators: [],
  currentIndicator: null,
  loading: false,
  uploading: false,
  error: null,
};

/* ---------------- THUNKS ---------------- */

export const fetchMyAssignments = createAsyncThunk(
  "userIndicators/fetchAll",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/user-indicators/my-assignments"); 
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load assignments"
      );
    }
  }
);

export const fetchIndicatorDetails = createAsyncThunk(
  "userIndicators/fetchDetails",
  async (id: string, thunkAPI) => {
    try {
      const response = await api.get(`/user-indicators/${id}`);
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load registry details"
      );
    }
  }
);

export const submitIndicatorProgress = createAsyncThunk(
  "userIndicators/submit",
  async ({ id, formData }: { id: string; formData: FormData }, thunkAPI) => {
    try {
      const response = await api.post(
        `/user-indicators/${id}/submit`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      // The controller now ensures status is "Awaiting Admin Approval"
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Submission failed"
      );
    }
  }
);

/* ---------------- SLICE ---------------- */

const userIndicatorSlice = createSlice({
  name: "userIndicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
    resetUserIndicatorState: () => initialState,
    setSelectedIndicator: (state, action: PayloadAction<string>) => {
      state.currentIndicator =
        state.myIndicators.find((i) => i._id === action.payload) || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action: PayloadAction<IIndicatorUI[]>) => {
        state.loading = false;
        state.myIndicators = action.payload;
      })
      .addCase(fetchIndicatorDetails.fulfilled, (state, action: PayloadAction<IIndicatorUI>) => {
        state.loading = false;
        state.currentIndicator = action.payload;
        
        const index = state.myIndicators.findIndex(ind => ind._id === action.payload._id);
        if (index !== -1) {
          state.myIndicators[index] = action.payload;
        } else {
          state.myIndicators.unshift(action.payload);
        }
      })

      .addCase(submitIndicatorProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(submitIndicatorProgress.fulfilled, (state, action: PayloadAction<IIndicatorUI>) => {
        state.uploading = false;
        
        // 🔹 UI Sync: Update the specific indicator in the list
        const index = state.myIndicators.findIndex(ind => ind._id === action.payload._id);
        if (index !== -1) {
          state.myIndicators[index] = action.payload;
        }
        
        // 🔹 Detail View Sync: Ensure the modal/detail page reflects the "Awaiting Admin Approval" status
        if (state.currentIndicator?._id === action.payload._id) {
          state.currentIndicator = action.payload;
        }
      })

      .addMatcher(
        (action): action is PayloadAction<string> => action.type.endsWith("/rejected"),
        (state, action) => {
          state.uploading = false;
          state.loading = false;
          state.error = typeof action.payload === "string" 
            ? action.payload 
            : "A server error occurred during the registry update.";
        }
      );
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;