// ─────────────────────────────────────────────────────────────────────────────
//  FILE: adminIndicatorSlice.ts
//  Queue-based admin review — one row per PENDING submission (IQueueItem).
// ─────────────────────────────────────────────────────────────────────────────
import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IDocument {
  id: string;
  submissionId: string;
  evidenceUrl: string;
  evidencePublicId?: string;
  fileType: string;
  fileName: string;
  description?: string;
  fileDescription?: string;
  status?: "Accepted" | "Approved" | "Rejected" | "Pending" | "Resubmitted" | "Additional" | "Deleted";
  rejectionReason?: string;
  uploadedAt: string;
}

export interface ISubmission {
  id: string;
  indicatorId: string;
  quarter: number;
  year: number;
  documents: IDocument[];
  notes: string;
  achievedValue: number;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected" | "Correction Needed" | "Partially Approved";
  adminComment?: string;
  submittedAt: string;
  resubmissionCount: number;
  isReviewed: boolean;
  submittedById?: string;
  submittedByName?: string;
  previousRejectionReason?: string | null;
}

export type ISubmissionsByPeriod = Record<string, ISubmission[]>;

export interface IApprovePayload {
  submissionUpdates?: { submissionId: string; adminComment?: string }[];
  adminOverallComments?: string;
}

export interface IRejectPayload {
  adminOverallComments: string;
  submissionUpdates?: { submissionId: string; adminComment?: string }[];
}

export interface IApproveDocumentPayload {
  documentId: string;
  submissionId: string;
  adminComment?: string;
}

export interface IRejectDocumentPayload {
  documentId: string;
  submissionId: string;
  reason: string;
}

export interface IDeleteDocumentPayload {
  documentId: string;
  reason: string;
}

export interface IApproveQuarterPayload {
  submissionId: string;
  adminComment?: string;
}

export interface IRejectQuarterPayload {
  submissionId: string;
  reason: string;
}

export interface IQuarterStatus {
  submissionId: string;
  quarter: number;
  year: number;
  achievedValue: number;
  reviewStatus: string;
  isComplete: boolean;
  isPartial: boolean;
  isPending: boolean;
  isRejected: boolean;
  isSentBack?: boolean;
  documents: IDocument[];
}

export interface IReviewHistoryEntry {
  id: string;
  action: string;
  reviewerRole: "admin" | "superadmin" | "user";
  reviewerName?: string;
  reason: string;
  at: string;
}

export interface IReopenPayload {
  newDeadline: string;
  reason?: string;
}

export type IndicatorStatus =
  | "Assigned"
  | "Awaiting Admin Approval"
  | "Correction Needed"
  | "Partially Approved"
  | "Rejected by Admin"
  | "Awaiting Super Admin"
  | "Rejected by Super Admin"
  | "Verified"
  | "Completed";

export interface IAdminIndicator {
  id: string;
  perspective: string;
  objective: { title: string };
  activity: { description: string };
  status: IndicatorStatus;
  progress: number;
  weight: number;
  unit: string;
  target: number;
  assigneeName: string;
  assigneeEmail: string;
  pjNumber?: string;
  reportingCycle: "Quarterly" | "Annual";
  activeQuarter: number;
  deadline: string;
  submissions: ISubmissionsByPeriod;
  reviewHistory?: IReviewHistoryEntry[];
  updatedAt: string;
  adminOverallComments?: string;
  instructions?: string;
}

/**
 * A single row in the admin review queue.
 * Every item represents ONE pending submission (one quarter), so a single
 * indicator with OJO Q3 and Q4 pending will appear as TWO queue items.
 */
export type IQueueItem = Omit<IAdminIndicator, "submissions"> & {
  submission: ISubmission;
};

// ─── State ────────────────────────────────────────────────────────────────────

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingQueue: IQueueItem[];               // ✅ NEW — flat review queue
  pendingAdminReview: IAdminIndicator[];    // legacy (kept for other screens)
  resubmittedWork: IAdminIndicator[];
  approvedIndicators: IAdminIndicator[];
  sentBackIndicators: IAdminIndicator[];
  returnedIndicators: IAdminIndicator[];
  selectedIndicator: IAdminIndicator | null;
  quarterStatuses: IQuarterStatus[];
  isLoading: boolean;
  isReviewing: boolean;
  isReopening: boolean;
  error: string | null;
}

const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingQueue: [],                         // ✅ NEW
  pendingAdminReview: [],
  resubmittedWork: [],
  approvedIndicators: [],
  sentBackIndicators: [],
  returnedIndicators: [],
  selectedIndicator: null,
  quarterStatuses: [],
  isLoading: false,
  isReviewing: false,
  isReopening: false,
  error: null,
};

// ─── Internal Helpers ─────────────────────────────────────────────────────────

const flattenSubmissions = (indicator: IAdminIndicator): ISubmission[] =>
  Object.values(indicator.submissions ?? {}).flat();

/**
 * Rebuilds the queue-derived views (pendingAdminReview / resubmittedWork)
 * from `allAssignments`. `pendingQueue` is intentionally NOT derived here —
 * it is populated directly by `fetchPendingQueue`.
 */
const refreshQueues = (state: IAdminIndicatorState) => {
  state.pendingAdminReview = state.allAssignments.filter(
    (ind) =>
      ind.status === "Awaiting Admin Approval" ||
      ind.status === "Correction Needed" ||
      ind.status === "Partially Approved"
  );

  state.resubmittedWork = state.allAssignments.filter((ind) =>
    Object.values(ind.submissions ?? {}).some((periodRows) =>
      periodRows.some(
        (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
      )
    )
  );
};

/**
 * After any review action, the queue may be stale. We patch the row in place
 * when possible (e.g. a comment was added) and otherwise drop it so the next
 * `fetchPendingQueue()` re-adds only genuinely-pending rows.
 */
const syncQueueAfterUpdate = (
  state: IAdminIndicatorState,
  updated: IAdminIndicator
) => {
  const stillPending = flattenSubmissions(updated).some(
    (s) => s.reviewStatus === "Pending"
  );

  if (!stillPending) {
    // No pending submissions left for this indicator → drop all its rows.
    state.pendingQueue = state.pendingQueue.filter(
      (q) => q.id !== updated.id
    );
    return;
  }

  // Otherwise patch every queue row belonging to this indicator.
  state.pendingQueue = state.pendingQueue.map((q) => {
    if (q.id !== updated.id) return q;
    const fresh = flattenSubmissions(updated).find(
      (s) => s.id === q.submission.id
    );
    return fresh ? { ...q, submission: fresh } : q;
  });
};

// ─── Exported Helpers ───────────────────────────────────────────────────────

export const getDocumentDescription = (doc: IDocument): string =>
  doc.description || doc.fileDescription || "";

export const hasRejectedDocuments = (submission: ISubmission): boolean =>
  submission.documents.some((doc) => doc.status === "Rejected");

export const hasResubmittedDocuments = (submission: ISubmission): boolean =>
  submission.documents.some((doc) => doc.status === "Resubmitted");

export const getRejectedDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status === "Rejected");

export const getApprovedDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status === "Approved" || doc.status === "Accepted");

export const getPendingDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status === "Pending" || !doc.status);

export const getResubmittedDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status === "Resubmitted");

export const getAcceptedDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status !== "Rejected" && doc.status !== "Deleted");

export const getSubmitterName = (submission: ISubmission): string | null =>
  submission.submittedByName ?? null;

export const getPreviousRejectionReason = (
  submission: ISubmission
): string | null => submission.previousRejectionReason ?? null;

export const hasEverBeenRejected = (indicator: IAdminIndicator): boolean =>
  flattenSubmissions(indicator).some((s) => s.reviewStatus === "Rejected");

export const getRejectedSubmissions = (
  indicator: IAdminIndicator
): ISubmission[] =>
  flattenSubmissions(indicator)
    .filter((s) => s.reviewStatus === "Rejected")
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

export const getLatestRejectedSubmission = (
  indicator: IAdminIndicator
): ISubmission | undefined => getRejectedSubmissions(indicator)[0];

export const getRejectionCount = (indicator: IAdminIndicator): number =>
  getRejectedSubmissions(indicator).length;

export const getMaxResubmissionCount = (indicator: IAdminIndicator): number =>
  flattenSubmissions(indicator).reduce(
    (max, s) => Math.max(max, s.resubmissionCount),
    0
  );

export const hasCorrectionNeededSubmissions = (
  indicator: IAdminIndicator
): boolean =>
  flattenSubmissions(indicator).some(
    (s) => s.reviewStatus === "Correction Needed"
  );

export const getCorrectionNeededSubmissions = (
  indicator: IAdminIndicator
): ISubmission[] =>
  flattenSubmissions(indicator).filter(
    (s) => s.reviewStatus === "Correction Needed"
  );

export const areAllDocumentsApproved = (submission: ISubmission): boolean => {
  const docs = submission.documents;
  if (docs.length === 0) return false;
  return docs.every((d) => d.status === "Approved" || d.status === "Accepted");
};

export const getQuarterStatusSummary = (
  submissions: ISubmission[]
): IQuarterStatus[] => {
  return submissions.map((sub) => {
    const docs = sub.documents || [];
    const hasRejected = docs.some((d) => d.status === "Rejected");
    const hasPending = docs.some((d) => d.status === "Pending" || d.status === "Resubmitted");
    const allApproved = docs.length > 0 && docs.every((d) => d.status === "Approved" || d.status === "Accepted");

    return {
      submissionId: sub.id,
      quarter: sub.quarter,
      year: sub.year,
      achievedValue: sub.achievedValue || 0,
      reviewStatus: sub.reviewStatus,
      isComplete: sub.reviewStatus === "Accepted" || sub.reviewStatus === "Verified" || allApproved,
      isPartial: sub.reviewStatus === "Partially Approved",
      isPending: sub.reviewStatus === "Pending" || hasPending,
      isRejected: sub.reviewStatus === "Rejected" || hasRejected,
      documents: docs,
    };
  });
};

// ─── Upsert Helpers ───────────────────────────────────────────────────────────

const upsertIntoAssignments = (
  state: IAdminIndicatorState,
  updated: IAdminIndicator
) => {
  const idx = state.allAssignments.findIndex((i) => i.id === updated.id);
  if (idx !== -1) {
    state.allAssignments[idx] = updated;
  } else {
    state.allAssignments.unshift(updated);
  }
};

const upsertAndRefresh = (
  state: IAdminIndicatorState,
  updated: IAdminIndicator
) => {
  upsertIntoAssignments(state, updated);
  if (state.selectedIndicator?.id === updated.id) {
    state.selectedIndicator = updated;
  }
  syncQueueAfterUpdate(state, updated);
  refreshQueues(state);
};

// ─── Error Extraction ─────────────────────────────────────────────────────────

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

const extractError = (error: unknown, fallback: string): string => {
  const err = error as KnownError;
  return err.response?.data?.message ?? err.message ?? fallback;
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * ✅ The primary source of truth for the AdminPendingReviews table.
 * Returns one IQueueItem per PENDING submission (one row per quarter).
 */
export const fetchPendingQueue = createAsyncThunk<
  IQueueItem[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchPendingQueue", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IQueueItem[] }>(
      "/admin/pending-queue"
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load review queue"));
  }
});

export const fetchAllAdminIndicators = createAsyncThunk<
  IAdminIndicator[],
  { status?: string; search?: string } | undefined,
  { rejectValue: string }
>("adminIndicators/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { status, search } = params ?? {};
    const query = new URLSearchParams();
    if (status && status !== "all") query.set("status", status);
    if (search) query.set("search", search);
    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      `/admin/all?${query.toString()}`
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load indicators"));
  }
});

export const fetchResubmittedIndicators = createAsyncThunk<
  IAdminIndicator[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchResubmitted", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      "/admin/resubmitted"
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load resubmissions"));
  }
});

export const fetchSentBackIndicators = createAsyncThunk<
  IAdminIndicator[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchSentBack", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      "/admin/sent-back"
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load sent back indicators"));
  }
});

export const fetchReturnedIndicators = createAsyncThunk<
  IAdminIndicator[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchReturned", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      "/admin/returned"
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load returned indicators"));
  }
});

export const getIndicatorByIdAdmin = createAsyncThunk<
  IAdminIndicator,
  string,
  { rejectValue: string }
>("adminIndicators/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Record not found"));
  }
});

// ─── Quarter-Level Actions ──────────────────────────────────────────────────

export const fetchQuarterStatuses = createAsyncThunk<
  IQuarterStatus[],
  string,
  { rejectValue: string }
>("adminIndicators/fetchQuarterStatuses", async (id, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IQuarterStatus[] }>(
      `/admin/${id}/quarters`
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load quarter statuses"));
  }
});

export const approveQuarter = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IApproveQuarterPayload },
  { rejectValue: string }
>("adminIndicators/approveQuarter", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/quarters/approve`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Quarter approval failed"));
  }
});

export const rejectQuarter = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IRejectQuarterPayload },
  { rejectValue: string }
>("adminIndicators/rejectQuarter", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/quarters/reject`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Quarter rejection failed"));
  }
});

// ─── Submission-Level Actions ───────────────────────────────────────────────

export const approveSubmission = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IApprovePayload },
  { rejectValue: string }
>("adminIndicators/approve", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/submissions/approve`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Approval failed"));
  }
});

export const rejectSubmission = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IRejectPayload },
  { rejectValue: string }
>("adminIndicators/reject", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/submissions/reject`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Rejection failed"));
  }
});

// ─── Document-Level Actions ─────────────────────────────────────────────────

export const approveDocument = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IApproveDocumentPayload },
  { rejectValue: string }
>("adminIndicators/approveDocument", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/documents/approve`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Document approval failed"));
  }
});

export const rejectDocument = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IRejectDocumentPayload },
  { rejectValue: string }
>("adminIndicators/rejectDocument", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/documents/reject`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Document rejection failed"));
  }
});

export const deleteDocumentAdmin = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IDeleteDocumentPayload },
  { rejectValue: string }
>("adminIndicators/deleteDocumentAdmin", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/documents/delete`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Document deletion failed"));
  }
});

// ─── Other Actions ────────────────────────────────────────────────────────────

export const reopenIndicator = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IReopenPayload },
  { rejectValue: string }
>("adminIndicators/reopen", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IAdminIndicator }>(
      `/admin/${id}/reopen`,
      payload
    );
    return res.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to reopen indicator"));
  }
});

export const fetchAdminApprovedIndicators = createAsyncThunk<
  IAdminIndicator[],
  void,
  { rejectValue: string }
>("adminIndicators/fetchApproved", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<{ data: IAdminIndicator[] }>(
      "/admin/approved-by-admin"
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(
      extractError(error, "Failed to load admin-approved indicators")
    );
  }
});

export const deleteSubmission = createAsyncThunk<
  IAdminIndicator,
  { indicatorId: string; submissionId: string },
  { rejectValue: string }
>("adminIndicators/deleteSubmission", async ({ indicatorId, submissionId }, { rejectWithValue }) => {
  try {
    await apiPrivate.delete(`/admin/${indicatorId}/submissions/${submissionId}`);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${indicatorId}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Deletion failed"));
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminIndicatorSlice = createSlice({
  name: "adminIndicators",
  initialState,
  reducers: {
    setSelectedIndicator: (
      state,
      action: PayloadAction<IAdminIndicator | null>
    ) => {
      state.selectedIndicator = action.payload;
    },
    clearAdminError: (state) => {
      state.error = null;
    },
    resetAdminState: () => initialState,
    clearQuarterStatuses: (state) => {
      state.quarterStatuses = [];
    },
  },
  extraReducers: (builder) => {
    const setPending =
      (key: "isLoading" | "isReviewing" | "isReopening") =>
      (state: IAdminIndicatorState) => {
        state[key] = true;
        state.error = null;
      };

    const setRejected =
      (key: "isLoading" | "isReviewing" | "isReopening") =>
      (state: IAdminIndicatorState, action: PayloadAction<string | undefined>) => {
        state[key] = false;
        state.error = action.payload ?? "An unexpected error occurred";
      };

    builder
      // ✅ fetchPendingQueue
      .addCase(fetchPendingQueue.pending, setPending("isLoading"))
      .addCase(fetchPendingQueue.fulfilled, (state, action) => {
        state.isLoading = false;
        state.pendingQueue = action.payload;
      })
      .addCase(fetchPendingQueue.rejected, setRejected("isLoading"))

      // fetchAllAdminIndicators
      .addCase(fetchAllAdminIndicators.pending, setPending("isLoading"))
      .addCase(fetchAllAdminIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
        refreshQueues(state);
      })
      .addCase(fetchAllAdminIndicators.rejected, setRejected("isLoading"))

      // fetchResubmittedIndicators
      .addCase(fetchResubmittedIndicators.pending, setPending("isLoading"))
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        action.payload.forEach((updated) => upsertIntoAssignments(state, updated));
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.rejected, setRejected("isLoading"))

      // fetchSentBackIndicators
      .addCase(fetchSentBackIndicators.pending, setPending("isLoading"))
      .addCase(fetchSentBackIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sentBackIndicators = action.payload;
        action.payload.forEach((updated) => {
          const exists = state.allAssignments.some((i) => i.id === updated.id);
          if (!exists) state.allAssignments.push(updated);
        });
        refreshQueues(state);
      })
      .addCase(fetchSentBackIndicators.rejected, setRejected("isLoading"))

      // fetchReturnedIndicators
      .addCase(fetchReturnedIndicators.pending, setPending("isLoading"))
      .addCase(fetchReturnedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.returnedIndicators = action.payload;
        action.payload.forEach((updated) => {
          const exists = state.allAssignments.some((i) => i.id === updated.id);
          if (!exists) state.allAssignments.push(updated);
        });
        refreshQueues(state);
      })
      .addCase(fetchReturnedIndicators.rejected, setRejected("isLoading"))

      // getIndicatorByIdAdmin
      .addCase(getIndicatorByIdAdmin.pending, setPending("isLoading"))
      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedIndicator = action.payload;
        upsertIntoAssignments(state, action.payload);
        refreshQueues(state);
      })
      .addCase(getIndicatorByIdAdmin.rejected, setRejected("isLoading"))

      // fetchQuarterStatuses
      .addCase(fetchQuarterStatuses.pending, setPending("isLoading"))
      .addCase(fetchQuarterStatuses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quarterStatuses = action.payload;
      })
      .addCase(fetchQuarterStatuses.rejected, setRejected("isLoading"))

      // fetchAdminApprovedIndicators
      .addCase(fetchAdminApprovedIndicators.pending, setPending("isLoading"))
      .addCase(fetchAdminApprovedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.approvedIndicators = action.payload;
      })
      .addCase(fetchAdminApprovedIndicators.rejected, setRejected("isLoading"))

      // approveSubmission
      .addCase(approveSubmission.pending, setPending("isReviewing"))
      .addCase(approveSubmission.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(approveSubmission.rejected, setRejected("isReviewing"))

      // rejectSubmission
      .addCase(rejectSubmission.pending, setPending("isReviewing"))
      .addCase(rejectSubmission.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(rejectSubmission.rejected, setRejected("isReviewing"))

      // approveQuarter
      .addCase(approveQuarter.pending, setPending("isReviewing"))
      .addCase(approveQuarter.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(approveQuarter.rejected, setRejected("isReviewing"))

      // rejectQuarter
      .addCase(rejectQuarter.pending, setPending("isReviewing"))
      .addCase(rejectQuarter.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(rejectQuarter.rejected, setRejected("isReviewing"))

      // approveDocument
      .addCase(approveDocument.pending, setPending("isReviewing"))
      .addCase(approveDocument.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(approveDocument.rejected, setRejected("isReviewing"))

      // rejectDocument
      .addCase(rejectDocument.pending, setPending("isReviewing"))
      .addCase(rejectDocument.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(rejectDocument.rejected, setRejected("isReviewing"))

      // deleteDocumentAdmin
      .addCase(deleteDocumentAdmin.pending, setPending("isReviewing"))
      .addCase(deleteDocumentAdmin.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(deleteDocumentAdmin.rejected, setRejected("isReviewing"))

      // deleteSubmission
      .addCase(deleteSubmission.pending, setPending("isReviewing"))
      .addCase(deleteSubmission.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(deleteSubmission.rejected, setRejected("isReviewing"))

      // reopenIndicator
      .addCase(reopenIndicator.pending, setPending("isReopening"))
      .addCase(reopenIndicator.fulfilled, (state, action) => {
        state.isReopening = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(reopenIndicator.rejected, setRejected("isReopening"));
  },
});

export const {
  setSelectedIndicator,
  clearAdminError,
  resetAdminState,
  clearQuarterStatuses,
} = adminIndicatorSlice.actions;

export default adminIndicatorSlice.reducer;