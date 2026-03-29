import React, { useState, useEffect } from "react";
import {
  FileText,
  ExternalLink,
  Files,
  Loader2,
  ThumbsUp,
  AlertOctagon,
  Edit3,
  Calendar,
  Clock,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  type IAdminIndicator,
  type ISubmissionReviewUpdate,
} from "../../store/slices/adminIndicatorSlice";
import FilePreviewModal from "../PreviewModal"; // ✅ Import — adjust path as needed

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

  const [docReviews, setDocReviews] = useState<ISubmissionReviewUpdate[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [rejectionMode, setRejectionMode] = useState(false);

  // ✅ State for file preview — same pattern as UserTaskIdPage
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (indicator.submissions) {
      const currentDocs = indicator.submissions
        .filter((s) => s.reviewStatus === "Pending")
        .map((s) => ({
          submissionId: s._id,
          reviewStatus: "Pending" as const,
          adminComment: s.adminComment || "",
        }));
      setDocReviews(currentDocs);
    }
  }, [indicator]);

  const handleDocReviewChange = (
    subId: string,
    updates: Partial<ISubmissionReviewUpdate>,
  ) => {
    setDocReviews((prev) =>
      prev.map((r) => (r.submissionId === subId ? { ...r, ...updates } : r)),
    );
  };

  const handleFinalAction = async (decision: "Verified" | "Rejected") => {
    if (decision === "Rejected" && !overallComment.trim()) {
      alert("Please provide a justification for the rejection.");
      return;
    }

    const finalSubmissionUpdates = docReviews.map((r) => ({
      submissionId: r.submissionId,
      reviewStatus: decision === "Verified" ? ("Verified" as const) : r.reviewStatus,
      adminComment: r.adminComment?.trim() || overallComment.trim(),
    }));

    await dispatch(
      processAdminReview({
        id: indicator._id,
        reviewData: {
          decision,
          adminOverallComments:
            overallComment.trim() ||
            (decision === "Verified"
              ? "Verified and approved for Super Admin review."
              : "Rejected for corrections."),
          submissionUpdates: finalSubmissionUpdates,
        },
      }),
    ).then((res) => {
      if (processAdminReview.fulfilled.match(res)) onClose();
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden">

      {/* Header */}
      <div className="px-8 py-4 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Reviewing Submission
          </h2>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
            indicator.reportingCycle === "Annual"
              ? "bg-amber-50 text-amber-600 border-amber-100"
              : "bg-blue-50 text-blue-600 border-blue-100"
          }`}>
            {indicator.reportingCycle === "Annual" ? <Calendar size={12} /> : <Clock size={12} />}
            {indicator.reportingCycle} Cycle
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!rejectionMode && (
            <button
              onClick={() => {
                setRejectionMode(true);
                setDocReviews((prev) => prev.map((r) => ({ ...r, reviewStatus: "Rejected" })));
              }}
              className="px-6 py-2.5 rounded-[0.5rem] text-[10px] font-black uppercase flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
            >
              <AlertOctagon size={14} /> Reject
            </button>
          )}
          <button
            disabled={isReviewing || rejectionMode}
            onClick={() => handleFinalAction("Verified")}
            className="px-6 py-2.5 rounded-[0.5rem] text-[10px] font-black uppercase bg-[#1a3a32] text-white flex items-center gap-2 hover:bg-black disabled:opacity-50 transition-all shadow-lg"
          >
            {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
            Approve
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10">
        <div className="w-full max-w-4xl mx-auto space-y-8">

          {/* Rejection Form */}
          {rejectionMode && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                  Provide Rejection Justification
                </h4>
                <button onClick={() => setRejectionMode(false)} className="text-[10px] font-bold text-slate-400 hover:text-rose-600">
                  Cancel
                </button>
              </div>
              <textarea
                autoFocus
                placeholder="Detail the specific deficiencies..."
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                className="w-full p-6 bg-white border-2 border-rose-200 rounded-[1.5rem] text-[14px] font-semibold outline-none focus:border-rose-500 min-h-[120px] resize-none"
              />
              <button
                disabled={isReviewing}
                onClick={() => handleFinalAction("Rejected")}
                className="w-full py-4 bg-rose-600 text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-rose-700 transition-all"
              >
                {isReviewing ? "Processing..." : "Confirm & Return to Assignee"}
              </button>
            </div>
          )}

          {/* Indicator Details Card */}
          <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-3xl relative">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black bg-[#1a3a32] text-white px-3 py-1.5 uppercase tracking-widest rounded-lg">
                {indicator.perspective}
              </span>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target ({indicator.unit})</p>
                <p className="text-lg font-serif font-black text-[#1a3a32]">{indicator.target}</p>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-serif font-black text-slate-800 leading-tight mb-4">
              {indicator.objectiveTitle}
            </h3>
            <div className="p-5 bg-slate-50 rounded-2xl border-l-4 border-[#1a3a32]">
              <p className="text-[13px] text-slate-600 font-semibold leading-relaxed">
                {indicator.activityDescription}
              </p>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 px-2">
              <Files size={14} className="text-[#1a3a32]" />
              {indicator.reportingCycle === "Annual" ? "Annual Submission" : "Quarterly Submissions"}
            </h4>

            {docReviews.map((review) => {
              const subData = indicator.submissions.find((s) => s._id === review.submissionId);
              if (!subData) return null;

              return (
                <div key={review.submissionId} className="bg-white p-6 md:p-8 border border-slate-200 shadow-md rounded-[1.5rem] space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black text-[#1a3a32] uppercase">
                      {indicator.reportingCycle === "Annual"
                        ? "Annual Performance Evidence"
                        : `Quarter ${subData.quarter} Evidence`}
                    </p>
                    {rejectionMode && (
                      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => handleDocReviewChange(review.submissionId, { reviewStatus: "Verified" })}
                          className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${review.reviewStatus === "Verified" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDocReviewChange(review.submissionId, { reviewStatus: "Rejected" })}
                          className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${review.reviewStatus === "Rejected" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400"}`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ✅ Documents Grid — button instead of anchor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subData.documents.map((doc, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName || "Evidence File" })}
                        className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-[#1a3a32] group transition-all text-left"
                      >
                        <div className="flex items-center w-full gap-4 overflow-hidden">
                          <FileText className="text-slate-400 group-hover:text-[#1a3a32] shrink-0" size={16} />
                          <span className="text-[11px] font-black text-slate-600 truncate uppercase">
                            {doc.fileName || "Evidence File"}
                          </span>
                        </div>
                        <ExternalLink size={14} className="text-slate-300 group-hover:text-[#1a3a32] shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Assignee Notes */}
                  {subData.notes && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assignee Notes</p>
                      <p className="text-xs font-medium text-slate-600">{subData.notes}</p>
                    </div>
                  )}

                  {/* Admin Comment Field */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                      <Edit3 size={14} /> Internal Review Comment
                    </label>
                    <textarea
                      value={review.adminComment}
                      onChange={(e) => handleDocReviewChange(review.submissionId, { adminComment: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-semibold text-slate-700 outline-none focus:bg-white focus:border-slate-200 transition-all resize-none min-h-[80px]"
                      placeholder="Comment on this specific evidence set..."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ✅ FilePreviewModal — same pattern as UserTaskIdPage */}
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