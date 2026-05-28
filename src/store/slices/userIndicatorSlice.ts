import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { api } from "../../api/axios";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface IDocumentUI {
  id: string;
  fileName?: string;
  evidenceUrl: string;
  status?: string;
  rejectionReason?: string;
  description?: string;
  uploadedAt?: string;
}

export interface ISubmissionUI {
  id: string;
  quarter: number;         // 0 = Annual, 1-4 = Q1-Q4
  year: number;
  achievedValue?: number;
  notes?: string;
  reviewStatus?: string;   // "Pending" | "Accepted" | "Rejected"
  adminComment?: string;
  submittedAt?: string;
  resubmissionCount: number;
  documents: IDocumentUI[];
}

/** Keyed as `"Q1_2024"` | `"Q2_2024"` | `"Annual_2024"` etc. */
export type SubmissionBuckets = Record<string, ISubmissionUI[]>;

export interface IIndicatorUI {
  id: string;
  name?: string;
  perspective?: string;
  assignee_model?: string;
  assigneeName?: string;
  reporting_cycle?: string;
  reportingCycle?: string;
  target?: number;
  unit?: string;
  deadline?: string;
  progress?: number;
  status?: string;
  submissions: SubmissionBuckets;
  objective?: { title?: string };
  activity?: { description?: string };
  currentQuarter?: number;
  currentYear?: number;
  [key: string]: unknown;
}

interface UserIndicatorState {
  indicators: IIndicatorUI[];
  myIndicators: IIndicatorUI[];
  rejectedIndicators: IIndicatorUI[];
  selectedIndicator: IIndicatorUI | null;
  currentIndicator: IIndicatorUI | null;
  loading: boolean;
  actionLoading: boolean;
  uploading: boolean;
  error: string | null;
  lastSubmissionId: string | null;
}

const initialState: UserIndicatorState = {
  indicators: [],
  myIndicators: [],
  rejectedIndicators: [],
  selectedIndicator: null,
  currentIndicator: null,
  loading: false,
  actionLoading: false,
  uploading: false,
  error: null,
  lastSubmissionId: null,
};

/* ─── Bucket helpers (exported) ──────────────────────────────────────────── */

export const getPendingSubmission = (
  bucket: ISubmissionUI[],
): ISubmissionUI | undefined =>
  bucket.find((s) => s.reviewStatus === "Pending");

export const getRejectedSubmission = (
  bucket: ISubmissionUI[],
): ISubmissionUI | undefined =>
  bucket
    .filter((s) => s.reviewStatus === "Rejected")
    .sort(
      (a, b) =>
        new Date(b.submittedAt ?? 0).getTime() -
        new Date(a.submittedAt ?? 0).getTime(),
    )[0];

export const getActiveSubmission = (
  bucket: ISubmissionUI[],
): ISubmissionUI | undefined =>
  getPendingSubmission(bucket) ??
  bucket.find((s) => s.reviewStatus === "Accepted") ??
  getRejectedSubmission(bucket);

export const getCurrentQuarterReviewStatus = (
  indicator: IIndicatorUI,
): string | null => {
  const key = _activeKey(indicator);
  if (!key) return null;
  const bucket = indicator.submissions?.[key] ?? [];
  return getActiveSubmission(bucket)?.reviewStatus ?? null;
};

export const canSubmitForCurrentQuarter = (indicator: IIndicatorUI): boolean => {
  const key = _activeKey(indicator);
  if (!key) return true;
  const bucket = indicator.submissions?.[key] ?? [];
  return bucket.every(
    (s) => s.reviewStatus === "Rejected" || s.reviewStatus == null,
  );
};

export const hasSubmissionForCurrentQuarter = (
  indicator: IIndicatorUI,
): boolean => {
  const key = _activeKey(indicator);
  if (!key) return false;
  return (indicator.submissions?.[key]?.length ?? 0) > 0;
};

export const flattenSubmissions = (indicator: IIndicatorUI): ISubmissionUI[] =>
  Object.values(indicator.submissions ?? {})
    .flat()
    .sort(
      (a, b) =>
        new Date(b.submittedAt ?? 0).getTime() -
        new Date(a.submittedAt ?? 0).getTime(),
    );

export const getActiveQuarterDisplay = (indicator: IIndicatorUI): string => {
  if (
    indicator.reporting_cycle === "Annual" ||
    indicator.reportingCycle === "Annual"
  )
    return "Annual";
  const q = indicator.currentQuarter ?? _currentQuarter();
  return `Q${q}`;
};

/* ─── Private helpers ────────────────────────────────────────────────────── */

const _currentQuarter = (): number => Math.ceil((new Date().getMonth() + 1) / 3);

const _activeKey = (indicator: IIndicatorUI): string | null => {
  const year = indicator.currentYear ?? new Date().getFullYear();
  if (
    indicator.reporting_cycle === "Annual" ||
    indicator.reportingCycle === "Annual"
  )
    return `Annual_${year}`;
  const q = indicator.currentQuarter ?? _currentQuarter();
  return `Q${q}_${year}`;
};

/* ─── Thunks (corrected endpoints) ──────────────────────────────────────── */

/** GET /user-indicators/my-assignments */
export const fetchMyIndicators = createAsyncThunk(
  "userIndicators/fetchMyIndicators",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/user-indicators/my-assignments");
      return (data.data ?? []) as IIndicatorUI[];
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to fetch indicators",
      );
    }
  },
);

/** GET /user-indicators/rejects */
export const fetchRejectedSubmissions = createAsyncThunk(
  "userIndicators/fetchRejectedSubmissions",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/user-indicators/rejects");
      return (data.data ?? []) as IIndicatorUI[];
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to fetch rejected submissions",
      );
    }
  },
);

/** GET /user-indicators/:id */
export const fetchIndicatorDetails = createAsyncThunk(
  "userIndicators/fetchIndicatorDetails",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/user-indicators/${id}`);
      return data.data as IIndicatorUI;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to fetch indicator details",
      );
    }
  },
);

/** POST /user-indicators/:id/submit */
export const submitProgress = createAsyncThunk(
  "userIndicators/submitProgress",
  async (
    { id, formData }: { id: string; formData: FormData },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(
        `/user-indicators/${id}/submit`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data.data as { submissionId: string };
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to submit progress",
      );
    }
  },
);

/** POST /user-indicators/:id/resubmit */
export const resubmitProgress = createAsyncThunk(
  "userIndicators/resubmitProgress",
  async (
    { id, formData }: { id: string; formData: FormData },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(
        `/user-indicators/${id}/resubmit`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data as { submissionId: string };
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to resubmit progress",
      );
    }
  },
);

/** POST /user-indicators/:id/add-documents */
export const addDocuments = createAsyncThunk(
  "userIndicators/addDocuments",
  async (
    {
      id,
      formData,
      quarter,
      idempotencyKey,
    }: { id: string; formData: FormData; quarter?: number; idempotencyKey?: string },
    { rejectWithValue },
  ) => {
    try {
      if (quarter !== undefined) formData.append("quarter", String(quarter));
      const config: Record<string, string> = {};
      if (idempotencyKey) config["Idempotency-Key"] = idempotencyKey;
      const { data } = await api.post(
        `/user-indicators/${id}/add-documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", ...config } },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add documents",
      );
    }
  },
);

/** PATCH /user-indicators/:id/update-submission */
export const updateRejectedSubmission = createAsyncThunk(
  "userIndicators/updateRejectedSubmission",
  async (
    { id, formData, idempotencyKey }: { id: string; formData: FormData; idempotencyKey?: string },
    { rejectWithValue },
  ) => {
    try {
      const config: Record<string, string> = {};
      if (idempotencyKey) config["Idempotency-Key"] = idempotencyKey;
      const { data } = await api.patch(
        `/user-indicators/${id}/update-submission`,
        formData,
        { headers: { "Content-Type": "multipart/form-data", ...config } },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update submission",
      );
    }
  },
);

/** PATCH /user-indicators/submissions/:submissionId/documents/descriptions */
export const updateDocumentDescriptions = createAsyncThunk(
  "userIndicators/updateDocumentDescriptions",
  async (
    {
      submissionId,
      documents,
      idempotencyKey,
    }: { submissionId: string; documents: Array<{ documentId: string; description: string }>; idempotencyKey?: string },
    { rejectWithValue },
  ) => {
    try {
      const config: Record<string, string> = {};
      if (idempotencyKey) config["Idempotency-Key"] = idempotencyKey;
      const { data } = await api.patch(
        `/user-indicators/submissions/${submissionId}/documents/descriptions`,
        { documents },
        { headers: config },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update document descriptions",
      );
    }
  },
);

/** PATCH /user-indicators/documents/:docId/description */
export const updateDocumentDescription = createAsyncThunk(
  "userIndicators/updateDocumentDescription",
  async (
    {
      docId,
      description,
      idempotencyKey,
    }: { docId: string; description: string; idempotencyKey?: string },
    { rejectWithValue },
  ) => {
    try {
      const config: Record<string, string> = {};
      if (idempotencyKey) config["Idempotency-Key"] = idempotencyKey;
      const { data } = await api.patch(
        `/user-indicators/documents/${docId}/description`,
        { description },
        { headers: config },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update document description",
      );
    }
  },
);

/** DELETE /user-indicators/documents/:docId */
export const deleteDocument = createAsyncThunk(
  "userIndicators/deleteDocument",
  async (docId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/user-indicators/documents/${docId}`);
      return { docId, data };
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete document",
      );
    }
  },
);


// ─── New thunk ────────────────────────────────────────────────────────────────

/** DELETE /user-indicators/:indicatorId/submissions/:submissionId */
// Add this new thunk after your existing deleteDocument thunk

/** DELETE /user-indicators/:indicatorId/submissions/:submissionId/documents/:docId */
export const deletePendingDocument = createAsyncThunk(
  "userIndicators/deletePendingDocument",
  async (
    { indicatorId, submissionId, docId }: { indicatorId: string; submissionId: string; docId: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.delete(
        `/user-indicators/${indicatorId}/submissions/${submissionId}/documents/${docId}`,
      );
      return { docId, submissionId, indicatorId, data };
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete document from pending submission",
      );
    }
  },
);



/* ─── Slice ──────────────────────────────────────────────────────────────── */

const userIndicatorSlice = createSlice({
  name: "userIndicators",
  initialState,
  reducers: {
    clearIndicatorError(state) {
      state.error = null;
    },
    clearLastSubmissionId(state) {
      state.lastSubmissionId = null;
    },
    setLocalSelectedIndicator(state, action: PayloadAction<string>) {
      const found =
        state.myIndicators.find((i) => i.id === action.payload) ??
        state.indicators.find((i) => i.id === action.payload) ??
        null;
      state.selectedIndicator = found;
    },
    optimisticUpdateDocumentDescription(
      state,
      action: PayloadAction<{ docId: string; description: string }>,
    ) {
      const { docId, description } = action.payload;
      const patch = (indicator: IIndicatorUI | null) => {
        if (!indicator?.submissions) return;
        for (const bucket of Object.values(indicator.submissions)) {
          for (const sub of bucket) {
            const doc = sub.documents?.find((d) => d.id === docId);
            if (doc) doc.description = description;
          }
        }
      };
      patch(state.currentIndicator);
      patch(state.selectedIndicator);
    },
    optimisticRemoveSubmission(                                     // ← moved INSIDE reducers: {}
      state,
      action: PayloadAction<{ submissionId: string; indicatorId: string }>,
    ) {
      const { submissionId } = action.payload;
      const patch = (indicator: IIndicatorUI | null) => {
        if (!indicator?.submissions) return;
        for (const key of Object.keys(indicator.submissions)) {
          indicator.submissions[key] = indicator.submissions[key].filter(
            (s) => s.id !== submissionId,
          );
          if (indicator.submissions[key].length === 0)
            delete indicator.submissions[key];
        }
      };
      patch(state.currentIndicator);
      patch(state.selectedIndicator);
      for (const ind of [...state.myIndicators, ...state.indicators]) {
        if (ind.id === action.payload.indicatorId) patch(ind);
      }
    },
  },

  extraReducers: (builder) => {
    // fetchMyIndicators
    builder
      .addCase(fetchMyIndicators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyIndicators.fulfilled, (state, action) => {
        state.loading = false;
        state.indicators = action.payload;
        state.myIndicators = action.payload;
      })
      .addCase(fetchMyIndicators.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to fetch indicators";
      });

    // fetchRejectedSubmissions
    builder
      .addCase(fetchRejectedSubmissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRejectedSubmissions.fulfilled, (state, action) => {
        state.loading = false;
        state.rejectedIndicators = action.payload;
      })
      .addCase(fetchRejectedSubmissions.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to fetch rejected submissions";
      });

    // fetchIndicatorDetails
    builder
      .addCase(fetchIndicatorDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIndicatorDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedIndicator = action.payload;
        state.currentIndicator = action.payload;
      })
      .addCase(fetchIndicatorDetails.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Failed to fetch indicator details";
      });

    // submitProgress
    builder
      .addCase(submitProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(submitProgress.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload?.submissionId ?? null;
      })
      .addCase(submitProgress.rejected, (state, action) => {
        state.uploading = false;
        state.error = (action.payload as string) ?? "Failed to submit progress";
      });

    // resubmitProgress
    builder
      .addCase(resubmitProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(resubmitProgress.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload?.submissionId ?? null;
      })
      .addCase(resubmitProgress.rejected, (state, action) => {
        state.uploading = false;
        state.error =
          (action.payload as string) ?? "Failed to resubmit progress";
      });

    // deletePendingSubmission                                       // ← moved INSIDE extraReducers
    // Add this after the deleteDocument case
builder
  .addCase(deletePendingDocument.pending, (state) => {
    state.actionLoading = true;
    state.error = null;
  })
  .addCase(deletePendingDocument.fulfilled, (state, action) => {
    state.actionLoading = false;
    const { docId, submissionId } = action.payload;
    
    const removeDocumentFromIndicator = (indicator: IIndicatorUI | null) => {
      if (!indicator?.submissions) return;
      for (const bucket of Object.values(indicator.submissions)) {
        for (const sub of bucket) {
          if (sub.id === submissionId) {
            const idx = sub.documents?.findIndex((d) => d.id === docId);
            if (idx !== undefined && idx !== -1 && sub.documents) {
              sub.documents.splice(idx, 1);
            }
          }
        }
      }
    };
    
    removeDocumentFromIndicator(state.currentIndicator);
    removeDocumentFromIndicator(state.selectedIndicator);
    
    // Also update in myIndicators and indicators lists
    for (const ind of [...state.myIndicators, ...state.indicators]) {
      if (ind.id === action.payload.indicatorId) {
        removeDocumentFromIndicator(ind);
      }
    }
  })
  .addCase(deletePendingDocument.rejected, (state, action) => {
    state.actionLoading = false;
    state.error = (action.payload as string) ?? "Failed to delete document from pending submission";
  });

    // addDocuments
    builder
      .addCase(addDocuments.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(addDocuments.fulfilled, (state) => {
        state.uploading = false;
      })
      .addCase(addDocuments.rejected, (state, action) => {
        state.uploading = false;
        state.error = (action.payload as string) ?? "Failed to add documents";
      });

    // updateRejectedSubmission
    builder
      .addCase(updateRejectedSubmission.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateRejectedSubmission.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateRejectedSubmission.rejected, (state, action) => {
        state.actionLoading = false;
        state.error =
          (action.payload as string) ?? "Failed to update submission";
      });

    // updateDocumentDescriptions
    builder
      .addCase(updateDocumentDescriptions.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateDocumentDescriptions.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateDocumentDescriptions.rejected, (state, action) => {
        state.actionLoading = false;
        state.error =
          (action.payload as string) ?? "Failed to update document descriptions";
      });

    // updateDocumentDescription
    builder
      .addCase(updateDocumentDescription.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateDocumentDescription.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateDocumentDescription.rejected, (state, action) => {
        state.actionLoading = false;
        state.error =
          (action.payload as string) ?? "Failed to update document description";
      });

    // deleteDocument
    builder
      .addCase(deleteDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.actionLoading = false;
        const docId = action.payload.docId;
        const removeFromIndicator = (indicator: IIndicatorUI | null) => {
          if (!indicator?.submissions) return;
          for (const bucket of Object.values(indicator.submissions)) {
            for (const sub of bucket) {
              const idx = sub.documents?.findIndex((d) => d.id === docId);
              if (idx !== undefined && idx !== -1 && sub.documents) {
                sub.documents.splice(idx, 1);
              }
            }
          }
        };
        removeFromIndicator(state.currentIndicator);
        removeFromIndicator(state.selectedIndicator);
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? "Failed to delete document";
      });

    // Generic rejected matcher
    builder.addMatcher(
      (action): action is PayloadAction<string | undefined> =>
        typeof action.type === "string" &&
        action.type.startsWith("userIndicators/") &&
        action.type.endsWith("/rejected"),
      (state, action) => {
        state.loading = false;
        state.actionLoading = false;
        state.uploading = false;
        if (!state.error) {
          state.error =
            (action.payload as string) ?? "An unexpected error occurred";
        }
      },
    );
  },
});

/* ─── Actions ────────────────────────────────────────────────────────────── */

export const {
  clearIndicatorError,
  clearLastSubmissionId,
  setLocalSelectedIndicator,
  optimisticUpdateDocumentDescription,
} = userIndicatorSlice.actions;

/* ─── Aliases ─────────────────────────────────────────────────────────────── */

export const fetchMyAssignments = fetchMyIndicators;
export const submitIndicatorProgress = submitProgress;
export const resubmitIndicatorProgress = resubmitProgress;
export const addIndicatorDocuments = addDocuments;
export const updateSubmission = updateRejectedSubmission;

export default userIndicatorSlice.reducer;