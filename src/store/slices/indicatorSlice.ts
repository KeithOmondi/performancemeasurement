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
  assignee: any;
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

/* ---------------- THUNK ARG TYPES ---------------- */

type UpdateIndicatorArg = { id: string; data: Partial<IIndicator> };

type SuperAdminReviewArg = {
  id: string;
  reviewData: {
    decision: "Approved" | "Rejected";
    reason: string;                // Required by backend — always send
    progressOverride?: number;     // Sets currentSub.achievedValue for this quarter
    nextDeadline?: string;         // ISO string — required for Quarterly Q1-Q3 approvals
  };
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
  async (arg: UpdateIndicatorArg, { rejectWithValue }) => {
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
  async (arg: SuperAdminReviewArg, { rejectWithValue }) => {
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

      .addCase(fetchSubmissionsQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSubmissionsQueue.fulfilled,
        (state, action: PayloadAction<IQueueItem[]>) => {
          state.loading = false;
          state.queue = action.payload;
        },
      )
      .addCase(fetchSubmissionsQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchRejectedByAdmin.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchRejectedByAdmin.fulfilled,
        (state, action: PayloadAction<IIndicator[]>) => {
          state.loading = false;
          state.rejectedByAdmin = action.payload;
        },
      )
      .addCase(fetchRejectedByAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(createIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(
        createIndicator.fulfilled,
        (state, action: PayloadAction<IIndicator>) => {
          state.actionLoading = false;
          state.indicators.unshift(action.payload);
        },
      )
      .addCase(createIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      .addCase(updateIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(
        updateIndicator.fulfilled,
        (state, action: PayloadAction<IIndicator>) => {
          state.actionLoading = false;
          const index = state.indicators.findIndex(
            (i) => i._id === action.payload._id,
          );
          if (index !== -1) state.indicators[index] = action.payload;
        },
      )

      .addCase(
        deleteIndicator.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.actionLoading = false;
          state.indicators = state.indicators.filter(
            (i) => i._id !== action.payload,
          );
          state.queue = state.queue.filter((q) => q._id !== action.payload);
          state.rejectedByAdmin = state.rejectedByAdmin.filter(
            (i) => i._id !== action.payload,
          );
        },
      )

      .addCase(superAdminReview.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(
        superAdminReview.fulfilled,
        (state, action: PayloadAction<IIndicator>) => {
          state.actionLoading = false;
          const index = state.indicators.findIndex(
            (i) => i._id === action.payload._id,
          );
          if (index !== -1) state.indicators[index] = action.payload;
          state.queue = state.queue.filter((q) => q._id !== action.payload._id);
        },
      )
      .addCase(superAdminReview.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearIndicatorError } = indicatorSlice.actions;
export default indicatorSlice.reducer;