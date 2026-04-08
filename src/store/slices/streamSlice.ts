import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface StreamFileState {
  blobUrl: string | null;
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

const initialState: StreamFileState = {
  blobUrl: null,
  loading: false,
  error: null,
};

/* ─── THUNK ───────────────────────────────────────────────────────── */

export const streamFile = createAsyncThunk<
  string, // Return type (the blob URL)
  string, // Argument type (the url to fetch)
  { rejectValue: string }
>(
  "streamFile/fetch",
  async (url, thunkAPI) => {
    try {
      // ✅ responseType: "blob" tells axios to treat the response as binary
      const response = await apiPrivate.get<Blob>("/user-indicators/stream-file", {
        params: { url },
        responseType: "blob", 
      });

      // ✅ Create a local blob URL the browser can render inline
      const blobUrl = URL.createObjectURL(response.data);
      return blobUrl;
    } catch (err) {
      const error = err as KnownError;
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || "Failed to stream file"
      );
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

const streamFileSlice = createSlice({
  name: "streamFile",
  initialState,
  reducers: {
    // ✅ Call this when modal closes to free browser memory
    revokeBlobUrl: (state) => {
      if (state.blobUrl) {
        URL.revokeObjectURL(state.blobUrl);
      }
      state.blobUrl = null;
      state.error = null;
    },
    clearStreamError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(streamFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        // ✅ Revoke previous blob URL before loading a new one to prevent memory leaks
        if (state.blobUrl) {
          URL.revokeObjectURL(state.blobUrl);
          state.blobUrl = null;
        }
      })
      .addCase(streamFile.fulfilled, (state, action) => {
        state.loading = false;
        state.blobUrl = action.payload;
      })
      .addCase(streamFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "An unexpected error occurred while streaming";
      });
  },
});

export const { revokeBlobUrl, clearStreamError } = streamFileSlice.actions;
export default streamFileSlice.reducer;