import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";
import type { AxiosError } from "axios";

/* ─── TYPES ───────────────────────────────────────────────────────────────── */

export interface IDocument {
  fileName: string;
  fileType: string;
  evidenceUrl: string;
  description: string;
  status: string;
}

export interface ISubmission {
  submissionId: string;
  quarter: number;
  year: number;
  achievedValue: number;
  notes: string;
  reviewStatus: string;   // kept in the data but not rendered in the UI
  submittedAt: string;
  documents: IDocument[];
}

export interface IIndicator {
  indicatorId: string;
  indicatorName: string;
  status: string;
  weight: number;
  unit: string;
  target: number;
  progress: number;
  deadline: string;
  instructions: string;
  reportingCycle: string;
  activeQuarter: number;
  currentTotalAchieved: number;
  assignmentType: "User" | "Team";
  assigneeId: string;
  assigneeDisplayName: string;
  // assignedByName: string;   // <-- removed – no longer returned by the API
  submissions: ISubmission[];
}

export interface IActivity {
  id: string;
  description: string;
  indicators: IIndicator[];
}

export interface IObjective {
  id: string;
  title: string;
  activities: IActivity[];
}

export interface IPerspective {
  perspective: string;
  objectives: IObjective[];
}

export interface IReportSummary {
  perspective: string;
  totalIndicators: number;
  completed: number;
  unassigned: number;
  awaitingReview: number;
  overdue: number;
  avgProgress: number;
}

export interface ReportFilters {
  perspective?: string;
  status?: string;
  assigneeId?: string;
  quarter?: number;
  year?: number;
}

/* ─── API RESPONSE SHAPES ─────────────────────────────────────────────────── */

interface TrackerReportResponse {
  success: boolean;
  count: number;
  data: IPerspective[];
  raw: IIndicator[];
}

interface SummaryResponse {
  success: boolean;
  data: IReportSummary[];
}

/* ─── STATE ───────────────────────────────────────────────────────────────── */

interface ReportState {
  data: IPerspective[];
  raw: IIndicator[];
  summary: IReportSummary[];
  filters: ReportFilters;
  loading: boolean;
  summaryLoading: boolean;
  pdfLoading: boolean;
  error: string | null;
  selectedPlanId: string | null;
}

const initialState: ReportState = {
  data: [],
  raw: [],
  summary: [],
  filters: {},
  loading: false,
  summaryLoading: false,
  pdfLoading: false,
  error: null,
  selectedPlanId: null,
};

/* ─── HELPER: extract error message ──────────────────────────────────────── */

function extractError(err: unknown, fallback: string): string {
  const error = err as AxiosError<{ message?: string }>;
  return error.response?.data?.message ?? fallback;
}

/* ─── HELPER: build query string ─────────────────────────────────────────── */

function buildParams(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.perspective) params.append("perspective", filters.perspective);
  if (filters.status)      params.append("status",      filters.status);
  if (filters.assigneeId)  params.append("assigneeId",  filters.assigneeId);
  if (filters.quarter)     params.append("quarter",     String(filters.quarter));
  if (filters.year)        params.append("year",        String(filters.year));
  return params.toString();
}

/* ─── THUNKS ──────────────────────────────────────────────────────────────── */

export const fetchTrackerReport = createAsyncThunk<
  TrackerReportResponse,
  ReportFilters,
  { rejectValue: string }
>(
  "reports/fetchTracker",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get<TrackerReportResponse>(
        `/reports?${buildParams(filters)}`
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch tracker report."));
    }
  }
);

export const fetchReportByPlan = createAsyncThunk<
  TrackerReportResponse,
  string,
  { rejectValue: string }
>(
  "reports/fetchByPlan",
  async (planId, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get<TrackerReportResponse>(`/reports/${planId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch plan report."));
    }
  }
);

export const fetchReportSummary = createAsyncThunk<
  SummaryResponse,
  void,
  { rejectValue: string }
>(
  "reports/fetchSummary",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get<SummaryResponse>("/reports/summary");
      return res.data;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to fetch report summary."));
    }
  }
);

export const downloadTrackerPdf = createAsyncThunk<
  boolean,
  ReportFilters,
  { rejectValue: string }
>(
  "reports/downloadPdf",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get<Blob>(
        `/reports/pdf?${buildParams(filters)}`,
        { responseType: "blob" }
      );

      const url  = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href  = url;
      link.download = `tracker-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      return rejectWithValue(extractError(err, "Failed to download PDF."));
    }
  }
);

/* ─── SLICE ───────────────────────────────────────────────────────────────── */

const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    setReportFilters(state, action: PayloadAction<ReportFilters>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearReportFilters(state) {
      state.filters = {};
    },
    setSelectedPlan(state, action: PayloadAction<string | null>) {
      state.selectedPlanId = action.payload;
    },
    clearReportError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    /* fetchTrackerReport */
    builder
      .addCase(fetchTrackerReport.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchTrackerReport.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload.data;
        state.raw     = action.payload.raw;
      })
      .addCase(fetchTrackerReport.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload ?? "Something went wrong.";
      });

    /* fetchReportByPlan */
    builder
      .addCase(fetchReportByPlan.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchReportByPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload.data;
        state.raw     = action.payload.raw;
      })
      .addCase(fetchReportByPlan.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload ?? "Something went wrong.";
      });

    /* fetchReportSummary */
    builder
      .addCase(fetchReportSummary.pending, (state) => {
        state.summaryLoading = true;
        state.error          = null;
      })
      .addCase(fetchReportSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary        = action.payload.data;
      })
      .addCase(fetchReportSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error          = action.payload ?? "Something went wrong.";
      });

    /* downloadTrackerPdf */
    builder
      .addCase(downloadTrackerPdf.pending, (state) => {
        state.pdfLoading = true;
        state.error      = null;
      })
      .addCase(downloadTrackerPdf.fulfilled, (state) => {
        state.pdfLoading = false;
      })
      .addCase(downloadTrackerPdf.rejected, (state, action) => {
        state.pdfLoading = false;
        state.error       = action.payload ?? "Something went wrong.";
      });
  },
});

export const {
  setReportFilters,
  clearReportFilters,
  setSelectedPlan,
  clearReportError,
} = reportSlice.actions;

export default reportSlice.reducer;