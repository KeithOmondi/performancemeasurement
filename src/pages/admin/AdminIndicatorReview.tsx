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
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  processAdminReview,
  getIndicatorByIdAdmin,
  type ISubmission,
  type ISubmissionReviewUpdate,
  type IDocumentReviewUpdate,
} from "../../store/slices/adminIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

const AdminIndicatorReview: React.FC = () => {
  const { indicatorId } = useParams<{ indicatorId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // ── Selectors ─────────────────────────────────────────────────────────────
  // Updated to match your slice's property names: selectedIndicator, isReviewing, isLoading
  const { selectedIndicator: indicator, isReviewing, isLoading } = useAppSelector(
    (state) => state.adminIndicators
  );

  // ── Load Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (indicatorId) {
      dispatch(getIndicatorByIdAdmin(indicatorId));
    }
  }, [dispatch, indicatorId]);

  // ── Derived Data ──────────────────────────────────────────────────────────
  const allSubmissions = useMemo<ISubmission[]>(
    () => (indicator ? Object.values(indicator.submissions ?? {}).flat() : []),
    [indicator]
  );

  const pendingSubmissions = useMemo(
    () => allSubmissions.filter((s) => s.reviewStatus === "Pending"),
    [allSubmissions]
  );

  // Pre-populate review state for pending items
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
  const [docReviews, setDocReviews] = useState<ISubmissionReviewUpdate[]>([]);
  const [documentUpdates, setDocumentUpdates] = useState<IDocumentReviewUpdate[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [rejectionMode, setRejectionMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    setDocReviews(initialReviews);
  }, [initialReviews]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleFileRejection = useCallback((documentId: string, fileName: string) => {
    setDocumentUpdates((prev) => {
      const exists = prev.find((d) => d.documentId === documentId);
      if (exists) return prev.filter((d) => d.documentId !== documentId);
      if (!rejectionMode) setRejectionMode(true);
      return [...prev, { documentId, status: "Rejected", reason: `File [${fileName}] rejected.` }];
    });
  }, [rejectionMode]);

  const handleFinalAction = useCallback(async (decision: "Verified" | "Rejected") => {
    if (!indicator) return;

    // If documents are flagged, the overall decision must be Rejected
    const finalDecision = documentUpdates.length > 0 ? "Rejected" : decision;

    if (finalDecision === "Rejected" && !overallComment.trim()) {
      alert("Please provide an overall justification for rejection.");
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
          adminOverallComments: overallComment.trim() || (finalDecision === "Verified" ? "Verified and approved." : "Returned for corrections."),
          submissionUpdates: finalSubmissionUpdates,
          documentUpdates,
        },
      })
    );

    if (processAdminReview.fulfilled.match(result)) {
      navigate("/admin/indicators");
    }
  }, [dispatch, docReviews, documentUpdates, indicator, navigate, overallComment]);

  // ── Render States ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fcfdfb]">
        <Loader2 className="w-10 h-10 text-[#1d3331] animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Dossier...</p>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <AlertOctagon size={48} className="text-slate-200" />
        <p className="text-slate-500 font-bold">Indicator not found.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase">Return to Registry</button>
      </div>
    );
  }

  const hasPending = pendingSubmissions.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfdfb]">
      {/* Navigation Header */}
      <div className="px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-black group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h2 className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">Registry Audit</h2>
            <h1 className="text-[13px] font-black text-slate-900 uppercase truncate max-w-[400px]">
               {indicator.activity.description}
            </h1>
          </div>
        </div>

        {hasPending && (
          <div className="flex items-center gap-4">
            {!rejectionMode && (
              <button
                onClick={() => setRejectionMode(true)}
                disabled={isReviewing}
                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-all"
              >
                Flag for Correction
              </button>
            )}
            <button
              disabled={isReviewing}
              onClick={() => handleFinalAction(rejectionMode ? "Rejected" : "Verified")}
              className={`px-7 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                rejectionMode 
                  ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200" 
                  : "bg-[#1d3331] text-white hover:bg-black shadow-emerald-900/20"
              }`}
            >
              {isReviewing ? <Loader2 size={14} className="animate-spin" /> : rejectionMode ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
              {rejectionMode ? "Confirm Rejection" : "Approve Progress"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 md:p-12">
        <div className="w-full max-w-6xl mx-auto space-y-10">
          
          {/* Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             <div className="lg:col-span-3 bg-white p-10 border border-slate-200/60 shadow-sm rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 uppercase tracking-widest rounded-lg">
                        {indicator.perspective}
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-slate-50 text-slate-500 border border-slate-100">
                        {indicator.reportingCycle === "Annual" ? <CalendarDays size={12} /> : <Clock size={12} />}
                        {indicator.reportingCycle} Cycle
                    </div>
                </div>
                <h3 className="text-2xl font-serif font-black text-slate-900 mb-4 leading-tight">{indicator.objective.title}</h3>
                <p className="text-[15px] text-slate-500 font-medium leading-relaxed max-w-3xl">{indicator.activity.description}</p>
             </div>

             <div className="bg-[#1d3331] p-10 rounded-[2.5rem] text-white flex flex-col justify-center shadow-2xl shadow-emerald-900/20">
                <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em] mb-3">Target Performance</p>
                <p className="text-5xl font-serif font-black tracking-tighter">{indicator.target}</p>
                <p className="text-[12px] font-bold opacity-70 mt-2 uppercase tracking-widest">{indicator.unit}</p>
             </div>
          </div>

          {/* Rejection UI */}
          {rejectionMode && (
            <div className="space-y-4 bg-rose-50/50 p-8 rounded-[2.5rem] border-2 border-dashed border-rose-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-rose-600">
                    <AlertOctagon size={20} />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Global Correction Note</h4>
                </div>
                <button onClick={() => setRejectionMode(false)} className="text-[10px] font-black text-slate-400 hover:text-black uppercase">Cancel</button>
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

          {/* Submissions List */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Evidence Trail</h4>
            
            {Object.entries(indicator.submissions).map(([quarterKey, submissions]) => (
              <div key={quarterKey} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase">{quarterKey.replace('_', ' ')}</span>
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>

                {submissions.map((sub: ISubmission) => (
                  <div key={sub.id} className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                 <FileText size={20} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Reported Value</p>
                                 <p className="text-lg font-black text-slate-900">{sub.achievedValue} {indicator.unit}</p>
                              </div>
                           </div>
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              sub.reviewStatus === "Verified" || sub.reviewStatus === "Accepted" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              sub.reviewStatus === "Rejected" ? "bg-rose-50 text-rose-600 border-rose-100" :
                              "bg-orange-50 text-orange-600 border-orange-100"
                           }`}>
                              {sub.reviewStatus}
                           </span>
                        </div>

                        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                           <p className="text-[13px] text-slate-600 font-medium leading-relaxed italic">
                             "{sub.notes || "No user commentary provided."}"
                           </p>
                        </div>

                        {/* Documents Section */}
                        <div className="space-y-3">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Paperclip size={12} /> Supporting Documents
                           </p>
                           <div className="flex flex-wrap gap-3">
                              {sub.documents.map((doc) => {
                                const isRejected = documentUpdates.some(du => du.documentId === doc.id);
                                return (
                                  <div key={doc.id} className="group relative">
                                    <button
                                      onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName })}
                                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                        isRejected 
                                          ? "border-rose-200 bg-rose-50/30 text-rose-600" 
                                          : "border-slate-100 bg-white hover:border-emerald-500 text-slate-600 shadow-sm"
                                      }`}
                                    >
                                      <FileText size={14} className={isRejected ? "text-rose-500" : "text-emerald-600"} />
                                      <span className="text-[11px] font-bold truncate max-w-[150px]">{doc.fileName}</span>
                                    </button>
                                    
                                    {sub.reviewStatus === "Pending" && (
                                      <button 
                                        onClick={() => toggleFileRejection(doc.id, doc.fileName)}
                                        className={`absolute -top-2 -right-2 p-1 rounded-full shadow-md transition-all ${
                                            isRejected ? "bg-rose-500 text-white" : "bg-white text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                                        }`}
                                      >
                                        {isRejected ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
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

export default AdminIndicatorReview;