// src/store/slices/spotCheckSlice.ts
//
// Redux slice for the Spot Check module.
//
// Endpoints consumed (mounted at /spot-check):
//   POST   /                                 createSpotCheck
//   GET    /                                 fetchSpotChecks
//   GET    /library                          fetchSpotCheckLibrary
//   GET    /:id                              fetchSpotCheckById
//   PATCH  /:id                              updateSpotCheck
//   DELETE /:id                              deleteSpotCheck
//   DELETE /documents/:documentId            deleteSpotCheckDocument
//
// Submission-side links (mounted separately at /submissions):
//   POST   /:submissionId/spot-check-links   linkSpotCheckDocuments
//   DELETE /:submissionId/spot-check-links   unlinkSpotCheckDocuments
//   GET    /:submissionId/spot-check-links   fetchSubmissionSpotCheckLinks

import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";
import axios from "axios";

import type {
  ISpotCheck,
  ISpotCheckLibraryItem,
  ISubmissionSpotCheckLink,
  ISpotCheckLibraryFilters,
} from "../../types/spot-check.types";

/* ────────────────────────────────────────────────────────────────────────────
   ERROR HELPER
   ──────────────────────────────────────────────────────────────────────────── */

const extractError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
};

/* ────────────────────────────────────────────────────────────────────────────
   STATE
   ──────────────────────────────────────────────────────────────────────────── */

export interface ISpotCheckListFilters {
  station?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface SpotCheckState {
  /* Library (admin side) */
  spotChecks: ISpotCheck[];
  spotChecksCount: number;

  /* Currently open spot check */
  selectedSpotCheck: ISpotCheck | null;

  /* Library picker (submission side) */
  libraryItems: ISpotCheckLibraryItem[];
  libraryCount: number;

  /* Links for the currently open submission */
  submissionLinks: ISubmissionSpotCheckLink[];

  /* Filters that produced the current library result */
  libraryFilters: ISpotCheckLibraryFilters;

  /* Loading flags */
  loading: boolean;         // list loads
  detailLoading: boolean;   // single record loads
  actionLoading: boolean;   // create/update/delete/link/unlink

  error: string | null;
}

const initialState: SpotCheckState = {
  spotChecks: [],
  spotChecksCount: 0,

  selectedSpotCheck: null,

  libraryItems: [],
  libraryCount: 0,

  submissionLinks: [],

  libraryFilters: {
    page: 1,
    pageSize: 30,
  },

  loading: false,
  detailLoading: false,
  actionLoading: false,
  error: null,
};

/* ────────────────────────────────────────────────────────────────────────────
   HELPERS — build query strings from filter objects
   ──────────────────────────────────────────────────────────────────────────── */

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* ────────────────────────────────────────────────────────────────────────────
   THUNKS — LIBRARY (admin side)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * POST /spot-check
 * Multipart form-data: `documents` (files) + text fields.
 */
export const createSpotCheck = createAsyncThunk(
  "spotCheck/create",
  async (
    arg: {
      station: string;
      visitDate: string;
      description: string;
      documentDescriptions?: string[];
      files: File[];
    },
    { rejectWithValue }
  ) => {
    try {
      const form = new FormData();
      form.append("station", arg.station);
      form.append("visitDate", arg.visitDate);
      form.append("description", arg.description);

      if (arg.documentDescriptions && arg.documentDescriptions.length > 0) {
        for (const d of arg.documentDescriptions) {
          form.append("documentDescriptions", d);
        }
      }

      for (const file of arg.files) {
        form.append("documents", file);
      }

      const res = await apiPrivate.post("/spot-check", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.data as ISpotCheck;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * GET /spot-check
 */
export const fetchSpotChecks = createAsyncThunk(
  "spotCheck/fetchAll",
  async (filters: ISpotCheckListFilters, { rejectWithValue }) => {
    try {
      const qs = buildQuery({
        station: filters.station,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        search: filters.search,
        page: filters.page,
        pageSize: filters.pageSize,
      });

      const res = await apiPrivate.get(`/spot-check${qs}`);
      return {
        data: res.data.data as ISpotCheck[],
        count: res.data.count as number,
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * GET /spot-check/:id
 */
export const fetchSpotCheckById = createAsyncThunk(
  "spotCheck/fetchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(`/spot-check/${id}`);
      return res.data.data as ISpotCheck;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * PATCH /spot-check/:id
 * Supports updating metadata and/or appending new files.
 */
export const updateSpotCheck = createAsyncThunk(
  "spotCheck/update",
  async (
    arg: {
      id: string;
      station?: string;
      visitDate?: string;
      description?: string;
      documentDescriptions?: string[];
      files?: File[];
    },
    { rejectWithValue }
  ) => {
    try {
      const form = new FormData();

      if (arg.station !== undefined) form.append("station", arg.station);
      if (arg.visitDate !== undefined) form.append("visitDate", arg.visitDate);
      if (arg.description !== undefined)
        form.append("description", arg.description);

      if (arg.documentDescriptions && arg.documentDescriptions.length > 0) {
        for (const d of arg.documentDescriptions) {
          form.append("documentDescriptions", d);
        }
      }

      if (arg.files && arg.files.length > 0) {
        for (const file of arg.files) {
          form.append("documents", file);
        }
      }

      const res = await apiPrivate.patch(`/spot-check/${arg.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return res.data.data as ISpotCheck;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * DELETE /spot-check/:id
 */
export const deleteSpotCheck = createAsyncThunk(
  "spotCheck/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/spot-check/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * DELETE /spot-check/documents/:documentId
 */
export const deleteSpotCheckDocument = createAsyncThunk(
  "spotCheck/deleteDocument",
  async (
    arg: { documentId: string; spotCheckId: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      await apiPrivate.delete(`/spot-check/documents/${arg.documentId}`, {
        data: { reason: arg.reason },
      });
      return arg;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ────────────────────────────────────────────────────────────────────────────
   THUNKS — LIBRARY PICKER (submission page)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * GET /spot-check/library
 * Flat list of documents available for linking.
 */
export const fetchSpotCheckLibrary = createAsyncThunk(
  "spotCheck/fetchLibrary",
  async (filters: ISpotCheckLibraryFilters, { rejectWithValue }) => {
    try {
      const qs = buildQuery({
        station: filters.station,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        search: filters.search,
        page: filters.page,
        pageSize: filters.pageSize,
      });

      const res = await apiPrivate.get(`/spot-check/library${qs}`);
      return {
        data: res.data.data as ISpotCheckLibraryItem[],
        count: res.data.count as number,
        filters,
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ────────────────────────────────────────────────────────────────────────────
   THUNKS — SUBMISSION LINKS
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * POST /submissions/:submissionId/spot-check-links
 */
export const linkSpotCheckDocuments = createAsyncThunk(
  "spotCheck/linkDocuments",
  async (
    arg: {
      submissionId: string;       // may be "new"
      spotCheckDocumentIds: string[];
      indicatorId?: string;
      quarter?: number;
      year?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiPrivate.post(
        `/submissions/${arg.submissionId}/spot-check-links`,
        {
          spotCheckDocumentIds: arg.spotCheckDocumentIds,
          indicatorId: arg.indicatorId,
          quarter: arg.quarter,
          year: arg.year,
        }
      );

      return {
        submissionId: res.data.submissionId as string,
        submission: res.data.data?.submission,
        linked: res.data.data?.linked,
        skipped: res.data.data?.skipped,
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * DELETE /submissions/:submissionId/spot-check-links
 */
export const unlinkSpotCheckDocuments = createAsyncThunk(
  "spotCheck/unlinkDocuments",
  async (
    arg: { submissionId: string; spotCheckDocumentIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      await apiPrivate.delete(
        `/submissions/${arg.submissionId}/spot-check-links`,
        { data: { spotCheckDocumentIds: arg.spotCheckDocumentIds } }
      );

      return arg;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * GET /submissions/:submissionId/spot-check-links
 */
export const fetchSubmissionSpotCheckLinks = createAsyncThunk(
  "spotCheck/fetchSubmissionLinks",
  async (submissionId: string, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get(
        `/submissions/${submissionId}/spot-check-links`
      );
      return res.data.data as ISubmissionSpotCheckLink[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ────────────────────────────────────────────────────────────────────────────
   SLICE
   ──────────────────────────────────────────────────────────────────────────── */

const spotCheckSlice = createSlice({
  name: "spotCheck",
  initialState,
  reducers: {
    clearSpotCheckError(state) {
      state.error = null;
    },
    clearSelectedSpotCheck(state) {
      state.selectedSpotCheck = null;
    },
    clearLibrary(state) {
      state.libraryItems = [];
      state.libraryCount = 0;
    },
    clearSubmissionLinks(state) {
      state.submissionLinks = [];
    },
    setLibraryFilters(
      state,
      action: PayloadAction<ISpotCheckLibraryFilters>
    ) {
      state.libraryFilters = { ...state.libraryFilters, ...action.payload };
    },
  },

  extraReducers: (builder) => {
    /* ── createSpotCheck ── */
    builder
      .addCase(createSpotCheck.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createSpotCheck.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        state.spotChecks.unshift(payload);
        state.spotChecksCount += 1;
      })
      .addCase(createSpotCheck.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── fetchSpotChecks ── */
    builder
      .addCase(fetchSpotChecks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpotChecks.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.spotChecks = payload.data;
        state.spotChecksCount = payload.count;
      })
      .addCase(fetchSpotChecks.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      });

    /* ── fetchSpotCheckById ── */
    builder
      .addCase(fetchSpotCheckById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchSpotCheckById.fulfilled, (state, { payload }) => {
        state.detailLoading = false;
        state.selectedSpotCheck = payload;

        /* Keep the list in sync if this record is already loaded */
        const idx = state.spotChecks.findIndex((s) => s.id === payload.id);
        if (idx !== -1) state.spotChecks[idx] = payload;
        else state.spotChecks.unshift(payload);
      })
      .addCase(fetchSpotCheckById.rejected, (state, { payload }) => {
        state.detailLoading = false;
        state.error = payload as string;
      });

    /* ── updateSpotCheck ── */
    builder
      .addCase(updateSpotCheck.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateSpotCheck.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        state.selectedSpotCheck = payload;

        const idx = state.spotChecks.findIndex((s) => s.id === payload.id);
        if (idx !== -1) state.spotChecks[idx] = payload;
      })
      .addCase(updateSpotCheck.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── deleteSpotCheck ── */
    builder
      .addCase(deleteSpotCheck.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteSpotCheck.fulfilled, (state, { payload: id }) => {
        state.actionLoading = false;
        state.spotChecks = state.spotChecks.filter((s) => s.id !== id);
        state.spotChecksCount = Math.max(0, state.spotChecksCount - 1);

        if (state.selectedSpotCheck?.id === id) {
          state.selectedSpotCheck = null;
        }
      })
      .addCase(deleteSpotCheck.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── deleteSpotCheckDocument ── */
    builder
      .addCase(deleteSpotCheckDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(
        deleteSpotCheckDocument.fulfilled,
        (state, { payload }) => {
          state.actionLoading = false;
          const { documentId, spotCheckId } = payload;

          const applyRemoval = (sc: ISpotCheck) => ({
            ...sc,
            documents: sc.documents.filter((d) => d.id !== documentId),
          });

          const idx = state.spotChecks.findIndex((s) => s.id === spotCheckId);
          if (idx !== -1) state.spotChecks[idx] = applyRemoval(state.spotChecks[idx]);

          if (state.selectedSpotCheck?.id === spotCheckId) {
            state.selectedSpotCheck = applyRemoval(state.selectedSpotCheck);
          }

          /* Also drop from the library list if present */
          state.libraryItems = state.libraryItems.filter(
            (item) => item.documentId !== documentId
          );
        }
      )
      .addCase(deleteSpotCheckDocument.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── fetchSpotCheckLibrary ── */
    builder
      .addCase(fetchSpotCheckLibrary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpotCheckLibrary.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.libraryItems = payload.data;
        state.libraryCount = payload.count;
        state.libraryFilters = payload.filters;
      })
      .addCase(fetchSpotCheckLibrary.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload as string;
      });

    /* ── linkSpotCheckDocuments ── */
    builder
      .addCase(linkSpotCheckDocuments.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(linkSpotCheckDocuments.fulfilled, (state, { payload }) => {
        state.actionLoading = false;

        /* Merge new links into the current submissionLinks array,
           skipping ones that were already present. */
        const existingIds = new Set(
          state.submissionLinks.map((l) => l.spotCheckDocumentId)
        );
        for (const link of payload.linked) {
          if (!existingIds.has(link.spotCheckDocumentId)) {
            state.submissionLinks.push(link);
          }
        }
      })
      .addCase(linkSpotCheckDocuments.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── unlinkSpotCheckDocuments ── */
    builder
      .addCase(unlinkSpotCheckDocuments.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(unlinkSpotCheckDocuments.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const removeSet = new Set(payload.spotCheckDocumentIds);
        state.submissionLinks = state.submissionLinks.filter(
          (l) => !removeSet.has(l.spotCheckDocumentId)
        );
      })
      .addCase(unlinkSpotCheckDocuments.rejected, (state, { payload }) => {
        state.actionLoading = false;
        state.error = payload as string;
      });

    /* ── fetchSubmissionSpotCheckLinks ── */
    builder
      .addCase(fetchSubmissionSpotCheckLinks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSubmissionSpotCheckLinks.fulfilled,
        (state, { payload }) => {
          state.loading = false;
          state.submissionLinks = payload;
        }
      )
      .addCase(
        fetchSubmissionSpotCheckLinks.rejected,
        (state, { payload }) => {
          state.loading = false;
          state.error = payload as string;
        }
      );
  },
});

/* ────────────────────────────────────────────────────────────────────────────
   ACTIONS
   ──────────────────────────────────────────────────────────────────────────── */

export const {
  clearSpotCheckError,
  clearSelectedSpotCheck,
  clearLibrary,
  clearSubmissionLinks,
  setLibraryFilters,
} = spotCheckSlice.actions;

export default spotCheckSlice.reducer;