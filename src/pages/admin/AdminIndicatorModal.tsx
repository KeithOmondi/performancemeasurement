import React, { useState } from "react";
import { 
  X, FileText, ExternalLink, CheckCircle2, AlertCircle, 
  User, Calendar, Clock, MessageSquare, Loader2, Target
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  processAdminReview, 
  type IAdminIndicator, 
  type IReviewData 
} from "../../store/slices/adminIndicatorSlice";

interface AdminIndicatorModalProps {
  indicator: IAdminIndicator;
  onClose: () => void;
}

const AdminIndicatorModal: React.FC<AdminIndicatorModalProps> = ({ indicator, onClose }) => {
  const dispatch = useAppDispatch();
  const { isReviewing } = useAppSelector((state) => state.adminIndicators);
  const [remarks, setRemarks] = useState("");
  
  const activeSub = indicator.submissions?.find(s => s.reviewStatus === "Pending") || indicator.latestSubmission;

  const handleReview = async (decision: "Reviewed" | "Rejected by Admin") => {
    if (!activeSub) return;

    const reviewPayload: IReviewData = {
      overallDecision: decision === "Reviewed" ? "Reviewed" : "Rejected by Admin",
      adminOverallComments: remarks,
      documentReviews: activeSub.documents.map((_) => ({ // Fixed ts(6133)
        submissionId: activeSub._id,
        reviewStatus: decision === "Reviewed" ? "Accepted" : "Rejected",
        adminComment: remarks,
      })),
    };

    try {
      await dispatch(processAdminReview({ id: indicator._id, reviewData: reviewPayload })).unwrap();
      onClose();
    } catch (err) {
      console.error("Review Error:", err);
    }
  };

  return (
    <div className="flex flex-col h-[90vh] max-h-[800px] w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
      
      {/* --- Header --- */}
      <div className="flex items-start justify-between p-8 bg-white border-b border-slate-100">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
              {indicator.perspective}
            </span>
            {indicator.isResubmission && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5">
                <Clock size={12} strokeWidth={2.5} /> Revision Required
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {indicator.objectiveTitle}
          </h2>
        </div>
        
        <button 
          onClick={onClose} 
          className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* --- Scrollable Body --- */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Officer Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Assigned Officer</label>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <User size={18} />
              </div>
              <span className="text-sm font-bold text-slate-700">{indicator.assigneeDisplayName}</span>
            </div>
          </div>

          {/* Period Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Review Period</label>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <span className="text-sm font-bold text-slate-700 uppercase">Q{activeSub?.quarter || 1} — 2026</span>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Reported Progress</label>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 leading-none">{indicator.progress}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">of {indicator.target}%</span>
              </div>
              <Target size={20} className="text-slate-200" />
            </div>
          </div>
        </div>

        {/* Evidence Grid */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Verification Evidence</h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
              {activeSub?.documents?.length || 0}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeSub?.documents?.map((doc, idx) => (
              <div key={idx} className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 truncate">
                  <div className="p-2 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-lg transition-colors">
                    <FileText size={18} />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{doc.fileName || "Document"}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{doc.fileType}</span>
                  </div>
                </div>
                <a 
                  href={doc.evidenceUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="ml-2 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Area */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Admin Feedback</h3>
          <div className="relative group">
            <MessageSquare className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter your review comments here..."
              className="w-full min-h-[140px] pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-300"
            />
          </div>
        </div>
      </div>

      {/* --- Footer Action Bar --- */}
      <div className="p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 max-w-sm">
          <div className="shrink-0 p-2 bg-amber-50 rounded-lg">
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
            Ensure data consistency between the reported progress and the uploaded evidence before finalizing.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            disabled={isReviewing}
            onClick={() => handleReview("Rejected by Admin")}
            className="flex-1 sm:px-10 py-3.5 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all disabled:opacity-50"
          >
            Reject
          </button>
          <button 
            disabled={isReviewing}
            onClick={() => handleReview("Reviewed")}
            className="flex-1 sm:px-10 py-3.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {isReviewing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            Approve Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminIndicatorModal;