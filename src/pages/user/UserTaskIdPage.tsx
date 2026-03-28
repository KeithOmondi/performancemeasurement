import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  ArrowLeft, Clock, AlertCircle,
  Loader2, TrendingUp, FileText, Upload, ExternalLink, ShieldAlert, Lock
} from "lucide-react";
import { fetchIndicatorDetails, clearIndicatorError } from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";
import type { ISubmissionUI } from "../../store/slices/userIndicatorSlice";

const UserTaskIdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { currentIndicator, loading, error, uploading } = useAppSelector(
    (state) => state.userIndicators
  );

  useEffect(() => {
    if (id) dispatch(fetchIndicatorDetails(id));
    return () => { dispatch(clearIndicatorError()); };
  }, [id, dispatch]);

  const daysRemaining = useMemo(() => {
    if (!currentIndicator?.deadline) return null;
    const diff = new Date(currentIndicator.deadline).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [currentIndicator]);

  // Updated Logic: Only lock if explicitly certified or under active audit
  const registryStatus = useMemo(() => {
    if (!currentIndicator) return { isOpen: false, message: "Syncing Registry..." };

    const targetQ = currentIndicator.activeQuarter;
    const now = new Date();
    const deadline = new Date(currentIndicator.deadline);

    // 1. Permanent Lock: Entire Indicator is Finished
    if (currentIndicator.status === "Completed") {
      return { isOpen: false, message: "Dossier Certified", icon: <Lock size={12}/> };
    }

    // 2. Audit Lock: Admin is currently reviewing (Prevents changing evidence mid-review)
    if (["Awaiting Admin Approval", "Awaiting Super Admin"].includes(currentIndicator.status)) {
      return { isOpen: false, message: "Under Review", icon: <Clock size={12}/> };
    }

    // 3. Cycle Lock: This specific quarter has already been verified/accepted
    const activeSub = currentIndicator.submissions?.find((s: ISubmissionUI) => s.quarter === targetQ);
    if (activeSub && (activeSub.reviewStatus === "Accepted" || activeSub.reviewStatus === "Verified")) {
      return { isOpen: false, message: "Quarter Certified", icon: <ShieldAlert size={12}/> };
    }

    // 4. Deadline Check
    if (now > deadline) return { isOpen: false, message: "Deadline Passed" };

    // 5. Open for Revision
    if (currentIndicator.status.includes("Rejected") || activeSub?.reviewStatus === "Rejected") {
      return { isOpen: true, message: "Revision Required" };
    }

    // Default: Open for submissions/additional documents
    return { isOpen: true, message: activeSub ? "Add More Evidence" : "Registry Active" };
  }, [currentIndicator]);

  if (loading && !currentIndicator) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fetching Dossier...</p>
      </div>
    );
  }

  if (error || !currentIndicator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center p-12 bg-white rounded-[2rem] shadow-xl border border-gray-100 max-w-sm">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="font-serif font-black text-xl text-[#1a3a32]">Record Not Found</h2>
          <button onClick={() => navigate(-1)} className="mt-8 w-full py-3 bg-[#1a3a32] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeSub = currentIndicator.submissions?.find((s: ISubmissionUI) => s.quarter === currentIndicator.activeQuarter);
  const submitLabel = activeSub ? "Update Filing" : "Submit Evidence";

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <nav className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 group w-fit">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">Registry Portal</span>
          </button>

          <div className="flex items-center gap-4">
            {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 animate-pulse">
                <ShieldAlert size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">{daysRemaining} Days Left</span>
              </div>
            )}
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              registryStatus.isOpen ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-gray-100 border-gray-200 text-gray-400 shadow-inner"
            }`}>
              {registryStatus.isOpen ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> : <Lock size={10}/>}
              {registryStatus.message}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!registryStatus.isOpen || uploading}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                registryStatus.isOpen 
                  ? "bg-[#1a3a32] text-white hover:shadow-2xl active:scale-95 shadow-lg shadow-[#1a3a32]/20" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {(uploading || loading) && <Loader2 size={12} className="animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-[#c2a336]">
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">{currentIndicator.perspective}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">{currentIndicator.reportingCycle}</span>
            </div>
            <h1 className="text-4xl lg:text-2xl font-serif font-black text-[#1a3a32] tracking-tight leading-tight">
              {currentIndicator.objectiveTitle}
            </h1>
            <p className="text-gray-400 font-medium text-lg leading-relaxed max-w-2xl italic border-l-4 border-gray-100 pl-6">
              {currentIndicator.activityDescription}
            </p>
          </div>

          <div className="bg-[#1a3a32] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
            <TrendingUp size={80} className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336] mb-4">Certified Progress</p>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-serif font-bold tracking-tighter">{Math.round(currentIndicator.progress || 0)}%</span>
                  <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                    Target: {currentIndicator.target}{currentIndicator.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-[#c2a336] transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(currentIndicator.progress || 0, 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="space-y-6">
              <div className="flex justify-between items-end">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
                  <FileText size={16} className="text-[#c2a336]" /> Uploaded Documents
                </h3>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {currentIndicator.submissions?.flatMap((sub: ISubmissionUI) =>
                  sub.documents?.map((doc, i) => (
                    <div key={`${sub._id}-${i}`} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#c2a336]/30 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[#c2a336] transition-colors">
                          <FileText size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[11px] font-black text-[#1a3a32] truncate uppercase tracking-tighter leading-none mb-1">
                            {doc.fileName || `Filing_Ref_${sub._id.slice(-4)}`}
                          </p>
                          <div className="flex gap-1.5">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              sub.reviewStatus === "Accepted" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              sub.reviewStatus === "Rejected" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600"
                            }`}>
                              {sub.reviewStatus}
                            </span>
                            <span className="text-[8px] font-black text-gray-300 uppercase py-0.5">Q{sub.quarter}</span>
                          </div>
                        </div>
                      </div>
                      <a href={doc.evidenceUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 rounded-lg group/btn">
                        <ExternalLink size={14} className="text-gray-300 group-hover/btn:text-[#1a3a32]" />
                      </a>
                    </div>
                  ))
                )}
                {(!currentIndicator.submissions || currentIndicator.submissions.length === 0) && (
                  <div className="col-span-full py-16 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-300">
                    <Upload size={32} className="mb-3 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Filing repository empty</p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-[#1a3a32]">
                <Clock size={16} className="text-[#c2a336]" /> Certification Timeline
              </h3>
              <div className="space-y-4 border-l-2 border-gray-100 pl-6 ml-2">
                {[...(currentIndicator.reviewHistory || [])].reverse().map((entry, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 relative group hover:shadow-xl transition-all">
                    <div className="absolute -left-[33px] top-6 w-4 h-4 rounded-full bg-white border-4 border-[#1a3a32]" />
                    <div className="flex justify-between items-start mb-4">
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        ["Approved", "Verified", "Accepted"].includes(entry.action) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {entry.action}
                      </div>
                      <span className="text-[9px] font-bold text-gray-300">{new Date(entry.at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-[#1a3a32] font-serif italic mb-4">"{entry.reason || "Registry entry updated."}"</p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Role: <span className="text-[#1a3a32]">{entry.reviewerRole}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside>
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 sticky top-12 space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4">Task Specification</h4>
              <div className="space-y-6">
                <SpecRow label="Current Status" value={currentIndicator.status} />
                <SpecRow label="Hard Deadline" value={new Date(currentIndicator.deadline).toLocaleDateString()} highlight />
                <SpecRow 
                  label="Reporting Cycle" 
                  value={currentIndicator.reportingCycle} 
                />
                <SpecRow 
                  label={currentIndicator.reportingCycle === "Annual" ? "Filing Mode" : "Current Target"} 
                  value={currentIndicator.reportingCycle === "Annual" ? "Cumulative" : `Quarter ${currentIndicator.activeQuarter}`} 
                />
              </div>

              {currentIndicator.instructions && (
                <div className="mt-12 pt-8 border-t border-gray-50">
                  <p className="text-[10px] font-black uppercase text-[#c2a336] mb-3 tracking-widest">Registry Guidance</p>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl italic">"{currentIndicator.instructions}"</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {isModalOpen && (
        <SubmissionModal
          task={currentIndicator}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

const SpecRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{label}</span>
    <span className={`text-[11px] font-black uppercase tracking-tight ${highlight ? "text-rose-600" : "text-[#1a3a32]"}`}>{value}</span>
  </div>
);

export default UserTaskIdPage;