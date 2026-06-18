import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

export interface IDocument {
  id: string;
  submissionId: string;
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: string;
  fileName: string;
  description: string;
  status: string;
  rejectionReason: string | null;
  uploadedAt: string;
}

export interface IExaminer {
  id:    string;
  name:  string;
  email: string;
}

export interface ISubmission {
  submissionId: string;
  quarter: number;
  year: number;
  achievedValue: number;
  notes: string;
  reviewStatus: string;
  submittedAt: string;
  documents: IDocument[];
}

export interface IFolderAssignment {
  objectiveId:     string;
  objectiveTitle:  string;
  perspective:     string;
  planId:          string;
  assignmentId:    string | null;
  assignedAt:      string | null;
  examinerId:      string | null;
  examinerName:    string | null;
  examinerEmail:   string | null;
  totalActivities: number;
  completedCount:  number;
}

export interface ICompletedIndicator {
  id:                  string;
  status:              string;
  progress:            number;
  activityDescription: string;
  objectiveTitle:      string;
  assigneeDisplayName: string;
  deadline:            string;
  updatedAt:           string;
  submissions?:        ISubmission[];
}

export interface IMyFolder {
  objectiveId:         string;
  objectiveTitle:      string;
  perspective:         string;
  assignedAt:          string;
  completedIndicators: ICompletedIndicator[];
}

interface ExaminerState {
  assignments:   IFolderAssignment[];
  examiners:     IExaminer[];
  myFolders:     IMyFolder[];
  loading:       boolean;
  actionLoading: boolean;
  error:         string | null;
}

const initialState: ExaminerState = {
  assignments:   [],
  examiners:     [],
  myFolders:     [],
  loading:       false,
  actionLoading: false,
  error:         null,
};

/* ─── THUNKS ─────────────────────────────────────────────────────────────── */

// GET /examiner  →  superadmin: all folder assignments
export const fetchAllAssignments = createAsyncThunk<
  IFolderAssignment[],
  void,
  { rejectValue: string }
>("examiner/fetchAllAssignments", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: IFolderAssignment[] }>("/examiner");
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to load assignments"
    );
  }
});

// GET /examiner/examiners  →  superadmin: list of examiners
export const fetchExaminers = createAsyncThunk<
  IExaminer[],
  void,
  { rejectValue: string }
>("examiner/fetchExaminers", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: IExaminer[] }>("/examiner/examiners");
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to load examiners"
    );
  }
});

// POST /examiner  →  superadmin: assign examiner to a folder
export const assignExaminer = createAsyncThunk<
  void,
  { objectiveId: string; examinerId: string },
  { rejectValue: string }
>("examiner/assign", async (payload, { rejectWithValue, dispatch }) => {
  try {
    await api.post("/examiner", payload);
    dispatch(fetchAllAssignments());
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to assign examiner"
    );
  }
});

// DELETE /examiner/:objectiveId  →  superadmin: unassign examiner from folder
export const unassignExaminer = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("examiner/unassign", async (objectiveId, { rejectWithValue, dispatch }) => {
  try {
    await api.delete(`/examiner/${objectiveId}`);
    dispatch(fetchAllAssignments());
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to unassign examiner"
    );
  }
});

// GET /examiner/my-folders  →  examiner: their own assigned folders
export const fetchMyFolders = createAsyncThunk<
  IMyFolder[],
  void,
  { rejectValue: string }
>("examiner/fetchMyFolders", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: IMyFolder[] }>("/examiner/my-folders");
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to load your folders"
    );
  }
});

/* ─── SLICE ──────────────────────────────────────────────────────────────── */

const examinerSlice = createSlice({
  name: "examiner",
  initialState,
  reducers: {
    clearExaminerError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setLoading     = (state: ExaminerState) => { state.loading = true;       state.error = null; };
    const setActionLoad  = (state: ExaminerState) => { state.actionLoading = true; state.error = null; };
    const stopLoading    = (state: ExaminerState) => { state.loading = false; };
    const stopActionLoad = (state: ExaminerState) => { state.actionLoading = false; };
    const setError = (
      state: ExaminerState,
      action: PayloadAction<string | undefined>
    ) => {
      state.loading      = false;
      state.actionLoading = false;
      state.error        = action.payload ?? "An error occurred";
    };

    builder
      /* fetchAllAssignments */
      .addCase(fetchAllAssignments.pending,   setLoading)
      .addCase(fetchAllAssignments.fulfilled, (state, action) => {
        stopLoading(state);
        state.assignments = action.payload;
      })
      .addCase(fetchAllAssignments.rejected,  setError)

      /* fetchExaminers */
      .addCase(fetchExaminers.pending,   setLoading)
      .addCase(fetchExaminers.fulfilled, (state, action) => {
        stopLoading(state);
        state.examiners = action.payload;
      })
      .addCase(fetchExaminers.rejected,  setError)

      /* assignExaminer */
      .addCase(assignExaminer.pending,   setActionLoad)
      .addCase(assignExaminer.fulfilled, stopActionLoad)
      .addCase(assignExaminer.rejected,  setError)

      /* unassignExaminer */
      .addCase(unassignExaminer.pending,   setActionLoad)
      .addCase(unassignExaminer.fulfilled, stopActionLoad)
      .addCase(unassignExaminer.rejected,  setError)

      /* fetchMyFolders */
      .addCase(fetchMyFolders.pending,   setLoading)
      .addCase(fetchMyFolders.fulfilled, (state, action) => {
        stopLoading(state);
        state.myFolders = action.payload;
      })
      .addCase(fetchMyFolders.rejected,  setError);
  },
});

export const { clearExaminerError } = examinerSlice.actions;
export default examinerSlice.reducer;