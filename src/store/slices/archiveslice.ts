import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

export interface IIncompleteIndicator {
  id:                  string;
  status:              string;
  progress:            number;
  activeQuarter:       number;
  deadline:            string | null;
  activityDescription: string;
  objectiveTitle:      string;
  perspective:         string;
  assigneeName:        string | null;
}

export interface IArchivePreview {
  year: number;
  summary: {
    total:      number;
    completed:  number;
    incomplete: number;
  };
  incompleteIndicators: IIncompleteIndicator[];
}

export interface IArchivedYear {
  year:        number;
  total:       number;
  completed:   number;
  incomplete:  number;
  archivedAt:  string;
  archivedBy:  string;
}

export interface IArchivedIndicator {
  id:                    string;
  year:                  number;
  archivedAt:            string;
  archivedByName:        string;
  indicatorId:           string;
  perspective:           string;
  objectiveTitle:        string;
  activityDescription:   string;
  assigneeName:          string | null;
  status:                string;
  progress:              number;
  target:                number;
  unit:                  string;
  weight:                number;
  finalAchieved:         number;
  submissionsSnapshot:   object[];
  reviewHistorySnapshot: object[];
}

interface ArchiveState {
  preview:        IArchivePreview | null;
  archivedYears:  IArchivedYear[];
  archiveDetail:  IArchivedIndicator[];
  loading:        boolean;  // fetchArchivedYears + fetchArchivePreview
  detailLoading:  boolean;  // fetchArchiveByYear
  archiving:      boolean;  // runYearArchive
  error:          string | null;
  successMessage: string | null;
}

const initialState: ArchiveState = {
  preview:        null,
  archivedYears:  [],
  archiveDetail:  [],
  loading:        false,
  detailLoading:  false,
  archiving:      false,
  error:          null,
  successMessage: null,
};

/* ─── THUNKS ─────────────────────────────────────────────────────────────── */

export const fetchArchivePreview = createAsyncThunk <
  IArchivePreview,
  number,
  { rejectValue: string }
>("archive/fetchPreview", async (year, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: IArchivePreview }>(
      `/archive/preview?year=${year}`
    );
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to load preview"
    );
  }
});

export const runYearArchive = createAsyncThunk <
  { archivedYear: number; nextYear: number; indicatorsArchived: number },
  number,
  { rejectValue: string }
>("archive/run", async (year, { rejectWithValue, dispatch }) => {
  try {
    const res = await api.post<{
      data: { archivedYear: number; nextYear: number; indicatorsArchived: number };
    }>("/archive/run", { year });
    dispatch(fetchArchivedYears());
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Archive failed"
    );
  }
});

export const fetchArchivedYears = createAsyncThunk <
  IArchivedYear[],
  void,
  { rejectValue: string }
>("archive/fetchYears", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: IArchivedYear[] }>("/archive");
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to load archived years"
    );
  }
});

export const fetchArchiveByYear = createAsyncThunk <
  IArchivedIndicator[],
  { year: number; perspective?: string },
  { rejectValue: string }
>("archive/fetchByYear", async ({ year, perspective }, { rejectWithValue }) => {
  try {
    const params = perspective
      ? `?perspective=${encodeURIComponent(perspective)}`
      : "";
    const res = await api.get<{ data: IArchivedIndicator[] }>(
      `/archive/${year}${params}`
    );
    return res.data.data;
  } catch (err) {
    return rejectWithValue(
      err instanceof Error ? err.message : "Failed to load archive"
    );
  }
});

/* ─── SLICE ──────────────────────────────────────────────────────────────── */

const archiveSlice = createSlice({
  name: "archive",
  initialState,
  reducers: {
    clearArchiveError:   (state) => { state.error = null; },
    clearArchiveSuccess: (state) => { state.successMessage = null; },
    clearPreview:        (state) => { state.preview = null; },
    clearArchiveDetail:  (state) => { state.archiveDetail = []; },
    resetArchiveState:   ()      => initialState,
  },
  extraReducers: (builder) => {
    builder
      /* ── fetchArchivePreview ────────────────────────────────────────── */
      .addCase(fetchArchivePreview.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchArchivePreview.fulfilled, (state, action: PayloadAction<IArchivePreview>) => {
        state.loading = false;
        state.preview = action.payload;
      })
      .addCase(fetchArchivePreview.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload ?? "Failed to load preview";
      })

      /* ── runYearArchive ─────────────────────────────────────────────── */
      .addCase(runYearArchive.pending, (state) => {
        state.archiving      = true;
        state.error          = null;
        state.successMessage = null;
      })
      .addCase(runYearArchive.fulfilled, (state, action) => {
        state.archiving      = false;
        state.preview        = null;
        state.successMessage = `Year ${action.payload.archivedYear} archived. ${action.payload.indicatorsArchived} indicators reset for ${action.payload.nextYear}.`;
      })
      .addCase(runYearArchive.rejected, (state, action) => {
        state.archiving = false;
        state.error     = action.payload ?? "Archive failed";
      })

      /* ── fetchArchivedYears ─────────────────────────────────────────── */
      .addCase(fetchArchivedYears.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchArchivedYears.fulfilled, (state, action: PayloadAction<IArchivedYear[]>) => {
        state.loading       = false;
        state.archivedYears = action.payload;
      })
      .addCase(fetchArchivedYears.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload ?? "Failed to load archived years";
      })

      /* ── fetchArchiveByYear ─────────────────────────────────────────── */
      .addCase(fetchArchiveByYear.pending, (state) => {
        state.detailLoading = true;
        state.error         = null;
      })
      .addCase(fetchArchiveByYear.fulfilled, (state, action: PayloadAction<IArchivedIndicator[]>) => {
        state.detailLoading = false;
        state.archiveDetail = action.payload;
      })
      .addCase(fetchArchiveByYear.rejected, (state, action) => {
        state.detailLoading = false;
        state.error         = action.payload ?? "Failed to load archive detail";
      });
  },
});

export const {
  clearArchiveError,
  clearArchiveSuccess,
  clearPreview,
  clearArchiveDetail,
  resetArchiveState,
} = archiveSlice.actions;

export default archiveSlice.reducer;