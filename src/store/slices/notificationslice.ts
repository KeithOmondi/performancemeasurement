import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "submission_created"
  | "resubmission_received"
  | "indicator_rejected";

export interface INotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: {
    indicatorId?: string;
    submissionId?: string;
    quarter?: number;
    year?: number;
    resubmissionCount?: number;
    rejectedBy?: string;
    comment?: string;
  };
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  items: INotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

// ─── Helper to get SSE stream URL from api instance ──────────────────────────
const getNotificationStreamUrl = (): string => {
  // Get the baseURL from the api instance
  const baseURL = api.defaults.baseURL || "";
  // Remove trailing slash if exists
  const cleanBaseURL = baseURL.replace(/\/$/, "");
  return `${cleanBaseURL}/notifications/stream`;
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk<
  { data: INotification[]; unreadCount: number },
  void,
  { rejectValue: string }
>("notifications/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{
      data: INotification[];
      unreadCount: number;
    }>("/notifications");
    return res.data;
  } catch {
    return rejectWithValue("Failed to load notifications");
  }
});

export const markOneRead = createAsyncThunk<string, string, { rejectValue: string }>(
  "notifications/markOneRead",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      return id;
    } catch {
      return rejectWithValue("Failed to mark notification as read");
    }
  }
);

export const markAllRead = createAsyncThunk<void, void, { rejectValue: string }>(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await api.patch("/notifications/read-all");
    } catch {
      return rejectWithValue("Failed to mark all as read");
    }
  }
);

export const dismissNotification = createAsyncThunk<string, string, { rejectValue: string }>(
  "notifications/dismiss",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notifications/${id}`);
      return id;
    } catch {
      return rejectWithValue("Failed to dismiss notification");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Called by useNotificationSSE when a new event arrives over the stream
    pushNotification: (state, action: PayloadAction<INotification>) => {
      // Avoid duplicates (SSE flush on reconnect can re-send existing rows)
      const exists = state.items.some((n) => n.id === action.payload.id);
      if (!exists) {
        state.items.unshift(action.payload);
        if (!action.payload.isRead) state.unreadCount += 1;
      }
    },
    // Bulk-replace from SSE initial flush (array of notifications on connect)
    hydrateNotifications: (state, action: PayloadAction<INotification[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    clearNotifications: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.data;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Error";
      })

      // markOneRead
      .addCase(markOneRead.fulfilled, (state, action) => {
        const n = state.items.find((i) => i.id === action.payload);
        if (n && !n.isRead) {
          n.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // markAllRead
      .addCase(markAllRead.fulfilled, (state) => {
        state.items.forEach((n) => (n.isRead = true));
        state.unreadCount = 0;
      })

      // dismissNotification
      .addCase(dismissNotification.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload);
        if (idx !== -1) {
          if (!state.items[idx].isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.items.splice(idx, 1);
        }
      });
  },
});

export const { pushNotification, hydrateNotifications, clearNotifications } =
  notificationSlice.actions;
export { getNotificationStreamUrl }; // Export the helper for SSE hook
export default notificationSlice.reducer;