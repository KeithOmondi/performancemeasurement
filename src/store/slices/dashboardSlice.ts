import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

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

const initialState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get("/indicators/dashboard-stats");
      return response.data.data as IDashboardStats;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load dashboard stats"
      );
    }
  }
);

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
        state.error = action.payload as string;
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;