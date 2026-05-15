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
  | "Completed"
  | "Unassigned";

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
  assignedDate?: string | null;
  completionPercentage?: number;
}

export interface IQueueItem {
  id: string;
  submissionId: string;
  indicatorId: string;
  indicatorTitle: string;
  submittedBy: string;
  year?: number;
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
  assignedIndicators: IIndicator[];
  unassignedIndicators: IIndicator[];
  reviewIndicators: IIndicator[];
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
  assignedIndicators: [],
  unassignedIndicators: [],
  reviewIndicators: [],
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
 * Categorizes indicators based on their status and assignment
 */
const categorizeIndicators = (indicators: IIndicator[]) => {
  const assigned: IIndicator[] = [];
  const unassigned: IIndicator[] = [];
  const review: IIndicator[] = [];

  indicators.forEach(indicator => {
    // Check if indicator needs review (has pending submissions or needs action)
    if (indicator.needsAction || 
        indicator.status === "Awaiting Admin Approval" ||
        indicator.status === "Awaiting Super Admin" ||
        (indicator.submissions?.some(s => s.reviewStatus === "Pending"))) {
      review.push(indicator);
    }
    // Check if unassigned - by checking if assignee is null/empty
    else if (!indicator.assignee || indicator.assignee === "") {
      unassigned.push(indicator);
    }
    // Otherwise assigned
    else {
      assigned.push(indicator);
    }
  });

  return { assigned, unassigned, review };
};

/**
 * Synchronizes the categorized lists after any update
 */
const syncCategorizedLists = (state: IndicatorState) => {
  const { assigned, unassigned, review } = categorizeIndicators(state.indicators);
  state.assignedIndicators = assigned;
  state.unassignedIndicators = unassigned;
  state.reviewIndicators = review;
};

/**
 * Synchronizes the indicator data across all state arrays and the selected reference.
 */
const upsertIndicator = (state: IndicatorState, updated: IIndicator) => {
  const replace = (list: IIndicator[]) => {
    const idx = list.findIndex((i) => String(i.id) === String(updated.id));
    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
  };

  replace(state.indicators);
  replace(state.rejectedByAdmin);
  replace(state.assignedIndicators);
  replace(state.unassignedIndicators);
  replace(state.reviewIndicators);

  if (
    state.selectedIndicator &&
    String(state.selectedIndicator.id) === String(updated.id)
  ) {
    state.selectedIndicator = updated;
  }

  // Re-sync after update
  syncCategorizedLists(state);
};

/**
 * Removes an indicator by ID from every state list and clears selectedIndicator
 * if it matches. Used by deleteIndicator.
 */
const removeIndicatorById = (state: IndicatorState, id: string) => {
  state.indicators = state.indicators.filter((i) => String(i.id) !== id);
  state.rejectedByAdmin = state.rejectedByAdmin.filter((i) => String(i.id) !== id);
  state.queue = state.queue.filter((q) => String(q.indicatorId) !== id);
  state.assignedIndicators = state.assignedIndicators.filter((i) => String(i.id) !== id);
  state.unassignedIndicators = state.unassignedIndicators.filter((i) => String(i.id) !== id);
  state.reviewIndicators = state.reviewIndicators.filter((i) => String(i.id) !== id);

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

export const fetchAssignedIndicators = createAsyncThunk(
  "indicators/fetchAssigned",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/assigned");
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUnassignedIndicators = createAsyncThunk(
  "indicators/fetchUnassigned",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/unassigned");
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchReviewIndicators = createAsyncThunk(
  "indicators/fetchReview",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/review");
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
      const res = await apiPrivate.get("/indicators/rejected-by-admin");
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

export const assignIndicator = createAsyncThunk(
  "indicators/assign",
  async (arg: { id: string; assigneeId: string }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.post(`/indicators/${arg.id}/assign`, {
        assigneeId: arg.assigneeId
      });
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const unassignIndicator = createAsyncThunk(
  "indicators/unassign",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.delete(`/indicators/${id}/unassign`);
      return res.data.data as IIndicator;
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
    refreshCategorizedLists: (state) => {
      syncCategorizedLists(state);
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
        syncCategorizedLists(state);
      })
      .addCase(fetchIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ── FETCH ASSIGNED ─────────────────────────────────────────────────
    builder
      .addCase(fetchAssignedIndicators.fulfilled, (state, action) => {
        state.assignedIndicators = action.payload;
      });

    // ── FETCH UNASSIGNED ───────────────────────────────────────────────
    builder
      .addCase(fetchUnassignedIndicators.fulfilled, (state, action) => {
        state.unassignedIndicators = action.payload;
      });

    // ── FETCH REVIEW ───────────────────────────────────────────────────
    builder
      .addCase(fetchReviewIndicators.fulfilled, (state, action) => {
        state.reviewIndicators = action.payload;
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
        syncCategorizedLists(state);
      })
      .addCase(createIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    // ── ASSIGN INDICATOR ───────────────────────────────────────────────
    builder
      .addCase(assignIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(assignIndicator.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updatedIndicator = {
          ...action.payload,
          assignedDate: new Date().toISOString(),
          completionPercentage: 0
        };
        upsertIndicator(state, updatedIndicator);
      })
      .addCase(assignIndicator.rejected, (state, action) => {
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
          syncCategorizedLists(state);
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
        syncCategorizedLists(state);
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
        // ✅ Keep the backend status (which is 'Pending') - don't override to 'Unassigned'
        const updatedIndicator = {
          ...action.payload,
          assignee: "",  // Clear assignee ID
          assigneeDisplayName: undefined,
          assignedDate: null,
          completionPercentage: 0,
          progress: 0,
          needsAction: false,
          isOverdue: false,
          // Status remains whatever backend returned (should be 'Pending')
        };
        
        // Use upsertIndicator to sync across all lists
        upsertIndicator(state, updatedIndicator);
        
        console.log(`✅ Indicator ${updatedIndicator.id} successfully unassigned and moved to unassigned list`);
      })
      .addCase(unassignIndicator.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
        console.error(`❌ Unassign failed:`, action.payload);
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
        
        if (updated.status !== "Rejected by Super Admin" && 
            updated.status !== "Rejected by Admin") {
          updated.status = "Pending";
        }
        
        upsertIndicator(state, updated);

        state.queue = state.queue.filter(
          (q) => String(q.indicatorId) !== String(updated.id)
        );

        if (updated.status === "Rejected by Super Admin" || 
            updated.status === "Rejected by Admin") {
          const exists = state.rejectedByAdmin.some((r) => r.id === updated.id);
          if (!exists) state.rejectedByAdmin.push(updated);
        } else {
          state.rejectedByAdmin = state.rejectedByAdmin.filter(
            (r) => r.id !== updated.id
          );
        }
        
        syncCategorizedLists(state);
      })
      .addCase(superAdminReview.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearIndicatorError, 
  clearSelectedIndicator, 
  refreshCategorizedLists 
} = indicatorSlice.actions;
export default indicatorSlice.reducer;