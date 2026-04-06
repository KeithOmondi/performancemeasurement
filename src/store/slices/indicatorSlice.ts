import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ──────────────────────────────────────────────────────────── */

export interface IDocument {
  id?: string;
  submissionId?: string;
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
  uploadedAt?: string;
}

export interface ISubmission {
  id: string;
  indicatorId?: string;
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
  id?: string;
  action:
    | "Approved"
    | "Rejected"
    | "Verified"
    | "Resubmitted"
    | "Correction Requested";
  reason: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy: string;
  reviewedByName?: string;
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
  id: string;
  status: PerformanceStatus;
  weight: number;
  unit: string;
  target: number;
  progress: number;
  deadline: string;
  instructions?: string;
  currentTotalAchieved: number;
  activeQuarter: 1 | 2 | 3 | 4;
  reportingCycle: "Quarterly" | "Annual";
  assignmentType: "User" | "Team";

  // ✅ Updated to match backend controller expectation
  assignee: string; 
  assignedBy: string;
  strategicPlanId: string;
  objectiveId: string;
  activityId: string;

  assigneeDisplayName?: string;
  assignedByName?: string;
  perspective?: string;
  objectiveTitle?: string;
  activityDescription?: string;
  assigneePjNumber?: string;

  createdAt?: string;
  updatedAt?: string;

  submissions?: ISubmission[];
  reviewHistory?: IReviewHistory[];

  needsAction?: boolean;
  isOverdue?: boolean;
  adminOverallComments?: string;
}

export interface IQueueItem {
  id: string;
  submissionId: string;
  indicatorTitle: string;
  submittedBy: string;
  submittedOn: string;
  status: string;
  quarter: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: string;
  adminComment?: string;
  notes?: string;
  documentsCount: number;
  documents: IDocument[];
}

/* ─── STATE ──────────────────────────────────────────────────────────── */

interface IndicatorState {
  indicators: IIndicator[];
  selectedIndicator: IIndicator | null;
  rejectedByAdmin: IIndicator[];
  queue: IQueueItem[];
  loading: boolean;
  detailLoading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: IndicatorState = {
  indicators: [],
  selectedIndicator: null,
  rejectedByAdmin: [],
  queue: [],
  loading: false,
  detailLoading: false,
  actionLoading: false,
  error: null,
};

/* ─── HELPERS ─────────────────────────────────────────────────────────── */

const getErrorMessage = (error: any): string =>
  error?.response?.data?.message ?? "An unexpected error occurred";

const upsertIndicator = (state: IndicatorState, updated: IIndicator) => {
  const replace = (list: IIndicator[]) => {
    const idx = list.findIndex((i) => i.id === updated.id);
    if (idx !== -1) {
      list[idx] = updated;
      return true;
    }
    return false;
  };
  if (!replace(state.indicators)) state.indicators.unshift(updated);
  replace(state.rejectedByAdmin);

  if (state.selectedIndicator?.id === updated.id) {
    state.selectedIndicator = { ...state.selectedIndicator, ...updated };
  }
};

/* ─── THUNKS ──────────────────────────────────────────────────────────── */

export const fetchIndicators = createAsyncThunk(
  "indicators/fetchAll",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators");
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchIndicatorById = createAsyncThunk(
  "indicators/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(`/indicators/${id}`);
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
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
  }
);

export const fetchRejectedByAdmin = createAsyncThunk(
  "indicators/fetchRejectedByAdmin",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(
        "/indicators/submissions/rejected-by-admin"
      );
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
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
  }
);

export const updateIndicator = createAsyncThunk(
  "indicators/update",
  async (
    arg: { id: string; data: Partial<IIndicator> },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}`, arg.data);
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
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
  }
);

export const superAdminReview = createAsyncThunk(
  "indicators/superAdminReview",
  async (
    arg: { id: string; reviewData: any },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiPrivate.patch(
        `/indicators/${arg.id}/review`,
        arg.reviewData
      );
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/* ─── SLICE ───────────────────────────────────────────────────────────── */

const indicatorSlice = createSlice({
  name: "indicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
    clearSelectedIndicator: (state) => {
      state.selectedIndicator = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndicators.fulfilled, (state, action: PayloadAction<IIndicator[]>) => {
        state.loading = false;
        state.indicators = action.payload;
      })
      .addCase(fetchIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchIndicatorById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchIndicatorById.fulfilled, (state, action: PayloadAction<IIndicator>) => {
        state.detailLoading = false;
        state.selectedIndicator = action.payload;
        upsertIndicator(state, action.payload);
      })
      .addCase(fetchIndicatorById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchSubmissionsQueue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubmissionsQueue.fulfilled, (state, action: PayloadAction<IQueueItem[]>) => {
        state.loading = false;
        state.queue = action.payload;
      })
      .addCase(fetchSubmissionsQueue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchRejectedByAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRejectedByAdmin.fulfilled, (state, action: PayloadAction<IIndicator[]>) => {
        state.loading = false;
        state.rejectedByAdmin = action.payload;
      })
      .addCase(fetchRejectedByAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createIndicator.fulfilled, (state, action: PayloadAction<IIndicator>) => {
        state.actionLoading = false;
        state.indicators.unshift(action.payload);
      })
      .addCase(createIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateIndicator.fulfilled, (state, action: PayloadAction<IIndicator>) => {
        state.actionLoading = false;
        upsertIndicator(state, action.payload);
      })
      .addCase(updateIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteIndicator.fulfilled, (state, action: PayloadAction<string>) => {
        state.actionLoading = false;
        const id = action.payload;
        state.indicators = state.indicators.filter((i) => i.id !== id);
        state.queue = state.queue.filter((q) => q.id !== id);
        state.rejectedByAdmin = state.rejectedByAdmin.filter((i) => i.id !== id);
        if (state.selectedIndicator?.id === id) state.selectedIndicator = null;
      })
      .addCase(deleteIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(superAdminReview.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(superAdminReview.fulfilled, (state, action: PayloadAction<IIndicator>) => {
        state.actionLoading = false;
        upsertIndicator(state, action.payload);
        state.queue = state.queue.filter((q) => q.id !== action.payload.id);
      })
      .addCase(superAdminReview.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearIndicatorError, clearSelectedIndicator } = indicatorSlice.actions;
export default indicatorSlice.reducer;