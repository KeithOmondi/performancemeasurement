import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

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
  reviewedBy?: { _id: string; name: string };
  at: string;
}

export interface ISubmissionUI {
  _id: string;
  quarter: 1 | 2 | 3 | 4;
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
  activeQuarter: 1 | 2 | 3 | 4;
}

/* ---------------- STATE ---------------- */

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

/* ---------------- HELPERS ---------------- */

const upsertIndicator = (
  state: UserIndicatorState,
  indicator: IIndicatorUI
) => {
  if (!indicator?._id) return;

  const index = state.myIndicators.findIndex(
    (ind) => ind._id === indicator._id
  );
  if (index !== -1) {
    state.myIndicators[index] = { ...state.myIndicators[index], ...indicator };
  } else {
    state.myIndicators.unshift(indicator);
  }

  if (state.currentIndicator?._id === indicator._id) {
    state.currentIndicator = { ...state.currentIndicator, ...indicator };
  }
};

/* ---------------- THUNKS ---------------- */

type SubmitArg = { id: string; formData: FormData };

export const fetchMyAssignments = createAsyncThunk(
  "userIndicators/fetchAll",
  async (_: void, thunkAPI) => {
    try {
      const response = await apiPrivate.get("/user-indicators/my-assignments");
      return response.data.data as IIndicatorUI[];
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
      const response = await apiPrivate.get(`/user-indicators/${id}`);
      if (!response.data.data) {
        return thunkAPI.rejectWithValue("Indicator data not found");
      }
      return response.data.data as IIndicatorUI;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load indicator details"
      );
    }
  }
);

export const submitIndicatorProgress = createAsyncThunk(
  "userIndicators/submit",
  async (arg: SubmitArg, thunkAPI) => {
    try {
      const response = await apiPrivate.post(
        `/user-indicators/${arg.id}/submit`,
        arg.formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      // Re-fetch full indicator so progress % and status are up to date
      thunkAPI.dispatch(fetchIndicatorDetails(arg.id));
      return response.data;
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
      // ── Fetch all assignments ────────────────────────────────────────────
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
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Fetch single indicator ───────────────────────────────────────────
      .addCase(fetchIndicatorDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchIndicatorDetails.fulfilled,
        (state, action: PayloadAction<IIndicatorUI>) => {
          state.loading = false;
          state.currentIndicator = action.payload;
          upsertIndicator(state, action.payload);
        }
      )
      .addCase(fetchIndicatorDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Submit progress ──────────────────────────────────────────────────
      .addCase(submitIndicatorProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(submitIndicatorProgress.fulfilled, (state) => {
        state.uploading = false;
        // Updated data comes in via the fetchIndicatorDetails dispatch in thunk
      })
      .addCase(submitIndicatorProgress.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setLocalSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;