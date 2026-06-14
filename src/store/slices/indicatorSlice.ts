/* ─────────────────────────────────────────────────────────────────────────────
   indicatorSlice.ts
   Redux slice for the indicator domain (super-admin surface).

   Endpoints consumed  (all under /indicators, all require superadmin role):
     GET    /                          getAllIndicators
     POST   /                          createIndicator
     GET    /assigned                  getAssignedIndicators
     GET    /unassigned                getUnassignedIndicators
     GET    /review                    getReviewIndicators
     GET    /counts                    getIndicatorCounts
     GET    /rejected-by-admin         getRejectedByAdmin
     GET    /approved-by-superadmin    getSuperAdminApprovedIndicators
     GET    /submissions/queue         getAllSubmissions  (queue)
     DELETE /submissions/:id           deleteSubmission
     GET    /:id                       getIndicatorById
     PATCH  /:id                       updateIndicator
     DELETE /:id                       deleteIndicator
     PATCH  /:id/review                superAdminReviewProcess
     PATCH  /:id/reopen                reopenIndicator
     PATCH  /:id/assign                assignIndicator
     DELETE /:id/unassign              unassignIndicator
     GET    /:id/partial-approvals     getPartialApprovalsHistory
───────────────────────────────────────────────────────────────────────────── */

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";
import axios from "axios";

import type {
  IIndicator,
  IQueueItem,
  IIndicatorCounts,
  IPartialApproval,
  ISuperAdminReviewPayload,
  IAssignPayload,
  ICreateIndicatorPayload,
  IUpdateIndicatorPayload,
} from "../../types/Indicatortypes";

/* ─── RE-EXPORT TYPES (so existing imports don't break) ─────────────────── */
export type {
  IIndicator,
  IDocument,
  ISubmission,
  IReviewHistory,
  IPartialApproval,
  IQueueItem,
  IIndicatorCounts,
  ISuperAdminReviewPayload,
  IAssignPayload,
  ICreateIndicatorPayload,
  IUpdateIndicatorPayload,
  IndicatorStatus,
  ReviewAction,
  ReviewerRole,
  AssignmentType,
  ReportingCycle,
  DocumentStatus,
  SubmissionReviewStatus,
  Quarter,
} from "../../types/Indicatortypes";

/* ─── STATE ──────────────────────────────────────────────────────────────── */

interface IndicatorState {
  /** Full unfiltered list returned by GET / */
  indicators: IIndicator[];
  /** Derived: indicators with an assignee */
  assignedIndicators: IIndicator[];
  /** Derived: indicators without an assignee */
  unassignedIndicators: IIndicator[];
  /** Derived: indicators awaiting any review step */
  reviewIndicators: IIndicator[];
  /** Currently open indicator (detail view) */
  selectedIndicator: IIndicator | null;
  /** Indicators that have ever been rejected/returned */
  rejectedByAdmin: IIndicator[];
  /** Indicators approved by super admin */
  superAdminApprovedIndicators: IIndicator[];
  /** Submissions queue */
  queue: IQueueItem[];
  /** Partial approval history for the selected indicator */
  partialApprovals: IPartialApproval[];
  /** Server-side counts */
  counts: IIndicatorCounts | null;
  /* Loading flags */
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
  superAdminApprovedIndicators: [],
  queue: [],
  partialApprovals: [],
  counts: null,
  loading: false,
  detailLoading: false,
  actionLoading: false,
  error: null,
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

const extractError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
};

/**
 * Derive the three categorised lists from the master indicators array.
 * Called any time `state.indicators` changes.
 */
const deriveCategories = (indicators: IIndicator[]) => {
  const assigned: IIndicator[] = [];
  const unassigned: IIndicator[] = [];
  const review: IIndicator[] = [];

  for (const ind of indicators) {
    const hasAssignee = !!ind.assigneeId?.trim();

    if (hasAssignee) {
      assigned.push(ind);
    } else {
      unassigned.push(ind);
    }

    if (
      ind.status === "Awaiting Admin Approval" ||
      ind.status === "Awaiting Super Admin" ||
      ind.submissions?.some((s) => s.reviewStatus === "Pending")
    ) {
      review.push(ind);
    }
  }

  return { assigned, unassigned, review };
};

const applyCategories = (state: IndicatorState) => {
  const { assigned, unassigned, review } = deriveCategories(state.indicators);
  state.assignedIndicators = assigned;
  state.unassignedIndicators = unassigned;
  state.reviewIndicators = review;
};

/**
 * Upsert a single indicator into every list it belongs to.
 * Also refreshes derived categories afterwards.
 */
const upsertOne = (state: IndicatorState, updated: IIndicator) => {
  const replaceIn = (list: IIndicator[]) => {
    const idx = list.findIndex((i) => i.id === updated.id);
    if (idx !== -1) list[idx] = updated;
    else list.push(updated);
  };

  replaceIn(state.indicators);
  replaceIn(state.rejectedByAdmin);
  replaceIn(state.superAdminApprovedIndicators);

  if (state.selectedIndicator?.id === updated.id) {
    // Preserve relations that are only loaded via fetchById
    state.selectedIndicator = {
      submissions: state.selectedIndicator.submissions,
      reviewHistory: state.selectedIndicator.reviewHistory,
      ...updated,
    };
  }

  applyCategories(state);
};

/**
 * Remove a single indicator from every list.
 */
const removeOne = (state: IndicatorState, id: string) => {
  const without = (list: IIndicator[]) => list.filter((i) => i.id !== id);

  state.indicators = without(state.indicators);
  state.rejectedByAdmin = without(state.rejectedByAdmin);
  state.superAdminApprovedIndicators = without(state.superAdminApprovedIndicators);
  state.assignedIndicators = without(state.assignedIndicators);
  state.unassignedIndicators = without(state.unassignedIndicators);
  state.reviewIndicators = without(state.reviewIndicators);
  state.queue = state.queue.filter((q) => q.indicatorId !== id);

  if (state.selectedIndicator?.id === id) {
    state.selectedIndicator = null;
  }
};

/** Whether an indicator belongs in the rejection registry */
const isRejected = (indicator: IIndicator): boolean =>
  indicator.status === "Rejected by Admin" ||
  indicator.status === "Rejected by Super Admin" ||
  indicator.status === "Correction Needed";

/* ─── THUNKS ─────────────────────────────────────────────────────────────── */

// ── Lists ──────────────────────────────────────────────────────────────────

export const fetchIndicators = createAsyncThunk(
  "indicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators");
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(extractError(err));
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
      return rejectWithValue(extractError(err));
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
      return rejectWithValue(extractError(err));
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
      return rejectWithValue(extractError(err));
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
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchSuperAdminApprovedIndicators = createAsyncThunk(
  "indicators/fetchSuperAdminApproved",
  async (includePending: boolean, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/approved-by-superadmin", {
        params: { includePending: String(includePending) },
      });
      return res.data.data as IIndicator[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchIndicatorCounts = createAsyncThunk(
  "indicators/fetchCounts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/counts");
      return res.data.data as IIndicatorCounts;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ── Single indicator ───────────────────────────────────────────────────────

export const fetchIndicatorById = createAsyncThunk(
  "indicators/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(`/indicators/${id}`);
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const createIndicator = createAsyncThunk(
  "indicators/create",
  async (payload: ICreateIndicatorPayload, { rejectWithValue, dispatch }) => {
    try {
      const res = await apiPrivate.post("/indicators", payload);
      dispatch(fetchIndicatorCounts());
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const updateIndicator = createAsyncThunk(
  "indicators/update",
  async (
    arg: { id: string; data: IUpdateIndicatorPayload },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}`, arg.data);
      dispatch(fetchIndicatorCounts());
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const deleteIndicator = createAsyncThunk(
  "indicators/delete",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await apiPrivate.delete(`/indicators/${id}`);
      dispatch(fetchIndicatorCounts());
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ── Assignment ─────────────────────────────────────────────────────────────

export const assignIndicator = createAsyncThunk(
  "indicators/assign",
  async (arg: IAssignPayload, { rejectWithValue, dispatch }) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}/assign`, {
        assigneeId: arg.assigneeId,
        assigneeModel: arg.assigneeModel ?? "User",
      });
      dispatch(fetchIndicatorCounts());
      dispatch(fetchIndicators());
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const unassignIndicator = createAsyncThunk(
  "indicators/unassign",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      const res = await apiPrivate.delete(`/indicators/${id}/unassign`);
      dispatch(fetchIndicatorCounts());
      dispatch(fetchIndicators());
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ── Review & reopen ────────────────────────────────────────────────────────

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
      dispatch(fetchPartialApprovalsHistory(arg.id));
      dispatch(fetchIndicatorCounts());
      dispatch(fetchIndicators());
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const reopenIndicator = createAsyncThunk(
  "indicators/reopen",
  async (
    arg: { id: string; newDeadline: string; reason?: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const res = await apiPrivate.patch(`/indicators/${arg.id}/reopen`, {
        newDeadline: arg.newDeadline,
        reason: arg.reason,
      });
      dispatch(fetchIndicatorCounts());
      return res.data.data as IIndicator;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ── Submissions ────────────────────────────────────────────────────────────

export const fetchSubmissionsQueue = createAsyncThunk(
  "indicators/fetchQueue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/indicators/submissions/queue");
      return res.data.data as IQueueItem[];
    } catch (err) {
      return rejectWithValue(extractError(err));
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
      // Refresh the parent indicator so the detail view is up-to-date
      dispatch(fetchIndicatorById(arg.indicatorId));
      return arg;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

// ── Partial approvals ──────────────────────────────────────────────────────

export const fetchPartialApprovalsHistory = createAsyncThunk(
  "indicators/fetchPartialApprovals",
  async (indicatorId: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(
        `/indicators/${indicatorId}/partial-approvals`
      );
      return res.data.data as IPartialApproval[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ─── SLICE ──────────────────────────────────────────────────────────────── */

const indicatorSlice = createSlice({
  name: "indicators",
  initialState,
  reducers: {
    clearIndicatorError(state) {
      state.error = null;
    },
    clearSelectedIndicator(state) {
      state.selectedIndicator = null;
    },
    clearPartialApprovals(state) {
      state.partialApprovals = [];
    },
    refreshCategorizedLists(state) {
      applyCategories(state);
    },

    /**
     * Optimistically mark an indicator as assigned in the UI before the
     * server round-trip completes. Roll back automatically if the thunk rejects.
     */
    optimisticAssign(
      state,
      action: PayloadAction<{
        id: string;
        assigneeId: string;
        assigneeDisplayName: string;
      }>
    ) {
      const { id, assigneeId, assigneeDisplayName } = action.payload;
      const indicator = state.indicators.find((i) => i.id === id);
      if (indicator) {
        indicator.assigneeId = assigneeId;
        indicator.assignee = assigneeId;
        indicator.assigneeDisplayName = assigneeDisplayName;
        indicator.status = "Pending";
      }
      applyCategories(state);
    },

    /**
     * Optimistically clear an indicator's assignee before the server
     * round-trip completes.
     */
    optimisticUnassign(state, action: PayloadAction<{ id: string }>) {
      const indicator = state.indicators.find(
        (i) => i.id === action.payload.id
      );
      if (indicator) {
        indicator.assigneeId = undefined;
        indicator.assignee = "";
        indicator.assigneeDisplayName = undefined;
        indicator.status = "Unassigned";
      }
      applyCategories(state);
    },
  },

  extraReducers: (builder) => {
    /* ── fetchIndicators ── */
    builder
      .addCase(fetchIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndicators.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.indicators = payload;
        applyCategories(state);
      })
      .addCase(fetchIndicators.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      });

    /* ── fetchAssignedIndicators ── */
    builder.addCase(fetchAssignedIndicators.fulfilled, (state, { payload }) => {
      state.assignedIndicators = payload;
    });

    /* ── fetchUnassignedIndicators ── */
    builder.addCase(
      fetchUnassignedIndicators.fulfilled,
      (state, { payload }) => {
        state.unassignedIndicators = payload;
      }
    );

    /* ── fetchReviewIndicators ── */
    builder.addCase(fetchReviewIndicators.fulfilled, (state, { payload }) => {
      state.reviewIndicators = payload;
    });

    /* ── fetchRejectedByAdmin ── */
    builder.addCase(fetchRejectedByAdmin.fulfilled, (state, { payload }) => {
      state.rejectedByAdmin = payload;
    });

    /* ── fetchSuperAdminApprovedIndicators ── */
    builder
      .addCase(fetchSuperAdminApprovedIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSuperAdminApprovedIndicators.fulfilled,
        (state, { payload }) => {
          state.loading = false;
          state.superAdminApprovedIndicators = payload;
        }
      )
      .addCase(
        fetchSuperAdminApprovedIndicators.rejected,
        (state, { payload }) => {
          state.loading = false;
          state.error = payload as string;
        }
      );

    /* ── fetchIndicatorCounts ── */
    builder
      .addCase(fetchIndicatorCounts.fulfilled, (state, { payload }) => {
        state.counts = payload;
      })
      .addCase(fetchIndicatorCounts.rejected, (_, { payload }) => {
  console.error("[indicators] Failed to fetch counts:", payload);
});

    /* ── fetchIndicatorById ── */
    builder
      .addCase(fetchIndicatorById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchIndicatorById.fulfilled, (state, { payload }) => {
        state.detailLoading = false;
        state.selectedIndicator = payload;
        upsertOne(state, payload);
      })
      .addCase(fetchIndicatorById.rejected, (state, { payload }) => {
        state.detailLoading = false;
        state.error = payload as string;
      });

    /* ── createIndicator ── */
    builder
      .addCase(createIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createIndicator.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        state.indicators.unshift(payload);
        applyCategories(state);
      })
      .addCase(createIndicator.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── updateIndicator ── */
    builder
      .addCase(updateIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateIndicator.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        // Preserve heavy relations from the already-loaded detail view
        if (state.selectedIndicator?.id === payload.id) {
          payload.submissions = state.selectedIndicator.submissions;
          payload.reviewHistory = state.selectedIndicator.reviewHistory;
        }
        upsertOne(state, payload);
      })
      .addCase(updateIndicator.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── deleteIndicator ── */
    builder
      .addCase(deleteIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteIndicator.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        removeOne(state, payload);
      })
      .addCase(deleteIndicator.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── assignIndicator ── */
    builder
      .addCase(assignIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(assignIndicator.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        upsertOne(state, payload);
      })
      .addCase(assignIndicator.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── unassignIndicator ── */
    builder
      .addCase(unassignIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(unassignIndicator.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        upsertOne(state, payload);
      })
      .addCase(unassignIndicator.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── superAdminReview ── */
    builder
      .addCase(superAdminReview.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(superAdminReview.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        upsertOne(state, payload);

        // Remove from queue once a terminal decision has been made
        if (
          payload.status === "Completed" ||
          payload.status === "Rejected by Super Admin"
        ) {
          state.queue = state.queue.filter(
            (q) => q.indicatorId !== payload.id
          );
        }

        // Keep rejectedByAdmin in sync
        if (isRejected(payload)) {
          if (!state.rejectedByAdmin.some((r) => r.id === payload.id)) {
            state.rejectedByAdmin.push(payload);
          }
        } else {
          state.rejectedByAdmin = state.rejectedByAdmin.filter(
            (r) => r.id !== payload.id
          );
        }
      })
      .addCase(superAdminReview.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── reopenIndicator ── */
    builder
      .addCase(reopenIndicator.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(reopenIndicator.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        upsertOne(state, payload);
        // Remove from rejection list since it's been reopened
        state.rejectedByAdmin = state.rejectedByAdmin.filter(
          (r) => r.id !== payload.id
        );
      })
      .addCase(reopenIndicator.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── fetchSubmissionsQueue ── */
    builder.addCase(fetchSubmissionsQueue.fulfilled, (state, { payload }) => {
      state.queue = payload;
    });

    /* ── deleteSubmission ── */
    builder
      .addCase(deleteSubmission.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteSubmission.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const { submissionId, indicatorId } = payload;

        // Remove from queue
        state.queue = state.queue.filter((q) => q.id !== submissionId);

        // Remove from selectedIndicator's submissions array
        if (state.selectedIndicator?.id === indicatorId) {
          state.selectedIndicator = {
            ...state.selectedIndicator,
            submissions: state.selectedIndicator.submissions?.filter(
              (s) => s.id !== submissionId
            ),
          };
        }

        // Remove from the master indicators list too
        const idx = state.indicators.findIndex((i) => i.id === indicatorId);
        if (idx !== -1 && state.indicators[idx].submissions) {
          state.indicators[idx] = {
            ...state.indicators[idx],
            submissions: state.indicators[idx].submissions!.filter(
              (s) => s.id !== submissionId
            ),
          };
          applyCategories(state);
        }
      })
      .addCase(deleteSubmission.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── fetchPartialApprovalsHistory ── */
    builder
      .addCase(
        fetchPartialApprovalsHistory.fulfilled,
        (state, { payload }) => {
          state.partialApprovals = payload;
        }
      )
      .addCase(
        fetchPartialApprovalsHistory.rejected,
        (_state, { payload }) => {
          console.error(
            "[indicators] Failed to fetch partial approvals:",
            payload
          );
        }
      );
  },
});

/* ─── ACTIONS ────────────────────────────────────────────────────────────── */

export const {
  clearIndicatorError,
  clearSelectedIndicator,
  clearPartialApprovals,
  refreshCategorizedLists,
  optimisticAssign,
  optimisticUnassign,
} = indicatorSlice.actions;

export default indicatorSlice.reducer;