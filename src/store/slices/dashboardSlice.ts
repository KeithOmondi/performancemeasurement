// src/store/slices/dashboardSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import { api } from "../../api/axios";

// --- Types (unchanged) ---
export interface CompletionPipeline {
  assigned: number;
  pendingReview: number;
  reviewedAndApproved: number;
  returned: number;
}

export interface Distribution {
  overdue: number;
  pendingReview: number;
  returned: number;
  onTrack: number;
}

export interface DashboardStats {
  totalIndicators: number;
  assignedIndicators: number;
  unassignedIndicators: number;
  overdueIndicators: number;
  pendingReviewIndicators: number;
  returnedForCorrection: number;
  reviewedAndApproved: number;
  completionPipeline: CompletionPipeline;
  distribution: Distribution;
}

export interface RecentSubmission {
  id: string;
  submitterName: string;
  submitterId: string;
  indicatorTitle: string;
  indicatorId: string;
  submittedAt: string;
  achieved: number;
  documentCount: number;
}

export interface TeamMemberOverview {
  id: string;
  name: string;
  pjNumber: string;
  title: string;
  assignedIndicatorsCount: number;
}

interface DashboardState {
  stats: DashboardStats | null;
  recentSubmissions: RecentSubmission[];
  teamOverview: TeamMemberOverview[];
  loading: {
    stats: boolean;
    recentSubmissions: boolean;
    teamOverview: boolean;
  };
  error: {
    stats: string | null;
    recentSubmissions: string | null;
    teamOverview: string | null;
  };
}

// --- Initial State ---
const initialState: DashboardState = {
  stats: null,
  recentSubmissions: [],
  teamOverview: [],
  loading: {
    stats: false,
    recentSubmissions: false,
    teamOverview: false,
  },
  error: {
    stats: null,
    recentSubmissions: null,
    teamOverview: null,
  },
};

// Helper to extract error message
const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return (axiosError.response?.data as { message?: string })?.message || axiosError.message || "Request failed";
  }
  return error instanceof Error ? error.message : "An unknown error occurred";
};

// --- Async Thunks ---
export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/dashboard/stats");
      return response.data.data as DashboardStats;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchRecentSubmissions = createAsyncThunk(
  "dashboard/fetchRecentSubmissions",
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await api.get(`/dashboard/recent-submissions?limit=${limit}`);
      return response.data.data as RecentSubmission[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchTeamOverview = createAsyncThunk(
  "dashboard/fetchTeamOverview",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/dashboard/team-overview");
      return response.data.data as TeamMemberOverview[];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice ---
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.stats = null;
      state.recentSubmissions = [];
      state.teamOverview = [];
      state.loading = { stats: false, recentSubmissions: false, teamOverview: false };
      state.error = { stats: null, recentSubmissions: null, teamOverview: null };
    },
  },
  extraReducers: (builder) => {
    // Fetch Stats
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading.stats = true;
        state.error.stats = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action: PayloadAction<DashboardStats>) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error.stats = action.payload as string;
      });

    // Fetch Recent Submissions
    builder
      .addCase(fetchRecentSubmissions.pending, (state) => {
        state.loading.recentSubmissions = true;
        state.error.recentSubmissions = null;
      })
      .addCase(fetchRecentSubmissions.fulfilled, (state, action: PayloadAction<RecentSubmission[]>) => {
        state.loading.recentSubmissions = false;
        state.recentSubmissions = action.payload;
      })
      .addCase(fetchRecentSubmissions.rejected, (state, action) => {
        state.loading.recentSubmissions = false;
        state.error.recentSubmissions = action.payload as string;
      });

    // Fetch Team Overview
    builder
      .addCase(fetchTeamOverview.pending, (state) => {
        state.loading.teamOverview = true;
        state.error.teamOverview = null;
      })
      .addCase(fetchTeamOverview.fulfilled, (state, action: PayloadAction<TeamMemberOverview[]>) => {
        state.loading.teamOverview = false;
        state.teamOverview = action.payload;
      })
      .addCase(fetchTeamOverview.rejected, (state, action) => {
        state.loading.teamOverview = false;
        state.error.teamOverview = action.payload as string;
      });
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;