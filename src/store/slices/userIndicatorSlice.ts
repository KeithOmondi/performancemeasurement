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
  action:
    | "Approved"
    | "Rejected"
    | "Verified"
    | "Resubmitted"
    | "Correction Requested";
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
  quarter: 0 | 1 | 2 | 3 | 4;
  documents: IDocumentUI[];
  notes: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
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

/**
 * Fetches all assigned indicators for the logged-in user
 */
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

/**
 * Fetches specific details for a single indicator/dossier
 */
export const fetchIndicatorDetails = createAsyncThunk(
  "userIndicators/fetchDetails",
  async (id: string, thunkAPI) => {
    try {
      const response = await api.get(`/user-indicators/${id}`);
      const payload = response.data.data;
      if (!payload) return thunkAPI.rejectWithValue("Dossier data not found");
      return payload;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load registry details"
      );
    }
  }
);

/**
 * Handles multipart/form-data submission of evidence and progress
 * Dispatches a re-fetch on success to trigger backend hook recalculations
 */
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

      if (response.data.success) {
        // Sync full state including progress % and status via backend hooks
        thunkAPI.dispatch(fetchIndicatorDetails(id));
      }
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Submission failed"
      );
    }
  }
);

/* ---------------- HELPERS ---------------- */

const upsertIndicator = (
  state: UserIndicatorState,
  indicator: IIndicatorUI
) => {
  if (!indicator?._id) return;

  // 1. Update list view entry
  const index = state.myIndicators.findIndex((ind) => ind._id === indicator._id);
  if (index !== -1) {
    state.myIndicators[index] = { ...state.myIndicators[index], ...indicator };
  } else {
    state.myIndicators.unshift(indicator);
  }

  // 2. Update active detail view if it matches
  if (state.currentIndicator?._id === indicator._id) {
    state.currentIndicator = { ...state.currentIndicator, ...indicator };
  }
};

/* ---------------- SLICE ---------------- */

const userIndicatorSlice = createSlice({
  name: "userIndicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
    resetUserIndicatorState: () => initialState,
    setLocalSelectedIndicator: (
      state,
      action: PayloadAction<string | null>
    ) => {
      if (!action.payload) {
        state.currentIndicator = null;
      } else {
        state.currentIndicator =
          state.myIndicators.find((i) => i._id === action.payload) || null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      /* Fetch All */
      .addCase(fetchMyAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyAssignments.fulfilled,
        (state, action: PayloadAction<IIndicatorUI[]>) => {
          state.loading = false;
          state.myIndicators = action.payload || [];
        }
      )

      /* Fetch Details */
      .addCase(fetchIndicatorDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchIndicatorDetails.fulfilled,
        (state, action: PayloadAction<IIndicatorUI>) => {
          state.loading = false;
          state.currentIndicator = action.payload;
          upsertIndicator(state, action.payload);
        }
      )

      /* Submit Evidence */
      .addCase(submitIndicatorProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(submitIndicatorProgress.fulfilled, (state) => {
        state.uploading = false;
        // Data is handled by the fetchIndicatorDetails dispatch in the thunk
      })

      /* Global Error Matcher */
      .addMatcher(
        (action): action is PayloadAction<string> =>
          action.type.endsWith("/rejected"),
        (state, action) => {
          state.uploading = false;
          state.loading = false;
          state.error = (action.payload as string) || "A registry error occurred.";
        }
      );
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setLocalSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;