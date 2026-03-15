import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";
import { getAllStrategicPlans } from "./strategicPlan/strategicPlanSlice";

/* ---------------- TYPES ---------------- */

export interface IDocument {
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
}

export interface ISubmission {
  _id: string;
  quarter: 0 | 1 | 2 | 3 | 4;
  documents: IDocument[];
  notes: string;
  adminDescriptionEdit?: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Accepted" | "Rejected";
  adminComment?: string;
  resubmissionCount: number;
}

export interface IReviewHistory {
  action: "Approved" | "Rejected" | "Verified" | "Resubmitted" | "Correction Requested";
  reason: string;
  reviewerRole: "admin" | "superadmin" | "user";
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
  currentTotalAchieved: number; // Added to match model
  progress: number;
  activeQuarter: number;
  status:
    | "Pending"
    | "Awaiting Admin Approval"
    | "Rejected by Admin"
    | "Awaiting Super Admin"
    | "Rejected by Super Admin"
    | "Partially Approved"
    | "Completed";
  instructions?: string;
  assignedBy: any;
  adminOverallComments?: string;
  // Fields from transformIndicator helper:
  perspective?: string;
  objectiveTitle?: string;
  activityDescription?: string;
  assigneeDisplayName?: string;
  needsAction?: boolean;
}

export interface IQueueItem {
  _id: string;
  indicatorTitle: string; 
  submittedBy: string;
  submittedOn: string;
  status: string;
  progress: number;
  quarter: string;
  documentsCount: number; 
}

/* ---------------- THUNKS ---------------- */

const getErrorMessage = (error: any) =>
  error.response?.data?.message || "Internal Server Error";

/** 1. Fetch All Indicators */
export const fetchIndicators = createAsyncThunk<IIndicator[], void>(
  "indicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/indicators");
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

/** 2. Fetch Work Queue (Submissions) - Matches getAllSubmissions */
export const fetchSubmissionsQueue = createAsyncThunk<IQueueItem[], void>(
  "indicators/fetchQueue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/indicators/submissions/queue");
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

/** 3. Submit Progress (User) - Matches submitProgress payload */
export const submitProgress = createAsyncThunk<
  void, 
  { id: string; data: { notes: string; achievedValue: number; evidenceUrl: string; evidencePublicId: string; fileType?: string; fileName?: string } }
>(
  "indicators/submitProgress",
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      // Endpoint: router.post("/:id/submit")
      await api.post(`/indicators/${id}/submit`, data);
      // Refresh list to trigger model hooks and update progress/status UI
      dispatch(fetchIndicators());
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

/** 4. Super Admin Review - Matches superAdminReviewProcess */
export const superAdminReview = createAsyncThunk<
  IIndicator,
  { id: string; reviewData: { decision: "Approved" | "Rejected"; reason: string; progressOverride?: number } }
>(
  "indicators/superAdminReview",
  async ({ id, reviewData }, { dispatch, rejectWithValue }) => {
    try {
      // Endpoint: router.patch("/:id/review")
      const res = await api.patch(`/indicators/${id}/review`, reviewData);
      // Also refresh plans if global progress stats are affected
      dispatch(getAllStrategicPlans());
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

/** 5. CRUD Ops */
export const createIndicator = createAsyncThunk<IIndicator, any>(
  "indicators/create",
  async (data, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post("/indicators", data);
      dispatch(getAllStrategicPlans());
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

export const updateIndicator = createAsyncThunk<IIndicator, { id: string; data: Partial<IIndicator> }>(
  "indicators/update",
  async ({ id, data }, {  rejectWithValue }) => {
    try {
      const res = await api.patch(`/indicators/${id}`, data);
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

export const deleteIndicator = createAsyncThunk<string, string>(
  "indicators/delete",
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/indicators/${id}`);
      dispatch(getAllStrategicPlans());
      return id;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
  }
);

/* ---------------- SLICE ---------------- */

interface IndicatorState {
  indicators: IIndicator[];
  queue: IQueueItem[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: IndicatorState = {
  indicators: [],
  queue: [],
  loading: false,
  actionLoading: false,
  error: null,
};

const indicatorSlice = createSlice({
  name: "indicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIndicators.pending, (state) => { state.loading = true; })
      .addCase(fetchIndicators.fulfilled, (state, action) => {
        state.loading = false;
        state.indicators = action.payload;
      })
      .addCase(fetchSubmissionsQueue.fulfilled, (state, action) => {
        state.queue = action.payload;
      })
      .addCase(deleteIndicator.fulfilled, (state, action) => {
        state.indicators = state.indicators.filter((i) => i._id !== action.payload);
        state.queue = state.queue.filter((q) => q._id !== action.payload);
      })
      .addMatcher(
        (action) => action.type.endsWith("/fulfilled"),
        (state, action: PayloadAction<any>) => {
          if (action.payload?._id && !Array.isArray(action.payload)) {
            const updated = action.payload as IIndicator;

            // Update Master List
            const index = state.indicators.findIndex((i) => i._id === updated._id);
            if (index !== -1) {
              state.indicators[index] = updated;
            } else {
              state.indicators.unshift(updated);
            }

            // Remove from queue if it's no longer awaiting review
            const isResolved = ["Completed", "Rejected by Super Admin", "Pending"].includes(updated.status);
            if (isResolved) {
              state.queue = state.queue.filter((q) => q._id !== updated._id);
            }
          }
          state.actionLoading = false;
        }
      )
      .addMatcher((action) => action.type.endsWith("/pending"), (state, action) => {
        if (!action.type.includes("fetchAll")) state.actionLoading = true;
        state.error = null;
      })
      .addMatcher((action) => action.type.endsWith("/rejected"), (state, action: any) => {
        state.loading = false;
        state.actionLoading = false;
        state.error = action.payload || "An error occurred";
      });
  },
});

export const { clearIndicatorError } = indicatorSlice.actions;
export default indicatorSlice.reducer;