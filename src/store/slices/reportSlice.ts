import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/axios';

// --- Interfaces based on your Controller & Schema ---
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
  quarter: number;
  achievedValue: number;
  reviewStatus: "Accepted" | "Rejected" | "Pending";
  submittedAt: string;
  notes: string;
  adminComment?: string;
  userDetails: { name: string; pfNumber: string };
}

interface IndividualPerformance {
  _id: string;
  name: string;
  pfNumber: string;
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
    error: string | null 
  };
  individual: { data: IndividualPerformance[]; loading: boolean; error: string | null };
}

const initialState: ReportState = {
  summary: { data: [], loading: false, error: null },
  reviewLog: { data: [], stats: { approved: 0, rejected: 0 }, loading: false, error: null },
  individual: { data: [], loading: false, error: null },
};

// --- Async Thunks ---

export const fetchSummaryReport = createAsyncThunk('reports/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/reports/summary');
    return response.data;
  } catch (err: any) {
    return rejectWithValue(err.response.data.message || 'Failed to fetch summary');
  }
});

export const fetchReviewLog = createAsyncThunk('reports/fetchReviewLog', async (status: string, { rejectWithValue }) => {
  try {
    const response = await api.get(`/reports/review-log?status=${status}`);
    return response.data; // Expecting { logs: [], stats: {} }
  } catch (err: any) {
    return rejectWithValue(err.response.data.message || 'Failed to fetch review log');
  }
});

export const fetchIndividualPerformance = createAsyncThunk('reports/fetchIndividual', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/reports/individual');
    return response.data;
  } catch (err: any) {
    return rejectWithValue(err.response.data.message || 'Failed to fetch staff performance');
  }
});

// --- Slice ---

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Summary
    builder.addCase(fetchSummaryReport.pending, (state) => { state.summary.loading = true; });
    builder.addCase(fetchSummaryReport.fulfilled, (state, action) => {
      state.summary.loading = false;
      state.summary.data = action.payload;
    });
    // Review Log
    builder.addCase(fetchReviewLog.pending, (state) => { state.reviewLog.loading = true; });
    builder.addCase(fetchReviewLog.fulfilled, (state, action) => {
      state.reviewLog.loading = false;
      state.reviewLog.data = action.payload.logs;
      state.reviewLog.stats = action.payload.stats;
    });
    // Individual
    builder.addCase(fetchIndividualPerformance.pending, (state) => { state.individual.loading = true; });
    builder.addCase(fetchIndividualPerformance.fulfilled, (state, action) => {
      state.individual.loading = false;
      state.individual.data = action.payload;
    });
  },
});

export default reportSlice.reducer;