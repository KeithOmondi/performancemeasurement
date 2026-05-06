import {
  createSlice,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";
import axios from "axios";

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
  indicatorId: string;
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

export interface ISuperAdminReviewPayload {
  decision: "Approved" | "Rejected";
  reason?: string;
  progressOverride?: number;
  nextDeadline?: string;
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

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

/**
 * Synchronizes the indicator data across all state arrays and the selected reference.
 */
const upsertIndicator = (state: IndicatorState, updated: IIndicator) => {
  const replace = (list: IIndicator[]) => {
    const idx = list.findIndex((i) => String(i.id) === String(updated.id));
    if (idx !== -1) {
      list[idx] = updated;
    }
  };

  replace(state.indicators);
  replace(state.rejectedByAdmin);

  if (
    state.selectedIndicator &&
    String(state.selectedIndicator.id) === String(updated.id)
  ) {
    state.selectedIndicator = updated;
  }
};

/**
 * Removes an indicator by ID from every state list and clears selectedIndicator
 * if it matches. Used by both deleteIndicator and unassignIndicator.
 */
const removeIndicatorById = (state: IndicatorState, id: string) => {
  state.indicators      = state.indicators.filter((i) => String(i.id) !== id);
  state.rejectedByAdmin = state.rejectedByAdmin.filter((i) => String(i.id) !== id);
  state.queue           = state.queue.filter((q) => String(q.indicatorId) !== id);

  if (state.selectedIndicator && String(state.selectedIndicator.id) === id) {
    state.selectedIndicator = null;
  }
};

/* ─── THUNKS ──────────────────────────────────────────────────────────── */

export const fetchIndicators = createAsyncThunk(
  "indicators/fetchAll",
  async (_, { rejectWithValue }) => {
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
  async (_, { rejectWithValue }) => {
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
  async (_, { rejectWithValue }) => {
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

export const unassignIndicator = createAsyncThunk(
  "indicators/unassign",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/indicators/${id}/unassign`);
      // ✅ Return the original arg id — never trust the backend response id
      // since INDICATOR_SELECT joins can alias a different table's id column.
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const superAdminReview = createAsyncThunk(
  "indicators/superAdminReview",
  async (
    arg: { id: string; reviewData: ISuperAdminReviewPayload },
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

export const deleteSubmission = createAsyncThunk(
  "indicators/deleteSubmission",
  async (
    arg: { submissionId: string; indicatorId: string },
    { rejectWithValue }
  ) => {
    try {
      await apiPrivate.delete(`/indicators/submissions/${arg.submissionId}`);
      return arg;
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
    // ── FETCH ALL ──────────────────────────────────────────────────────
    builder
      .addCase(fetchIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndicators.fulfilled, (state, action) => {
        state.loading = false;
        state.indicators = action.payload;
      })
      .addCase(fetchIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ── FETCH BY ID ────────────────────────────────────────────────────
    builder
      .addCase(fetchIndicatorById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchIndicatorById.fulfilled, (state, action) => {
        state.detailLoading = false;
        if (
          !state.selectedIndicator ||
          state.selectedIndicator.id !== action.payload.id
        ) {
          state.selectedIndicator = action.payload;
        }
        upsertIndicator(state, action.payload);
      })
      .addCase(fetchIndicatorById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload as string;
      });

    // ── QUEUE & REJECTED LISTS ─────────────────────────────────────────
    builder
      .addCase(fetchSubmissionsQueue.fulfilled, (state, action) => {
        state.queue = action.payload;
      })
      .addCase(fetchRejectedByAdmin.fulfilled, (state, action) => {
        state.rejectedByAdmin = action.payload;
      });

    // ── CREATE ─────────────────────────────────────────────────────────
    builder
      .addCase(createIndicator.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createIndicator.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.indicators.unshift(action.payload);
      })
      .addCase(createIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    // ── DELETE SUBMISSION ──────────────────────────────────────────────
    builder
      .addCase(deleteSubmission.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteSubmission.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { submissionId, indicatorId } = action.payload;

        state.queue = state.queue.filter((q) => q.id !== submissionId);

        if (state.selectedIndicator?.id === indicatorId) {
          state.selectedIndicator = {
            ...state.selectedIndicator,
            submissions: state.selectedIndicator.submissions?.filter(
              (s) => s.id !== submissionId
            ),
          };
        }

        const idx = state.indicators.findIndex((i) => i.id === indicatorId);
        if (idx !== -1 && state.indicators[idx].submissions) {
          state.indicators[idx] = {
            ...state.indicators[idx],
            submissions: state.indicators[idx].submissions!.filter(
              (s) => s.id !== submissionId
            ),
          };
        }
      })
      .addCase(deleteSubmission.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    // ── UPDATE ─────────────────────────────────────────────────────────
    builder
      .addCase(updateIndicator.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateIndicator.fulfilled, (state, action) => {
        state.actionLoading = false;
        upsertIndicator(state, action.payload);
      })
      .addCase(updateIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    // ── DELETE ─────────────────────────────────────────────────────────
    builder
      .addCase(deleteIndicator.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(deleteIndicator.fulfilled, (state, action) => {
        state.actionLoading = false;
        removeIndicatorById(state, String(action.payload));
      })
      .addCase(deleteIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

   // ── UNASSIGN ───────────────────────────────────────────────────────
builder
  .addCase(unassignIndicator.pending, (state) => {
    state.actionLoading = true;
    state.error = null;
  })
  .addCase(unassignIndicator.fulfilled, (state, action) => {
  state.actionLoading = false;
  const id = action.payload;

  const before = state.indicators.length;
  state.indicators = state.indicators.filter((i) => String(i.id) !== id);
  const after = state.indicators.length;
  
  console.log(`Removed: ${before} → ${after}, id matched: ${before !== after}`);

  state.rejectedByAdmin = state.rejectedByAdmin.filter((i) => String(i.id) !== id);
  state.queue = state.queue.filter((q) => String(q.indicatorId) !== id);
  if (state.selectedIndicator && String(state.selectedIndicator.id) === id) {
    state.selectedIndicator = null;
  }
})
  .addCase(unassignIndicator.rejected, (state, action) => {
    state.actionLoading = false;
    state.error = action.payload as string;
  });

    // ── SUPER ADMIN REVIEW ─────────────────────────────────────────────
    builder
      .addCase(superAdminReview.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(superAdminReview.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;

        upsertIndicator(state, updated);

        state.queue = state.queue.filter(
          (q) => String(q.indicatorId) !== String(updated.id)
        );

        if (updated.status === "Rejected by Super Admin") {
          const exists = state.rejectedByAdmin.some((r) => r.id === updated.id);
          if (!exists) state.rejectedByAdmin.push(updated);
        } else {
          state.rejectedByAdmin = state.rejectedByAdmin.filter(
            (r) => r.id !== updated.id
          );
        }
      })
      .addCase(superAdminReview.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearIndicatorError, clearSelectedIndicator } =
  indicatorSlice.actions;
export default indicatorSlice.reducer;