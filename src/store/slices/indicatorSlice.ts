import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
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
  description?: string;
  status?: "Accepted" | "Rejected" | "Pending";
}

export interface ISubmission {
  id: string;
  indicatorId?: string;
  quarter: 1 | 2 | 3 | 4 | 0;
  year: number;
  documents: IDocument[];
  notes: string;
  adminDescriptionEdit?: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected" | "Partially Approved";
  adminComment?: string;
  resubmissionCount: number;
  approvedAmount?: number;
  reviewedAt?: string;
}

export interface IReviewHistory {
  id?: string;
  action:
    | "Approved"
    | "Rejected"
    | "Verified"
    | "Resubmitted"
    | "Correction Requested"
    | "Partially Approved";
  reason: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewedBy: string;
  reviewedByName?: string;
  at: string;
  nextDeadline?: string;
  approvedAmount?: number;
  isPartial?: boolean;
  quarter?: number;
  year?: number;
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
  assigneeId?: string;
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

export interface IPartialApproval {
  id: string;
  action: string;
  reason: string;
  approvedAmount: number;
  quarter: number;
  year: number;
  approvedAt: string;
  approvedBy: string;
  isPartial: boolean;
}

export interface ISuperAdminReviewPayload {
  decision: "Approved" | "Rejected";
  reason?: string;
  progressOverride: number;
  isPartialApproval?: boolean;
  year?: number;
  quarter?: number;
}

export interface ICounts {
  total: number;
  assigned: number;
  unassigned: number;
  review: number;
  overdue: number;
  perspectives: Record<string, number>;
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
  counts: ICounts | null;
  superAdminApprovedIndicators: IIndicator[];
  partialApprovals: IPartialApproval[];
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
  counts: null,
  superAdminApprovedIndicators: [],
  partialApprovals: [],
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

const categorizeIndicators = (indicators: IIndicator[]) => {
  const assigned: IIndicator[] = [];
  const unassigned: IIndicator[] = [];
  const review: IIndicator[] = [];

  indicators.forEach((indicator) => {
    // ✅ Fix: Check assigneeId instead of assignee string
    const hasAssignee = indicator.assigneeId && indicator.assigneeId.trim() !== "";
    
    if (hasAssignee) {
      assigned.push(indicator);
    } else {
      unassigned.push(indicator);
    }

    if (
      indicator.status === "Awaiting Admin Approval" ||
      indicator.status === "Awaiting Super Admin" ||
      indicator.submissions?.some((s) => s.reviewStatus === "Pending")
    ) {
      review.push(indicator);
    }
  });

  return { assigned, unassigned, review };
};

const syncCategorizedLists = (state: IndicatorState) => {
  const { assigned, unassigned, review } = categorizeIndicators(
    state.indicators
  );
  state.assignedIndicators = assigned;
  state.unassignedIndicators = unassigned;
  state.reviewIndicators = review;
};

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
  replace(state.superAdminApprovedIndicators);

  if (
    state.selectedIndicator &&
    String(state.selectedIndicator.id) === String(updated.id)
  ) {
    state.selectedIndicator = updated;
  }

  syncCategorizedLists(state);
};

const removeIndicatorById = (state: IndicatorState, id: string) => {
  state.indicators = state.indicators.filter((i) => String(i.id) !== id);
  state.rejectedByAdmin = state.rejectedByAdmin.filter(
    (i) => String(i.id) !== id
  );
  state.queue = state.queue.filter((q) => String(q.indicatorId) !== id);
  state.assignedIndicators = state.assignedIndicators.filter(
    (i) => String(i.id) !== id
  );
  state.unassignedIndicators = state.unassignedIndicators.filter(
    (i) => String(i.id) !== id
  );
  state.reviewIndicators = state.reviewIndicators.filter(
    (i) => String(i.id) !== id
  );
  state.superAdminApprovedIndicators = state.superAdminApprovedIndicators.filter(
    (i) => String(i.id) !== id
  );

  if (
    state.selectedIndicator &&
    String(state.selectedIndicator.id) === id
  ) {
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

export const fetchIndicatorCounts = createAsyncThunk(
  "indicators/fetchCounts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/counts");
      return res.data.data as ICounts;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchSuperAdminApprovedIndicators = createAsyncThunk(
  "indicators/fetchSuperAdminApproved",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/approved-by-superadmin", {
        params: { includePending: "true" }
      });
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchPartialApprovalsHistory = createAsyncThunk(
  "indicators/fetchPartialApprovals",
  async (indicatorId: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(`/indicators/${indicatorId}/partial-approvals`);
      return { indicatorId, data: res.data.data as IPartialApproval[] };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const createIndicator = createAsyncThunk(
  "indicators/create",
  async (data: Partial<IIndicator>, { rejectWithValue, dispatch }) => {
    try {
      const res = await apiPrivate.post("/indicators", data);
      const result = res.data.data as IIndicator;
      // Refresh counts after creation
      await dispatch(fetchIndicatorCounts());
      return result;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const updateIndicator = createAsyncThunk(
  "indicators/update",
  async (
    arg: { id: string; data: Partial<IIndicator> },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}`, arg.data);
      const result = res.data.data as IIndicator;
      // Refresh counts after update
      await dispatch(fetchIndicatorCounts());
      return result;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const deleteIndicator = createAsyncThunk(
  "indicators/delete",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await apiPrivate.delete(`/indicators/${id}`);
      // Refresh counts after delete
      await dispatch(fetchIndicatorCounts());
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const assignIndicator = createAsyncThunk(
  "indicators/assign",
  async (arg: { id: string; assigneeId: string; assigneeModel?: string }, { rejectWithValue, dispatch }) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}/assign`, {
        assigneeId: arg.assigneeId,
        assigneeModel: arg.assigneeModel || "User"
      });
      const result = res.data.data as IIndicator;
      // Refresh counts and lists after assignment
      await dispatch(fetchIndicatorCounts());
      await dispatch(fetchIndicators());
      return result;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const unassignIndicator = createAsyncThunk(
  "indicators/unassign",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      const res = await apiPrivate.delete(`/indicators/${id}/unassign`);
      const result = res.data.data as IIndicator;
      // Refresh counts and lists after unassignment
      await dispatch(fetchIndicatorCounts());
      await dispatch(fetchIndicators());
      return result;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const superAdminReview = createAsyncThunk(
  "indicators/superAdminReview",
  async (
    arg: { id: string; reviewData: ISuperAdminReviewPayload },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await apiPrivate.patch(
        `/indicators/${arg.id}/review`,
        arg.reviewData
      );
      
      await dispatch(fetchPartialApprovalsHistory(arg.id));
      await dispatch(fetchIndicatorCounts());
      await dispatch(fetchIndicators());
      
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
    { rejectWithValue, dispatch }
  ) => {
    try {
      await apiPrivate.delete(`/indicators/submissions/${arg.submissionId}`);
      await dispatch(fetchIndicatorById(arg.indicatorId));
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
    clearPartialApprovals: (state) => {
      state.partialApprovals = [];
    },
    // ✅ NEW - Optimistic update for assign/unassign
    optimisticAssign: (state, action: PayloadAction<{ id: string; assigneeId: string; assigneeDisplayName: string }>) => {
      const { id, assigneeId, assigneeDisplayName } = action.payload;
      const indicator = state.indicators.find(i => i.id === id);
      if (indicator) {
        indicator.assigneeId = assigneeId;
        indicator.assignee = assigneeId;
        indicator.assigneeDisplayName = assigneeDisplayName;
        indicator.status = "Pending";
      }
      syncCategorizedLists(state);
    },
    optimisticUnassign: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      const indicator = state.indicators.find(i => i.id === id);
      if (indicator) {
        indicator.assigneeId = undefined;
        indicator.assignee = "";
        indicator.assigneeDisplayName = undefined;
        indicator.status = "Unassigned";
      }
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
    builder.addCase(fetchAssignedIndicators.fulfilled, (state, action) => {
      state.assignedIndicators = action.payload;
    });

    // ── FETCH UNASSIGNED ───────────────────────────────────────────────
    builder.addCase(fetchUnassignedIndicators.fulfilled, (state, action) => {
      state.unassignedIndicators = action.payload;
    });

    // ── FETCH REVIEW ───────────────────────────────────────────────────
    builder.addCase(fetchReviewIndicators.fulfilled, (state, action) => {
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

    // ── FETCH COUNTS ───────────────────────────────────────────────────
    builder
      .addCase(fetchIndicatorCounts.pending, () => {})
      .addCase(fetchIndicatorCounts.fulfilled, (state, action) => {
        state.counts = action.payload;
      })
      .addCase(fetchIndicatorCounts.rejected, (state, action) => {
        console.error("Failed to fetch indicator counts:", action.payload);
        state.counts = null;
      });

    // ── FETCH SUPER ADMIN APPROVED ─────────────────────────────────────
    builder
      .addCase(fetchSuperAdminApprovedIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuperAdminApprovedIndicators.fulfilled, (state, action) => {
        state.loading = false;
        state.superAdminApprovedIndicators = action.payload;
      })
      .addCase(fetchSuperAdminApprovedIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ── FETCH PARTIAL APPROVALS HISTORY ─────────────────────────────────
    builder
      .addCase(fetchPartialApprovalsHistory.fulfilled, (state, action) => {
        state.partialApprovals = action.payload.data;
      })
      .addCase(fetchPartialApprovalsHistory.rejected, (state, action) => {
        console.error("Failed to fetch partial approvals:", action.payload);
        state.partialApprovals = [];
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
        upsertIndicator(state, action.payload);
        // Counts and indicators are refreshed in the thunk
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
        const updated = action.payload;

        if (
          state.selectedIndicator &&
          String(state.selectedIndicator.id) === String(updated.id)
        ) {
          state.selectedIndicator = {
            ...state.selectedIndicator,
            ...updated,
            submissions: state.selectedIndicator.submissions,
            reviewHistory: state.selectedIndicator.reviewHistory,
          };
        }

        upsertIndicator(state, updated);
        syncCategorizedLists(state);
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
        upsertIndicator(state, action.payload);
        // Counts and indicators are refreshed in the thunk
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

        if (updated.status === "Completed" || updated.status === "Rejected by Super Admin") {
          state.queue = state.queue.filter(
            (q) => String(q.indicatorId) !== String(updated.id)
          );
        }

        if (updated.status === "Rejected by Super Admin") {
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
  refreshCategorizedLists,
  clearPartialApprovals,
  optimisticAssign,
  optimisticUnassign,
} = indicatorSlice.actions;

export default indicatorSlice.reducer;