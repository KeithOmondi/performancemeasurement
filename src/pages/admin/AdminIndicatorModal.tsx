import React, { useState, useCallback, useMemo } from "react";
import {
  FileText,
  ExternalLink,
  Files,
  Loader2,
  ThumbsUp,
  AlertOctagon,
  Edit3,
  Clock,
  CalendarDays,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  type IAdminIndicator,
  type ISubmissionReviewUpdate,
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

  // ── Derived Data (Replaces the Effect) ──────────────────────────────────
  // We calculate what the "default" reviews look like based on current props.
  const initialPendingReviews = useMemo(() => {
    return (indicator.submissions ?? [])
      .filter((s) => s.reviewStatus === "Pending")
      .map((s) => ({
        submissionId: s.id,
        reviewStatus: "Pending" as const,
        adminComment: s.adminComment ?? "",
      }));
  }, [indicator.submissions]);

  // ── State ──────────────────────────────────────────────────────────────
  // Initialize state directly from the derived logic.
  // NOTE: Ensure the parent calls this with <AdminIndicatorModal key={indicator.id} ... />
  // to force a fresh state whenever the indicator changes.
  const [docReviews, setDocReviews] = useState<ISubmissionReviewUpdate[]>(initialPendingReviews);
  const [overallComment, setOverallComment] = useState("");
  const [rejectionMode, setRejectionMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const handleDocReviewChange = useCallback(
    (subId: string, updates: Partial<ISubmissionReviewUpdate>) => {
      setDocReviews((prev) =>
        prev.map((r) => (r.submissionId === subId ? { ...r, ...updates } : r))
      );
    },
    []
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
    setDocReviews((prev) =>
      prev.map((r) => ({ ...r, reviewStatus: "Pending" as const }))
    );
  }, []);

  const handleFinalAction = useCallback(
    async (decision: "Verified" | "Rejected") => {
      if (decision === "Rejected" && !overallComment.trim()) {
        alert("Please provide a justification for the rejection.");
        return;
      }

      const finalSubmissionUpdates = docReviews.map((r) => ({
        submissionId: r.submissionId,
        reviewStatus:
          decision === "Verified" ? ("Verified" as const) : r.reviewStatus,
        adminComment: r.adminComment?.trim() || overallComment.trim(),
      }));

      const result = await dispatch(
        processAdminReview({
          id: indicator.id,
          reviewData: {
            decision,
            adminOverallComments:
              overallComment.trim() ||
              (decision === "Verified"
                ? "Verified and approved for Super Admin review."
                : "Rejected for corrections."),
            submissionUpdates: finalSubmissionUpdates,
          },
        })
      );

      if (processAdminReview.fulfilled.match(result)) {
        onClose();
      }
    },
    [dispatch, docReviews, indicator.id, onClose, overallComment]
  );

  const isAnnual = indicator.reportingCycle === "Annual";

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Review Panel
          </h2>
          {isAnnual ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border bg-amber-50 text-amber-600 border-amber-100">
              <CalendarDays size={12} /> Annual Cycle
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border bg-blue-50 text-blue-600 border-blue-100">
              <Clock size={12} /> Quarter {indicator.activeQuarter}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!rejectionMode && (
            <button
              onClick={handleEnterRejectionMode}
              disabled={isReviewing}
              className="px-6 py-2.5 rounded-[0.5rem] text-[10px] font-black uppercase flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-all"
            >
              <AlertOctagon size={14} /> Reject
            </button>
          )}
          <button
            disabled={isReviewing || rejectionMode}
            onClick={() => handleFinalAction("Verified")}
            className="px-6 py-2.5 rounded-[0.5rem] text-[10px] font-black uppercase bg-[#1d3331] text-white flex items-center gap-2 hover:bg-black disabled:opacity-50 transition-all shadow-lg"
          >
            {isReviewing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ThumbsUp size={14} />
            )}
            Approve
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          {rejectionMode && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 bg-rose-50 p-6 rounded-[2rem] border border-rose-100 shadow-inner">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  Performance Correction Order
                </h4>
                <button
                  onClick={handleCancelRejection}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <textarea
                autoFocus
                placeholder="Detail deficiencies..."
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                className="w-full p-6 bg-white border-2 border-rose-200 rounded-[1.5rem] text-[14px] font-semibold outline-none focus:border-rose-500 min-h-[120px] resize-none"
              />
              <button
                disabled={isReviewing}
                onClick={() => handleFinalAction("Rejected")}
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-rose-700 disabled:opacity-50 transition-all"
              >
                {isReviewing ? "Processing..." : "Confirm & Return"}
              </button>
            </div>
          )}

          <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-3xl">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black bg-[#1d3331] text-white px-3 py-1.5 uppercase tracking-widest rounded-lg">
                {indicator.perspective}
              </span>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target ({indicator.unit})</p>
                <p className="text-xl font-serif font-black text-[#1d3331]">{indicator.target}</p>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-serif font-black text-slate-800 mb-4">{indicator.objective?.title}</h3>
            <div className="p-5 bg-[#fcfcf7] rounded-2xl border-l-4 border-[#1d3331]">
              <p className="text-[13px] text-[#1a2c2c] font-semibold">{indicator.activity?.description}</p>
            </div>
          </div>

          <div className="space-y-6 pb-10">
            <h4 className="text-[10px] font-black text-slate-400 uppercase px-2 flex items-center gap-3">
              <Files size={14} className="text-[#1d3331]" /> Quarterly Performance Evidence
            </h4>

            {docReviews.length === 0 ? (
              <div className="text-center py-12 text-[11px] font-bold text-slate-400 uppercase tracking-widest">No pending submissions to review.</div>
            ) : (
              docReviews.map((review) => {
                const subData = indicator.submissions.find((s) => s.id === review.submissionId);
                if (!subData) return null;
                return (
                  <div key={review.submissionId} className="bg-white p-6 border border-slate-200 rounded-[1.5rem] space-y-6 shadow-md">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-black text-[#1d3331] uppercase">Quarter {subData.quarter} Evidence</p>
                      {rejectionMode && (
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                          <button
                            onClick={() => handleDocReviewChange(review.submissionId, { reviewStatus: "Verified" })}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${review.reviewStatus === "Verified" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
                          >Accept</button>
                          <button
                            onClick={() => handleDocReviewChange(review.submissionId, { reviewStatus: "Rejected" })}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${review.reviewStatus === "Rejected" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400"}`}
                          >Reject</button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(subData.documents ?? []).map((doc) => (
                        <button key={doc.id} onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName })} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-[#1d3331] text-left transition-colors">
                          <div className="flex items-center gap-4 overflow-hidden w-full">
                            <FileText className="text-slate-400 shrink-0" size={16} />
                            <span className="text-[11px] font-black text-slate-600 truncate uppercase">{doc.fileName}</span>
                          </div>
                          <ExternalLink size={14} className="text-slate-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                    {subData.notes && (
                      <div className="bg-[#fcfcf7] p-4 rounded-xl border border-dashed border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assignee Notes</p>
                        <p className="text-xs font-medium text-[#1a2c2c]">{subData.notes}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Edit3 size={14} /> Internal Audit Comment</label>
                      <textarea
                        value={review.adminComment}
                        onChange={(e) => handleDocReviewChange(review.submissionId, { adminComment: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-semibold outline-none focus:bg-white focus:border-[#1d3331]/20 transition-all resize-none min-h-[80px]"
                        placeholder="Comment on this quarter's evidence..."
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
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