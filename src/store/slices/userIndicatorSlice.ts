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
  submissionId: string;          // camelCase — matches backend
  evidenceUrl: string;           // camelCase — matches backend
  evidencePublicId?: string;     // camelCase — matches backend
  fileType: "image" | "video" | "raw";
  fileName?: string;             // camelCase — matches backend
  description?: string;
  status: "Pending" | "Rejected" | "Accepted";
  rejectionReason?: string;      // camelCase — matches backend
  uploadedAt?: string;           // camelCase — matches backend
}

export interface ISubmissionUI {
  id: string;
  indicatorId?: string;
  /**
   * Normalised quarter string — matches the backend normaliseQuarter() output.
   *   Quarterly indicators: "Q1" | "Q2" | "Q3" | "Q4"
   *   Annual indicators:    "Annual"
   */
  quarter: string;
  year: number;
  notes: string;
  achievedValue: number;         // camelCase — matches backend
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;         // camelCase — matches backend
  submittedAt: string;           // camelCase — matches backend
  resubmissionCount: number;     // camelCase — matches backend
  isReviewed: boolean;           // camelCase — matches backend
  documents: IDocumentUI[];
}

/**
 * Submissions are grouped by quarter key, e.g.:
 *   { "Q1_2025": [ISubmissionUI, ...], "Annual_2025": [...] }
 *
 * Index 0 of each array is always the latest (re)submission for that quarter.
 * This matches both the admin and user backend shapes after the rewrite.
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
  /**
   * Raw DB integer (1-4) used for cycle-tracking logic.
   * For display, always pass through normaliseQuarter() before rendering.
   */
  active_quarter: number;
  objective: { title: string };
  activity: { description: string };
  /**
   * Quarterly-grouped submissions — matches the updated backend shape.
   * Previously ISubmissionUI[]; now Record<string, ISubmissionUI[]>.
   */
  submissions: ISubmissionsByQuarter;
  updated_at: string;
  review_history?: IReviewLog[];
  progress?: number;
  admin_overall_comments?: string;
}

/**
 * Extends IIndicatorUI with the rejectedQuarters array returned by
 * getRejectedSubmissions. Allows the frontend to badge only the affected
 * quarter folders rather than the entire indicator card.
 */
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
}

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────────*/

/**
 * Normalises any quarter value to the consistent string used as a folder-key
 * prefix.  Mirrors normaliseQuarter() in the backend controller.
 *
 *   1 | "1" | "Q1"  →  "Q1"
 *   "annual" (any)  →  "Annual"
 */
export function normaliseQuarter(raw: string | number): string {
  const s = String(raw).trim();
  if (s.toLowerCase() === "annual") return "Annual";
  const n = s.replace(/^Q/i, "");
  return isNaN(Number(n)) ? s.toUpperCase() : `Q${n}`;
}

/**
 * Flatten all quarterly submissions into a single array.
 * Useful for filtering / searching across quarters without caring about
 * which folder a submission lives in.
 */
export const flattenSubmissions = (indicator: IIndicatorUI): ISubmissionUI[] =>
  Object.values(indicator.submissions ?? {}).flat();

/* ─── INITIAL STATE ──────────────────────────────────────────────────────────*/

const initialState: UserIndicatorState = {
  myIndicators: [],
  rejectedIndicators: [],
  currentIndicator: null,
  loading: false,
  uploading: false,
  error: null,
};

/* ─── UPSERT HELPER ──────────────────────────────────────────────────────────*/

const upsertIndicator = (state: UserIndicatorState, indicator: IIndicatorUI) => {
  if (!indicator?.id) return;

  // Sync into myIndicators
  const index = state.myIndicators.findIndex((i) => i.id === indicator.id);
  if (index !== -1) {
    state.myIndicators[index] = indicator;
  } else {
    state.myIndicators.unshift(indicator);
  }

  // Sync into rejectedIndicators (preserve rejectedQuarters if already present)
  const rejIndex = state.rejectedIndicators.findIndex((i) => i.id === indicator.id);
  if (rejIndex !== -1) {
    state.rejectedIndicators[rejIndex] = {
      ...indicator,
      // Keep existing rejectedQuarters unless the incoming data already has them
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

type SubmitArg         = { id: string; formData: FormData };
type UpdateSubmissionArg = { id: string; formData: FormData };

/**
 * quarter accepts string | number so callers can pass either the raw
 * active_quarter integer (1-4) or a normalised string ("Q1", "Annual").
 * The thunk appends it as a string so the backend receives a consistent value.
 */
type AddDocumentsArg = {
  id: string;
  quarter: string | number;
  formData: FormData;
};

type AddDocumentsResult = { documents: IDocumentUI[]; message: string };

/* ─── THUNKS ─────────────────────────────────────────────────────────────────*/

const extractError = (error: unknown, fallback: string): string => {
  const err = error as KnownError;
  return err.response?.data?.message ?? err.message ?? fallback;
};

export const fetchMyAssignments = createAsyncThunk<
  IIndicatorUI[],
  void,
  { rejectValue: string }
>("userIndicators/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IIndicatorUI[] }>(
      "/user-indicators/my-assignments"
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
      "/user-indicators/rejects"
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load rejected filings"));
  }
});

export const fetchIndicatorDetails = createAsyncThunk<
  IIndicatorUI,
  string,
  { rejectValue: string }
>("userIndicators/fetchDetails", async (id, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IIndicatorUI }>(
      `/user-indicators/${id}`
    );
    return response.data.data;
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load details"));
  }
});

export const submitIndicatorProgress = createAsyncThunk<
  void,
  SubmitArg,
  { rejectValue: string }
>("userIndicators/submit", async (arg, { dispatch, rejectWithValue }) => {
  try {
    await apiPrivate.post(`/user-indicators/${arg.id}/submit`, arg.formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(fetchIndicatorDetails(arg.id));
  } catch (error) {
    return rejectWithValue(extractError(error, "Submission failed"));
  }
});

export const resubmitIndicatorProgress = createAsyncThunk<
  void,
  SubmitArg,
  { rejectValue: string }
>("userIndicators/resubmit", async (arg, { dispatch, rejectWithValue }) => {
  try {
    await apiPrivate.post(`/user-indicators/${arg.id}/resubmit`, arg.formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(fetchIndicatorDetails(arg.id));
  } catch (error) {
    return rejectWithValue(extractError(error, "Resubmission failed"));
  }
});

export const addIndicatorDocuments = createAsyncThunk<
  AddDocumentsResult,
  AddDocumentsArg,
  { rejectValue: string }
>("userIndicators/addDocuments", async (arg, { dispatch, rejectWithValue }) => {
  try {
    // Normalise the quarter before sending so the backend always receives
    // "Q1" / "Annual" rather than a raw integer.
    const normalisedQ = normaliseQuarter(arg.quarter);
    if (!arg.formData.has("quarter")) {
      arg.formData.append("quarter", normalisedQ);
    }

    const response = await apiPrivate.post<{
      success: boolean;
      message: string;
      documents: IDocumentUI[];
    }>(
      `/user-indicators/${arg.id}/add-documents`,
      arg.formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    dispatch(fetchIndicatorDetails(arg.id));
    return { documents: response.data.documents, message: response.data.message };
  } catch (error) {
    return rejectWithValue(extractError(error, "Upload failed"));
  }
});

export const deleteRejectedDocument = createAsyncThunk<
  void,
  { docId: string; indicatorId: string },
  { rejectValue: string }
>("userIndicators/deleteDocument", async ({ docId, indicatorId }, { dispatch, rejectWithValue }) => {
  try {
    await apiPrivate.delete(`/user-indicators/documents/${docId}`);
    dispatch(fetchIndicatorDetails(indicatorId));
  } catch (error) {
    return rejectWithValue(extractError(error, "Delete failed"));
  }
});

export const updateRejectedSubmission = createAsyncThunk<
  void,
  UpdateSubmissionArg,
  { rejectValue: string }
>("userIndicators/updateSubmission", async (arg, { dispatch, rejectWithValue }) => {
  try {
    await apiPrivate.patch(
      `/user-indicators/${arg.id}/update-submission`,
      arg.formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    dispatch(fetchIndicatorDetails(arg.id));
  } catch (error) {
    return rejectWithValue(extractError(error, "Update failed"));
  }
});

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

    /**
     * Selects an indicator from either list by ID.
     * Falls back to null if not found in either list.
     */
    setLocalSelectedIndicator: (state, action: PayloadAction<string | null>) => {
      const source = [
        ...state.myIndicators,
        ...state.rejectedIndicators,
      ] as IIndicatorUI[];
      state.currentIndicator = action.payload
        ? (source.find((i) => i.id === action.payload) ?? null)
        : null;
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
        // Store the full IRejectedIndicatorUI shape including rejectedQuarters
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

      /* ── Write operations (submit / resubmit / add docs / delete / update) */
      .addMatcher(
        (action): action is AnyAction =>
          WRITE_ACTIONS.pending.includes(action.type),
        (state) => {
          state.uploading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action): action is AnyAction =>
          WRITE_ACTIONS.fulfilled.includes(action.type),
        (state) => {
          state.uploading = false;
        }
      )
      .addMatcher(
        (action): action is AnyAction =>
          WRITE_ACTIONS.rejected.includes(action.type),
        (state, action) => {
          state.uploading = false;
          state.error = (action.payload as string) ?? "Operation failed";
        }
      );
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setLocalSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;