import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import { api } from "../../api/axios";

// ========== Types (aligned with component usage) ==========
export interface IDashboardStats {
  total: number;                 // totalIndicators
  assigned: number;              // assignedIndicators
  unassigned: number;            // unassignedIndicators
  overdue: number;               // overdueIndicators
  pendingReview: number;         // pendingReviewIndicators
  returnedForCorrection: number; // returnedForCorrection
  approved: number;              // reviewedAndApproved
  // Optional: keep internal fields if backend uses different names
  completionPipeline?: {
    assigned: number;
    pendingReview: number;
    reviewedAndApproved: number;
    returned: number;
  };
  distribution?: {
    overdue: number;
    pendingReview: number;
    returned: number;
    onTrack: number;
  };
}

export interface IPerspectiveStat {
  name: string;                  // perspective name
  completionPercentage: number;  // averageProgress
  assignedActivities: number;    // count of assigned indicators in that perspective
  totalActivities: number;       // total indicators in that perspective
}

export interface IRecentSubmission {
  id: string;
  submitterName: string;
  submitterId: string;
  indicatorTitle: string;
  indicatorId: string;
  submittedAt: string;
  achieved: number;
  documentCount: number;
}

export interface IDashboardData {
  stats: IDashboardStats;
  perspectives: IPerspectiveStat[];
  recentSubmissions: IRecentSubmission[];
}

// ========== Slice State ==========
interface DashboardState {
  data: IDashboardData | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
};

// ========== Helper ==========
const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return (axiosError.response?.data as { message?: string })?.message || axiosError.message || "Request failed";
  }
  return error instanceof Error ? error.message : "An unknown error occurred";
};

// ========== Async Thunk ==========
// Expects backend to return { data: { stats, perspectives, recentSubmissions } }
export const fetchDashboardStats = createAsyncThunk<IDashboardData, void, { rejectValue: string }>(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/dashboard/stats");
      return response.data.data as IDashboardData;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ========== Slice ==========
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action: PayloadAction<IDashboardData>) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to load dashboard data";
      });
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;