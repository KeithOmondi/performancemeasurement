import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ─── TYPES ─────────────────────────────────────────────────────────────── */

export interface IDashboardStats {
  total:                 number;
  assigned:              number;
  unassigned:            number;
  overdue:               number;
  pendingReview:         number;
  approved:              number;
  rejected:              number;
  returnedForCorrection: number;
}

export interface IPerspectiveStat {
  name:                 string;
  totalActivities:      number;
  assignedActivities:   number;
  completionPercentage: number;
}

export interface IRecentSubmission {
  submissionId:   string;
  indicatorTitle: string;
  submittedBy:    string;
  submittedOn:    string;
  quarter:        number;
  achievedValue:  number;
  reviewStatus:   string;
  documentsCount: number;
}

export interface IDashboardData {
  stats:             IDashboardStats;
  perspectives:      IPerspectiveStat[];
  recentSubmissions: IRecentSubmission[];
}

interface DashboardState {
  data:    IDashboardData | null;
  loading: boolean;
  error:   string | null;
}

/* ─── INITIAL STATE ──────────────────────────────────────────────────────── */

const initialState: DashboardState = {
  data:    null,
  loading: false,
  error:   null,
};

/* ─── THUNK ──────────────────────────────────────────────────────────────── */

export const fetchDashboardStats = createAsyncThunk<
  IDashboardData,
  void,
  { rejectValue: string }
>(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ success: boolean; data: IDashboardData }>(
        "/dashboard/stats"
      );
      return response.data.data;
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
        return rejectWithValue(
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to load dashboard"
        );
      }
      return rejectWithValue("Failed to load dashboard");
    }
  }
);

/* ─── SLICE ──────────────────────────────────────────────────────────────── */

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
        state.error   = null;
      })
      .addCase(
        fetchDashboardStats.fulfilled,
        (state, action: PayloadAction<IDashboardData>) => {
          state.loading = false;
          state.data    = action.payload;
        }
      )
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload ?? "An unexpected error occurred";
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;