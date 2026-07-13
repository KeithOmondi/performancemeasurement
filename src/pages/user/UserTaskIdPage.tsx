import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  ArrowLeft, Loader2, TrendingUp, FileText,
  ExternalLink, ShieldCheck, AlertCircle, Clock, Calendar,
  AlertTriangle, CheckCircle, XCircle, Edit2, Save, X, Trash2,
  Plus,
} from "lucide-react";
import {
  fetchIndicatorDetails,
  clearIndicatorError,
  flattenSubmissions,
  clearLastSubmissionId,
  updateDocumentDescription,
  optimisticUpdateDocumentDescription,
  getActiveQuarterDisplay,
  hasSubmissionForCurrentQuarter,
  getCurrentQuarterReviewStatus,
  deleteDocument,
  deletePendingDocument,
  clearLastActionSuccess,
  updateSubmission,
  addOrUpdateSubmissionInState,
  hasAcceptedSubmission,
  getAcceptedSubmissionForCurrentQuarter,
} from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";
import type { ISubmissionUI, IDocumentUI } from "../../store/slices/userIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

const Toast = ({ message, type, onDismiss }: ToastProps) => (
  <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
    <div
      className={`rounded-2xl p-4 shadow-lg flex items-center gap-3 border ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200"
          : "bg-rose-50 border-rose-200"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
      )}
      <p className={`text-sm ${type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
        {message}
      </p>
      <button onClick={onDismiss} className="ml-2 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    </div>
  </div>
);

interface StatusBadgeConfig {
  icon: React.ElementType;
  text: string;
  color: string;
  iconColor: string;
}

function useStatusBadge(
  currentQuarterStatus: string | null,
  hasSubmission: boolean,
): StatusBadgeConfig {
  return useMemo(() => {
    if (!currentQuarterStatus && !hasSubmission) {
      return {
        icon: AlertCircle,
        text: "Not Started",
        color: "text-gray-500 bg-gray-50 border-gray-200",
        iconColor: "text-gray-400",
      };
    }
    switch (currentQuarterStatus) {
      case "Rejected":
        return {
          icon: XCircle,
          text: "Revision Required",
          color: "text-rose-600 bg-rose-50 border-rose-100",
          iconColor: "text-rose-500",
        };
      case "Pending":
        return {
          icon: Clock,
          text: "Awaiting Review",
          color: "text-amber-600 bg-amber-50 border-amber-100",
          iconColor: "text-amber-500",
        };
      case "Accepted":
        return {
          icon: CheckCircle,
          text: "✅ Approved (100%)",
          color: "text-emerald-600 bg-emerald-50 border-emerald-100",
          iconColor: "text-emerald-500",
        };
      default:
        return {
          icon: AlertCircle,
          text: "Draft",
          color: "text-gray-500 bg-gray-50 border-gray-200",
          iconColor: "text-gray-400",
        };
    }
  }, [currentQuarterStatus, hasSubmission]);
}

// ─── Component ────────────────────────────────────────────────────────────────

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isModalOpen,          setIsModalOpen]          = useState(false);
  const [previewFile,          setPreviewFile]          = useState<{ url: string; name: string } | null>(null);
  const [toast,                setToast]                = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editingDocId,         setEditingDocId]         = useState<string | null>(null);
  const [editingDescription,   setEditingDescription]   = useState("");
  const [updatingDescription,  setUpdatingDescription]  = useState(false);
  const [deletingDocId,        setDeletingDocId]        = useState<string | null>(null);

  const lastSubmissionIdRef = useRef<string | null>(null);
  const toastTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef     = useRef(false);

  // ── Store ─────────────────────────────────────────────────────────────────
  const currentIndicator = useAppSelector((s) => s.userIndicators.currentIndicator);
  const loading          = useAppSelector((s) => s.userIndicators.loading);
  const uploading        = useAppSelector((s) => s.userIndicators.uploading);
  const lastSubmissionId = useAppSelector((s) => s.userIndicators.lastSubmissionId);
  const error            = useAppSelector((s) => s.userIndicators.error);
  const actionLoading    = useAppSelector((s) => s.userIndicators.actionLoading);
  const lastActionSuccess = useAppSelector((s) => s.userIndicators.lastActionSuccess);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = useCallback(
    (message: string, type: "success" | "error", duration = 4000) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ message, type });
      toastTimerRef.current = setTimeout(() => setToast(null), duration);
    },
    [],
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const refreshData = useCallback(async () => {
    if (!id || isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      await dispatch(fetchIndicatorDetails(id));
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [id, dispatch]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) dispatch(fetchIndicatorDetails(id));
    return () => {
      dispatch(clearIndicatorError());
      dispatch(clearLastSubmissionId());
      dispatch(clearLastActionSuccess());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (lastActionSuccess) {
      showToast(lastActionSuccess, "success", 4000);
      dispatch(clearLastActionSuccess());
      refreshData();
    }
  }, [lastActionSuccess, dispatch, showToast, refreshData]);

  useEffect(() => {
    if (
      lastSubmissionId &&
      !uploading &&
      !error &&
      lastSubmissionIdRef.current !== lastSubmissionId
    ) {
      lastSubmissionIdRef.current = lastSubmissionId;
      showToast("Filing submitted successfully! Awaiting admin review.", "success", 5000);
      refreshData();
    }
  }, [lastSubmissionId, uploading, error, showToast, refreshData]);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  useEffect(() => {
    if (error) {
      showToast(error, "error", 5000);
      dispatch(clearIndicatorError());
    }
  }, [error, dispatch, showToast]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isAnnual             = currentIndicator?.reporting_cycle === "Annual";
  const activeQuarterDisplay = currentIndicator ? getActiveQuarterDisplay(currentIndicator) : "";
  const currentQuarterStatus = currentIndicator ? getCurrentQuarterReviewStatus(currentIndicator) : null;
  const hasSubmission        = currentIndicator ? hasSubmissionForCurrentQuarter(currentIndicator) : false;
  const statusBadge          = useStatusBadge(currentQuarterStatus, hasSubmission);
  const StatusIcon           = statusBadge.icon;

  // Check if we have an accepted submission
  const hasAccepted = currentIndicator ? hasAcceptedSubmission(currentIndicator) : false;
  const acceptedSubmission = currentIndicator ? getAcceptedSubmissionForCurrentQuarter(currentIndicator) : undefined;

  // ── Memos — depend on currentIndicator only, no refreshTrigger needed ────
  const allSubmissions = useMemo<ISubmissionUI[]>(
    () => (currentIndicator ? flattenSubmissions(currentIndicator) : []),
    [currentIndicator],
  );

  const activeSub = useMemo<ISubmissionUI | undefined>(() => {
    if (!currentIndicator?.submissions) return undefined;
    const year = currentIndicator.currentYear ?? new Date().getFullYear();
    const key  = `${activeQuarterDisplay}_${year}`;
    return currentIndicator.submissions[key]?.[0];
  }, [currentIndicator, activeQuarterDisplay]);

  const submissionHistory = useMemo(() => {
    if (!currentIndicator?.submissions) return [];
    const year = currentIndicator.currentYear ?? new Date().getFullYear();
    return currentIndicator.submissions[`${activeQuarterDisplay}_${year}`] ?? [];
  }, [currentIndicator, activeQuarterDisplay]);

  const rejectedDocs = useMemo(
    () =>
      allSubmissions.flatMap((sub) =>
        (sub.documents ?? [])
          .filter((d: IDocumentUI) => d.status === "Rejected")
          .map((d) => ({
            doc: d,
            quarterLabel:    sub.quarter === 0 ? "Annual" : `Q${sub.quarter}`,
            year:            sub.year,
            rejectionReason: d.rejectionReason,
            submission:      sub,
          })),
      ),
    [allSubmissions],
  );

  const activeDocs = useMemo(
    () =>
      allSubmissions
        .filter((sub) => sub.reviewStatus !== "Rejected")
        .flatMap((sub) =>
          (sub.documents ?? [])
            .filter((d: IDocumentUI) => d.status !== "Rejected")
            .map((d) => ({
              doc:          d,
              quarterLabel: sub.quarter === 0 ? "Annual" : `Q${sub.quarter}`,
              year:         sub.year,
              submission:   sub,
            })),
        ),
    [allSubmissions],
  );

  // Button label logic - includes "Add Documents" for accepted submissions
  const getSubmitButtonLabel = useCallback(() => {
    if (isAnnual) {
      if (hasAccepted) return "Add Supporting Documents";
      if (hasSubmission && currentQuarterStatus === "Rejected") return "Resubmit Annual Filing";
      if (hasSubmission) return "Update Annual Filing";
      return "Submit Annual Filing";
    }
    
    if (hasAccepted) return `Add Supporting Documents (${activeQuarterDisplay})`;
    if (hasSubmission && currentQuarterStatus === "Rejected") return `Resubmit ${activeQuarterDisplay} Filing`;
    if (hasSubmission) return `Update ${activeQuarterDisplay} Filing`;
    return `Submit ${activeQuarterDisplay} Filing`;
  }, [isAnnual, hasAccepted, hasSubmission, currentQuarterStatus, activeQuarterDisplay]);

  const submitButtonLabel = getSubmitButtonLabel();

  // Determine if the button should be disabled
  const isButtonDisabled = useMemo(() => {
    if (uploading) return true;
    if (!hasSubmission) return false;
    if (currentQuarterStatus === "Pending") return false;
    if (currentQuarterStatus === "Accepted") return false;
    if (currentQuarterStatus === "Rejected") return false;
    return true;
  }, [hasSubmission, currentQuarterStatus, uploading]);

  // Determine modal mode when opened
  const handleOpenModal = useCallback(async () => {
    if (id) await refreshData();
    setIsModalOpen(true);
  }, [id, refreshData]);

  // ── Description edit handlers ─────────────────────────────────────────────
  // ✅ FIXED: Removed unused parameter
  const canEditDescription = (docStatus: string | undefined): boolean => {
    // Can edit if document is not accepted
    return docStatus !== "Accepted";
  };

  const handleStartEdit = (doc: IDocumentUI) => {
    setEditingDocId(doc.id);
    setEditingDescription(doc.description ?? "");
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
    setEditingDescription("");
    setUpdatingDescription(false);
  };

  const handleSaveDescription = async (docId: string) => {
    if (updatingDescription) return;
    setUpdatingDescription(true);
    dispatch(optimisticUpdateDocumentDescription({ docId, description: editingDescription }));
    try {
      await dispatch(
        updateDocumentDescription({
          docId,
          description:    editingDescription,
          idempotencyKey: crypto.randomUUID(),
        }),
      ).unwrap();
      showToast("Document description updated successfully.", "success");
      setEditingDocId(null);
      setEditingDescription("");
      await refreshData();
    } catch (err) {
      console.error("Failed to update description:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to update description. Please try again.",
        "error",
      );
      await refreshData();
    } finally {
      setUpdatingDescription(false);
    }
  };

  // ── Delete document handler ───────────────────────────────────────────────
  const canDeleteDocument = (
    docStatus: string | undefined,
    submissionReviewStatus?: string,
  ): boolean => {
    if (docStatus === "Rejected") return true;
    if (submissionReviewStatus === "Pending") return true;
    if (docStatus === "Additional" && submissionReviewStatus === "Accepted") return true;
    return false;
  };

  const getDeleteConfirmMessage = (doc: IDocumentUI, submission: ISubmissionUI): string => {
    if (submission.reviewStatus === "Pending")
      return "Are you sure you want to delete this document from your pending submission? This action cannot be undone.\n\nYou will need to resubmit or add new documents afterward.";
    if (doc.status === "Rejected")
      return "Are you sure you want to delete this rejected document? This action cannot be undone.\n\nYou can upload a new corrected document with your resubmission.";
    if (doc.status === "Additional" && submission.reviewStatus === "Accepted")
      return "Are you sure you want to delete this additional document from your approved submission? This action cannot be undone.";
    return "Are you sure you want to delete this document? This action cannot be undone.";
  };

  const handleDeleteDocument = async (doc: IDocumentUI, submission: ISubmissionUI) => {
    if (!id) return;

    const isPendingSubmission = submission.reviewStatus === "Pending";
    const isRejectedDocument  = doc.status === "Rejected";
    const isAdditionalOnAccepted = doc.status === "Additional" && submission.reviewStatus === "Accepted";

    if (!isPendingSubmission && !isRejectedDocument && !isAdditionalOnAccepted) {
      showToast(
        "This document cannot be deleted. Only rejected documents, documents from pending submissions, or additional documents on approved submissions can be deleted.",
        "error",
      );
      return;
    }

    if (!window.confirm(getDeleteConfirmMessage(doc, submission))) return;

    setDeletingDocId(doc.id);
    try {
      if (isPendingSubmission || isAdditionalOnAccepted) {
        await dispatch(deletePendingDocument({
          indicatorId:  id,
          submissionId: submission.id,
          docId:        doc.id,
        })).unwrap();
        showToast("Document removed successfully.", "success");
      } else {
        await dispatch(deleteDocument(doc.id)).unwrap();
        showToast("Rejected document deleted successfully.", "success");
      }
      await refreshData();
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to delete document. Please try again.",
        "error",
      );
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── Modal handlers ─────────────────────────────────────────────────────────

  const handleModalClose = useCallback(async () => {
    setIsModalOpen(false);
    setTimeout(() => {
      refreshData();
    }, 100);
  }, [refreshData]);

  // ── Submission handler ──────────────────────────────────────────────────
  const handleSubmissionSubmit = useCallback(async (formData: FormData) => {
    if (!id) return;
    
    console.log("📤 [UserTaskIdPage] Submitting form data...");
    
    try {
      const result = await dispatch(updateSubmission({ id, formData })).unwrap();
      console.log("✅ [UserTaskIdPage] Submission result:", result);
      
      showToast(result?.message ?? "Submission processed successfully.", "success");
      
      if (result?.submission) {
        console.log("📦 [UserTaskIdPage] Updating state with submission:", result.submission);
        dispatch(addOrUpdateSubmissionInState({
          indicatorId: id,
          submission: result.submission,
        }));
      }
      
      await refreshData();
      
      setTimeout(() => {
        setIsModalOpen(false);
      }, 500);
      
    } catch (err) {
      console.error("❌ [UserTaskIdPage] Submission failed:", err);
      showToast(
        err instanceof Error ? err.message : "Failed to process submission. Please try again.",
        "error",
      );
    }
  }, [id, dispatch, showToast, refreshData]);

  // ── Loading / empty states ────────────────────────────────────────────────
  if (loading && !currentIndicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-10 h-10 animate-spin text-[#1a3a32] mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading Registry...
        </p>
      </div>
    );
  }

  if (!currentIndicator) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}

        {/* ── Nav bar ── */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group w-fit">
            <div className="p-2 bg-white rounded-full border border-gray-100 shadow-sm group-hover:bg-gray-50 transition-colors">
              <ArrowLeft size={18} className="text-[#1a3a32]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">
              Back to Assignments
            </span>
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-100 shadow-sm">
              <Calendar size={12} className="text-[#c2a336]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                {currentIndicator.reporting_cycle} Cycle
              </span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBadge.color}`}>
              <StatusIcon size={12} className={statusBadge.iconColor} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {statusBadge.text}
              </span>
            </div>

            {/* Button logic - enabled for Accepted submissions */}
            <button
              onClick={handleOpenModal}
              disabled={isButtonDisabled}
              className={`px-6 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:shadow-xl ${
                hasAccepted && currentQuarterStatus === "Accepted"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#1a3a32] hover:bg-[#2a4a42]"
              } disabled:bg-gray-200 disabled:cursor-not-allowed`}
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  {hasAccepted ? <Plus size={14} /> : <ShieldCheck size={14} />}
                  {submitButtonLabel}
                </>
              )}
            </button>

            {/* Info badge for accepted submissions */}
            {hasAccepted && currentQuarterStatus === "Accepted" && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-lg">
                <CheckCircle size={10} className="text-emerald-600" />
                <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wider">
                  Add Documents Allowed
                </span>
              </div>
            )}
          </div>
        </nav>

        {/* ── Accepted submission banner ── */}
        {hasAccepted && acceptedSubmission && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle size={16} className="shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider">
                  ✅ Filing Complete — 100% Approved
                </span>
                <p className="text-xs text-emerald-600 mt-1">
                  Your submission has been fully approved. You can still add supporting documents or additional evidence below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Resubmission history banner ── */}
        {submissionHistory.length > 1 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider">
                Resubmission History — {submissionHistory.length} total submissions
              </span>
            </div>
            <p className="mt-1 text-xs text-blue-600">
              Latest: {formatDate(submissionHistory[0]?.submittedAt)}
            </p>
          </div>
        )}

        {/* ── Rejected documents ── */}
        {rejectedDocs.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-rose-600">
              <AlertTriangle size={16} /> Action Required: Returned Evidence
            </h3>
            <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-4">
              {rejectedDocs.map(({ doc, quarterLabel, rejectionReason, year, submission }) => (
                <div
                  key={doc.id}
                  className="bg-rose-50 border border-rose-100 p-5 rounded-[2rem] flex gap-4 items-start"
                >
                  <div className="p-4 bg-white rounded-2xl text-rose-500 shadow-sm shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-[10px] font-black text-rose-900 uppercase truncate">
                      {doc.fileName ?? "Evidence File"}
                    </p>
                    <p className="text-xs text-rose-700 font-medium italic">
                      "{rejectionReason ?? "Please provide clearer evidence for this metric."}"
                    </p>
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <span className="text-[8px] font-black bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                        {quarterLabel} {year}
                      </span>
                      <span className="text-[8px] font-black bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                        Rejected
                      </span>
                    </div>
                    {(submission.reviewStatus === "Pending" || doc.status === "Rejected" || 
                      (doc.status === "Additional" && submission.reviewStatus === "Accepted")) && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleDeleteDocument(doc, submission)}
                          disabled={deletingDocId === doc.id || actionLoading}
                          className="flex items-center gap-1 text-[8px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingDocId === doc.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Trash2 size={10} />
                          )}
                          Delete Document
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Hero stats ── */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c2a336]">
                {currentIndicator.perspective}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-200" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
                {isAnnual ? "Full Year Target" : `${activeQuarterDisplay} ${new Date().getFullYear()}`}
              </span>
            </div>
            <h1 className="text-3xl font-serif font-black text-[#1a3a32] leading-tight">
              {currentIndicator.objective?.title}
            </h1>
            <p className="text-gray-400 font-medium italic border-l-4 border-gray-100 pl-6">
              {currentIndicator.activity?.description}
            </p>
          </div>

          <div className={`p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group ${
            hasAccepted ? "bg-emerald-700" : "bg-[#1a3a32]"
          }`}>
            <TrendingUp size={80} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-all" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-2">
              {isAnnual ? "Annual Completion" : "Quarterly Progress"}
            </p>
            <span className="text-6xl font-serif font-bold">
              {Math.round(currentIndicator.progress ?? 0)}%
            </span>
            {activeSub && (
              <p className="text-[8px] text-gray-400 mt-2 uppercase tracking-wider">
                Target: {currentIndicator.target} {currentIndicator.unit}
              </p>
            )}
            {hasAccepted && (
              <div className="mt-2 flex items-center gap-1 text-[8px] text-emerald-200">
                <CheckCircle size={10} />
                <span className="uppercase tracking-wider">Fully Approved</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Current Submission Summary ── */}
        {activeSub && (
          <section className={`rounded-[2rem] p-6 border shadow-sm ${
            activeSub.reviewStatus === "Accepted" 
              ? "bg-emerald-50 border-emerald-200" 
              : "bg-white border-gray-100"
          }`}>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32] mb-4">
              <FileText size={16} className="text-[#c2a336]" />
              Current Filing Summary
              {activeSub.reviewStatus === "Accepted" && (
                <span className="ml-2 text-[8px] font-black bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                  100% Complete
                </span>
              )}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{activeSub.notes || "No notes provided"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Achieved Value</p>
                <p className="text-2xl font-bold text-[#1a3a32]">
                  {activeSub.achievedValue ?? "—"}{" "}
                  <span className="text-sm font-normal text-gray-400">{currentIndicator.unit}</span>
                </p>
              </div>
            </div>

            {activeSub.adminComment && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-[9px] font-black uppercase text-amber-600 mb-1">Admin Comment</p>
                <p className="text-sm text-amber-700">{activeSub.adminComment}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4 flex-wrap">
              <p className="text-[8px] text-gray-400">Submitted: {formatDate(activeSub.submittedAt)}</p>
              {activeSub.resubmissionCount > 0 && (
                <p className="text-[8px] text-amber-600">Resubmission #{activeSub.resubmissionCount}</p>
              )}
              {activeSub.reviewStatus === "Accepted" && (
                <p className="text-[8px] text-emerald-600 font-black">✅ Fully Approved</p>
              )}
            </div>
          </section>
        )}

        {/* ── Document Registry ── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
              <FileText size={16} className="text-[#c2a336]" /> Document Registry
            </h3>
            {editingDocId && (
              <p className="text-[8px] text-gray-400 italic">Editing description…</p>
            )}
          </div>

          {activeDocs.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
              <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
                No active documents filed in the registry
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDocs.map(({ doc, quarterLabel, year, submission }) => {
                const resolvedName        = doc.fileName ?? "UNTITLED_EVIDENCE";
                const isPending           = doc.status === "Pending" || !doc.status;
                const isAcceptedDoc       = doc.status === "Accepted";
                const isAdditional        = doc.status === "Additional";
                const submissionReviewStatus = submission.reviewStatus;
                const canEdit             = canEditDescription(doc.status);
                const canDelete           = canDeleteDocument(doc.status, submissionReviewStatus);
                const isEditing           = editingDocId === doc.id;
                const isDeleting          = deletingDocId === doc.id;

                // Determine badge styling
                let badgeColor = "bg-gray-100 text-gray-700";
                let badgeText = doc.status ?? "Under Review";
                if (isPending) {
                  badgeColor = "bg-amber-100 text-amber-700";
                  badgeText = "Under Review";
                } else if (isAcceptedDoc) {
                  badgeColor = "bg-emerald-100 text-emerald-700";
                  badgeText = "✅ Approved";
                } else if (isAdditional) {
                  badgeColor = "bg-blue-100 text-blue-700";
                  badgeText = "📎 Additional";
                }

                return (
                  <div
                    key={doc.id}
                    className={`p-5 rounded-[2rem] border transition-all hover:shadow-md flex flex-col ${
                      isAdditional ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${
                        isPending    ? "bg-amber-50 text-amber-500"
                        : isAcceptedDoc ? "bg-emerald-50 text-emerald-500"
                        : isAdditional ? "bg-blue-50 text-blue-500"
                        :               "bg-gray-50 text-gray-500"
                      }`}>
                        {isPending ? <Clock size={20} /> : <ShieldCheck size={20} />}
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && !isEditing && (
                          <button
                            onClick={() => handleStartEdit(doc)}
                            className="p-2 text-gray-400 hover:text-[#1a3a32] hover:bg-gray-100 rounded-xl transition-all"
                            title="Edit description"
                            disabled={isDeleting || actionLoading}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && !isEditing && (
                          <button
                            onClick={() => handleDeleteDocument(doc, submission)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title={
                              submissionReviewStatus === "Pending" 
                                ? "Delete from pending submission" 
                                : submissionReviewStatus === "Accepted" && isAdditional
                                ? "Delete additional document"
                                : "Delete rejected document"
                            }
                            disabled={isDeleting || actionLoading}
                          >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: resolvedName })}
                          className="p-2 text-gray-300 hover:text-[#1a3a32] hover:bg-gray-100 rounded-xl transition-all"
                          title="Preview file"
                          disabled={isDeleting || actionLoading}
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] font-black text-[#1a3a32] uppercase truncate" title={resolvedName}>
                      {resolvedName}
                    </p>

                    <div className="flex items-center gap-2 mt-1 mb-4 flex-wrap">
                      <span className="text-[8px] font-black text-gray-300 uppercase">
                        {quarterLabel} {year}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badgeText}
                      </span>
                      {submissionReviewStatus === "Pending" && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Pending Submission
                        </span>
                      )}
                      {submissionReviewStatus === "Accepted" && isAdditional && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Post-Approval
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-50">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#1a3a32] focus:border-[#1a3a32] resize-none"
                            rows={3}
                            placeholder="Add a description for this document…"
                            maxLength={500}
                            autoFocus
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-gray-400">{editingDescription.length}/500</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleCancelEdit}
                                disabled={updatingDescription}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() => handleSaveDescription(doc.id)}
                                disabled={updatingDescription}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updatingDescription ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : doc.description ? (
                        <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed">
                          "{doc.description}"
                        </p>
                      ) : canEdit ? (
                        <button
                          onClick={() => handleStartEdit(doc)}
                          className="w-full text-center py-2 text-[8px] text-gray-400 hover:text-[#1a3a32] uppercase tracking-wider transition-colors border border-dashed border-gray-200 rounded-lg hover:border-[#1a3a32]/20"
                        >
                          + Add description
                        </button>
                      ) : (
                        <p className="text-[8px] text-gray-300 italic text-center py-2">
                          No description provided
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <SubmissionModal
          task={currentIndicator}
          onClose={handleModalClose}
          existingSubmission={activeSub}
          onSubmit={handleSubmissionSubmit}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default UserTaskIdPage;