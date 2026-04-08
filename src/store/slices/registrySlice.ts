import { createSlice, createAsyncThunk, type PayloadAction, isAnyOf } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";
import type { RootState } from "../store";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface IRegistrySetting {
  _id: string;
  quarter: 0 | 1 | 2 | 3 | 4;
  year: number;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  lockedReason?: string;
  isOpen?: boolean; // Computed by backend
  isExpired?: boolean; // Computed by backend
}

interface RegistryState {
  settings: IRegistrySetting[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
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

const initialState: RegistryState = {
  settings: [],
  loading: false,
  actionLoading: false,
  error: null,
  lastUpdated: null,
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

export const fetchRegistryStatus = createAsyncThunk<
  IRegistrySetting[],
  void,
  { rejectValue: string }
>("registry/fetchStatus", async (_, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.get<{ data: IRegistrySetting[] }>("/registry/status");
    return response.data.data;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(err.response?.data?.message || err.message || "Failed to fetch registry status");
  }
});

export const updateRegistryConfig = createAsyncThunk<
  IRegistrySetting,
  Partial<IRegistrySetting>,
  { rejectValue: string }
>("registry/updateConfig", async (data, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.post<{ data: IRegistrySetting }>("/registry/configure", data);
    return response.data.data;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(err.response?.data?.message || err.message || "Failed to update configuration");
  }
});

export const toggleRegistryLock = createAsyncThunk<
  IRegistrySetting,
  { id: string; lockedReason?: string },
  { rejectValue: string }
>("registry/toggleLock", async (arg, { rejectWithValue }) => {
  try {
    const response = await apiPrivate.patch<{ data: IRegistrySetting }>(`/registry/lock/${arg.id}`, {
      lockedReason: arg.lockedReason || "",
    });
    return response.data.data;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(err.response?.data?.message || err.message || "Failed to change lock status");
  }
});

export const deleteRegistryConfig = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("registry/delete", async (id, { rejectWithValue }) => {
  try {
    await apiPrivate.delete(`/registry/${id}`);
    return id;
  } catch (error) {
    const err = error as KnownError;
    return rejectWithValue(err.response?.data?.message || err.message || "Failed to delete configuration");
  }
});

/* ─── HELPERS ──────────────────────────────────────────────────────── */

const upsertSetting = (state: RegistryState, payload: IRegistrySetting) => {
  const index = state.settings.findIndex((s) => s._id === payload._id);
  if (index !== -1) {
    state.settings[index] = payload;
  } else {
    state.settings.push(payload);
  }
  state.settings.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
  state.lastUpdated = Date.now();
};

/* ─── SLICE ────────────────────────────────────────────────────────── */

const registrySlice = createSlice({
  name: "registry",
  initialState,
  reducers: {
    clearRegistryError: (state) => {
      state.error = null;
    },
    resetRegistryState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Status
      .addCase(fetchRegistryStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRegistryStatus.fulfilled, (state, action: PayloadAction<IRegistrySetting[]>) => {
        state.loading = false;
        state.settings = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchRegistryStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "An unexpected error occurred";
      })

      // Updates/Mutations
      .addCase(updateRegistryConfig.fulfilled, (state, action: PayloadAction<IRegistrySetting>) => {
        state.actionLoading = false;
        upsertSetting(state, action.payload);
      })
      .addCase(toggleRegistryLock.fulfilled, (state, action: PayloadAction<IRegistrySetting>) => {
        state.actionLoading = false;
        upsertSetting(state, action.payload);
      })
      .addCase(deleteRegistryConfig.fulfilled, (state, action: PayloadAction<string>) => {
        state.actionLoading = false;
        state.settings = state.settings.filter((s) => s._id !== action.payload);
        state.lastUpdated = Date.now();
      })

      // Mutation Pending State
      .addMatcher(
        isAnyOf(updateRegistryConfig.pending, toggleRegistryLock.pending, deleteRegistryConfig.pending),
        (state) => {
          state.actionLoading = true;
          state.error = null;
        }
      )

      // Mutation Rejected State
      .addMatcher(
        isAnyOf(updateRegistryConfig.rejected, toggleRegistryLock.rejected, deleteRegistryConfig.rejected),
        (state, action) => {
          state.actionLoading = false;
          state.error = (action.payload as string) || "An unexpected error occurred";
        }
      );
  },
});

/* ─── SELECTORS ────────────────────────────────────────────────────── */

export const selectCurrentRegistryConfig = (state: RootState) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  return state.registry.settings.find(
    (s) => s.year === currentYear && s.isOpen
  );
};

export const { clearRegistryError, resetRegistryState } = registrySlice.actions;
export default registrySlice.reducer;