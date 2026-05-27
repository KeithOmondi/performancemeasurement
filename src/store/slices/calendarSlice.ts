import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarEventType =
  | "deadline"
  | "submission"
  | "resubmission"
  | "review"
  | "reopen";

export interface ICalendarEvent {
  id: string;
  indicatorId: string;
  title: string;
  type: CalendarEventType;
  date: string;
  endDate?: string;
  status: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  quarter: number | null;
  year: number | null;
  reportingCycle: "Quarterly" | "Annual";
  perspective: string | null;
  objectiveTitle: string | null;
  activityDescription: string | null;
  meta?: {
    reason?: string;
    comment?: string;
    resubmissionCount?: number;
  };
}

export interface IUpcomingDeadline {
  id: string;
  indicatorId: string;
  date: string;
  status: string;
  quarter: number;
  reportingCycle: "Quarterly" | "Annual";
  year: number;
  assigneeName: string | null;
  assigneeEmail: string | null;
  activityDescription: string | null;
  perspective: string | null;
  objectiveTitle: string | null;
  days_remaining: number;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface ICalendarFeedParams {
  from?: string;
  to?: string;
  assigneeId?: string;
  status?: string;
  cycle?: "Quarterly" | "Annual";
}

export interface IUpcomingDeadlinesParams {
  days?: number;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface ICalendarState {
  // Full feed — all indicators, all event types
  events: ICalendarEvent[];

  // Per-indicator timeline (keyed by indicatorId)
  indicatorEvents: Record<string, ICalendarEvent[]>;

  // Upcoming deadlines widget
  upcomingDeadlines: IUpcomingDeadline[];
  upcomingWindowDays: number;

  // Active filters (mirrors last fetch params so UI can reflect them)
  activeFilters: ICalendarFeedParams;

  isLoadingFeed: boolean;
  isLoadingIndicator: boolean;
  isLoadingUpcoming: boolean;
  error: string | null;
}

const initialState: ICalendarState = {
  events: [],
  indicatorEvents: {},
  upcomingDeadlines: [],
  upcomingWindowDays: 30,
  activeFilters: {},
  isLoadingFeed: false,
  isLoadingIndicator: false,
  isLoadingUpcoming: false,
  error: null,
};

// ─── Error Extraction ─────────────────────────────────────────────────────────

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

const extractError = (error: unknown, fallback: string): string => {
  const err = error as KnownError;
  return err.response?.data?.message ?? err.message ?? fallback;
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchCalendarEvents = createAsyncThunk<
  ICalendarEvent[],
  ICalendarFeedParams | undefined,
  { rejectValue: string }
>("calendar/fetchFeed", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.from)       query.set("from",       params.from);
    if (params?.to)         query.set("to",         params.to);
    if (params?.assigneeId) query.set("assigneeId", params.assigneeId);
    if (params?.status)     query.set("status",     params.status);
    if (params?.cycle)      query.set("cycle",      params.cycle);

    const res = await api.get<{ data: ICalendarEvent[] }>(
      `/admin/calendar?${query.toString()}`
    );
    return res.data?.data ?? [];
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load calendar events"));
  }
});

export const fetchIndicatorCalendarEvents = createAsyncThunk<
  { indicatorId: string; events: ICalendarEvent[] },
  string,
  { rejectValue: string }
>("calendar/fetchByIndicator", async (indicatorId, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: ICalendarEvent[] }>(
      `/admin/calendar/${indicatorId}`
    );
    return { indicatorId, events: res.data?.data ?? [] };
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load indicator timeline"));
  }
});

export const fetchUpcomingDeadlines = createAsyncThunk<
  { deadlines: IUpcomingDeadline[]; windowDays: number },
  IUpcomingDeadlinesParams | undefined,
  { rejectValue: string }
>("calendar/fetchUpcoming", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.days) query.set("days", String(params.days));

    const res = await api.get<{
      data: IUpcomingDeadline[];
      windowDays: number;
    }>(`/admin/calendar/upcoming?${query.toString()}`);

    return {
      deadlines:  res.data?.data ?? [],
      windowDays: res.data?.windowDays ?? params?.days ?? 30,
    };
  } catch (error) {
    return rejectWithValue(extractError(error, "Failed to load upcoming deadlines"));
  }
});

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectEventsByType =
  (type: CalendarEventType) =>
  (events: ICalendarEvent[]): ICalendarEvent[] =>
    events.filter((e) => e.type === type);

export const selectOverdueDeadlines = (
  deadlines: IUpcomingDeadline[]
): IUpcomingDeadline[] =>
  deadlines.filter((d) => d.days_remaining <= 0);

export const selectDeadlinesWithinDays =
  (days: number) =>
  (deadlines: IUpcomingDeadline[]): IUpcomingDeadline[] =>
    deadlines.filter((d) => d.days_remaining >= 0 && d.days_remaining <= days);

// ─── Slice ────────────────────────────────────────────────────────────────────

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    setActiveFilters: (state, action: PayloadAction<ICalendarFeedParams>) => {
      state.activeFilters = action.payload;
    },
    clearCalendarError: (state) => {
      state.error = null;
    },
    clearIndicatorEvents: (state, action: PayloadAction<string>) => {
      delete state.indicatorEvents[action.payload];
    },
    resetCalendarState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ── fetchCalendarEvents ──────────────────────────────────────────────
      .addCase(fetchCalendarEvents.pending, (state, action) => {
        state.isLoadingFeed = true;
        state.error = null;
        // Snapshot the filters that triggered this fetch
        state.activeFilters = action.meta.arg ?? {};
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.isLoadingFeed = false;
        state.events = action.payload;
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.isLoadingFeed = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })

      // ── fetchIndicatorCalendarEvents ─────────────────────────────────────
      .addCase(fetchIndicatorCalendarEvents.pending, (state) => {
        state.isLoadingIndicator = true;
        state.error = null;
      })
      .addCase(fetchIndicatorCalendarEvents.fulfilled, (state, action) => {
        state.isLoadingIndicator = false;
        state.indicatorEvents[action.payload.indicatorId] =
          action.payload.events;
      })
      .addCase(fetchIndicatorCalendarEvents.rejected, (state, action) => {
        state.isLoadingIndicator = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })

      // ── fetchUpcomingDeadlines ───────────────────────────────────────────
      .addCase(fetchUpcomingDeadlines.pending, (state) => {
        state.isLoadingUpcoming = true;
        state.error = null;
      })
      .addCase(fetchUpcomingDeadlines.fulfilled, (state, action) => {
        state.isLoadingUpcoming = false;
        state.upcomingDeadlines  = action.payload.deadlines;
        state.upcomingWindowDays = action.payload.windowDays;
      })
      .addCase(fetchUpcomingDeadlines.rejected, (state, action) => {
        state.isLoadingUpcoming = false;
        state.error = action.payload ?? "An unexpected error occurred";
      });
  },
});

export const {
  setActiveFilters,
  clearCalendarError,
  clearIndicatorEvents,
  resetCalendarState,
} = calendarSlice.actions;

export default calendarSlice.reducer;