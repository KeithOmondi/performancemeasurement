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
  status?: "Accepted" | "Rejected" | "Pending";
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
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  submittedAt: string;
  resubmissionCount: number;
  isReviewed: boolean;
  submittedById?: string;
  submittedByName?: string;
  previousRejectionReason?: string | null;
}

export type ISubmissionsByPeriod = Record<string, ISubmission[]>;

export interface IDocumentReviewUpdate {
  documentId: string;
  status: "Accepted" | "Rejected";
  reason?: string;
}

export interface ISubmissionReviewUpdate {
  submissionId: string;
  adminComment?: string;
}

export interface IApprovePayload {
  submissionUpdates?: ISubmissionReviewUpdate[];
  adminOverallComments?: string;
}

export interface IRejectPayload {
  adminOverallComments: string;
  submissionUpdates?: ISubmissionReviewUpdate[];
  documentUpdates?: IDocumentReviewUpdate[];
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

export interface IAdminIndicator {
  id: string;
  perspective: string;
  objective: { title: string };
  activity: { description: string };
  status: string;
  progress: number;
  weight: number;
  unit: string;
  target: number;
  // ❌ REMOVED: approvedIndicators: [],   // <-- this was incorrect
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

// ✅ Add approvedIndicators to the STATE interface
interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingAdminReview: IAdminIndicator[];
  resubmittedWork: IAdminIndicator[];
  approvedIndicators: IAdminIndicator[];   // <-- new
  selectedIndicator: IAdminIndicator | null;
  isLoading: boolean;
  isReviewing: boolean;
  isReopening: boolean;
  error: string | null;
}

// ✅ Update initial state
const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingAdminReview: [],
  resubmittedWork: [],
  approvedIndicators: [],   // <-- new
  selectedIndicator: null,
  isLoading: false,
  isReviewing: false,
  isReopening: false,
  error: null,
};

// ─── Helpers (internal) ───────────────────────────────────────────────────────

const flattenSubmissions = (indicator: IAdminIndicator): ISubmission[] =>
  Object.values(indicator.submissions ?? {}).flat();

// ─── Exported Helpers ─────────────────────────────────────────────────────────

export const getDocumentDescription = (doc: IDocument): string =>
  doc.description || doc.fileDescription || "";

export const hasRejectedDocuments = (submission: ISubmission): boolean =>
  submission.documents.some((doc) => doc.status === "Rejected");

export const getAcceptedDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status !== "Rejected");

export const getSubmitterName = (submission: ISubmission): string | null =>
  submission.submittedByName ?? null;

export const getPreviousRejectionReason = (
  submission: ISubmission
): string | null => submission.previousRejectionReason ?? null;

export const hasEverBeenRejected = (indicator: IAdminIndicator): boolean =>
  flattenSubmissions(indicator).some((s) => s.reviewStatus === "Rejected");

export const getRejectedSubmissions = (indicator: IAdminIndicator): ISubmission[] =>
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

// ─── Queue Refresh ────────────────────────────────────────────────────────────

const refreshQueues = (state: IAdminIndicatorState) => {
  state.pendingAdminReview = state.allAssignments.filter(
    (ind) => ind.status === "Awaiting Admin Approval"
  );

  state.resubmittedWork = state.allAssignments.filter((ind) =>
    Object.values(ind.submissions ?? {}).some((periodRows) =>
      periodRows.some(
        (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
      )
    )
  );
};

// ─── Upsert Helper ────────────────────────────────────────────────────────────

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

export const approveSubmission = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IApprovePayload },
  { rejectValue: string }
>("adminIndicators/approve", async ({ id, payload }, { rejectWithValue }) => {
  try {
    await apiPrivate.patch(`/admin/${id}/approve`, payload);
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
    await apiPrivate.patch(`/admin/${id}/reject`, payload);
    const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
    return res.data?.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Rejection failed"));
  }
});

export const reopenIndicator = createAsyncThunk<
  IAdminIndicator,
  { id: string; payload: IReopenPayload },
  { rejectValue: string }
>("adminIndicators/reopen", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IAdminIndicator }>(
      `/indicators/${id}/reopen`,
      payload
    );
    return res.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to reopen indicator"));
  }
});

// ✅ New thunk for admin-approved indicators
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
    return rejectWithValue(extractError(error, "Failed to load admin-approved indicators"));
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
      (
        state: IAdminIndicatorState,
        action: PayloadAction<string | undefined>
      ) => {
        state[key] = false;
        state.error = action.payload ?? "An unexpected error occurred";
      };

    builder
      // ── fetchAllAdminIndicators ──────────────────────────────────────────
      .addCase(fetchAllAdminIndicators.pending, setPending("isLoading"))
      .addCase(fetchAllAdminIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allAssignments = action.payload;
        refreshQueues(state);
      })
      .addCase(fetchAllAdminIndicators.rejected, setRejected("isLoading"))

      // ── fetchResubmittedIndicators ───────────────────────────────────────
      .addCase(fetchResubmittedIndicators.pending, setPending("isLoading"))
      .addCase(fetchResubmittedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        action.payload.forEach((updated) =>
          upsertIntoAssignments(state, updated)
        );
        refreshQueues(state);
      })
      .addCase(fetchResubmittedIndicators.rejected, setRejected("isLoading"))

      // ── getIndicatorByIdAdmin ────────────────────────────────────────────
      .addCase(getIndicatorByIdAdmin.pending, setPending("isLoading"))
      .addCase(getIndicatorByIdAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedIndicator = action.payload;
        upsertIntoAssignments(state, action.payload);
        refreshQueues(state);
      })
      .addCase(getIndicatorByIdAdmin.rejected, setRejected("isLoading"))

      // ── fetchAdminApprovedIndicators ─────────────────────────────────────
      .addCase(fetchAdminApprovedIndicators.pending, setPending("isLoading"))
      .addCase(fetchAdminApprovedIndicators.fulfilled, (state, action) => {
        state.isLoading = false;
        state.approvedIndicators = action.payload;
      })
      .addCase(fetchAdminApprovedIndicators.rejected, setRejected("isLoading"))

      // ── approveSubmission ────────────────────────────────────────────────
      .addCase(approveSubmission.pending, setPending("isReviewing"))
      .addCase(approveSubmission.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(approveSubmission.rejected, setRejected("isReviewing"))

      // ── rejectSubmission ─────────────────────────────────────────────────
      .addCase(rejectSubmission.pending, setPending("isReviewing"))
      .addCase(rejectSubmission.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(rejectSubmission.rejected, setRejected("isReviewing"))

      // ── reopenIndicator ──────────────────────────────────────────────────
      .addCase(reopenIndicator.pending, setPending("isReopening"))
      .addCase(reopenIndicator.fulfilled, (state, action) => {
        state.isReopening = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(reopenIndicator.rejected, setRejected("isReopening"));
  },
});

export const { setSelectedIndicator, clearAdminError, resetAdminState } =
  adminIndicatorSlice.actions;
export default adminIndicatorSlice.reducer;