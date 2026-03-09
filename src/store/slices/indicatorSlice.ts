import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
  type ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface ISubmission {
  _id: string;
  quarter: 1 | 2 | 3 | 4;
  evidenceUrl?: string;
  evidencePublicId?: string;
  fileType?: "image" | "video" | "raw";
  notes: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Accepted" | "Rejected";
  adminComment?: string;
  submittedBy: string;
  resubmissionCount?: number;
}

export interface IReviewHistory {
  _id: string;
  action: string;
  reason: string;
  reviewedBy: string | { _id: string; name: string };
  at: string;
}

export interface IIndicator {
  _id: string;
  strategicPlanId: any;
  objectiveId: string;
  activityId: string;
  assignee: any;
  assignmentType: "User" | "Team";
  reportingCycle: "Quarterly" | "Annual";
  weight: number;
  unit: string;
  target: number;
  deadline: string;
  submissions: ISubmission[];
  reviewHistory: IReviewHistory[];
  status:
    | "Active"
    | "Pending"
    | "Partially Complete"
    | "Submitted"
    | "Rejected by Admin"
    | "Awaiting Super Admin"
    | "Reviewed";
  instructions?: string;
  assignedBy: any;
  perspective?: string;
  objectiveTitle?: string;
  activityDescription?: string;
  assigneeDisplayName?: string;
  progress: number;
  isResubmission?: boolean;
}

export interface IQueueItem {
  _id: string;
  indicatorTitle: string;
  submittedBy: string;
  isTeam: boolean;
  documentsCount: number;
  submittedOn: string;
  status: string;
  latestSubmission: ISubmission;
  assignee?: string | string[];
}

/* ---------------- HELPER ---------------- */

const getErrorMessage = (error: unknown, defaultMsg: string) =>
  (error as any)?.response?.data?.message || defaultMsg;

/* ---------------- THUNKS ---------------- */

// 1. Fetch all indicators
export const fetchIndicators = createAsyncThunk<IIndicator[], void>(
  "indicators/fetchAll",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/indicators");
      return res.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getErrorMessage(error, "Failed to fetch indicators"),
      );
    }
  },
);

// 2. Fetch submissions queue
export const fetchSubmissionsQueue = createAsyncThunk<IQueueItem[], void>(
  "indicators/fetchQueue",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/indicators/submissions/queue");
      return res.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getErrorMessage(error, "Failed to fetch queue"),
      );
    }
  },
);

// 3. NEW: Fetch Indicators specifically rejected by Admin
export const fetchRejectedOversight = createAsyncThunk<IIndicator[], void>(
  "indicators/fetchRejected",
  async (_, thunkAPI) => {
    try {
      const res = await api.get("/indicators/rejected-by-admin");
      return res.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getErrorMessage(error, "Failed to fetch rejected list"),
      );
    }
  },
);

// 4. Initial/Admin Review (Supports Progress Override)
export const processAdminReview = createAsyncThunk<
  IIndicator,
  {
    id: string;
    reviewData: {
      decision: "Approved" | "Rejected";
      reason: string;
      reviewerRole: string;
      progressOverride?: number;
    };
  }
>("indicators/processReview", async ({ id, reviewData }, thunkAPI) => {
  try {
    const res = await api.patch(`/indicators/${id}/review`, reviewData);
    return res.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      getErrorMessage(error, "Failed to process review"),
    );
  }
});

// 5. Final Super Admin Decision
export const submitSuperAdminDecision = createAsyncThunk<
  IIndicator,
  { 
    id: string; 
    decisionData: { 
      decision: "Approve" | "Reject"; 
      reason: string; 
      progressOverride?: number;
      nextDeadline?: string; // <--- ADD THIS LINE
    } 
  }
>(
  "indicators/superAdminDecision",
  async ({ id, decisionData }, thunkAPI) => {
    try {
      // The backend will now receive nextDeadline in the request body
      const res = await api.post(`/indicators/super-admin/decision/${id}`, decisionData);
      return res.data.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error, "Failed to finalize decision"));
    }
  }
);

// 6. Standard CRUD & Submission Thunks
export const createIndicator = createAsyncThunk<
  IIndicator,
  Partial<IIndicator>
>("indicators/create", async (data, thunkAPI) => {
  try {
    const res = await api.post("/indicators", data);
    return res.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      getErrorMessage(error, "Failed to create indicator"),
    );
  }
});

export const submitProgress = createAsyncThunk<
  IIndicator,
  { id: string; submission: any }
>("indicators/submitProgress", async ({ id, submission }, thunkAPI) => {
  try {
    const config =
      submission instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const res = await api.post(`/indicators/${id}/submit`, submission, config);
    return res.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      getErrorMessage(error, "Failed to submit progress"),
    );
  }
});

export const updateIndicator = createAsyncThunk<
  IIndicator,
  { id: string; updateData: any }
>("indicators/update", async ({ id, updateData }, thunkAPI) => {
  try {
    const res = await api.patch(`/indicators/${id}`, updateData);
    return res.data.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, "Update failed"));
  }
});

export const deleteIndicator = createAsyncThunk<string, string>(
  "indicators/delete",
  async (id, thunkAPI) => {
    try {
      await api.delete(`/indicators/${id}`);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        getErrorMessage(error, "Failed to delete indicator"),
      );
    }
  },
);

/* ---------------- SLICE ---------------- */

interface IndicatorState {
  indicators: IIndicator[];
  queue: IQueueItem[];
  rejectedOversight: IIndicator[]; // New list for Super Admin oversight
  loading: boolean;
  isReviewing: boolean;
  createLoading: boolean;
  error: string | null;
}

const initialState: IndicatorState = {
  indicators: [],
  queue: [],
  rejectedOversight: [],
  loading: false,
  isReviewing: false,
  createLoading: false,
  error: null,
};

const indicatorSlice = createSlice({
  name: "indicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<IndicatorState>) => {
    builder
      /* --- 1. CASES --- */
      .addCase(fetchIndicators.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchIndicators.fulfilled, (state, action) => {
        state.loading = false;
        state.indicators = action.payload;
      })
      .addCase(fetchIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchSubmissionsQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.queue = action.payload;
      })

      .addCase(fetchRejectedOversight.fulfilled, (state, action) => {
        state.loading = false;
        state.rejectedOversight = action.payload;
      })

      .addCase(createIndicator.fulfilled, (state, action) => {
        state.createLoading = false;
        state.indicators.unshift(action.payload);
      })

      .addCase(deleteIndicator.fulfilled, (state, action) => {
        state.indicators = state.indicators.filter(
          (i) => i._id !== action.payload,
        );
        state.queue = state.queue.filter((i) => i._id !== action.payload);
        state.rejectedOversight = state.rejectedOversight.filter(
          (i) => i._id !== action.payload,
        );
      })

      /* --- 2. MATCHERS --- */

      // Global Review Logic
      .addMatcher(
        (action: any) =>
          [
            processAdminReview.fulfilled.type,
            submitSuperAdminDecision.fulfilled.type,
          ].includes(action.type),
        (state, action: PayloadAction<IIndicator>) => {
          state.isReviewing = false;
          // Clean up all possible lists where this indicator might reside
          state.queue = state.queue.filter((q) => q._id !== action.payload._id);
          state.rejectedOversight = state.rejectedOversight.filter(
            (r) => r._id !== action.payload._id,
          );

          const index = state.indicators.findIndex(
            (i) => i._id === action.payload._id,
          );
          if (index !== -1) state.indicators[index] = action.payload;
        },
      )
      .addMatcher(
        (action: any) =>
          action.type.endsWith("/pending") && action.type.includes("Review"),
        (state) => {
          state.isReviewing = true;
        },
      )
      // Generic Update/Submit Success
      .addMatcher(
        (action: any) =>
          [
            submitProgress.fulfilled.type,
            updateIndicator.fulfilled.type,
          ].includes(action.type),
        (state, action: PayloadAction<IIndicator>) => {
          const index = state.indicators.findIndex(
            (i) => i._id === action.payload._id,
          );
          if (index !== -1) state.indicators[index] = action.payload;
        },
      );
  },
});

export const { clearIndicatorError } = indicatorSlice.actions;
export default indicatorSlice.reducer;
