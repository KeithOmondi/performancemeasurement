import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface IDashboardStats {
  general: {
    total: number;
    users: number;
    awaitingReview: number;
    approved: number;
    rejected: number;
    overdue: number;
    assigned: number;
  };
  perspectiveStats: Array<{
    name: string;
    val: number;
    count: number;
  }>;
}

interface DashboardState {
  stats: IDashboardStats | null;
  loading: boolean;
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

const initialState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

export const fetchDashboardStats = createAsyncThunk<
  IDashboardStats,
  void,
  { rejectValue: string }
>(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get<{ data: IDashboardStats }>("/indicators/dashboard-stats");
      return response.data.data;
    } catch (error) {
      const err = error as KnownError;
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load dashboard stats"
      );
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDashboardStats.fulfilled,
        (state, action: PayloadAction<IDashboardStats>) => {
          state.loading = false;
          state.stats = action.payload;
        }
      )
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "An unexpected error occurred";
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;