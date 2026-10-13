import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface StreamFileState {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
  requestId: string | null;
}

interface KnownError {
  response?: {
    data?: unknown;
  };
  message?: string;
}

/* ─── INITIAL STATE ────────────────────────────────────────────────── */

const initialState: StreamFileState = {
  blobUrl: null,
  loading: false,
  error: null,
  requestId: null,
};

/* ─── HELPERS ─────────────────────────────────────────────────────── */

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export const getFileExt = (name: string | undefined) =>
  name ? name.split(/[#?]/)[0].split(".").pop()?.toLowerCase() ?? "" : "";

/* ─── THUNK ───────────────────────────────────────────────────────── */

export const streamFile = createAsyncThunk<
  string, // Return type (the blob URL)
  { url: string; fileName?: string }, // Argument type
  { rejectValue: string }
>(
  "streamFile/fetch",
  async ({ url, fileName }, thunkAPI) => {
    try {
      // ✅ responseType: "blob" tells axios to treat the response as binary
      const response = await apiPrivate.get<Blob>("/user-indicators/stream-file", {
        params: { url },
        responseType: "blob",
      });

      // ✅ Force a renderable MIME type — the host may send application/octet-stream,
      // which stops iframes/img tags from rendering the blob inline
      const mime = MIME_BY_EXT[getFileExt(url)] ?? MIME_BY_EXT[getFileExt(fileName)];
      const blob =
        mime && response.data.type !== mime
          ? new Blob([response.data], { type: mime })
          : response.data;

      // ✅ Create a local blob URL the browser can render inline
      return URL.createObjectURL(blob);
    } catch (err) {
      const error = err as KnownError;
      let message: string | undefined;
      // ✅ Error bodies arrive as Blobs because of responseType: "blob"
      const data = error.response?.data;
      if (data instanceof Blob) {
        try {
          message = JSON.parse(await data.text())?.message;
        } catch {
          /* non-JSON body */
        }
      }
      return thunkAPI.rejectWithValue(message || error.message || "Failed to stream file");
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
      state.loading = false;
      state.requestId = null;
    },
    clearStreamError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(streamFile.pending, (state, action) => {
        state.requestId = action.meta.requestId;
        state.loading = true;
        state.error = null;
        // ✅ Revoke previous blob URL before loading a new one to prevent memory leaks
        if (state.blobUrl) {
          URL.revokeObjectURL(state.blobUrl);
          state.blobUrl = null;
        }
      })
      .addCase(streamFile.fulfilled, (state, action) => {
        // ✅ Ignore responses for a file that is no longer being previewed
        if (action.meta.requestId !== state.requestId) {
          URL.revokeObjectURL(action.payload);
          return;
        }
        state.loading = false;
        state.blobUrl = action.payload;
      })
      .addCase(streamFile.rejected, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.loading = false;
        state.error = action.payload ?? "An unexpected error occurred while streaming";
      });
  },
});

export const { revokeBlobUrl, clearStreamError } = streamFileSlice.actions;
export default streamFileSlice.reducer;
