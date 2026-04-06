import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ---------------- TYPES ---------------- */

export interface IDocumentUI {
  id: string;
  submission_id: string;
  evidence_url: string;
  evidence_public_id: string;
  file_type: "image" | "video" | "raw";
  file_name?: string;
  created_at: string;
}

export interface IReviewHistoryEntryUI {
  id: string;
  action: "Submitted" | "Resubmitted" | "Verified" | "Approved" | "Rejected" | "Correction Requested";
  reason: string;
  reviewer_role: "user" | "admin" | "superadmin" | "examiner";
  reviewed_by?: string; 
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
  assigneeName: string; // From SQL LEFT JOIN
  assignedByName: string; // From SQL LEFT JOIN
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

const upsertIndicator = (
  state: UserIndicatorState,
  indicator: IIndicatorUI,
) => {
  if (!indicator?.id) return;

  const index = state.myIndicators.findIndex((i) => i.id === indicator.id);
  if (index !== -1) {
    state.myIndicators[index] = { ...state.myIndicators[index], ...indicator };
  } else {
    state.myIndicators.unshift(indicator);
  }

  if (state.currentIndicator?.id === indicator.id) {
    state.currentIndicator = { ...state.currentIndicator, ...indicator };
  }
};

/* ---------------- THUNKS ---------------- */

type SubmitArg = { id: string; formData: FormData };
type AddDocumentsArg = { id: string; quarter: number; formData: FormData };

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

export const fetchIndicatorDetails = createAsyncThunk(
  "userIndicators/fetchDetails",
  async (id: string, thunkAPI) => {
    try {
      const response = await apiPrivate.get(`/user-indicators/${id}`);
      return response.data.data as IIndicatorUI;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to load indicator details",
      );
    }
  },
);

export const submitIndicatorProgress = createAsyncThunk(
  "userIndicators/submit",
  async (arg: SubmitArg, thunkAPI) => {
    try {
      const response = await apiPrivate.post(
        `/user-indicators/${arg.id}/submit`,
        arg.formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Re-fetch to sync calculated progress and statuses from SQL
      thunkAPI.dispatch(fetchIndicatorDetails(arg.id));
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Submission failed",
      );
    }
  },
);

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
      thunkAPI.dispatch(fetchIndicatorDetails(arg.id));
      return response.data.documents;
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
    setLocalSelectedIndicator: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.currentIndicator = action.payload
        ? (state.myIndicators.find((i) => i.id === action.payload) ?? null)
        : null;
    },
  },
  extraReducers: (builder) => {
    builder
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
        state.error = action.payload as string;
      })
      .addCase(fetchIndicatorDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentIndicator = action.payload;
        upsertIndicator(state, action.payload);
      })
      .addCase(submitIndicatorProgress.pending, (state) => {
        state.uploading = true;
      })
      .addCase(submitIndicatorProgress.fulfilled, (state) => {
        state.uploading = false;
      })
      .addCase(addIndicatorDocuments.pending, (state) => {
        state.uploading = true;
      })
      .addCase(addIndicatorDocuments.fulfilled, (state) => {
        state.uploading = false;
      });
  },
});

export const {
  clearIndicatorError,
  resetUserIndicatorState,
  setLocalSelectedIndicator,
} = userIndicatorSlice.actions;

export default userIndicatorSlice.reducer;