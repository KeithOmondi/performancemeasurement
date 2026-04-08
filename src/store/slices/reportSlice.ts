import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface SummaryData {
  name: string;
  weight: number;
  target: number;
  achieved: number;
  score: number;
  status: string;
}

interface ReviewLog {
  _id: string;
  indicatorTitle: string;
  quarter: 1 | 2 | 3 | 4;
  achievedValue: number;
  reviewStatus: "Accepted" | "Rejected" | "Pending";
  submittedAt: string;
  notes: string;
  adminComment?: string;
  userDetails: { name: string; pjNumber: string };
}

interface IndividualPerformance {
  _id: string;
  name: string;
  pjNumber: string;
  role: string;
  subIndicatorsCount: number;
  approved: number;
  totalRejections: number;
}

interface ReportState {
  summary: { data: SummaryData[]; loading: boolean; error: string | null };
  reviewLog: {
    data: ReviewLog[];
    stats: { approved: number; rejected: number };
    loading: boolean;
    error: string | null;
  };
  individual: {
    data: IndividualPerformance[];
    loading: boolean;
    error: string | null;
  };
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

const initialState: ReportState = {
  summary: { data: [], loading: false, error: null },
  reviewLog: {
    data: [],
    stats: { approved: 0, rejected: 0 },
    loading: false,
    error: null,
  },
  individual: { data: [], loading: false, error: null },
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

export const fetchSummaryReport = createAsyncThunk<
  SummaryData[],
  void,
  { rejectValue: string }
>(
  "reports/fetchSummary",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get<{ data: SummaryData[] }>("/reports/summary");
      return response.data.data;
    } catch (err) {
      const error = err as KnownError;
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch summary report"
      );
    }
  }
);

export const fetchReviewLog = createAsyncThunk<
  { logs: ReviewLog[]; stats: { approved: number; rejected: number } },
  string,
  { rejectValue: string }
>(
  "reports/fetchReviewLog",
  async (status, { rejectWithValue }) => {
    try {
      const params = status ? `?status=${status}` : "";
      const response = await apiPrivate.get<{ logs: ReviewLog[]; stats: { approved: number; rejected: number } }>(
        `/reports/review-log${params}`
      );
      return response.data;
    } catch (err) {
      const error = err as KnownError;
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch review log"
      );
    }
  }
);

export const fetchIndividualPerformance = createAsyncThunk<
  IndividualPerformance[],
  void,
  { rejectValue: string }
>(
  "reports/fetchIndividual",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get<{ data: IndividualPerformance[] }>("/reports/individual");
      return response.data.data;
    } catch (err) {
      const error = err as KnownError;
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch staff performance"
      );
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    clearReportErrors: (state) => {
      state.summary.error = null;
      state.reviewLog.error = null;
      state.individual.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Summary
      .addCase(fetchSummaryReport.pending, (state) => {
        state.summary.loading = true;
        state.summary.error = null;
      })
      .addCase(
        fetchSummaryReport.fulfilled,
        (state, action: PayloadAction<SummaryData[]>) => {
          state.summary.loading = false;
          state.summary.data = action.payload;
        }
      )
      .addCase(fetchSummaryReport.rejected, (state, action) => {
        state.summary.loading = false;
        state.summary.error = action.payload ?? "Failed to load summary";
      })

      // Review Log
      .addCase(fetchReviewLog.pending, (state) => {
        state.reviewLog.loading = true;
        state.reviewLog.error = null;
      })
      .addCase(fetchReviewLog.fulfilled, (state, action) => {
        state.reviewLog.loading = false;
        state.reviewLog.data = action.payload.logs;
        state.reviewLog.stats = action.payload.stats;
      })
      .addCase(fetchReviewLog.rejected, (state, action) => {
        state.reviewLog.loading = false;
        state.reviewLog.error = action.payload ?? "Failed to load review log";
      })

      // Individual Performance
      .addCase(fetchIndividualPerformance.pending, (state) => {
        state.individual.loading = true;
        state.individual.error = null;
      })
      .addCase(
        fetchIndividualPerformance.fulfilled,
        (state, action: PayloadAction<IndividualPerformance[]>) => {
          state.individual.loading = false;
          state.individual.data = action.payload;
        }
      )
      .addCase(fetchIndividualPerformance.rejected, (state, action) => {
        state.individual.loading = false;
        state.individual.error = action.payload ?? "Failed to load performance report";
      });
  },
});

export const { clearReportErrors } = reportSlice.actions;
export default reportSlice.reducer;