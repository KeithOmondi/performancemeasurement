import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
  isAnyOf,
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
  _id: string;
  action: string;
  reason: string;
  at: string;
  reviewedBy?: {
    _id: string;
    name: string;
  };
}

export interface ISubmissionUI {
  _id: string;
  quarter: number;
  /** @deprecated Use documents array for multi-file display */
  evidenceUrl?: string;
  /** @deprecated Use documents array for multi-file display */
  fileType: "image" | "video" | "raw";
  documents: IDocumentUI[]; // Added for multi-file support
  notes: string;
  submittedAt: string;
  achievedValue: number;
  reviewStatus: "Pending" | "Accepted" | "Rejected";
  adminComment?: string;
  resubmissionCount: number;
}

export interface IIndicatorUI {
  _id: string;
  objectiveTitle: string;
  activityDescription: string;
  perspective: string;
  reportingCycle: "Quarterly" | "Annual";
  status: string;
  progress: number;
  target: number;
  unit: string;
  submissions: ISubmissionUI[];
  reviewHistory: IReviewHistoryEntryUI[];
  deadline: string;
  instructions?: string;
  currentTotalAchieved: number;
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
        error.response?.data?.message || "Failed to load assignments",
      );
    }
  },
);

export const submitIndicatorProgress = createAsyncThunk(
  "userIndicators/submit",
  async ({ id, formData }: { id: string; formData: FormData }, thunkAPI) => {
    try {
      // The backend now handles upload.array("evidence")
      const response = await api.post(
        `/user-indicators/${id}/submit`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Upload failed",
      );
    }
  },
);

export const resubmitIndicatorProgress = createAsyncThunk(
  "userIndicators/resubmit",
  async (
    {
      indicatorId,
      submissionId,
      formData,
    }: { indicatorId: string; submissionId: string; formData: FormData },
    thunkAPI,
  ) => {
    try {
      const response = await api.patch(
        `/user-indicators/${indicatorId}/resubmit/${submissionId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Resubmission failed",
      );
    }
  },
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
      .addCase(
        fetchMyAssignments.fulfilled,
        (state, action: PayloadAction<IIndicatorUI[]>) => {
          state.loading = false;
          state.myIndicators = action.payload;
        },
      )
      .addMatcher(
        isAnyOf(
          submitIndicatorProgress.pending,
          resubmitIndicatorProgress.pending,
        ),
        (state) => {
          state.uploading = true;
          state.error = null;
        },
      )
      .addMatcher(
        isAnyOf(
          submitIndicatorProgress.fulfilled,
          resubmitIndicatorProgress.fulfilled,
        ),
        (state, action: PayloadAction<IIndicatorUI>) => {
          state.uploading = false;

          const index = state.myIndicators.findIndex(
            (ind) => ind._id === action.payload._id,
          );

          if (index !== -1) {
            state.myIndicators[index] = action.payload;

            if (state.currentIndicator?._id === action.payload._id) {
              state.currentIndicator = action.payload;
            }
          }
        },
      )
      .addMatcher(
        (action): action is PayloadAction<string> =>
          action.type.endsWith("/rejected"),
        (state, action) => {
          state.uploading = false;
          state.loading = false;
          state.error =
            typeof action.payload === "string"
              ? action.payload
              : (action as any).error?.message ||
                "An unexpected error occurred";
        },
      );
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;
