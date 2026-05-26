import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Loader2,
  ChevronLeft,
  AlertOctagon,
  Clock,
  CalendarDays,
  XCircle,
  CheckCircle2,
  Paperclip,
  Info,
  RotateCcw,
  User,
  MessageSquareWarning,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  approveSubmission,
  rejectSubmission,
  getIndicatorByIdAdmin,
  getSubmitterName,
  type ISubmission,
  type IDocument,
  type IDocumentReviewUpdate,
} from "../../store/slices/adminIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast {
  type: "success" | "error";
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deduplicateDocs(docs: IDocument[] | undefined | null): IDocument[] {
  if (!docs || !Array.isArray(docs) || docs.length === 0) return [];
  const seen = new Map<string, IDocument>();
  for (const doc of docs) {
    if (!doc || !doc.id) continue;
    const key = doc.fileName || doc.id;
    if (!seen.has(key)) seen.set(key, doc);
  }
  return Array.from(seen.values());
}

function getSafeDocuments(sub: ISubmission): IDocument[] {
  const docs = sub.documents;
  if (!docs || !Array.isArray(docs)) return [];
  return docs;
}

function getPrecedingRejection(
  sub: ISubmission,
  periodSubmissions: ISubmission[]
): ISubmission | null {
  const currentIdx = periodSubmissions.findIndex((s) => s.id === sub.id);
  if (currentIdx !== -1) {
    for (let i = currentIdx + 1; i < periodSubmissions.length; i++) {
      if (periodSubmissions[i].reviewStatus === "Rejected") {
        return periodSubmissions[i];
      }
    }
  }

  if (sub.previousRejectionReason) {
    return { adminComment: sub.previousRejectionReason } as ISubmission;
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AdminIndicatorReview: React.FC = () => {
  const { indicatorId } = useParams<{ indicatorId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { selectedIndicator: indicator, isReviewing, isLoading } =
    useAppSelector((state) => state.adminIndicators);

  // Core local states
  const [individualComments, setIndividualComments] = useState<Record<string, string>>({});
  const [documentUpdates, setDocumentUpdates] = useState<IDocumentReviewUpdate[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [explicitRejectionToggle, setExplicitRejectionToggle] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Fetch data on mount
  useEffect(() => {
    if (indicatorId) {
      dispatch(getIndicatorByIdAdmin(indicatorId));
    }
  }, [dispatch, indicatorId]);

  const allSubmissions = useMemo<ISubmission[]>(() => {
    if (!indicator?.submissions) return [];
    return Object.values(indicator.submissions).flat();
  }, [indicator]);

  const pendingSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.reviewStatus === "Pending"),
    [allSubmissions]
  );

  // Clean, derived render computation instead of executing a synchronizing useEffect
  const rejectionMode = useMemo(() => {
    return explicitRejectionToggle || documentUpdates.length > 0;
  }, [explicitRejectionToggle, documentUpdates.length]);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const toggleFileRejection = useCallback(
    (documentId: string, fileName: string) => {
      setDocumentUpdates((prev) => {
        const exists = prev.find((d) => d.documentId === documentId);
        if (exists) return prev.filter((d) => d.documentId !== documentId);
        return [
          ...prev,
          { documentId, status: "Rejected", reason: `File [${fileName}] rejected.` },
        ];
      });
    },
    []
  );

  const resetReviewState = useCallback(() => {
    setOverallComment("");
    setIndividualComments({});
    setDocumentUpdates([]);
    setExplicitRejectionToggle(false);
  }, []);

  // ── Approve ───────────────────────────────────────────────────────────────

  const handleApprove = useCallback(async () => {
    if (!indicator) return;

    // Dynamically compile payloads on event execution path rather than pulling from state structures
    const submissionUpdates = pendingSubmissions.map((s) => ({
      submissionId: s.id,
      adminComment: individualComments[s.id]?.trim() || overallComment.trim() || "Approved.",
    }));

    const result = await dispatch(
      approveSubmission({
        id: indicator.id,
        payload: {
          submissionUpdates,
          adminOverallComments: overallComment.trim() || undefined,
        },
      })
    );

    if (approveSubmission.fulfilled.match(result)) {
      showToast("success", "Submission approved and forwarded to Super Admin.");
      dispatch(getIndicatorByIdAdmin(indicator.id));
      resetReviewState();
    } else if (approveSubmission.rejected.match(result)) {
      showToast("error", (result.payload as string) || "Approval failed. Please try again.");
    }
  }, [dispatch, indicator, individualComments, overallComment, pendingSubmissions, resetReviewState, showToast]);

  // ── Reject ────────────────────────────────────────────────────────────────

  const handleReject = useCallback(async () => {
    if (!indicator) return;

    if (!overallComment.trim()) {
      alert("Please provide an overall justification for rejection.");
      return;
    }

    const submissionUpdates = pendingSubmissions.map((s) => ({
      submissionId: s.id,
      adminComment: individualComments[s.id]?.trim() || overallComment.trim(),
    }));

    const result = await dispatch(
      rejectSubmission({
        id: indicator.id,
        payload: {
          adminOverallComments: overallComment.trim(),
          submissionUpdates,
          documentUpdates,
        },
      })
    );

    if (rejectSubmission.fulfilled.match(result)) {
      showToast("success", "Submission returned for correction.");
      dispatch(getIndicatorByIdAdmin(indicator.id));
      resetReviewState();
    } else if (rejectSubmission.rejected.match(result)) {
      showToast("error", (result.payload as string) || "Rejection failed. Please try again.");
    }
  }, [dispatch, indicator, individualComments, documentUpdates, overallComment, pendingSubmissions, resetReviewState, showToast]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fcfdfb]">
        <Loader2 className="w-10 h-10 text-[#1d3331] animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading Dossier...
        </p>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (!indicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <AlertOctagon size={48} className="text-slate-200" />
        <p className="text-slate-500 font-bold">Indicator not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase"
        >
          Return to Registry
        </button>
      </div>
    );
  }

  const hasPending = pendingSubmissions.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfdfb]">

      {/* ── Header ── */}
      <div className="px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-black group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
          </button>
          <div>
            <h2 className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">
              Registry Audit
            </h2>
            <h1 className="text-[13px] font-black text-slate-900 uppercase truncate max-w-[400px]">
              {indicator.activity?.description || "Indicator Details"}
            </h1>
          </div>
        </div>

        {hasPending && (
          <div className="flex items-center gap-4">
            {!rejectionMode && (
              <button
                onClick={() => setExplicitRejectionToggle(true)}
                disabled={isReviewing}
                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
              >
                Flag for Correction
              </button>
            )}
            <button
              disabled={isReviewing}
              onClick={rejectionMode ? handleReject : handleApprove}
              className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                rejectionMode
                  ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                  : "bg-[#1d3331] text-white hover:bg-black shadow-emerald-900/20"
              }`}
            >
              {isReviewing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : rejectionMode ? (
                <XCircle size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {rejectionMode ? "Confirm Rejection" : "Approve Submission"}
            </button>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 p-6 md:p-12">
        <div className="w-full max-w-6xl mx-auto space-y-10">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-white p-10 border border-slate-200/60 shadow-sm rounded-[2.5rem]">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 uppercase tracking-widest rounded-lg">
                  {indicator.perspective || "General"}
                </span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-slate-50 text-slate-500 border border-slate-100">
                  {indicator.reportingCycle === "Annual" ? (
                    <CalendarDays size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                  {indicator.reportingCycle || "Quarterly"} Cycle
                </div>
              </div>
              <h3 className="text-2xl font-serif font-black text-slate-900 mb-4 leading-tight">
                {indicator.objective?.title || "Objective Title"}
              </h3>
              <p className="text-[15px] text-slate-500 font-medium leading-relaxed max-w-3xl">
                {indicator.activity?.description || "Activity description"}
              </p>
            </div>

            <div className="bg-[#1d3331] p-10 rounded-[2.5rem] text-white flex flex-col justify-center shadow-2xl shadow-emerald-900/20">
              <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] mb-3">
                Target Performance
              </p>
              <p className="text-5xl font-serif font-black tracking-tighter">
                {indicator.target || 0}
              </p>
              <p className="text-[12px] font-bold opacity-70 mt-2 uppercase tracking-widest">
                {indicator.unit || "%"}
              </p>
            </div>
          </div>

          {/* Rejection Textarea */}
          {rejectionMode && (
            <div className="space-y-4 bg-rose-50/50 p-8 rounded-[2.5rem] border-2 border-dashed border-rose-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-rose-600">
                  <AlertOctagon size={20} />
                  <h4 className="text-[11px] font-black uppercase tracking-widest">
                    Rejection Note
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setExplicitRejectionToggle(false);
                    setDocumentUpdates([]);
                  }}
                  className="text-[10px] font-black text-slate-400 hover:text-black uppercase"
                >
                  Cancel
                </button>
              </div>
              <textarea
                autoFocus
                placeholder="Detail the specific adjustments or evidence missing from this submission..."
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                className="w-full p-6 bg-white border border-rose-100 rounded-2xl text-[14px] font-semibold outline-none focus:ring-4 focus:ring-rose-500/10 min-h-[140px] resize-none"
              />
            </div>
          )}

          {/* Evidence Trail */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
              Evidence Trail
            </h4>

            {indicator.submissions &&
              Object.entries(indicator.submissions).map(
                ([quarterKey, submissions]) => (
                  <div key={quarterKey} className="space-y-4">

                    <div className="flex items-center gap-4 px-2">
                      <div className="h-[1px] flex-1 bg-slate-100" />
                      <span className="text-[10px] font-black text-slate-300 uppercase">
                        {quarterKey.replace("_", " ")}
                      </span>
                      <div className="h-[1px] flex-1 bg-slate-100" />
                    </div>

                    {submissions.map((sub: ISubmission) => {
                      const documents = getSafeDocuments(sub);
                      const uniqueDocs = deduplicateDocs(documents);
                      const isResubmission = sub.resubmissionCount > 0;
                      const submitterName = getSubmitterName(sub);

                      const precedingRejection =
                        sub.reviewStatus === "Pending"
                          ? getPrecedingRejection(sub, submissions)
                          : null;

                      return (
                        <div
                          key={sub.id}
                          className={`bg-white border rounded-[2rem] p-8 shadow-sm ${
                            isResubmission
                              ? "border-amber-200/60"
                              : "border-slate-200/60"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row justify-between gap-8">
                            <div className="flex-1 space-y-6">

                              <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                      Reported Value
                                    </p>
                                    <p className="text-lg font-black text-slate-900">
                                      {sub.achievedValue || 0}{" "}
                                      {indicator.unit || "%"}
                                    </p>
                                  </div>

                                  <div className="w-px h-8 bg-slate-100" />

                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                                      Submitted By
                                    </p>
                                    {submitterName ? (
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                          <User size={10} className="text-emerald-700" />
                                        </div>
                                        <span className="text-[12px] font-black text-slate-800">
                                          {submitterName}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] font-medium text-slate-400 italic">
                                        Unknown submitter
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {isResubmission && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                      <RotateCcw size={10} />
                                      <span className="text-[8px] font-black uppercase tracking-widest">
                                        Resubmission #{sub.resubmissionCount}
                                      </span>
                                    </div>
                                  )}
                                  <span
                                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                      sub.reviewStatus === "Verified" ||
                                      sub.reviewStatus === "Accepted"
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : sub.reviewStatus === "Rejected"
                                        ? "bg-rose-50 text-rose-600 border-rose-100"
                                        : "bg-orange-50 text-orange-600 border-orange-100"
                                    }`}
                                  >
                                    {sub.reviewStatus || "Pending"}
                                  </span>
                                </div>
                              </div>

                              {precedingRejection?.adminComment && (
                                <div className="flex gap-3 p-5 bg-rose-50/60 border border-rose-200/70 rounded-2xl">
                                  <div className="shrink-0 mt-0.5">
                                    <MessageSquareWarning size={15} className="text-rose-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1.5">
                                      Previous Rejection Reason
                                    </p>
                                    <p className="text-[12px] text-rose-700 font-semibold leading-relaxed">
                                      {precedingRejection.adminComment}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                  User's Commentary
                                </p>
                                <p className="text-[13px] text-slate-600 font-medium leading-relaxed italic">
                                  "{sub.notes || "No user commentary provided."}"
                                </p>
                              </div>

                              {/* Row comment updates input area */}
                              {sub.reviewStatus === "Pending" && (
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Reviewer Row Comments (Optional)
                                  </label>
                                  <input 
                                    type="text"
                                    placeholder="Add notes specific to this value..."
                                    value={individualComments[sub.id] || ""}
                                    onChange={(e) => setIndividualComments(prev => ({
                                      ...prev,
                                      [sub.id]: e.target.value
                                    }))}
                                    className="w-full px-4 py-3 border border-slate-100 bg-slate-50/30 rounded-xl text-[12px] font-medium outline-none focus:border-slate-300 focus:bg-white transition-all"
                                  />
                                </div>
                              )}

                              {/* Documents */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Paperclip size={12} /> Supporting Documents
                                  </p>
                                  {documents.length > 0 &&
                                    uniqueDocs.length < documents.length && (
                                      <span className="text-[9px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                                        {documents.length - uniqueDocs.length}{" "}
                                        duplicate
                                        {documents.length - uniqueDocs.length > 1 ? "s" : ""}{" "}
                                        collapsed · showing latest versions
                                      </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                  {uniqueDocs.length > 0 ? (
                                    uniqueDocs.map((doc) => {
                                      const isRejected = documentUpdates.some(
                                        (du) => du.documentId === doc.id
                                      );
                                      const isExpanded = expandedDocId === doc.id;
                                      const docDescription =
                                        doc.description || doc.fileDescription || null;

                                      return (
                                        <div key={doc.id} className="group relative">
                                          <div
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                              isRejected
                                                ? "border-rose-200 bg-rose-50/30"
                                                : "border-slate-100 bg-white shadow-sm"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setPreviewFile({
                                                  url: doc.evidenceUrl,
                                                  name: doc.fileName || "Document",
                                                })
                                              }
                                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                            >
                                              <FileText
                                                size={14}
                                                className={
                                                  isRejected
                                                    ? "text-rose-500 shrink-0"
                                                    : "text-emerald-600 shrink-0"
                                                }
                                              />
                                              <span
                                                className={`text-[11px] font-bold truncate ${
                                                  isRejected ? "text-rose-600" : "text-slate-700"
                                                }`}
                                              >
                                                {doc.fileName || "Untitled Document"}
                                              </span>
                                            </button>

                                            {isResubmission && (
                                              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[8px] font-black uppercase tracking-wider">
                                                <RotateCcw size={9} />
                                                Resubmitted
                                              </span>
                                            )}

                                            {docDescription && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setExpandedDocId(isExpanded ? null : doc.id)
                                                }
                                                className={`shrink-0 p-1 rounded-lg transition-all ${
                                                  isExpanded
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                                                }`}
                                              >
                                                <Info size={13} />
                                              </button>
                                            )}

                                            {sub.reviewStatus === "Pending" && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  toggleFileRejection(
                                                    doc.id,
                                                    doc.fileName || "document"
                                                  )
                                                }
                                                className={`shrink-0 p-1 rounded-full shadow-sm transition-all ${
                                                  isRejected
                                                    ? "bg-rose-500 text-white"
                                                    : "bg-white text-slate-300 hover:text-rose-500 border border-slate-100 opacity-0 group-hover:opacity-100"
                                                }`}
                                              >
                                                {isRejected ? (
                                                  <CheckCircle2 size={12} />
                                                ) : (
                                                  <XCircle size={12} />
                                                )}
                                              </button>
                                            )}
                                          </div>

                                          {docDescription && isExpanded && (
                                            <div className="mt-1.5 ml-4 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                Document Description
                                              </p>
                                              <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
                                                {docDescription}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                                      <p className="text-[10px] text-slate-400 font-medium">
                                        No documents attached for this submission.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

            {(!indicator.submissions ||
              Object.keys(indicator.submissions).length === 0) && (
              <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
                <FileText size={48} className="mx-auto text-slate-200 mb-3" />
                <p className="text-[11px] text-slate-400 font-medium">
                  No submissions found for this indicator.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── File Preview Modal ── */}
      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white text-[11px] font-black uppercase tracking-widest transition-all ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertOctagon size={16} />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminIndicatorReview;