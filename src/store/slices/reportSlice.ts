import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
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
  reviewStatus: string;
  submittedAt: string;
  documents: IDocument[];
}

export interface IIndicator {
  indicatorId: string;
  indicatorName?: string;
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
  hasSubmissions?: number;
  submittedComplete?: number;
}

export interface ReportFilters {
  perspective?: string;
  status?: string;
  assigneeId?: string;
  quarter?: number;
  year?: number;
  hasSubmission?: string;
  submissionStatus?: string | string[];
}

/* ─── UI STATUS GROUPS ─────────────────────────────────────────────────────
   These are the only indicator-status groups the UI exposes.
   Maps 1:1 to real Postgres enum values in `indicator_status`.
   ──────────────────────────────────────────────────────────────────────── */

export type StatusGroup = "Complete" | "Partial" | "Incomplete";

export const STATUS_GROUP_VALUES: Record<StatusGroup, string[]> = {
  Complete: ["Completed"],
  Partial: ["Partially Approved", "Awaiting Super Admin"],
  Incomplete: [
    "Pending",
    "Awaiting Admin Approval",
    "Rejected by Admin",
    "Rejected by Super Admin",
    "Correction Needed",
  ],
};

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

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */

function extractError(err: unknown, fallback: string): string {
  const error = err as AxiosError<{ message?: string }>;
  return error.response?.data?.message ?? fallback;
}

/**
 * Builds the query string sent to the backend.
 *
 * The backend understands:
 *   ?status=Completed,Partially Approved,Awaiting Super Admin
 *   ?hasSubmission=true|false
 *   ?submissionStatus=Accepted,Verified,Partially Approved
 *   ?perspective=...
 *   ?assigneeId=...
 *   ?quarter=1
 *   ?year=2026
 */
function buildParams(filters: ReportFilters): string {
  const params = new URLSearchParams();

  if (filters.perspective) params.append("perspective", filters.perspective);
  if (filters.status) params.append("status", filters.status);
  if (filters.assigneeId) params.append("assigneeId", filters.assigneeId);
  if (filters.quarter) params.append("quarter", String(filters.quarter));
  if (filters.year) params.append("year", String(filters.year));
  if (filters.hasSubmission) params.append("hasSubmission", filters.hasSubmission);

  if (filters.submissionStatus) {
    const statuses = Array.isArray(filters.submissionStatus)
      ? filters.submissionStatus
      : filters.submissionStatus.split(",");

    const valid = statuses.filter((s) =>
      [
        "Accepted",
        "Verified",
        "Partially Approved",
        "Pending",
        "Rejected",
        "Correction Needed",
      ].includes(s)
    );

    if (valid.length > 0) {
      params.append("submissionStatus", valid.join(","));
    }
  }

  return params.toString();
}

/* ─── THUNKS ──────────────────────────────────────────────────────────────── */

export const fetchTrackerReport = createAsyncThunk<
  TrackerReportResponse,
  ReportFilters,
  { rejectValue: string }
>("reports/fetchTracker", async (filters = {}, { rejectWithValue }) => {
  try {
    const qs = buildParams(filters);
    const url = `/reports${qs ? `?${qs}` : ""}`;
    const res = await apiPrivate.get<TrackerReportResponse>(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to fetch tracker report."));
  }
});

export const fetchReportByPlan = createAsyncThunk<
  TrackerReportResponse,
  string,
  { rejectValue: string }
>("reports/fetchByPlan", async (planId, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<TrackerReportResponse>(`/reports/${planId}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to fetch plan report."));
  }
});

export const fetchReportSummary = createAsyncThunk<
  SummaryResponse,
  void,
  { rejectValue: string }
>("reports/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.get<SummaryResponse>("/reports/summary");
    return res.data;
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to fetch report summary."));
  }
});

export const downloadTrackerPdf = createAsyncThunk<
  boolean,
  ReportFilters,
  { rejectValue: string }
>("reports/downloadPdf", async (filters = {}, { rejectWithValue }) => {
  try {
    const qs = buildParams(filters);
    const url = `/reports/pdf${qs ? `?${qs}` : ""}`;

    const res = await apiPrivate.get<Blob>(url, { responseType: "blob" });

    const blobUrl = URL.createObjectURL(
      new Blob([res.data], { type: "application/pdf" })
    );
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `tracker-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(blobUrl);

    return true;
  } catch (err) {
    return rejectWithValue(extractError(err, "Failed to download PDF."));
  }
});

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

    /**
     * Set (or clear) the "status group" filter.
     *
     * Passing `null` clears the status filter, which means "show every
     * status". This is the ONLY place the UI translates groups to raw
     * enum values.
     */
    setStatusGroupFilter(
      state,
      action: PayloadAction<StatusGroup | null>
    ) {
      if (!action.payload) {
        const { status, ...rest } = state.filters;
        void status;
        state.filters = rest;
        return;
      }

      state.filters = {
        ...state.filters,
        status: STATUS_GROUP_VALUES[action.payload].join(","),
      };
    },

    /**
     * Toggle the "has submission" filter.
     *
     * `true`  → only indicators with at least one submission whose
     *           review_status is Accepted / Verified / Partially Approved
     * `false` → remove the submission filter entirely
     */
    toggleSubmissionFilter(state, action: PayloadAction<boolean>) {
      if (action.payload) {
        state.filters = {
          ...state.filters,
          hasSubmission: "true",
          submissionStatus: "Accepted,Verified,Partially Approved",
        };
      } else {
        const { hasSubmission, submissionStatus, ...rest } = state.filters;
        void hasSubmission;
        void submissionStatus;
        state.filters = rest;
      }
    },

    /**
     * Reset everything except the perspective — useful for a "Clear" button.
     */
    resetReportFilters(state) {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrackerReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrackerReport.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.raw = action.payload.raw;
      })
      .addCase(fetchTrackerReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Something went wrong.";
      });

    builder
      .addCase(fetchReportByPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportByPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data;
        state.raw = action.payload.raw;
      })
      .addCase(fetchReportByPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Something went wrong.";
      });

    builder
      .addCase(fetchReportSummary.pending, (state) => {
        state.summaryLoading = true;
        state.error = null;
      })
      .addCase(fetchReportSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload.data;
      })
      .addCase(fetchReportSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error = action.payload ?? "Something went wrong.";
      });

    builder
      .addCase(downloadTrackerPdf.pending, (state) => {
        state.pdfLoading = true;
        state.error = null;
      })
      .addCase(downloadTrackerPdf.fulfilled, (state) => {
        state.pdfLoading = false;
      })
      .addCase(downloadTrackerPdf.rejected, (state, action) => {
        state.pdfLoading = false;
        state.error = action.payload ?? "Something went wrong.";
      });
  },
});

export const {
  setReportFilters,
  clearReportFilters,
  setSelectedPlan,
  clearReportError,
  setStatusGroupFilter,
  toggleSubmissionFilter,
  resetReportFilters,
} = reportSlice.actions;

export default reportSlice.reducer;