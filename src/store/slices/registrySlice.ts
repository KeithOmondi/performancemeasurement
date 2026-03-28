import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";
import type { RootState } from "../store";

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

const initialState: RegistryState = {
  settings: [],
  loading: false,
  actionLoading: false,
  error: null,
  lastUpdated: null,
};

/* ---------------- THUNKS ---------------- */

export const fetchRegistryStatus = createAsyncThunk(
  "registry/fetchStatus",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.get("/registry/status");
      return response.data.data as IRegistrySetting[];
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch registry status"
      );
    }
  }
);

export const updateRegistryConfig = createAsyncThunk(
  "registry/updateConfig",
  async (data: Partial<IRegistrySetting>, { rejectWithValue }) => {
    try {
      const response = await apiPrivate.post("/registry/configure", data);
      return response.data.data as IRegistrySetting;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update configuration"
      );
    }
  }
);

export const toggleRegistryLock = createAsyncThunk(
  "registry/toggleLock",
  async (
    arg: { id: string; lockedReason?: string }, // Updated to match backend field
    { rejectWithValue }
  ) => {
    try {
      const response = await apiPrivate.patch(`/registry/lock/${arg.id}`, {
        lockedReason: arg.lockedReason || "", // Matched controller variable
      });
      return response.data.data as IRegistrySetting;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to change lock status"
      );
    }
  }
);

export const deleteRegistryConfig = createAsyncThunk(
  "registry/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/registry/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete configuration"
      );
    }
  }
);

/* ---------------- SLICE ---------------- */

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
    // 1. ALL addCase calls go FIRST
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
      state.error = action.payload as string;
    })
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
      state.settings = state.settings.filter(s => s._id !== action.payload);
    })

    // 2. ALL addMatcher calls go LAST
    .addMatcher(
      (action) =>
        [
          updateRegistryConfig.pending.type,
          toggleRegistryLock.pending.type,
          deleteRegistryConfig.pending.type,
        ].includes(action.type),
      (state) => {
        state.actionLoading = true;
        state.error = null;
      }
    )
    .addMatcher(
      (action) =>
        [
          updateRegistryConfig.rejected.type,
          toggleRegistryLock.rejected.type,
          deleteRegistryConfig.rejected.type,
        ].includes(action.type),
      (state, action: any) => { // Type as any or PayloadAction<string>
        state.actionLoading = false;
        state.error = action.payload || "An unexpected error occurred";
      }
    );
},
});

/* ---------------- HELPERS ---------------- */

const upsertSetting = (state: RegistryState, payload: IRegistrySetting) => {
  const index = state.settings.findIndex((s) => s._id === payload._id);
  if (index !== -1) {
    state.settings[index] = payload;
  } else {
    // If it's a new year/quarter not in list
    state.settings.push(payload);
  }
  // Keep quarters in order
  state.settings.sort((a, b) => a.year - b.year || a.quarter - b.quarter);
  state.lastUpdated = Date.now();
};

/* ---------------- SELECTORS ---------------- */

export const selectCurrentRegistryConfig = (state: RootState) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  // Find the first config that is currently open
  return state.registry.settings.find(
    (s) => s.year === currentYear && s.isOpen
  );
};

export const { clearRegistryError, resetRegistryState } = registrySlice.actions;
export default registrySlice.reducer;