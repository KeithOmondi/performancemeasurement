import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IDocument {
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
}

export interface ISubmission {
  _id: string;
  quarter: 1 | 2 | 3 | 4;
  documents: IDocument[];
  notes: string;
  submittedBy: string | { _id: string; name: string };
  adminDescriptionEdit?: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  resubmissionCount: number;
}

export interface IReviewHistory {
  action:
    | "Approved"
    | "Rejected"
    | "Verified"
    | "Resubmitted"
    | "Correction Requested";
  reason: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy: string | { _id: string; name: string };
  at: string;
  nextDeadline?: string;
}

export type PerformanceStatus =
  | "Pending"
  | "Awaiting Admin Approval"
  | "Rejected by Admin"
  | "Awaiting Super Admin"
  | "Rejected by Super Admin"
  | "Completed";

export interface IIndicator {
  _id: string;
  strategicPlanId: any;
  objectiveId: string;
  activityId: string;
  assignee: { _id: string; name: string; email?: string; pjNumber?: string };
  assignmentType: "User" | "Team";
  reportingCycle: "Quarterly" | "Annual";
  weight: number;
  unit: string;
  target: number;
  deadline: string;
  submissions: ISubmission[];
  reviewHistory?: IReviewHistory[];
  currentTotalAchieved: number;
  progress: number;
  activeQuarter: 1 | 2 | 3 | 4;
  status: PerformanceStatus;
  instructions?: string;
  assignedBy: any;
  adminOverallComments?: string;
  perspective?: string;
  objectiveTitle?: string;
  activityDescription?: string;
  assigneeDisplayName?: string;
  needsAction?: boolean;
  isOverdue?: boolean;
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
  documents?: IDocument[];
}

/* ---------------- STATE ---------------- */

interface IndicatorState {
  indicators: IIndicator[];
  rejectedByAdmin: IIndicator[];
  queue: IQueueItem[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: IndicatorState = {
  indicators: [],
  rejectedByAdmin: [],
  queue: [],
  loading: false,
  actionLoading: false,
  error: null,
};

/* ---------------- HELPERS ---------------- */

const getErrorMessage = (error: any): string =>
  error.response?.data?.message || "An unexpected error occurred";

const updateIndicatorInState = (
  state: IndicatorState,
  updatedInd: IIndicator,
) => {
  const idx = state.indicators.findIndex(
    (i: IIndicator) => i._id === updatedInd._id,
  );
  if (idx !== -1) state.indicators[idx] = updatedInd;

  const rejIdx = state.rejectedByAdmin.findIndex(
    (i: IIndicator) => i._id === updatedInd._id,
  );
  if (rejIdx !== -1) state.rejectedByAdmin[rejIdx] = updatedInd;
};

/* ---------------- THUNKS ---------------- */

export const fetchIndicators = createAsyncThunk(
  "indicators/fetchAll",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators");
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchSubmissionsQueue = createAsyncThunk(
  "indicators/fetchQueue",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/submissions/queue");
      return res.data.data as IQueueItem[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchRejectedByAdmin = createAsyncThunk(
  "indicators/fetchRejectedByAdmin",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(
        "/indicators/submissions/rejected-by-admin",
      );
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createIndicator = createAsyncThunk(
  "indicators/create",
  async (data: Partial<IIndicator>, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.post("/indicators", data);
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateIndicator = createAsyncThunk(
  "indicators/update",
  async (
    arg: { id: string; data: Partial<IIndicator> },
    { rejectWithValue },
  ) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}`, arg.data);
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteIndicator = createAsyncThunk(
  "indicators/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/indicators/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const superAdminReview = createAsyncThunk(
  "indicators/superAdminReview",
  async (arg: { id: string; reviewData: any }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(
        `/indicators/${arg.id}/review`,
        arg.reviewData,
      );
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ---------------- SLICE ---------------- */

const indicatorSlice = createSlice({
  name: "indicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // All .addCase calls MUST come first
      .addCase(fetchIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchIndicators.fulfilled,
        (state, action: PayloadAction<IIndicator[]>) => {
          state.loading = false;
          state.indicators = action.payload;
        },
      )
      .addCase(fetchIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(
        fetchSubmissionsQueue.fulfilled,
        (state, action: PayloadAction<IQueueItem[]>) => {
          state.loading = false;
          state.queue = action.payload;
        },
      )
      .addCase(
        fetchRejectedByAdmin.fulfilled,
        (state, action: PayloadAction<IIndicator[]>) => {
          state.loading = false;
          state.rejectedByAdmin = action.payload;
        },
      )
      .addCase(
        createIndicator.fulfilled,
        (state, action: PayloadAction<IIndicator>) => {
          state.actionLoading = false;
          state.indicators.unshift(action.payload);
        },
      )
      .addCase(
        deleteIndicator.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.actionLoading = false;
          state.indicators = state.indicators.filter(
            (i: IIndicator) => i._id !== action.payload,
          );
          state.queue = state.queue.filter(
            (q: IQueueItem) => q._id !== action.payload,
          );
          state.rejectedByAdmin = state.rejectedByAdmin.filter(
            (i: IIndicator) => i._id !== action.payload,
          );
        },
      )
      // Matcher MUST come after all addCase calls
      .addMatcher(
        (action) =>
          [
            updateIndicator.fulfilled.type,
            superAdminReview.fulfilled.type,
          ].includes(action.type),
        (state, action: PayloadAction<IIndicator>) => {
          state.actionLoading = false;
          updateIndicatorInState(state, action.payload);
          if (action.type === superAdminReview.fulfilled.type) {
            state.queue = state.queue.filter(
              (q: IQueueItem) => q._id !== action.payload._id,
            );
          }
        },
      );
  },
});

export const { clearIndicatorError } = indicatorSlice.actions;
export default indicatorSlice.reducer;
