import React, { useState, useCallback, useMemo } from "react";
import {
  FileText, Loader2, ThumbsUp,
  AlertOctagon, Edit3, Clock, CalendarDays, XCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  type IAdminIndicator,
  type ISubmission,
  type ISubmissionReviewUpdate,
  type IDocumentReviewUpdate,
} from "../../store/slices/adminIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

interface AdminIndicatorModalProps {
  indicator: IAdminIndicator;
  onClose: () => void;
}

const AdminIndicatorModal: React.FC<AdminIndicatorModalProps> = ({
  indicator,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { isReviewing } = useAppSelector((state) => state.adminIndicators);

  // ── Derived Data ──────────────────────────────────────────────────────────

  /**
   * Flatten all quarterly folders into a single array.
   * Each quarter key (e.g. "Q1_2025") holds submissions sorted newest-first,
   * so we preserve that order when flattening.
   */
  const allSubmissions = useMemo<ISubmission[]>(
    () => Object.values(indicator.submissions ?? {}).flat(),
    [indicator.submissions]
  );

  /** Quarters that have at least one pending submission, shown as review cards. */
  const pendingSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.reviewStatus === "Pending"),
    [allSubmissions]
  );

  const hasSubmissions = allSubmissions.length > 0;
  const hasPending     = pendingSubmissions.length > 0;

  const initialReviews = useMemo<ISubmissionReviewUpdate[]>(
    () =>
      pendingSubmissions.map((s) => ({
        submissionId: s.id,
        reviewStatus: "Pending" as const,
        adminComment: s.adminComment ?? "",
      })),
    [pendingSubmissions]
  );

  // ── State ─────────────────────────────────────────────────────────────────

  const [docReviews, setDocReviews]         = useState<ISubmissionReviewUpdate[]>(initialReviews);
  const [documentUpdates, setDocumentUpdates] = useState<IDocumentReviewUpdate[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [rejectionMode, setRejectionMode]   = useState(false);
  const [previewFile, setPreviewFile]       = useState<{ url: string; name: string } | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDocReviewChange = useCallback(
    (subId: string, updates: Partial<ISubmissionReviewUpdate>) => {
      setDocReviews((prev) =>
        prev.map((r) => (r.submissionId === subId ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const toggleFileRejection = useCallback(
    (documentId: string, fileName: string) => {
      setDocumentUpdates((prev) => {
        const exists = prev.find((d) => d.documentId === documentId);
        if (exists) return prev.filter((d) => d.documentId !== documentId);
        if (!rejectionMode) setRejectionMode(true);
        return [
          ...prev,
          { documentId, status: "Rejected" as const, reason: `File [${fileName}] rejected.` },
        ];
      });
    },
    [rejectionMode]
  );

  const handleEnterRejectionMode = useCallback(() => {
    setRejectionMode(true);
    setDocReviews((prev) =>
      prev.map((r) => ({ ...r, reviewStatus: "Rejected" as const }))
    );
  }, []);

  const handleCancelRejection = useCallback(() => {
    setRejectionMode(false);
    setOverallComment("");
    setDocumentUpdates([]);
    setDocReviews((prev) =>
      prev.map((r) => ({ ...r, reviewStatus: "Pending" as const }))
    );
  }, []);

  const handleFinalAction = useCallback(
    async (decision: "Verified" | "Rejected") => {
      const finalDecision = documentUpdates.length > 0 ? "Rejected" : decision;

      if (finalDecision === "Rejected" && !overallComment.trim()) {
        alert("Please provide an overall justification for the correction order.");
        return;
      }

      const finalSubmissionUpdates = docReviews.map((r) => ({
        submissionId: r.submissionId,
        reviewStatus:
          finalDecision === "Verified"
            ? ("Verified" as const)
            : r.reviewStatus,
        adminComment: r.adminComment?.trim() || overallComment.trim(),
      }));

      const result = await dispatch(
        processAdminReview({
          id: indicator.id,
          reviewData: {
            decision: finalDecision,
            adminOverallComments:
              overallComment.trim() ||
              (finalDecision === "Verified"
                ? "Verified and approved."
                : "Returned for document corrections."),
            submissionUpdates: finalSubmissionUpdates,
            documentUpdates,
          },
        })
      );

      if (processAdminReview.fulfilled.match(result)) onClose();
    },
    [dispatch, docReviews, documentUpdates, indicator.id, onClose, overallComment]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">

      {/* Header */}
      <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Review Panel
          </h2>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
            indicator.reportingCycle === "Annual"
              ? "bg-amber-50 text-amber-600 border-amber-100"
              : "bg-blue-50 text-blue-600 border-blue-100"
          }`}>
            {indicator.reportingCycle === "Annual"
              ? <CalendarDays size={12} />
              : <Clock size={12} />}
            {indicator.reportingCycle === "Annual"
              ? "Annual"
              : `Quarter ${indicator.activeQuarter}`}
          </div>
        </div>

        {/* Action buttons — only render when there are pending submissions to review */}
        {hasPending && (
          <div className="flex items-center gap-3">
            {!rejectionMode && (
              <button
                onClick={handleEnterRejectionMode}
                disabled={isReviewing}
                className="px-6 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
              >
                <AlertOctagon size={14} /> Reject
              </button>
            )}
            <button
              disabled={isReviewing}
              onClick={() => handleFinalAction(rejectionMode ? "Rejected" : "Verified")}
              className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg ${
                rejectionMode
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-[#1d3331] text-white hover:bg-black"
              }`}
            >
              {isReviewing
                ? <Loader2 size={14} className="animate-spin" />
                : rejectionMode
                  ? <AlertOctagon size={14} />
                  : <ThumbsUp size={14} />}
              {rejectionMode ? "Confirm Rejection" : "Approve"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
        <div className="w-full max-w-4xl mx-auto space-y-8">

          {/* Rejection reason box */}
          {rejectionMode && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  {documentUpdates.length > 0
                    ? "Document Correction Required"
                    : "Overall Deficiency Report"}
                </h4>
                <button
                  onClick={handleCancelRejection}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600"
                >
                  Cancel
                </button>
              </div>
              <textarea
                autoFocus
                placeholder="Describe why specific files or the overall progress is being returned..."
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                className="w-full p-6 bg-white border-2 border-rose-200 rounded-[1.5rem] text-[14px] font-semibold outline-none focus:border-rose-500 min-h-[100px] resize-none"
              />
            </div>
          )}

          {/* Indicator Info Card */}
          <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-3xl">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black bg-[#1d3331] text-white px-3 py-1.5 uppercase tracking-widest rounded-lg">
                {indicator.perspective}
              </span>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Target ({indicator.unit})
                </p>
                <p className="text-xl font-serif font-black text-[#1d3331]">
                  {indicator.target}
                </p>
              </div>
            </div>
            <h3 className="text-xl font-serif font-black text-slate-800 mb-4">
              {indicator.objective?.title}
            </h3>
            <div className="p-5 bg-[#fcfcf7] rounded-2xl border-l-4 border-[#1d3331]">
              <p className="text-[13px] text-[#1a2c2c] font-semibold">
                {indicator.activity?.description}
              </p>
            </div>
          </div>

          {/* No submissions state */}
          {!hasSubmissions && (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
              <FileText className="mx-auto mb-3 text-slate-300" size={32} />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                No Submissions Yet
              </p>
              <p className="text-[13px] text-slate-400 mt-1">
                This indicator has not received any submissions.
              </p>
            </div>
          )}

          {/* Quarterly submission folders */}
          {Object.entries(indicator.submissions ?? {}).map(([quarterKey, submissions]) => {
            const latest = submissions[0]; // newest-first from the API
            if (!latest) return null;

            const quarterReviews = docReviews.filter((r) =>
              submissions.some((s) => s.id === r.submissionId)
            );

            return (
              <div
                key={quarterKey}
                className="bg-white border border-slate-200 rounded-[1.5rem] shadow-md overflow-hidden"
              >
                {/* Quarter folder header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#1d3331] uppercase tracking-widest">
                      {quarterKey.replace("_", " · ")}
                    </span>
                    {submissions.length > 1 && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                        {submissions.length - 1} resubmission{submissions.length > 2 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                    latest.reviewStatus === "Verified"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : latest.reviewStatus === "Rejected"
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-blue-50 text-blue-600 border-blue-100"
                  }`}>
                    {latest.reviewStatus}
                  </span>
                </div>

                {/* Submissions inside this quarter folder */}
                <div className="divide-y divide-slate-100">
                  {submissions.map((subData, idx) => {
                    const review = quarterReviews.find(
                      (r) => r.submissionId === subData.id
                    );

                    return (
                      <div key={subData.id} className="p-6 space-y-5">
                        {/* Submission meta */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">
                            {idx === 0 ? "Latest" : `Previous · ${subData.resubmissionCount > 0 ? `Resubmission ${subData.resubmissionCount}` : "Original"}`}
                          </span>
                          <span className="text-[9px] text-slate-300">·</span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(subData.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Achieved value */}
                        {subData.achievedValue != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              Achieved
                            </span>
                            <span className="text-[13px] font-black text-[#1d3331]">
                              {subData.achievedValue} {indicator.unit}
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        {subData.notes && (
                          <p className="text-[13px] text-slate-600 font-semibold bg-slate-50 rounded-xl p-4">
                            {subData.notes}
                          </p>
                        )}

                        {/* Documents */}
                        <div className="grid grid-cols-1 gap-3">
                          {(subData.documents ?? []).map((doc) => {
                            const isFileRejected = documentUpdates.some(
                              (du) => du.documentId === doc.id
                            );
                            return (
                              <div
                                key={doc.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  isFileRejected
                                    ? "bg-rose-50 border-rose-200"
                                    : "bg-slate-50 border-slate-100"
                                }`}
                              >
                                <button
                                  onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName })}
                                  className="flex-1 flex items-center gap-4 overflow-hidden text-left"
                                >
                                  <FileText
                                    className={isFileRejected ? "text-rose-400" : "text-slate-400"}
                                    size={16}
                                  />
                                  <span className={`text-[11px] font-black truncate uppercase ${
                                    isFileRejected ? "text-rose-700" : "text-slate-600"
                                  }`}>
                                    {doc.fileName}
                                  </span>
                                </button>

                                {/* Only allow rejection toggles on pending submissions */}
                                {subData.reviewStatus === "Pending" && (
                                  <button
                                    onClick={() => toggleFileRejection(doc.id, doc.fileName)}
                                    className={`p-2 rounded-lg transition-all ${
                                      isFileRejected
                                        ? "bg-rose-600 text-white"
                                        : "bg-white text-slate-400 hover:text-rose-500 border border-slate-200"
                                    }`}
                                    title={isFileRejected ? "Undo rejection" : "Reject this file"}
                                  >
                                    {isFileRejected ? <XCircle size={16} /> : <AlertOctagon size={16} />}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Per-submission comment — only for pending */}
                        {review && (
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                              <Edit3 size={14} /> Auditor's Feedback for this Submission
                            </label>
                            <textarea
                              value={review.adminComment}
                              onChange={(e) =>
                                handleDocReviewChange(subData.id, { adminComment: e.target.value })
                              }
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-semibold outline-none focus:bg-white focus:border-[#1d3331]/20 transition-all resize-none min-h-[80px]"
                              placeholder="Comment on this specific submission..."
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

export default AdminIndicatorModal;