import React, { useState, useCallback, useMemo } from "react";
import {
  FileText, Loader2, ThumbsUp,
  AlertOctagon, Edit3, Clock, CalendarDays, XCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  type IAdminIndicator,
  type ISubmissionReviewUpdate,
  type IDocumentReviewUpdate, // New Interface from our Slice update
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

  // ── Derived Data ────────────────────────────────────────────────────────
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
  const [docReviews, setDocReviews] = useState<ISubmissionReviewUpdate[]>(initialPendingReviews);
  const [documentUpdates, setDocumentUpdates] = useState<IDocumentReviewUpdate[]>([]); // New: Tracks individual file status
  const [overallComment, setOverallComment] = useState("");
  const [rejectionMode, setRejectionMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleDocReviewChange = useCallback((subId: string, updates: Partial<ISubmissionReviewUpdate>) => {
    setDocReviews((prev) => prev.map((r) => (r.submissionId === subId ? { ...r, ...updates } : r)));
  }, []);

  // NEW: Toggle rejection for a single specific document
  const toggleFileRejection = useCallback((documentId: string, fileName: string) => {
    setDocumentUpdates((prev) => {
      const exists = prev.find((d) => d.documentId === documentId);
      if (exists) {
        return prev.filter((d) => d.documentId !== documentId);
      }
      // If we reject a file, we automatically enter rejection mode for the whole indicator
      if (!rejectionMode) setRejectionMode(true);
      return [...prev, { documentId, status: "Rejected" as const, reason: `File [${fileName}] rejected.` }];
    });
  }, [rejectionMode]);

  const handleEnterRejectionMode = useCallback(() => {
    setRejectionMode(true);
    setDocReviews((prev) => prev.map((r) => ({ ...r, reviewStatus: "Rejected" as const })));
  }, []);

  const handleCancelRejection = useCallback(() => {
    setRejectionMode(false);
    setOverallComment("");
    setDocumentUpdates([]); // Clear individual file rejections
    setDocReviews((prev) => prev.map((r) => ({ ...r, reviewStatus: "Pending" as const })));
  }, []);

  const handleFinalAction = useCallback(
    async (decision: "Verified" | "Rejected") => {
      // If there are specific document rejections, the decision MUST be Rejected
      const finalDecision = documentUpdates.length > 0 ? "Rejected" : decision;

      if (finalDecision === "Rejected" && !overallComment.trim()) {
        alert("Please provide an overall justification for the correction order.");
        return;
      }

      const finalSubmissionUpdates = docReviews.map((r) => ({
        submissionId: r.submissionId,
        reviewStatus: finalDecision === "Verified" ? ("Verified" as const) : r.reviewStatus,
        adminComment: r.adminComment?.trim() || overallComment.trim(),
      }));

      const result = await dispatch(
        processAdminReview({
          id: indicator.id,
          reviewData: {
            decision: finalDecision,
            adminOverallComments: overallComment.trim() || (finalDecision === "Verified" 
              ? "Verified and approved." 
              : "Returned for document corrections."),
            submissionUpdates: finalSubmissionUpdates,
            documentUpdates: documentUpdates, // Passing the single file rejections to backend
          },
        })
      );

      if (processAdminReview.fulfilled.match(result)) {
        onClose();
      }
    },
    [dispatch, docReviews, documentUpdates, indicator.id, onClose, overallComment]
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review Panel</h2>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
            indicator.reportingCycle === "Annual" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"
          }`}>
            {indicator.reportingCycle === "Annual" ? <CalendarDays size={12} /> : <Clock size={12} />}
            {indicator.reportingCycle === "Annual" ? "Annual" : `Quarter ${indicator.activeQuarter}`}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!rejectionMode && (
            <button onClick={handleEnterRejectionMode} disabled={isReviewing} className="px-6 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all">
              <AlertOctagon size={14} /> Reject
            </button>
          )}
          <button
            disabled={isReviewing || (rejectionMode && documentUpdates.length === 0)}
            onClick={() => handleFinalAction(rejectionMode ? "Rejected" : "Verified")}
            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg ${
              rejectionMode ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-[#1d3331] text-white hover:bg-black"
            }`}
          >
            {isReviewing ? <Loader2 size={14} className="animate-spin" /> : rejectionMode ? <AlertOctagon size={14} /> : <ThumbsUp size={14} />}
            {rejectionMode ? "Reject" : "Approve"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          
          {rejectionMode && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  {documentUpdates.length > 0 ? "Document Correction Required" : "Overall Deficiency Report"}
                </h4>
                <button onClick={handleCancelRejection} className="text-[10px] font-bold text-slate-400 hover:text-rose-600">Cancel</button>
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
               <span className="text-[9px] font-black bg-[#1d3331] text-white px-3 py-1.5 uppercase tracking-widest rounded-lg">{indicator.perspective}</span>
               <div className="text-right">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target ({indicator.unit})</p>
                 <p className="text-xl font-serif font-black text-[#1d3331]">{indicator.target}</p>
               </div>
             </div>
             <h3 className="text-xl font-serif font-black text-slate-800 mb-4">{indicator.objective?.title}</h3>
             <div className="p-5 bg-[#fcfcf7] rounded-2xl border-l-4 border-[#1d3331]">
               <p className="text-[13px] text-[#1a2c2c] font-semibold">{indicator.activity?.description}</p>
             </div>
          </div>

          {/* Evidence List */}
          <div className="space-y-6 pb-10">
            {docReviews.map((review) => {
              const subData = indicator.submissions.find((s) => s.id === review.submissionId);
              if (!subData) return null;
              return (
                <div key={review.submissionId} className="bg-white p-6 border border-slate-200 rounded-[1.5rem] space-y-6 shadow-md">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black text-[#1d3331] uppercase">Quarter {subData.quarter} Evidence</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {(subData.documents ?? []).map((doc) => {
                      const isFileRejected = documentUpdates.some(du => du.documentId === doc.id);
                      return (
                        <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isFileRejected ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-100"}`}>
                          <button onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName })} className="flex-1 flex items-center gap-4 overflow-hidden text-left">
                            <FileText className={isFileRejected ? "text-rose-400" : "text-slate-400"} size={16} />
                            <span className={`text-[11px] font-black truncate uppercase ${isFileRejected ? "text-rose-700" : "text-slate-600"}`}>{doc.fileName}</span>
                          </button>
                          
                          {/* NEW: Single Document Rejection Button */}
                          <button 
                            onClick={() => toggleFileRejection(doc.id, doc.fileName)}
                            className={`p-2 rounded-lg transition-all ${isFileRejected ? "bg-rose-600 text-white" : "bg-white text-slate-400 hover:text-rose-500 border border-slate-200"}`}
                            title={isFileRejected ? "Undo Rejection" : "Reject this specific file"}
                          >
                            {isFileRejected ? <XCircle size={16} /> : <AlertOctagon size={16} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Edit3 size={14} /> Auditor's Feedback for this Quarter</label>
                    <textarea
                      value={review.adminComment}
                      onChange={(e) => handleDocReviewChange(review.submissionId, { adminComment: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-semibold outline-none focus:bg-white focus:border-[#1d3331]/20 transition-all resize-none min-h-[80px]"
                      placeholder="Comment on these specific documents..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {previewFile && (
        <FilePreviewModal url={previewFile.url} fileName={previewFile.name} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
};

export default AdminIndicatorModal;