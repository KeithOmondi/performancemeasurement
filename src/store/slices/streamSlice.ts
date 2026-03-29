import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios"; // ✅ adjust path

/* ---------------- TYPES ---------------- */

interface StreamFileState {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
}

/* ---------------- INITIAL STATE ---------------- */

const initialState: StreamFileState = {
  blobUrl: null,
  loading: false,
  error: null,
};

/* ---------------- THUNK ---------------- */

export const streamFile = createAsyncThunk(
  "streamFile/fetch",
  async (url: string, thunkAPI) => {
    try {
      const response = await apiPrivate.get("/user-indicators/stream-file", {
        params: { url },
        responseType: "blob", // ✅ axios returns raw binary
      });

      // ✅ Create a local blob URL the browser can render inline
      const blobUrl = URL.createObjectURL(response.data);
      return blobUrl;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to stream file"
      );
    }
  }
);

/* ---------------- SLICE ---------------- */

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
        // ✅ Revoke previous blob URL before loading a new one
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
        state.error = action.payload as string;
      });
  },
});

export const { revokeBlobUrl, clearStreamError } = streamFileSlice.actions;
export default streamFileSlice.reducer;