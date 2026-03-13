import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

// --- INTERFACES ---

export interface IRegistrySetting {
  _id: string;
  quarter: 1 | 2 | 3 | 4;
  year: number;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  isLocked: boolean;
}

interface RegistryState {
  settings: IRegistrySetting[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: RegistryState = {
  settings: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

// --- ASYNC THUNKS ---

/**
 * Fetch status - Adjusted to match the router's base path: /indicators/registry/status
 */
export const fetchRegistryStatus = createAsyncThunk(
  "registry/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/registry/status");
      return response.data.data; 
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch registry");
    }
  }
);

/**
 * Create/Update Config - Matches: /indicators/registry/configure
 */
export const updateRegistryConfig = createAsyncThunk(
  "registry/updateConfig",
  async (data: Partial<IRegistrySetting>, { rejectWithValue }) => {
    try {
      const response = await api.post("/registry/configure", data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Update failed");
    }
  }
);

/**
 * Toggle Lock (Emergency Freeze) - Matches: /indicators/registry/lock/:id
 */
export const toggleRegistryLock = createAsyncThunk(
  "registry/toggleLock",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/registry/lock/${id}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to toggle lock");
    }
  }
);

// --- SLICE ---

const registrySlice = createSlice({
  name: "registry",
  initialState,
  reducers: {
    clearRegistryError: (state) => {
      state.error = null;
    },
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
        state.error = action.payload as string;
      })

      // Update Config & Toggle Lock (Shared update logic)
      .addMatcher(
        (action) => 
          [updateRegistryConfig.fulfilled.type, toggleRegistryLock.fulfilled.type].includes(action.type),
        (state, action: PayloadAction<IRegistrySetting>) => {
          const index = state.settings.findIndex(
            (s) => s.quarter === action.payload.quarter && s.year === action.payload.year
          );
          
          if (index !== -1) {
            state.settings[index] = action.payload;
          } else {
            state.settings.push(action.payload);
          }
          
          // Keep settings sorted by Quarter for the UI
          state.settings.sort((a, b) => a.quarter - b.quarter);
          state.loading = false;
        }
      );
  },
});

// --- SELECTORS ---

/**
 * Helper to check if a specific quarter is currently open for submission
 */
export const selectIsQuarterOpen = (state: { registry: RegistryState }, quarter: number) => {
  const config = state.registry.settings.find((s) => s.quarter === quarter);
  if (!config || config.isLocked) return false;

  const now = new Date();
  const start = new Date(config.startDate);
  const end = new Date(config.endDate);

  return now >= start && now <= end;
};

export const { clearRegistryError } = registrySlice.actions;
export default registrySlice.reducer;