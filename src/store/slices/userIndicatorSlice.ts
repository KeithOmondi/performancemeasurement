import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IDocumentUI {
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
}

export interface IReviewHistoryEntryUI {
  action:
    | "Submitted"
    | "Resubmitted"
    | "Verified"
    | "Approved"
    | "Rejected"
    | "Correction Requested";
  reason: string;
  reviewerRole: "user" | "admin" | "superadmin" | "examiner";
  reviewedBy?: { _id: string; name: string };
  at: string;
  nextDeadline?: string;
}

export interface ISubmissionUI {
  _id: string;
  quarter: 1 | 2 | 3 | 4;
  documents: IDocumentUI[];
  notes: string;
  adminDescriptionEdit?: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: "Pending" | "Verified" | "Accepted" | "Rejected";
  adminComment?: string;
  resubmissionCount: number;
}

export interface IIndicatorUI {
  _id: string;
  strategicPlanId: any;
  objectiveId: string;
  activityId: string;
  objectiveTitle: string;
  activityDescription: string;
  perspective: string;
  reportingCycle: "Quarterly" | "Annual";
  /**
   * "User"  → assigned directly to a single user
   * "Team"  → assigned to a team (any member can submit)
   */
  assignmentType: "User" | "Team";
  assigneeModel: "User" | "Team";
  /**
   * Populated assignee — a User document OR a Team document.
   * Both have a `name` field; Team documents won't have `email`/`pjNumber`.
   */
  assignee: {
    _id: string;
    name: string;
    email?: string;
    pjNumber?: string;
  };
  status:
    | "Pending"
    | "Awaiting Admin Approval"
    | "Rejected by Admin"
    | "Awaiting Super Admin"
    | "Rejected by Super Admin"
    | "Completed";
  progress: number;
  target: number;
  unit: string;
  weight: number;
  deadline: string;
  instructions?: string;
  currentTotalAchieved: number;
  activeQuarter: 1 | 2 | 3 | 4;
  submissions: ISubmissionUI[];
  reviewHistory: IReviewHistoryEntryUI[];
  adminOverallComments?: string;
}

/* ---------------- STATE ---------------- */

interface UserIndicatorState {
  myIndicators: IIndicatorUI[];
  currentIndicator: IIndicatorUI | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

const initialState: UserIndicatorState = {
  myIndicators: [],
  currentIndicator: null,
  loading: false,
  uploading: false,
  error: null,
};

/* ---------------- HELPERS ---------------- */

/** Merges an updated indicator into the list and currentIndicator in-place. */
const upsertIndicator = (
  state: UserIndicatorState,
  indicator: IIndicatorUI,
) => {
  if (!indicator?._id) return;

  const index = state.myIndicators.findIndex((i) => i._id === indicator._id);
  if (index !== -1) {
    state.myIndicators[index] = { ...state.myIndicators[index], ...indicator };
  } else {
    state.myIndicators.unshift(indicator);
  }

  if (state.currentIndicator?._id === indicator._id) {
    state.currentIndicator = { ...state.currentIndicator, ...indicator };
  }
};

/* ---------------- THUNKS ---------------- */

type SubmitArg = { id: string; formData: FormData };
type AddDocumentsArg = { id: string; quarter: number; formData: FormData };

// 1. Fetch all assignments (user-direct + team-assigned)
export const fetchMyAssignments = createAsyncThunk(
  "userIndicators/fetchAll",
  async (_: void, thunkAPI) => {
    try {
      const response = await apiPrivate.get("/user-indicators/my-assignments");
      return response.data.data as IIndicatorUI[];
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load assignments",
      );
    }
  },
);

// 2. Fetch single indicator details
export const fetchIndicatorDetails = createAsyncThunk(
  "userIndicators/fetchDetails",
  async (id: string, thunkAPI) => {
    try {
      const response = await apiPrivate.get(`/user-indicators/${id}`);
      if (!response.data.data) {
        return thunkAPI.rejectWithValue("Indicator data not found");
      }
      return response.data.data as IIndicatorUI;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load indicator details",
      );
    }
  },
);

// 3. Submit / resubmit progress for the active quarter
export const submitIndicatorProgress = createAsyncThunk(
  "userIndicators/submit",
  async (arg: SubmitArg, thunkAPI) => {
    try {
      const response = await apiPrivate.post(
        `/user-indicators/${arg.id}/submit`,
        arg.formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Re-fetch so the UI reflects the new submission + updated progress
      thunkAPI.dispatch(fetchIndicatorDetails(arg.id));
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Submission failed",
      );
    }
  },
);

// 4. Add extra documents to an existing submission
export const addIndicatorDocuments = createAsyncThunk(
  "userIndicators/addDocuments",
  async (arg: AddDocumentsArg, thunkAPI) => {
    try {
      arg.formData.append("quarter", String(arg.quarter));
      const response = await apiPrivate.post(
        `/user-indicators/${arg.id}/documents`,
        arg.formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Re-fetch so the document list is up to date
      thunkAPI.dispatch(fetchIndicatorDetails(arg.id));
      return response.data.documents as IDocumentUI[];
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to upload documents",
      );
    }
  },
);

/* ---------------- SLICE ---------------- */

const userIndicatorSlice = createSlice({
  name: "userIndicators",
  initialState,
  reducers: {
    clearIndicatorError: (state) => {
      state.error = null;
    },
    resetUserIndicatorState: () => initialState,
    /** Selects an indicator from the cached list by id, or clears the selection. */
    setLocalSelectedIndicator: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.currentIndicator = action.payload
        ? (state.myIndicators.find((i) => i._id === action.payload) ?? null)
        : null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch all assignments ──────────────────────────────────────────
      .addCase(fetchMyAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyAssignments.fulfilled,
        (state, action: PayloadAction<IIndicatorUI[]>) => {
          state.loading = false;
          state.myIndicators = action.payload ?? [];
        },
      )
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Fetch single indicator ─────────────────────────────────────────
      .addCase(fetchIndicatorDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchIndicatorDetails.fulfilled,
        (state, action: PayloadAction<IIndicatorUI>) => {
          state.loading = false;
          state.currentIndicator = action.payload;
          upsertIndicator(state, action.payload);
        },
      )
      .addCase(fetchIndicatorDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Submit / resubmit progress ─────────────────────────────────────
      .addCase(submitIndicatorProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(submitIndicatorProgress.fulfilled, (state) => {
        state.uploading = false;
      })
      .addCase(submitIndicatorProgress.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })

      // ── Add documents ──────────────────────────────────────────────────
      .addCase(addIndicatorDocuments.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(addIndicatorDocuments.fulfilled, (state) => {
        state.uploading = false;
        // currentIndicator is refreshed by the fetchIndicatorDetails dispatch
        // inside the thunk, so no manual merge needed here.
      })
      .addCase(addIndicatorDocuments.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setLocalSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;