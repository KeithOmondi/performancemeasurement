import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Files,
  Loader2,
  ShieldAlert,
  ArrowUpRight,
  ClipboardCheck,
  Edit3,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  type IAdminIndicator,
  type ISubmissionReviewUpdate,
} from "../../store/slices/adminIndicatorSlice";

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

  useEffect(() => {
    if (indicator.submissions) {
      const targetQ = indicator.reportingCycle === "Annual" ? 0 : indicator.activeQuarter;
      
      const currentDocs = indicator.submissions
        .filter((s) => s.quarter === targetQ)
        .map((s) => ({
          submissionId: s._id,
          // ALIGNED: Initial status mapping includes 'Verified'
          reviewStatus: (s.reviewStatus === "Accepted" ? "Verified" : s.reviewStatus || "Pending") as any,
          adminComment: s.adminComment || "",
          adminDescriptionEdit: s.adminDescriptionEdit || s.notes || "", 
        }));
      setDocReviews(currentDocs);
    }
  }, [indicator]);

  const handleDocReviewChange = (
    subId: string,
    updates: Partial<ISubmissionReviewUpdate>
  ) => {
    setDocReviews((prev) =>
      prev.map((r) => (r.submissionId === subId ? { ...r, ...updates } : r))
    );
  };

  const handleAdminSubmit = async () => {
    const hasRejections = docReviews.some((r) => r.reviewStatus === "Rejected");
    const allReviewed = docReviews.every((r) => r.reviewStatus !== "Pending");

    if (!allReviewed) {
      alert("Please provide a decision (Verify or Flag) for the submission before escalating.");
      return;
    }

    // ALIGNED: Matches backend "Verified" action
    const decision = hasRejections ? "Rejected" : "Verified";

    await dispatch(
      processAdminReview({
        id: indicator._id,
        reviewData: {
          decision,
          adminOverallComments:
            overallComment ||
            (hasRejections
              ? "Corrections required on evidence provided."
              : "Evidence audited and verified by Registry. Pending Super Admin certification."),
          submissionUpdates: docReviews,
        },
      })
    ).then((res) => {
      if (processAdminReview.fulfilled.match(res)) onClose();
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* RESUBMISSION ALERT */}
          {indicator.submissions?.some((s) => s.resubmissionCount > 0) && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center gap-4 shadow-sm animate-pulse">
              <ShieldAlert className="text-amber-600" size={20} />
              <div>
                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Resubmitted Dossier</p>
                <p className="text-[11px] text-amber-700 font-medium">Evidence updated following a prior rejection.</p>
              </div>
            </div>
          )}

          {/* HEADER */}
          <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ClipboardCheck size={120} />
            </div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] font-black bg-[#1a3a32] text-white px-3 py-1.5 uppercase tracking-[0.15em] rounded-lg">
                {indicator.perspective}
              </span>
              <div className="text-right">
                <p className="text-[8px] font-bold text-slate-400 uppercase">Target</p>
                <p className="text-sm font-black text-[#1a3a32]">{indicator.target} {indicator.unit}</p>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-4">{indicator.objectiveTitle}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border-l-2 border-emerald-500">
              {indicator.activityDescription}
            </p>
          </div>

          {/* AUDIT AREA */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <Files size={14} className="text-[#1a3a32]" /> Registry Audit Pipeline
            </h4>

            {docReviews.map((review) => {
              const subData = indicator.submissions.find(s => s._id === review.submissionId);
              return (
                <div key={review.submissionId} className="bg-white p-6 border border-slate-200 shadow-sm rounded-3xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                        <ClipboardCheck className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Claimed Value</p>
                        <p className="text-2xl font-black text-[#1a3a32]">
                          {subData?.achievedValue} <span className="text-xs text-slate-400 uppercase">{indicator.unit}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                      {/* ALIGNED: Marking as Verified instead of Accepted */}
                      <button
                        onClick={() => handleDocReviewChange(review.submissionId, { reviewStatus: "Verified" })}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${review.reviewStatus === "Verified" ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-white text-slate-500"}`}
                      >
                        <CheckCircle2 size={14} /> Mark Verified
                      </button>
                      <button
                        onClick={() => handleDocReviewChange(review.submissionId, { reviewStatus: "Rejected" })}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${review.reviewStatus === "Rejected" ? "bg-rose-600 text-white shadow-lg" : "hover:bg-white text-slate-500"}`}
                      >
                        <XCircle size={14} /> Flag Correction
                      </button>
                    </div>
                  </div>

                  {/* REGISTRY NOTES */}
                  <div className="space-y-3 p-5 bg-[#fcfdfd] rounded-2xl border border-slate-100">
                    <label className="text-[9px] font-black text-emerald-700 uppercase flex items-center gap-2">
                      <Edit3 size={12} /> Registry Refinement (Formal Language)
                    </label>
                    <textarea
                      value={review.adminDescriptionEdit}
                      onChange={(e) => handleDocReviewChange(review.submissionId, { adminDescriptionEdit: e.target.value })}
                      className="w-full p-0 bg-transparent border-none text-xs font-semibold text-slate-700 outline-none resize-none min-h-[60px]"
                      placeholder="Translate user notes into formal registry language..."
                    />
                  </div>

                  {/* DOCUMENTS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subData?.documents.map((doc: any, i: number) => (
                      <a key={i} href={doc.evidenceUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-[#1a3a32] group">
                        <div className="flex items-center gap-3">
                          <FileText className="text-emerald-600" size={16} />
                          <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{doc.fileName || "View Document"}</span>
                        </div>
                        <ExternalLink size={12} className="text-slate-300 group-hover:text-[#1a3a32]" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pb-12">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Final Remarks</h4>
            <textarea
              placeholder="Internal summary for Super Admin..."
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              className="w-full p-5 bg-white border border-slate-200 rounded-3xl text-sm font-medium outline-none shadow-sm focus:border-[#1a3a32] min-h-[100px]"
            />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-white border-t border-slate-100 px-8 py-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-[#1a3a32] uppercase tracking-widest">Registry Audit</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase">Escalation Phase</p>
        </div>

        <button
          onClick={handleAdminSubmit}
          disabled={isReviewing}
          className={`px-10 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all text-white ${
            docReviews.some((r) => r.reviewStatus === "Rejected") 
              ? "bg-rose-600 hover:bg-rose-700" 
              : "bg-[#1a3a32] hover:bg-black"
          }`}
        >
          {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
          {docReviews.some((r) => r.reviewStatus === "Rejected") ? "Request Correction" : "Verify & Escalate"}
        </button>
      </div>
    </div>
  );
};

export default AdminIndicatorModal;