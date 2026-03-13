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
  // 🔹 Update: Now accepts 0 for Annual
  quarter: 0 | 1 | 2 | 3 | 4; 
  documents: IDocument[];
  notes: string;
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
  indicatorTitle?: string; 
  submissions: ISubmission[];
  reviewHistory: IReviewHistory[];
  currentTotalAchieved: number;
  progress: number;
  // 🔹 Update: Now accepts 0 for Annual
  activeQuarter: 0 | 1 | 2 | 3 | 4; 
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
  // 🔹 Changed to string/number to handle "Annual" vs "Q1" labels from backend
  quarter: string | number; 
  documentsCount?: number;
  documents?: any[]; 
  activityDescription?: string;
}

/* ---------------- THUNKS ---------------- */

const getErrorMessage = (error: any) =>
  error.response?.data?.message || "Internal Server Error";

export const fetchIndicators = createAsyncThunk<IIndicator[], void>(
  "indicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/indicators");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchSubmissionsQueue = createAsyncThunk<IQueueItem[], void>(
  "indicators/fetchQueue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/indicators/submissions/queue");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const processReview = createAsyncThunk<
  IIndicator,
  {
    id: string;
    reviewData: {
      decision: "Approved" | "Rejected";
      reason: string;
      progressOverride?: number;
    };
  }
>(
  "indicators/processReview",
  async ({ id, reviewData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.patch(`/indicators/${id}/review`, reviewData);
      dispatch(getAllStrategicPlans());
      return res.data.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const superAdminDecision = createAsyncThunk<
  IIndicator,
  {
    id: string;
    decisionData: {
      decision: "Approved" | "Rejected";
      reason: string;
    };
  }
>(
  "indicators/superAdminDecision",
  async ({ id, decisionData }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post(`/indicators/super-admin/decision/${id}`, decisionData);
      dispatch(getAllStrategicPlans());
      return res.data.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const createIndicator = createAsyncThunk<IIndicator, Partial<IIndicator>>(
  "indicators/create", 
  async (data, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post("/indicators", data);
      dispatch(getAllStrategicPlans());
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
});

export const updateIndicator = createAsyncThunk<IIndicator, { id: string; data: Partial<IIndicator> }>(
  "indicators/update", 
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.patch(`/indicators/${id}`, data);
      dispatch(getAllStrategicPlans());
      return res.data.data;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
});

export const deleteIndicator = createAsyncThunk<string, string>(
  "indicators/delete", 
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await api.delete(`/indicators/${id}`);
      dispatch(getAllStrategicPlans());
      return id;
    } catch (err) { return rejectWithValue(getErrorMessage(err)); }
});

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

            const index = state.indicators.findIndex((i) => i._id === updated._id);
            if (index !== -1) { 
              state.indicators[index] = updated; 
            } else { 
              state.indicators.unshift(updated); 
            }

            const stillAwaitingReview = [
              "Awaiting Admin Approval",
              "Awaiting Super Admin",
            ].includes(updated.status);

            if (!stillAwaitingReview) {
              state.queue = state.queue.filter((q) => q._id !== updated._id);
            } else {
              const qIndex = state.queue.findIndex((q) => q._id === updated._id);
              if (qIndex !== -1) {
                state.queue[qIndex] = {
                  ...state.queue[qIndex],
                  progress: updated.progress,
                  status: updated.status,
                  // 🔹 Handling the label mapping for the queue
                  quarter: updated.activeQuarter === 0 ? "Annual" : `Q${updated.activeQuarter}`,
                };
              }
            }
          }
          state.loading = false;
          state.actionLoading = false;
        }
      )
      .addMatcher((action) => action.type.endsWith("/pending"), (state, action) => {
        if (!action.type.includes("fetch")) state.actionLoading = true;
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