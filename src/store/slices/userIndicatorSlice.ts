import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
  type AnyAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ──────────────────────────────────────────────────────────────────*/

export interface IDocumentUI {
  id: string;
  submissionId: string;
  evidenceUrl: string;
  evidencePublicId?: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
  description?: string;
  status: "Pending" | "Rejected" | "Accepted";
  rejectionReason?: string;
  uploadedAt?: string;
}

export interface ISubmissionUI {
  id: string;
  indicatorId?: string;
  quarter: number; // Changed from string to number to match backend (0=Annual, 1-4=Q1-Q4)
  year: number;
  notes: string;
  achievedValue: number;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  submittedAt: string;
  resubmissionCount: number;
  isReviewed: boolean;
  documents: IDocumentUI[];
}

/**
 * Submissions are grouped by quarter key, e.g.:
 *   { "Q1_2025": [ISubmissionUI, ...], "Annual_2025": [...] }
 */
export type ISubmissionsByQuarter = Record<string, ISubmissionUI[]>;

export interface IReviewLog {
  action: string;
  reviewerName: string;
  at: string;
  reason: string;
}

export interface IIndicatorUI {
  id: string;
  strategic_plan_id: string;
  objective_id: string;
  activity_id: string;
  perspective: string;
  reporting_cycle: "Quarterly" | "Annual";
  assignee_id: string;
  assignee_model: "User" | "Team";
  assigneeName: string;
  assignedByName: string;
  status: string;
  target: number;
  unit: string;
  weight: number;
  deadline: string;
  instructions?: string;
  active_quarter: number; // 1-4 for quarterly, ignored for annual
  objective: { title: string };
  activity: { description: string };
  submissions: ISubmissionsByQuarter;
  updated_at: string;
  review_history?: IReviewLog[];
  progress?: number;
  admin_overall_comments?: string;
}

export interface IRejectedIndicatorUI extends IIndicatorUI {
  rejectedQuarters: string[]; // e.g. ["Q1_2025", "Annual_2025"]
}

interface UserIndicatorState {
  myIndicators: IIndicatorUI[];
  rejectedIndicators: IRejectedIndicatorUI[];
  currentIndicator: IIndicatorUI | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  lastSubmissionId: string | null; // Track last successful submission
}

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────────*/

/**
 * Normalises any quarter value to the consistent string used as a folder-key
 * prefix. Mirrors normaliseQuarter() in the backend controller.
 *
 *   0 | "0" | "annual" | "Annual" → "Annual"
 *   1 | "1" | "Q1" | "q1" → "Q1"
 *   2 | "2" | "Q2" → "Q2"
 *   3 | "3" | "Q3" → "Q3"
 *   4 | "4" | "Q4" → "Q4"
 */
export function normaliseQuarter(raw: string | number): string {
  if (raw === 0 || raw === "0" || String(raw).toLowerCase() === "annual") {
    return "Annual";
  }
  const s = String(raw).replace(/^Q/i, "");
  const num = parseInt(s, 10);
  if (isNaN(num) || num < 1 || num > 4) return String(raw).toUpperCase();
  return `Q${num}`;
}

/**
 * Converts a display quarter string back to the integer format expected by the backend.
 * Useful for API calls that need the integer value.
 *
 *   "Annual" → 0
 *   "Q1" → 1
 *   "Q2" → 2
 *   "Q3" → 3
 *   "Q4" → 4
 */
export function quarterToInt(quarterStr: string): number {
  if (quarterStr.toLowerCase() === "annual") return 0;
  const match = quarterStr.match(/Q(\d)/i);
  if (!match) return 1;
  return parseInt(match[1], 10);
}

/**
 * Gets the current active quarter display string for an indicator
 */
export function getActiveQuarterDisplay(indicator: IIndicatorUI): string {
  if (indicator.reporting_cycle === "Annual") return "Annual";
  return normaliseQuarter(indicator.active_quarter);
}

/**
 * Flatten all quarterly submissions into a single array.
 * Useful for filtering / searching across quarters.
 */
export const flattenSubmissions = (indicator: IIndicatorUI): ISubmissionUI[] =>
  Object.values(indicator.submissions ?? {}).flat();

/**
 * Get the latest submission for a specific quarter
 */
export const getLatestSubmissionForQuarter = (
  indicator: IIndicatorUI,
  quarterDisplay: string,
  year?: number,
): ISubmissionUI | null => {
  const submissions =
    indicator.submissions?.[
      `${quarterDisplay}_${year || new Date().getFullYear()}`
    ];
  if (!submissions || submissions.length === 0) return null;
  // Submissions are ordered with latest first (by submitted_at DESC)
  return submissions[0];
};

/**
 * Check if a submission exists for the current quarter
 */
export const hasSubmissionForCurrentQuarter = (
  indicator: IIndicatorUI,
): boolean => {
  const activeDisplay = getActiveQuarterDisplay(indicator);
  const currentYear = new Date().getFullYear();
  const submissions =
    indicator.submissions?.[`${activeDisplay}_${currentYear}`];
  return submissions && submissions.length > 0;
};

/**
 * Get the review status for the current quarter's submission
 */
export const getCurrentQuarterReviewStatus = (
  indicator: IIndicatorUI,
): string | null => {
  const latest = getLatestSubmissionForQuarter(
    indicator,
    getActiveQuarterDisplay(indicator),
  );
  return latest?.reviewStatus || null;
};

/**
 * Check if the user can submit/resubmit for the current quarter
 */
export const canSubmitForCurrentQuarter = (
  indicator: IIndicatorUI,
): boolean => {
  const status = getCurrentQuarterReviewStatus(indicator);
  const lockedStatuses = [
    "Awaiting Admin Approval",
    "Awaiting Super Admin",
    "Completed",
  ];

  if (lockedStatuses.includes(indicator.status)) return false;
  if (!status) return true; // No submission exists
  return status === "Rejected"; // Can only resubmit if rejected
};

/* ─── INITIAL STATE ──────────────────────────────────────────────────────────*/

const initialState: UserIndicatorState = {
  myIndicators: [],
  rejectedIndicators: [],
  currentIndicator: null,
  loading: false,
  uploading: false,
  error: null,
  lastSubmissionId: null,
};

/* ─── UPSERT HELPER ──────────────────────────────────────────────────────────*/

const upsertIndicator = (
  state: UserIndicatorState,
  indicator: IIndicatorUI,
) => {
  if (!indicator?.id) return;

  // Sync into myIndicators
  const index = state.myIndicators.findIndex((i) => i.id === indicator.id);
  if (index !== -1) {
    state.myIndicators[index] = indicator;
  } else {
    state.myIndicators.unshift(indicator);
  }

  // Sync into rejectedIndicators (preserve rejectedQuarters if already present)
  const rejIndex = state.rejectedIndicators.findIndex(
    (i) => i.id === indicator.id,
  );
  if (rejIndex !== -1) {
    state.rejectedIndicators[rejIndex] = {
      ...indicator,
      rejectedQuarters:
        (indicator as IRejectedIndicatorUI).rejectedQuarters ??
        state.rejectedIndicators[rejIndex].rejectedQuarters ??
        [],
    };
  }

  // Sync currentIndicator
  if (state.currentIndicator?.id === indicator.id) {
    state.currentIndicator = indicator;
  }
};

/* ─── THUNK ARG TYPES ────────────────────────────────────────────────────────*/

interface SubmissionPayload {
  id: string;
  formData: FormData;
  idempotencyKey?: string;
}

interface AddDocumentsPayload {
  id: string;
  quarter: string | number;
  formData: FormData;
  idempotencyKey?: string;
}

interface AddDocumentsResult {
  documents: IDocumentUI[];
  message: string;
  submissionId?: string;
}

interface SubmissionResult {
  message: string;
  submissionId: string;
  idempotent?: boolean;
}

/* ─── THUNKS ─────────────────────────────────────────────────────────────────*/

const extractError = (error: unknown, fallback: string): string => {
  const err = error as KnownError;
  return err.response?.data?.message ?? err.message ?? fallback;
};

// Add idempotency key to FormData if not present
const addIdempotencyKey = (formData: FormData): string => {
  if (!formData.has("idempotencyKey")) {
    const key = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    formData.append("idempotencyKey", key);
    return key;
  }
  return formData.get("idempotencyKey") as string;
};

export const fetchMyAssignments = createAsyncThunk<
  IIndicatorUI[],
  void,
  { rejectValue: string }
>("userIndicators/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IIndicatorUI[] }>(
      "/user-indicators/my-assignments",
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load assignments"));
  }
});

export const fetchRejectedSubmissions = createAsyncThunk<
  IRejectedIndicatorUI[],
  void,
  { rejectValue: string }
>("userIndicators/fetchRejects", async (_, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IRejectedIndicatorUI[] }>(
      "/user-indicators/rejects",
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(
      extractError(error, "Failed to load rejected filings"),
    );
  }
});

export const fetchIndicatorDetails = createAsyncThunk<
  IIndicatorUI,
  string,
  { rejectValue: string }
>("userIndicators/fetchDetails", async (id, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IIndicatorUI }>(
      `/user-indicators/${id}`,
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load details"));
  }
});

export const submitIndicatorProgress = createAsyncThunk<
  SubmissionResult,
  SubmissionPayload,
  { rejectValue: string }
>("userIndicators/submit", async (arg, { dispatch, rejectWithValue }) => {
  try {
    addIdempotencyKey(arg.formData);
    const response = await apiPrivate.post<{
      success: boolean;
      message: string;
      submissionId: string;
      idempotent?: boolean;
    }>(`/user-indicators/${arg.id}/submit`, arg.formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Refresh the indicator data
    await dispatch(fetchIndicatorDetails(arg.id));

    return {
      message: response.data.message,
      submissionId: response.data.submissionId,
      idempotent: response.data.idempotent,
    };
  } catch (error) {
    return rejectWithValue(extractError(error, "Submission failed"));
  }
});

export const resubmitIndicatorProgress = createAsyncThunk<
  SubmissionResult,
  SubmissionPayload,
  { rejectValue: string }
>("userIndicators/resubmit", async (arg, { dispatch, rejectWithValue }) => {
  try {
    addIdempotencyKey(arg.formData);
    const response = await apiPrivate.post<{
      success: boolean;
      message: string;
      submissionId: string;
      idempotent?: boolean;
    }>(`/user-indicators/${arg.id}/resubmit`, arg.formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    await dispatch(fetchIndicatorDetails(arg.id));

    return {
      message: response.data.message,
      submissionId: response.data.submissionId,
      idempotent: response.data.idempotent,
    };
  } catch (error) {
    return rejectWithValue(extractError(error, "Resubmission failed"));
  }
});

export const addIndicatorDocuments = createAsyncThunk<
  AddDocumentsResult,
  AddDocumentsPayload,
  { rejectValue: string }
>("userIndicators/addDocuments", async (arg, { dispatch, rejectWithValue }) => {
  try {
    addIdempotencyKey(arg.formData);

    // Normalise the quarter before sending
    const normalisedQ = normaliseQuarter(arg.quarter);
    if (!arg.formData.has("quarter")) {
      arg.formData.append("quarter", normalisedQ);
    }

    const response = await apiPrivate.post<{
      success: boolean;
      message: string;
      documents: IDocumentUI[];
      submissionId?: string;
    }>(`/user-indicators/${arg.id}/add-documents`, arg.formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    await dispatch(fetchIndicatorDetails(arg.id));

    return {
      documents: response.data.documents,
      message: response.data.message,
      submissionId: response.data.submissionId,
    };
  } catch (error) {
    return rejectWithValue(extractError(error, "Upload failed"));
  }
});

export const deleteRejectedDocument = createAsyncThunk<
  void,
  { docId: string; indicatorId: string },
  { rejectValue: string }
>(
  "userIndicators/deleteDocument",
  async ({ docId, indicatorId }, { dispatch, rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/user-indicators/documents/${docId}`);
      await dispatch(fetchIndicatorDetails(indicatorId));
    } catch (error) {
      return rejectWithValue(extractError(error, "Delete failed"));
    }
  },
);

export const updateRejectedSubmission = createAsyncThunk<
  SubmissionResult,
  SubmissionPayload,
  { rejectValue: string }
>(
  "userIndicators/updateSubmission",
  async (arg, { dispatch, rejectWithValue }) => {
    try {
      addIdempotencyKey(arg.formData);
      const response = await apiPrivate.patch<{
        success: boolean;
        message: string;
        submissionId: string;
        idempotent?: boolean;
      }>(`/user-indicators/${arg.id}/update-submission`, arg.formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await dispatch(fetchIndicatorDetails(arg.id));

      return {
        message: response.data.message,
        submissionId: response.data.submissionId,
        idempotent: response.data.idempotent,
      };
    } catch (error) {
      return rejectWithValue(extractError(error, "Update failed"));
    }
  },
);

/* ─── SLICE ──────────────────────────────────────────────────────────────────*/

const WRITE_ACTIONS = {
  pending: [
    submitIndicatorProgress.pending.type,
    resubmitIndicatorProgress.pending.type,
    addIndicatorDocuments.pending.type,
    deleteRejectedDocument.pending.type,
    updateRejectedSubmission.pending.type,
  ],
  fulfilled: [
    submitIndicatorProgress.fulfilled.type,
    resubmitIndicatorProgress.fulfilled.type,
    addIndicatorDocuments.fulfilled.type,
    deleteRejectedDocument.fulfilled.type,
    updateRejectedSubmission.fulfilled.type,
  ],
  rejected: [
    submitIndicatorProgress.rejected.type,
    resubmitIndicatorProgress.rejected.type,
    addIndicatorDocuments.rejected.type,
    deleteRejectedDocument.rejected.type,
    updateRejectedSubmission.rejected.type,
  ],
};

const userIndicatorSlice = createSlice({
  name: "userIndicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
    resetUserIndicatorState: () => initialState,
    clearLastSubmissionId: (state) => {
      state.lastSubmissionId = null;
    },

    /**
     * Selects an indicator from either list by ID.
     * Falls back to null if not found in either list.
     */
    setLocalSelectedIndicator: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      const source = [
        ...state.myIndicators,
        ...state.rejectedIndicators,
      ] as IIndicatorUI[];
      state.currentIndicator = action.payload
        ? (source.find((i) => i.id === action.payload) ?? null)
        : null;
    },

    /**
     * Optimistically update a document's status in the local state
     */
    optimisticUpdateDocumentStatus: (
      state,
      action: PayloadAction<{
        docId: string;
        status: IDocumentUI["status"];
        rejectionReason?: string;
      }>,
    ) => {
      const { docId, status, rejectionReason } = action.payload;

      const updateDocInIndicator = (indicator: IIndicatorUI) => {
        Object.values(indicator.submissions).forEach((submissions) => {
          submissions.forEach((submission) => {
            const doc = submission.documents.find((d) => d.id === docId);
            if (doc) {
              doc.status = status;
              if (rejectionReason) doc.rejectionReason = rejectionReason;
            }
          });
        });
      };

      if (state.currentIndicator) {
        updateDocInIndicator(state.currentIndicator);
      }

      state.myIndicators.forEach(updateDocInIndicator);
      state.rejectedIndicators.forEach(updateDocInIndicator);
    },
  },
  extraReducers: (builder) => {
    builder
      /* ── fetchMyAssignments ─────────────────────────────────────────── */
      .addCase(fetchMyAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.myIndicators = action.payload;
      })
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Error loading assignments";
      })

      /* ── fetchRejectedSubmissions ───────────────────────────────────── */
      .addCase(fetchRejectedSubmissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRejectedSubmissions.fulfilled, (state, action) => {
        state.loading = false;
        state.rejectedIndicators = action.payload;
      })
      .addCase(fetchRejectedSubmissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Error loading rejections";
      })

      /* ── fetchIndicatorDetails ──────────────────────────────────────── */
      .addCase(fetchIndicatorDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndicatorDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentIndicator = action.payload;
        upsertIndicator(state, action.payload);
      })
      .addCase(fetchIndicatorDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Error loading indicator details";
      })

      /* ── Submit Progress ───────────────────────────────────────────── */
      .addCase(submitIndicatorProgress.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload.submissionId;
        if (action.payload.idempotent) {
          console.log("Duplicate submission ignored:", action.payload.message);
        }
      })

      /* ── Resubmit Progress ─────────────────────────────────────────── */
      .addCase(resubmitIndicatorProgress.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload.submissionId;
      })

      /* ── Update Submission ─────────────────────────────────────────── */
      .addCase(updateRejectedSubmission.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload.submissionId;
      })

      /* ── Write operations (submit / resubmit / add docs / delete / update) */
      .addMatcher(
        (action): action is AnyAction =>
          WRITE_ACTIONS.pending.includes(action.type),
        (state) => {
          state.uploading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action): action is AnyAction =>
          WRITE_ACTIONS.fulfilled.includes(action.type),
        (state) => {
          state.uploading = false;
        },
      )
      .addMatcher(
        (action): action is AnyAction =>
          WRITE_ACTIONS.rejected.includes(action.type),
        (state, action) => {
          state.uploading = false;
          state.error = (action.payload as string) ?? "Operation failed";
        },
      );
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setLocalSelectedIndicator,
  clearLastSubmissionId,
  optimisticUpdateDocumentStatus,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;
