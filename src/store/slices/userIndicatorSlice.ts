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
  evidencePublicId?: string;
  fileType?: string;
  status?: string;          // "Pending" | "Rejected" | "Additional"
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
  reviewStatus?: string;   // "Pending" | "Accepted" | "Rejected" | "Partially Approved"
  adminComment?: string;
  submittedAt?: string;
  submittedBy?: string;
  submittedByName?: string;
  resubmissionCount: number;
  isReviewed?: boolean;
  approvedAmount?: number;
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
  assignedByName?: string;
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
  lastActionSuccess: string | null;
  lastResubmissionCount?: number;
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
  lastActionSuccess: null,
  lastResubmissionCount: undefined,
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

export const getAcceptedSubmission = (
  bucket: ISubmissionUI[],
): ISubmissionUI | undefined =>
  bucket.find((s) => s.reviewStatus === "Accepted");

export const getPartiallyApprovedSubmission = (
  bucket: ISubmissionUI[],
): ISubmissionUI | undefined =>
  bucket.find((s) => s.reviewStatus === "Partially Approved");

export const getActiveSubmission = (
  bucket: ISubmissionUI[],
): ISubmissionUI | undefined =>
  getPendingSubmission(bucket) ??
  getPartiallyApprovedSubmission(bucket) ??
  getAcceptedSubmission(bucket) ??
  getRejectedSubmission(bucket);

export const getCurrentQuarterReviewStatus = (
  indicator: IIndicatorUI,
): string | null => {
  const key = _activeKey(indicator);
  if (!key) return null;
  const bucket = indicator.submissions?.[key] ?? [];
  return getActiveSubmission(bucket)?.reviewStatus ?? null;
};

/**
 * ✅ FIXED: Can submit if no pending or partially approved submission exists.
 * Accepted submissions should NOT block new submissions or document additions.
 */
export const canSubmitForCurrentQuarter = (indicator: IIndicatorUI): boolean => {
  const key = _activeKey(indicator);
  if (!key) return true;
  const bucket = indicator.submissions?.[key] ?? [];
  // Only pending and partially approved block new submissions
  // Accepted submissions should allow additional documents
  return !bucket.some(
    (s) => 
      s.reviewStatus === "Pending" || 
      s.reviewStatus === "Partially Approved",
  );
};

/**
 * ✅ NEW: Check if there's an accepted submission that can have documents added
 */
export const hasAcceptedSubmission = (indicator: IIndicatorUI): boolean => {
  const key = _activeKey(indicator);
  if (!key) return false;
  const bucket = indicator.submissions?.[key] ?? [];
  return bucket.some((s) => s.reviewStatus === "Accepted");
};

/**
 * ✅ NEW: Get the accepted submission if it exists
 */
export const getAcceptedSubmissionForCurrentQuarter = (
  indicator: IIndicatorUI,
): ISubmissionUI | undefined => {
  const key = _activeKey(indicator);
  if (!key) return undefined;
  const bucket = indicator.submissions?.[key] ?? [];
  return bucket.find((s) => s.reviewStatus === "Accepted");
};

/**
 * ✅ FIXED: Has submission if there's any submission (including accepted)
 */
export const hasSubmissionForCurrentQuarter = (
  indicator: IIndicatorUI,
): boolean => {
  const key = _activeKey(indicator);
  if (!key) return false;
  return (indicator.submissions?.[key]?.length ?? 0) > 0;
};

/**
 * ✅ NEW: Check if documents can be added (pending OR accepted)
 */
export const canAddDocumentsForCurrentQuarter = (
  indicator: IIndicatorUI,
): boolean => {
  const key = _activeKey(indicator);
  if (!key) return false;
  const bucket = indicator.submissions?.[key] ?? [];
  // Can add documents if there's a pending OR accepted submission
  return bucket.some(
    (s) => s.reviewStatus === "Pending" || s.reviewStatus === "Accepted",
  );
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

export const getDocumentsForSubmission = (
  indicator: IIndicatorUI | null,
  submissionId: string,
): IDocumentUI[] => {
  if (!indicator?.submissions) return [];
  for (const bucket of Object.values(indicator.submissions)) {
    for (const sub of bucket) {
      if (sub.id === submissionId) {
        return sub.documents || [];
      }
    }
  }
  return [];
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

/* ─── Helper to update submission in state ───────────────────────────────── */

const updateSubmissionInIndicator = (
  indicator: IIndicatorUI | null,
  submissionId: string,
  updater: (submission: ISubmissionUI) => void,
): void => {
  if (!indicator?.submissions) return;
  for (const bucket of Object.values(indicator.submissions)) {
    for (const sub of bucket) {
      if (sub.id === submissionId) {
        updater(sub);
        return;
      }
    }
  }
};

const addOrUpdateSubmission = (
  indicator: IIndicatorUI | null,
  submission: ISubmissionUI,
): void => {
  if (!indicator) return;
  
  const key = submission.quarter === 0 
    ? `Annual_${submission.year}` 
    : `Q${submission.quarter}_${submission.year}`;
  
  if (!indicator.submissions) {
    indicator.submissions = {};
  }
  
  if (!indicator.submissions[key]) {
    indicator.submissions[key] = [];
  }
  
  const existingIndex = indicator.submissions[key].findIndex(
    (s) => s.id === submission.id,
  );
  
  if (existingIndex !== -1) {
    indicator.submissions[key][existingIndex] = submission;
  } else {
    indicator.submissions[key].push(submission);
  }
};

/* ─── Helper to build FormData ───────────────────────────────────────────── */

interface SubmissionFormData {
  quarter: number | string;
  year: number;
  achievedValue?: number;
  notes?: string;
  descriptions?: string[];
  idempotencyKey?: string;
  files?: File[];
}

export const buildSubmissionFormData = (data: SubmissionFormData): FormData => {
  const formData = new FormData();
  
  formData.append("quarter", String(data.quarter));
  formData.append("year", String(data.year));
  
  if (data.achievedValue !== undefined && data.achievedValue !== null) {
    formData.append("achievedValue", String(data.achievedValue));
  }
  
  if (data.notes) {
    formData.append("notes", data.notes);
  }
  
  if (data.idempotencyKey) {
    formData.append("idempotencyKey", data.idempotencyKey);
  }
  
  if (data.descriptions && data.descriptions.length > 0) {
    data.descriptions.forEach((desc, index) => {
      formData.append(`descriptions[${index}]`, desc);
    });
  }
  
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => {
      formData.append("documents", file);
    });
  }
  
  return formData;
};

/* ─── Thunks ──────────────────────────────────────────────────────────────── */

/** GET /user-indicators/my-assignments */
export const fetchMyIndicators = createAsyncThunk(
  "userIndicators/fetchMyIndicators",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/user-indicators/my-assignments");
      return (data.data ?? []) as IIndicatorUI[];
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to fetch indicators";
      return rejectWithValue(errorMessage);
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
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to fetch rejected submissions";
      return rejectWithValue(errorMessage);
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
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to fetch indicator details";
      return rejectWithValue(errorMessage);
    }
  },
);

/** POST /user-indicators/:id/submit - First time submission only */
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
      
      const result = data.data;
      const submission = result?.submission;
      
      return { 
        data: result, 
        message: data.message,
        submissionId: result?.submissionId,
        submission,
      };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to submit progress";
      return rejectWithValue(errorMessage);
    }
  },
);

/** POST /user-indicators/:id/resubmit - Resubmit rejected submission only */
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
      
      const result = data.data;
      const submission = result?.submission;
      
      return { 
        data: result, 
        message: data.message,
        submissionId: result?.submissionId,
        resubmissionCount: result?.resubmissionCount,
        submission,
      };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to resubmit progress";
      return rejectWithValue(errorMessage);
    }
  },
);

/**
 * ✅ FIXED: POST /user-indicators/:id/add-documents 
 * Now works for Pending AND Accepted submissions
 */
export const addDocuments = createAsyncThunk(
  "userIndicators/addDocuments",
  async (
    { id, formData }: { id: string; formData: FormData },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(
        `/user-indicators/${id}/add-documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      
      const result = data.data;
      const submission = result?.submission;
      
      return { 
        data: result, 
        message: data.message,
        submissionId: result?.submissionId,
        submission,
        documentsAdded: result?.documentsAdded,
      };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to add documents";
      return rejectWithValue(errorMessage);
    }
  },
);

/** 
 * ✅ FIXED: PATCH /user-indicators/:id/update-submission 
 * SMART ROUTER - Now routes Accepted submissions to addDocuments
 */
export const updateSubmission = createAsyncThunk(
  "userIndicators/updateSubmission",
  async (
    { id, formData }: { id: string; formData: FormData },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.patch(
        `/user-indicators/${id}/update-submission`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      
      const result = data.data;
      const submission = result?.submission;
      
      return { 
        data: result, 
        message: data.message,
        submissionId: result?.submissionId,
        resubmissionCount: result?.resubmissionCount,
        submission,
      };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update submission";
      return rejectWithValue(errorMessage);
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
    }: { 
      submissionId: string; 
      documents: Array<{ documentId: string; description: string }>; 
      idempotencyKey?: string;
    },
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
      
      const submission = data.data?.submission;
      
      return { 
        data, 
        message: data.message, 
        documents,
        submissionId,
        submission,
      };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update document descriptions";
      return rejectWithValue(errorMessage);
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
      
      return { 
        data, 
        docId, 
        description, 
        message: data.message,
        updatedDocument: data.data?.document,
        submission: data.data?.submission,
      };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update document description";
      return rejectWithValue(errorMessage);
    }
  },
);

/** DELETE /user-indicators/documents/:docId (legacy - use deletePendingDocument instead) */
export const deleteDocument = createAsyncThunk(
  "userIndicators/deleteDocument",
  async (docId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/user-indicators/documents/${docId}`);
      return { docId, data, message: data.message };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to delete document";
      return rejectWithValue(errorMessage);
    }
  },
);

/** 
 * DELETE /user-indicators/:indicatorId/submissions/:submissionId/documents/:docId
 * Now works for pending submissions and additional documents on accepted submissions
 */
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
      
      return { docId, submissionId, data, message: data.message };
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to delete document";
      return rejectWithValue(errorMessage);
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
    clearLastActionSuccess(state) {
      state.lastActionSuccess = null;
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
    optimisticRemoveDocument(
      state,
      action: PayloadAction<{ docId: string; submissionId: string }>,
    ) {
      const { docId, submissionId } = action.payload;
      const patch = (indicator: IIndicatorUI | null) => {
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
      patch(state.currentIndicator);
      patch(state.selectedIndicator);
    },
    optimisticAddDocuments(
      state,
      action: PayloadAction<{ 
        submissionId: string; 
        documents: IDocumentUI[] 
      }>,
    ) {
      const { submissionId, documents } = action.payload;
      const patch = (indicator: IIndicatorUI | null) => {
        if (!indicator?.submissions) return;
        for (const bucket of Object.values(indicator.submissions)) {
          for (const sub of bucket) {
            if (sub.id === submissionId) {
              if (!sub.documents) sub.documents = [];
              sub.documents.push(...documents);
            }
          }
        }
      };
      patch(state.currentIndicator);
      patch(state.selectedIndicator);
    },
    updateSubmissionInState(
      state,
      action: PayloadAction<{ 
        indicatorId: string; 
        submissionId: string; 
        submission: ISubmissionUI 
      }>,
    ) {
      const { indicatorId, submissionId, submission } = action.payload;
      
      const update = (indicator: IIndicatorUI | null) => {
        if (indicator && indicator.id === indicatorId) {
          updateSubmissionInIndicator(indicator, submissionId, (sub) => {
            Object.assign(sub, submission);
          });
        }
      };
      
      update(state.selectedIndicator);
      update(state.currentIndicator);
      
      const myIndicator = state.myIndicators.find((i) => i.id === indicatorId);
      if (myIndicator) updateSubmissionInIndicator(myIndicator, submissionId, (sub) => {
        Object.assign(sub, submission);
      });
      
      const indicator = state.indicators.find((i) => i.id === indicatorId);
      if (indicator) updateSubmissionInIndicator(indicator, submissionId, (sub) => {
        Object.assign(sub, submission);
      });
    },
    addOrUpdateSubmissionInState(
      state,
      action: PayloadAction<{ 
        indicatorId: string; 
        submission: ISubmissionUI 
      }>,
    ) {
      const { indicatorId, submission } = action.payload;
      
      const update = (indicator: IIndicatorUI | null) => {
        if (indicator && indicator.id === indicatorId) {
          addOrUpdateSubmission(indicator, submission);
        }
      };
      
      update(state.selectedIndicator);
      update(state.currentIndicator);
      
      const myIndicator = state.myIndicators.find((i) => i.id === indicatorId);
      if (myIndicator) addOrUpdateSubmission(myIndicator, submission);
      
      const indicator = state.indicators.find((i) => i.id === indicatorId);
      if (indicator) addOrUpdateSubmission(indicator, submission);
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
        
        const idx = state.myIndicators.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.myIndicators[idx] = action.payload;
        const idx2 = state.indicators.findIndex((i) => i.id === action.payload.id);
        if (idx2 !== -1) state.indicators[idx2] = action.payload;
      })
      .addCase(fetchIndicatorDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to fetch indicator details";
      });

    // submitProgress
    builder
      .addCase(submitProgress.pending, (state) => {
        state.uploading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(submitProgress.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload?.submissionId ?? null;
        state.lastActionSuccess = action.payload?.message ?? "Submission successful";
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
        state.lastActionSuccess = null;
      })
      .addCase(resubmitProgress.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload?.submissionId ?? null;
        state.lastResubmissionCount = action.payload?.resubmissionCount;
        state.lastActionSuccess = action.payload?.message ?? "Resubmission successful";
      })
      .addCase(resubmitProgress.rejected, (state, action) => {
        state.uploading = false;
        state.error = (action.payload as string) ?? "Failed to resubmit progress";
      });

    // updateSubmission (Smart Router - now handles Accepted too)
    builder
      .addCase(updateSubmission.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(updateSubmission.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.lastSubmissionId = action.payload?.submissionId ?? null;
        state.lastResubmissionCount = action.payload?.resubmissionCount;
        state.lastActionSuccess = action.payload?.message ?? "Submission updated successfully";
      })
      .addCase(updateSubmission.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? "Failed to update submission";
      });

    // deletePendingDocument
    builder
      .addCase(deletePendingDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(deletePendingDocument.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.lastActionSuccess = action.payload?.message ?? "Document deleted successfully";
      })
      .addCase(deletePendingDocument.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? "Failed to delete document";
      });

    // addDocuments - now works for Accepted submissions too
    builder
      .addCase(addDocuments.pending, (state) => {
        state.uploading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(addDocuments.fulfilled, (state, action) => {
        state.uploading = false;
        state.lastSubmissionId = action.payload?.submissionId ?? null;
        state.lastActionSuccess = action.payload?.message ?? "Documents added successfully";
      })
      .addCase(addDocuments.rejected, (state, action) => {
        state.uploading = false;
        state.error = (action.payload as string) ?? "Failed to add documents";
      });

    // updateDocumentDescriptions
    builder
      .addCase(updateDocumentDescriptions.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(updateDocumentDescriptions.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.lastActionSuccess = action.payload?.message ?? "Document descriptions updated successfully";
        
        const { submissionId, documents } = action.payload;
        const patch = (indicator: IIndicatorUI | null) => {
          if (!indicator?.submissions) return;
          for (const bucket of Object.values(indicator.submissions)) {
            for (const sub of bucket) {
              if (sub.id === submissionId) {
                for (const docUpdate of documents) {
                  const doc = sub.documents?.find((d) => d.id === docUpdate.documentId);
                  if (doc) doc.description = docUpdate.description;
                }
              }
            }
          }
        };
        patch(state.currentIndicator);
        patch(state.selectedIndicator);
      })
      .addCase(updateDocumentDescriptions.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? "Failed to update document descriptions";
      });

    // updateDocumentDescription
    builder
      .addCase(updateDocumentDescription.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(updateDocumentDescription.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.lastActionSuccess = action.payload?.message ?? "Document description updated successfully";
        
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
      })
      .addCase(updateDocumentDescription.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = (action.payload as string) ?? "Failed to update document description";
      });

    // deleteDocument (legacy)
    builder
      .addCase(deleteDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.lastActionSuccess = action.payload?.message ?? "Document deleted successfully";
        
        const { docId } = action.payload;
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
  },
});

/* ─── Actions ────────────────────────────────────────────────────────────── */

export const {
  clearIndicatorError,
  clearLastSubmissionId,
  clearLastActionSuccess,
  setLocalSelectedIndicator,
  optimisticUpdateDocumentDescription,
  optimisticRemoveDocument,
  optimisticAddDocuments,
  updateSubmissionInState,
  addOrUpdateSubmissionInState,
} = userIndicatorSlice.actions;

/* ─── Aliases for backward compatibility ─────────────────────────────────── */

export const fetchMyAssignments = fetchMyIndicators;
export const submitIndicatorProgress = submitProgress;
export const resubmitIndicatorProgress = resubmitProgress;
export const addIndicatorDocuments = addDocuments;
export const updateRejectedSubmission = updateSubmission;

export default userIndicatorSlice.reducer;