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
  // Submitter identity — populated by the backend via LEFT JOIN users su
  submittedById?: string;
  submittedByName?: string;
}

/**
 * Submissions grouped by period key (e.g. "Q1_2025" or "Annual_2025").
 * Each key maps to an array sorted newest-first, so index 0 is always
 * the latest (re)submission for that period.
 */
export type ISubmissionsByPeriod = Record<string, ISubmission[]>;

export interface IDocumentReviewUpdate {
  documentId: string;
  status: "Accepted" | "Rejected";
  reason?: string;
}

export interface ISubmissionReviewUpdate {
  submissionId: string;
  reviewStatus?: "Verified" | "Rejected" | "Pending";
  adminComment?: string;
}

export interface IAdminReviewPayload {
  decision: "Verified" | "Rejected";
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

interface IAdminIndicatorState {
  allAssignments: IAdminIndicator[];
  pendingAdminReview: IAdminIndicator[];
  resubmittedWork: IAdminIndicator[];
  selectedIndicator: IAdminIndicator | null;
  isLoading: boolean;
  isReviewing: boolean;
  isReopening: boolean;
  error: string | null;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: IAdminIndicatorState = {
  allAssignments: [],
  pendingAdminReview: [],
  resubmittedWork: [],
  selectedIndicator: null,
  isLoading: false,
  isReviewing: false,
  isReopening: false,
  error: null,
};

// ─── Helpers (internal) ───────────────────────────────────────────────────────

/** Flatten all period arrays into a single submission array. */
const flattenSubmissions = (indicator: IAdminIndicator): ISubmission[] =>
  Object.values(indicator.submissions ?? {}).flat();

// ─── Exported Helpers ─────────────────────────────────────────────────────────

/** Safe document description, falling back to fileDescription alias. */
export const getDocumentDescription = (doc: IDocument): string =>
  doc.description || doc.fileDescription || "";

/** True if the submission has at least one rejected document. */
export const hasRejectedDocuments = (submission: ISubmission): boolean =>
  submission.documents.some((doc) => doc.status === "Rejected");

/** Documents that have not been rejected. */
export const getAcceptedDocuments = (submission: ISubmission): IDocument[] =>
  submission.documents.filter((doc) => doc.status !== "Rejected");

/**
 * Resolve the display name of whoever submitted this row.
 * Returns null when the backend hasn't populated the field yet
 * (e.g. rows inserted before the submitted_by migration).
 */
export const getSubmitterName = (submission: ISubmission): string | null =>
  submission.submittedByName ?? null;

/**
 * True if ANY submission row for this indicator carries reviewStatus "Rejected".
 * Works correctly after the backend change to INSERT instead of UPDATE on
 * resubmission, because old rejected rows are preserved.
 */
export const hasEverBeenRejected = (indicator: IAdminIndicator): boolean =>
  flattenSubmissions(indicator).some((s) => s.reviewStatus === "Rejected");

/**
 * All rejected submission rows across all periods, newest-first.
 */
export const getRejectedSubmissions = (indicator: IAdminIndicator): ISubmission[] =>
  flattenSubmissions(indicator)
    .filter((s) => s.reviewStatus === "Rejected")
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

/** The single most-recent rejected submission, or undefined. */
export const getLatestRejectedSubmission = (
  indicator: IAdminIndicator
): ISubmission | undefined => getRejectedSubmissions(indicator)[0];

/**
 * Total number of rejection rows across all periods.
 * Equals the number of times this indicator has been sent back.
 */
export const getRejectionCount = (indicator: IAdminIndicator): number =>
  getRejectedSubmissions(indicator).length;

/**
 * Highest resubmission_count value seen across all rows.
 * Equals the number of times the assignee has resubmitted.
 */
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

  // An indicator is "resubmitted work" when any period has a Pending row
  // with resubmissionCount > 0, meaning it was rejected at least once before.
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

export const processAdminReview = createAsyncThunk<
  IAdminIndicator,
  { id: string; reviewData: IAdminReviewPayload },
  { rejectValue: string }
>(
  "adminIndicators/processReview",
  async ({ id, reviewData }, { rejectWithValue }) => {
    try {
      await apiPrivate.patch(`/admin/${id}/review`, reviewData);
      // Re-fetch to get updated submission rows, document statuses, and review history
      const res = await apiPrivate.get<{ data: IAdminIndicator }>(`/admin/${id}`);
      return res.data?.data;
    } catch (error) {
      return rejectWithValue(extractError(error, "Review submission failed"));
    }
  }
);

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

      // ── processAdminReview ───────────────────────────────────────────────
      .addCase(processAdminReview.pending, setPending("isReviewing"))
      .addCase(processAdminReview.fulfilled, (state, action) => {
        state.isReviewing = false;
        upsertAndRefresh(state, action.payload);
      })
      .addCase(processAdminReview.rejected, setRejected("isReviewing"))

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