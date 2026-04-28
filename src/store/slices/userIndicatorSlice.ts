import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
  type AnyAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface IDocumentUI {
  id: string;
  submission_id: string;
  evidence_url: string;
  evidence_public_id: string;
  file_type: "image" | "video" | "raw";
  file_name?: string;
  status: "Pending" | "Rejected" | "Accepted";
  description?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface ISubmissionUI {
  id: string;
  quarter: number;
  notes: string;
  achieved_value: number;
  review_status: "Pending" | "Verified" | "Accepted" | "Rejected";
  submitted_at: string;
  resubmission_count: number;
  documents: IDocumentUI[];
  overallRejectionReason?: string;
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
  active_quarter: number;
  objective: { title: string };
  activity: { description: string };
  submissions: ISubmissionUI[];
  updated_at: string;
  progress?: number;
}

interface UserIndicatorState {
  myIndicators: IIndicatorUI[];
  currentIndicator: IIndicatorUI | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

interface KnownError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

/* ─── INITIAL STATE ────────────────────────────────────────────────── */

const initialState: UserIndicatorState = {
  myIndicators: [],
  currentIndicator: null,
  loading: false,
  uploading: false,
  error: null,
};

/* ─── HELPERS ──────────────────────────────────────────────────────── */

/**
 * Inserts or fully replaces an indicator in the list and syncs
 * currentIndicator. The incoming payload overwrites the stored record
 * entirely so that replaced document arrays are never stale.
 */
const upsertIndicator = (state: UserIndicatorState, indicator: IIndicatorUI) => {
  if (!indicator?.id) return;

  const index = state.myIndicators.findIndex((i) => i.id === indicator.id);
  if (index !== -1) {
    state.myIndicators[index] = indicator;
  } else {
    state.myIndicators.unshift(indicator);
  }

  if (state.currentIndicator?.id === indicator.id) {
    state.currentIndicator = indicator;
  }
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

type SubmitArg        = { id: string; formData: FormData };
type AddDocumentsArg  = { id: string; quarter: number; formData: FormData };

// FIX: updateRejectedSubmission now accepts FormData so the backend's
// file-replacement logic can receive new evidence files, matching the
// updated controller which purges old documents and inserts the new set.
type UpdateSubmissionArg = { id: string; formData: FormData };

export const fetchMyAssignments = createAsyncThunk<
  IIndicatorUI[],
  void,
  { rejectValue: string }
>(
  "userIndicators/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get<{ data: IIndicatorUI[] }>(
        "/user-indicators/my-assignments"
      );
      return response.data.data;
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(err.response?.data?.message || "Failed to load assignments");
    }
  }
);

export const fetchIndicatorDetails = createAsyncThunk<
  IIndicatorUI,
  string,
  { rejectValue: string }
>(
  "userIndicators/fetchDetails",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get<{ data: IIndicatorUI }>(
        `/user-indicators/${id}`
      );
      return response.data.data;
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(err.response?.data?.message || "Failed to load details");
    }
  }
);

export const submitIndicatorProgress = createAsyncThunk<
  void,
  SubmitArg,
  { rejectValue: string }
>(
  "userIndicators/submit",
  async (arg, { dispatch, rejectWithValue }) => {
    try {
      await apiPrivate.post(`/user-indicators/${arg.id}/submit`, arg.formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(fetchIndicatorDetails(arg.id));
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(err.response?.data?.message || "Submission failed");
    }
  }
);

export const addIndicatorDocuments = createAsyncThunk<
  IDocumentUI[],
  AddDocumentsArg,
  { rejectValue: string }
>(
  "userIndicators/addDocuments",
  async (arg, { dispatch, rejectWithValue }) => {
    try {
      if (!arg.formData.has("quarter")) arg.formData.append("quarter", String(arg.quarter));
      const response = await apiPrivate.post<{ documents: IDocumentUI[] }>(
        `/user-indicators/${arg.id}/add-documents`,
        arg.formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      dispatch(fetchIndicatorDetails(arg.id));
      return response.data.documents;
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(err.response?.data?.message || "Upload failed");
    }
  }
);

export const deleteRejectedDocument = createAsyncThunk<
  void,
  { docId: string; indicatorId: string },
  { rejectValue: string }
>(
  "userIndicators/deleteDocument",
  async ({ docId, indicatorId }, { dispatch, rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/user-indicators/documents/${docId}`);
      dispatch(fetchIndicatorDetails(indicatorId));
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(err.response?.data?.message || "Delete failed");
    }
  }
);

// FIX: Accepts FormData instead of plain fields so replacement documents
// can be attached. Callers should build FormData with notes, achievedValue,
// quarter, and any new files before dispatching.
export const updateRejectedSubmission = createAsyncThunk<
  void,
  UpdateSubmissionArg,
  { rejectValue: string }
>(
  "userIndicators/updateSubmission",
  async (arg, { dispatch, rejectWithValue }) => {
    try {
      await apiPrivate.patch(
        `/user-indicators/${arg.id}/update-submission`,
        arg.formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      dispatch(fetchIndicatorDetails(arg.id));
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(err.response?.data?.message || "Update failed");
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

const WRITE_PENDING = [
  submitIndicatorProgress.pending.type,
  addIndicatorDocuments.pending.type,
  deleteRejectedDocument.pending.type,
  updateRejectedSubmission.pending.type,
];

const WRITE_FULFILLED = [
  submitIndicatorProgress.fulfilled.type,
  addIndicatorDocuments.fulfilled.type,
  deleteRejectedDocument.fulfilled.type,
  updateRejectedSubmission.fulfilled.type,
];

const WRITE_REJECTED = [
  submitIndicatorProgress.rejected.type,
  addIndicatorDocuments.rejected.type,
  deleteRejectedDocument.rejected.type,
  updateRejectedSubmission.rejected.type,
];

const userIndicatorSlice = createSlice({
  name: "userIndicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
    resetUserIndicatorState: () => initialState,
    setLocalSelectedIndicator: (state, action: PayloadAction<string | null>) => {
      state.currentIndicator = action.payload
        ? (state.myIndicators.find((i) => i.id === action.payload) ?? null)
        : null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ── fetchMyAssignments ── */
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
        state.error = action.payload || "Error loading assignments";
      })

      /* ── fetchIndicatorDetails ── */
      // FIX: added pending + rejected cases so loading/error states are
      // correctly driven when fetching a single indicator's details.
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
        state.error = action.payload || "Error loading indicator details";
      })

      /* ── Write operations: pending ── */
      .addMatcher(
        (action): action is AnyAction => WRITE_PENDING.includes(action.type),
        (state) => {
          state.uploading = true;
          state.error = null;
        }
      )
      /* ── Write operations: fulfilled ── */
      .addMatcher(
        (action): action is AnyAction => WRITE_FULFILLED.includes(action.type),
        (state) => {
          state.uploading = false;
        }
      )
      /* ── Write operations: rejected ── */
      .addMatcher(
        (action): action is AnyAction => WRITE_REJECTED.includes(action.type),
        (state, action) => {
          state.uploading = false;
          state.error = (action.payload as string) || "Operation failed";
        }
      );
  },
});

export const { clearIndicatorError, resetUserIndicatorState, setLocalSelectedIndicator } =
  userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;