import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  ArrowLeft, Loader2, TrendingUp, FileText,
  ExternalLink, ShieldCheck, AlertCircle, Clock, Calendar,
  AlertTriangle, CheckCircle, XCircle, Edit2, Save, X,
} from "lucide-react";
import {
  fetchIndicatorDetails,
  clearIndicatorError,
  flattenSubmissions,
  getActiveQuarterDisplay,
  hasSubmissionForCurrentQuarter,
  getCurrentQuarterReviewStatus,
  clearLastSubmissionId,
  updateDocumentDescription,
  optimisticUpdateDocumentDescription,
} from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";
import type { ISubmissionUI, IDocumentUI } from "../../store/slices/userIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [updatingDescription, setUpdatingDescription] = useState(false);

  const lastSubmissionIdRef = useRef<string | null>(null);

  const currentIndicator = useAppSelector((s) => s.userIndicators.currentIndicator);
  const loading = useAppSelector((s) => s.userIndicators.loading);
  const uploading = useAppSelector((s) => s.userIndicators.uploading);
  const lastSubmissionId = useAppSelector((s) => s.userIndicators.lastSubmissionId);
  const error = useAppSelector((s) => s.userIndicators.error);

  useEffect(() => {
    if (id) dispatch(fetchIndicatorDetails(id));
    return () => {
      dispatch(clearIndicatorError());
      dispatch(clearLastSubmissionId());
    };
  }, [id, dispatch]);

  // Success toast — deferred to avoid cascading renders
  useEffect(() => {
    if (
      lastSubmissionId &&
      !uploading &&
      !error &&
      lastSubmissionIdRef.current !== lastSubmissionId
    ) {
      lastSubmissionIdRef.current = lastSubmissionId;

      const showTimer = setTimeout(() => {
        setSuccessMessage("Filing submitted successfully! Awaiting admin review.");
        setShowSuccessToast(true);
      }, 0);

      const hideTimer = setTimeout(() => {
        setShowSuccessToast(false);
        setSuccessMessage("");
      }, 5000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [lastSubmissionId, uploading, error]);

  // Reset toast ref on page/indicator change
  useEffect(() => {
    lastSubmissionIdRef.current = null;
  }, [id]);

  const isAnnual = currentIndicator?.reporting_cycle === "Annual";
  const activeQuarterDisplay = currentIndicator ? getActiveQuarterDisplay(currentIndicator) : "";
  const currentQuarterStatus = currentIndicator ? getCurrentQuarterReviewStatus(currentIndicator) : null;
  const hasSubmission = currentIndicator ? hasSubmissionForCurrentQuarter(currentIndicator) : false;

  // ── Derived data ──────────────────────────────────────────────────────────

  const allSubmissions = useMemo<ISubmissionUI[]>(
    () => (currentIndicator ? flattenSubmissions(currentIndicator) : []),
    [currentIndicator]
  );

  const activeSub = useMemo<ISubmissionUI | undefined>(() => {
    if (!currentIndicator?.submissions) return undefined;
    const targetKey = isAnnual ? "Annual" : activeQuarterDisplay;
    const quarterKey = `${targetKey}_${new Date().getFullYear()}`;
    const submissions = currentIndicator.submissions[quarterKey];
    if (!submissions || submissions.length === 0) return undefined;
    return submissions[0];
  }, [currentIndicator, isAnnual, activeQuarterDisplay]);

  const submissionHistory = useMemo(() => {
    if (!currentIndicator?.submissions) return [];
    const targetKey = isAnnual ? "Annual" : activeQuarterDisplay;
    const quarterKey = `${targetKey}_${new Date().getFullYear()}`;
    return currentIndicator.submissions[quarterKey] || [];
  }, [currentIndicator, isAnnual, activeQuarterDisplay]);

  const rejectedDocs = useMemo(() => {
    return allSubmissions.flatMap((sub) =>
      (sub.documents ?? [])
        .filter((doc: IDocumentUI) => doc.status === "Rejected")
        .map((doc) => ({
          doc,
          quarterLabel: sub.quarter === 0 ? "Annual" : `Q${sub.quarter}`,
          year: sub.year,
          rejectionReason: doc.rejectionReason,
        }))
    );
  }, [allSubmissions]);

  const activeDocs = useMemo(() => {
    return allSubmissions.flatMap((sub) =>
      (sub.documents ?? [])
        .filter((doc: IDocumentUI) => doc.status !== "Rejected")
        .map((doc) => ({
          doc,
          quarterLabel: sub.quarter === 0 ? "Annual" : `Q${sub.quarter}`,
          year: sub.year,
        }))
    );
  }, [allSubmissions]);

  // ── Document description handlers ─────────────────────────────────────────

  const handleStartEditDescription = (doc: IDocumentUI) => {
    setEditingDocId(doc.id);
    setEditingDescription(doc.description || "");
  };

  const handleCancelEditDescription = () => {
    setEditingDocId(null);
    setEditingDescription("");
    setUpdatingDescription(false);
  };

  const handleSaveDescription = async (docId: string) => {
    if (updatingDescription) return;

    setUpdatingDescription(true);

    // Optimistic update
    dispatch(optimisticUpdateDocumentDescription({
      docId,
      description: editingDescription,
    }));

    try {
      await dispatch(updateDocumentDescription({
        docId,
        description: editingDescription,
        idempotencyKey: crypto.randomUUID(),
      })).unwrap();

      // Show success toast
      setSuccessMessage("Document description updated successfully!");
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        setSuccessMessage("");
      }, 3000);

      // Refresh indicator data
      if (id) {
        await dispatch(fetchIndicatorDetails(id));
      }

      // Clear editing state
      setEditingDocId(null);
      setEditingDescription("");
    } catch (err) {
      console.error("Failed to update description:", err);
      setSuccessMessage("Failed to update description. Please try again.");
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        setSuccessMessage("");
      }, 3000);
      
      // Revert optimistic update by refreshing data
      if (id) {
        await dispatch(fetchIndicatorDetails(id));
      }
    } finally {
      setUpdatingDescription(false);
    }
  };

  // ── Status badge ──────────────────────────────────────────────────────────

  const getStatusBadge = useCallback(() => {
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
          text: "Approved",
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

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    if (id) dispatch(fetchIndicatorDetails(id));
  }, [id, dispatch]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Submit button label
  const submitButtonLabel = isAnnual
    ? hasSubmission && currentQuarterStatus === "Rejected"
      ? "Resubmit Annual Filing"
      : hasSubmission
      ? "Update Annual Filing"
      : "Submit Annual Filing"
    : hasSubmission && currentQuarterStatus === "Rejected"
    ? `Resubmit ${activeQuarterDisplay} Filing`
    : hasSubmission
    ? `Update ${activeQuarterDisplay} Filing`
    : `Submit ${activeQuarterDisplay} Filing`;

  // Check if user can edit document descriptions
  const canEditDescription = (docStatus: string, submissionReviewStatus?: string) => {
    // Can't edit if document is accepted
    if (docStatus === "Accepted") return false;
    // Can't edit if submission is accepted
    if (submissionReviewStatus === "Accepted") return false;
    // Can edit for pending or rejected documents
    return true;
  };

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading && !currentIndicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
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

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-700">Success</p>
                <p className="text-sm text-emerald-600">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Header */}
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
            {/* Cycle badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-100 shadow-sm">
              <Calendar size={12} className="text-[#c2a336]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                {currentIndicator.reporting_cycle} Cycle
              </span>
            </div>

            {/* Status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusBadge.color}`}>
              <StatusIcon size={12} className={statusBadge.iconColor} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {statusBadge.text}
              </span>
            </div>

            {/* Submit button */}
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={
                uploading ||
                currentQuarterStatus === "Accepted" ||
                currentIndicator.status === "Completed"
              }
              className="px-6 py-2.5 rounded-xl bg-[#1a3a32] text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 hover:shadow-xl shadow-md disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={14} />
                  {submitButtonLabel}
                </>
              )}
            </button>
          </div>
        </nav>

        {/* Resubmission history banner */}
        {submissionHistory.length > 1 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider">
                Resubmission History: {submissionHistory.length} total submissions
              </span>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Latest submission: {formatDate(submissionHistory[0]?.submittedAt)}
            </div>
          </div>
        )}

        {/* Rejected documents */}
        {rejectedDocs.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-rose-600">
              <AlertTriangle size={16} /> Action Required: Returned Evidence
            </h3>
            <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-4">
              {rejectedDocs.map(({ doc, quarterLabel, rejectionReason, year }) => (
                <div
                  key={doc.id}
                  className="bg-rose-50 border border-rose-100 p-5 rounded-[2rem] flex flex-col md:flex-row gap-4 items-start"
                >
                  <div className="p-4 bg-white rounded-2xl text-rose-500 shadow-sm">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-black text-rose-900 uppercase truncate max-w-[200px]">
                      {doc.fileName ?? "Evidence File"}
                    </p>
                    <p className="text-xs text-rose-700 font-medium italic">
                      "{rejectionReason ?? "Please provide clearer evidence for this metric."}"
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-[8px] font-black bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                        {quarterLabel} {year}
                      </span>
                      <span className="text-[8px] font-black bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full uppercase">
                        Rejected
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main stats */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
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

          <div className="bg-[#1a3a32] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
            <TrendingUp
              size={80}
              className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-all"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-2">
              {isAnnual ? "Annual Completion" : "Quarterly Progress"}
            </p>
            <span className="text-6xl font-serif font-bold">
              {Math.round(currentIndicator.progress || 0)}%
            </span>
            {activeSub && (
              <p className="text-[8px] text-gray-400 mt-2 uppercase tracking-wider">
                Target: {currentIndicator.target} {currentIndicator.unit}
              </p>
            )}
          </div>
        </div>

        {/* Current Submission Summary */}
        {activeSub && (
          <section className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32] mb-4">
              <FileText size={16} className="text-[#c2a336]" />
              Current Filing Summary
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{activeSub.notes}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Achieved Value</p>
                <p className="text-2xl font-bold text-[#1a3a32]">
                  {activeSub.achievedValue}{" "}
                  <span className="text-sm font-normal text-gray-400">{currentIndicator.unit}</span>
                </p>
              </div>
            </div>
            {activeSub.adminComment && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[9px] font-black uppercase text-amber-600 mb-1">Admin Comment</p>
                <p className="text-sm text-amber-700">{activeSub.adminComment}</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
              <p className="text-[8px] text-gray-400">
                Submitted: {formatDate(activeSub.submittedAt)}
              </p>
              {activeSub.resubmissionCount > 0 && (
                <p className="text-[8px] text-amber-600">
                  Resubmission #{activeSub.resubmissionCount}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Document Registry with Edit Descriptions */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
              <FileText size={16} className="text-[#c2a336]" /> Document Registry
            </h3>
            <p className="text-[8px] text-gray-400 italic">
              {editingDocId ? "Editing description..." : "Click ✎ to add/edit description"}
            </p>
          </div>

          {activeDocs.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
              <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
                No active documents filed in the registry
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDocs.map(({ doc, quarterLabel, year }) => {
                const resolvedName = doc.fileName ?? "UNTITLED_EVIDENCE";
                const isPending = doc.status === "Pending" || !doc.status;
                const isAcceptedStatus = doc.status === "Accepted";
                const submissionReviewStatus = allSubmissions.find(
                  (sub) => sub.documents.some((d) => d.id === doc.id)
                )?.reviewStatus;
                const canEdit = canEditDescription(doc.status, submissionReviewStatus);
                const isEditing = editingDocId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="bg-white p-5 rounded-[2rem] border border-gray-100 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${
                        isPending
                          ? "bg-amber-50 text-amber-500"
                          : isAcceptedStatus
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-gray-50 text-gray-500"
                      }`}>
                        {isPending ? <Clock size={20} /> : <ShieldCheck size={20} />}
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && !isEditing && (
                          <button
                            onClick={() => handleStartEditDescription(doc)}
                            className="p-2 text-gray-400 hover:text-[#1a3a32] hover:bg-gray-100 rounded-xl transition-all"
                            title="Edit description"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: resolvedName })}
                          className="p-2 text-gray-300 hover:text-[#1a3a32] hover:bg-gray-100 rounded-xl transition-all"
                          title="Preview file"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </div>

                    <p
                      className="text-[11px] font-black text-[#1a3a32] uppercase truncate"
                      title={resolvedName}
                    >
                      {resolvedName}
                    </p>

                    <div className="flex items-center gap-2 mt-1 mb-4">
                      <span className="text-[8px] font-black text-gray-300 uppercase">
                        {quarterLabel} {year}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isPending
                          ? "bg-amber-100 text-amber-700"
                          : isAcceptedStatus
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {doc.status ?? "Under Review"}
                      </span>
                    </div>

                    {/* Editable Description Section */}
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#1a3a32] focus:border-[#1a3a32] resize-none"
                            rows={3}
                            placeholder="Add a description for this document..."
                            maxLength={500}
                            autoFocus
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] text-gray-400">
                              {editingDescription.length}/500 characters
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleCancelEditDescription}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                                disabled={updatingDescription}
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() => handleSaveDescription(doc.id)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors"
                                disabled={updatingDescription}
                              >
                                {updatingDescription ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Save size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        doc.description && (
                          <div className="group relative">
                            <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed pr-6">
                              "{doc.description}"
                            </p>
                            {canEdit && (
                              <button
                                onClick={() => handleStartEditDescription(doc)}
                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-[#1a3a32]"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                          </div>
                        )
                      )}
                      {!isEditing && !doc.description && canEdit && (
                        <button
                          onClick={() => handleStartEditDescription(doc)}
                          className="w-full text-center py-2 text-[8px] text-gray-400 hover:text-[#1a3a32] uppercase tracking-wider transition-colors border border-dashed border-gray-200 rounded-lg hover:border-[#1a3a32]/20"
                        >
                          + Add description
                        </button>
                      )}
                      {!isEditing && !doc.description && !canEdit && (
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