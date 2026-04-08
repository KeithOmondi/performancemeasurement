import React, { useEffect, useState, useMemo } from "react";
import { 
  RotateCcw, 
  MessageSquare, 
  History, 
  Search, 
  Loader2, 
  ChevronLeft,
  X,
  Upload,
  FileText,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchMyAssignments, 
  setLocalSelectedIndicator,
  submitIndicatorProgress, 
  type IIndicatorUI
} from "../../store/slices/userIndicatorSlice";
import toast from "react-hot-toast";

/* --- TYPES --- */
interface ILogEntry {
  action: string;
  created_at: string;
  reason: string;
  reviewer_role: string;
}

/* --- SUB-COMPONENT: SMART RESUBMISSION MODAL --- */
const ResubmissionModal = ({ indicator, onClose }: { indicator: IIndicatorUI; onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const { uploading } = useAppSelector((state) => state.userIndicators);
  
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  // Memoize the rejected submission
  const rejectedSub = useMemo(() => 
    [...(indicator.submissions || [])].reverse().find(s => s.review_status === "Rejected"),
    [indicator]
  );

  /**
   * FIX: State Initialization
   * Instead of using useEffect to set the value after render, 
   * we use a function in useState to set it during the first render pass.
   */
  const [achievedValue, setAchievedValue] = useState<number>(() => {
    return rejectedSub ? rejectedSub.achieved_value : 0;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectedSub) return;
    if (!notes.trim()) return toast.error("Clarification notes are required for re-audit.");

    const formData = new FormData();
    formData.append("notes", notes.trim());
    formData.append("quarter", rejectedSub.quarter.toString());
    formData.append("achievedValue", achievedValue.toString());
    if (file) formData.append("evidence", file);

    const result = await dispatch(submitIndicatorProgress({
      id: indicator.id, 
      formData
    }));

    if (submitIndicatorProgress.fulfilled.match(result)) {
      toast.success("Correction submitted to registry");
      onClose();
    }
  };

  if (!rejectedSub) return null;

  const isAnnual = indicator.reporting_cycle === "Annual";
  const periodDisplay = isAnnual ? "Annual Cycle" : `Quarter ${rejectedSub.quarter}`;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0c1a16]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <header className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-[#1a3a32] uppercase tracking-tight">Correction Protocol</h2>
            <p className="text-[10px] font-bold text-rose-500 uppercase mt-1">Re-submission • {periodDisplay}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="p-5 bg-rose-50 border border-rose-100 rounded-[1.5rem]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-rose-500" />
              <span className="text-[9px] font-black text-rose-600 uppercase">Registry Findings</span>
            </div>
            <p className="text-xs font-bold text-rose-900 leading-relaxed italic">
              "{rejectedSub.notes || "Please review data accuracy and re-submit with supporting evidence."}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={14}/> Corrected Value ({indicator.unit})
              </label>
              <input 
                type="number"
                required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-[#1a3a32]/5"
                value={achievedValue}
                onChange={(e) => setAchievedValue(Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Target Period
              </label>
              <div className="w-full p-4 bg-slate-100/50 border border-slate-100 rounded-2xl text-sm font-black text-slate-400">
                {periodDisplay}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14}/> Corrective Remarks
            </label>
            <textarea 
              required 
              placeholder="Explain the changes made or address the registry's concerns..." 
              className="w-full h-28 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-[#1a3a32]/5 resize-none font-medium transition-all" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Upload size={14}/> Updated Evidence (Optional)
            </label>
            <div className="relative group">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className={`p-6 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all ${file ? 'border-[#1a3a32] bg-emerald-50/20' : 'border-slate-200 bg-slate-50 group-hover:border-slate-400'}`}>
                {file ? <FileText className="text-[#1a3a32] mb-2" size={24} /> : <Upload className="text-slate-300 mb-2" size={24} />}
                <p className="text-[9px] font-black text-slate-600 uppercase text-center truncate px-4">
                  {file ? file.name : "Upload corrected evidence"}
                </p>
              </div>
            </div>
          </div>

          <button 
            disabled={uploading} 
            type="submit" 
            className="w-full bg-[#1a3a32] text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={18} />}
            Commit Correction
          </button>
        </form>
      </div>
    </div>
  );
};

/* --- MAIN PAGE COMPONENT --- */
const UserRejections = () => {
  const dispatch = useAppDispatch();
  const { myIndicators, loading, currentIndicator } = useAppSelector((state) => state.userIndicators);
  const [searchTerm, setSearchTerm] = useState("");
  const [historyViewId, setHistoryViewId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  const rejectedIndicators = useMemo(() => {
    return myIndicators.filter((ind) => {
      const isStatusRejected = ind.status?.includes("Rejected");
      const hasRejectedSub = ind.submissions?.some(sub => sub.review_status === "Rejected");
      
      const matchesSearch = 
        (ind.activity?.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ind.objective?.title || "").toLowerCase().includes(searchTerm.toLowerCase());

      return (isStatusRejected || hasRejectedSub) && matchesSearch;
    });
  }, [myIndicators, searchTerm]);

  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scanning Registry...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fdfdfd] min-h-screen font-sans">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tighter uppercase">
            Flagged Assignments
          </h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">
            PMMU • {rejectedIndicators.length} Requires Action
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text" 
            placeholder="Search by Activity or Objective..." 
            className="pl-14 pr-8 py-4 bg-white border border-slate-100 rounded-full text-[11px] font-black uppercase w-full md:w-80 shadow-sm outline-none focus:ring-4 focus:ring-rose-500/5 transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {rejectedIndicators.length === 0 ? (
          <div className="bg-white rounded-[4rem] py-32 text-center border-4 border-dashed border-slate-50">
            <ShieldCheck className="mx-auto mb-6 text-emerald-100" size={80} />
            <h2 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Compliance Verified</h2>
          </div>
        ) : (
          rejectedIndicators.map((indicator) => {
            const isViewingHistory = historyViewId === indicator.id;
            const rejectedSub = [...(indicator.submissions || [])].reverse().find(s => s.review_status === "Rejected");
            const periodText = indicator.reporting_cycle === "Annual" ? "Annual" : `Quarter ${rejectedSub?.quarter ?? indicator.active_quarter}`;

            return (
              <div 
                key={indicator.id} 
                className={`bg-white rounded-[2.5rem] border-2 transition-all duration-500 ${
                  isViewingHistory ? 'border-[#1a3a32] shadow-2xl' : 'border-slate-50 shadow-sm hover:border-rose-100'
                }`}
              >
                <div className="p-8 md:p-10">
                  {isViewingHistory ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <header className="flex justify-between items-center mb-8">
                        <button onClick={() => setHistoryViewId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors">
                          <ChevronLeft size={16} /> Exit Audit Trail
                        </button>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocol History</span>
                      </header>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* FIX: Replaced 'any' with ILogEntry interface */}
                        {(indicator.submissions?.map(s => ({
                          action: s.review_status,
                          created_at: s.submitted_at,
                          reason: s.notes,
                          reviewer_role: "Registry Auditor"
                        })) || []).map((log: ILogEntry, idx) => (
                          <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-transparent">
                            <div className="flex justify-between items-center mb-4">
                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                                log.action === 'Rejected' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {log.action}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-semibold italic leading-relaxed">"{log.reason}"</p>
                            <p className="text-[8px] font-black text-slate-300 mt-4 uppercase">Source: {log.reviewer_role}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-rose-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-rose-500/20">Rejected</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase">{periodText} Cycle</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight mb-2">{indicator.activity?.description}</h3>
                        <p className="text-[9px] font-bold text-[#c2a336] uppercase tracking-widest">{indicator.objective?.title}</p>
                      </div>

                      <div className="lg:w-1/3 bg-rose-50/30 rounded-3xl p-6 border border-rose-50">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={12} className="text-rose-400" />
                            <span className="text-[8px] font-black text-rose-400 uppercase">Auditor Remarks</span>
                        </div>
                        <p className="text-xs text-rose-950 font-bold italic leading-relaxed">
                          "{rejectedSub?.notes || "Inconsistent data detected. Please re-verify and attach mandatory evidence."}"
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                        <button 
                          onClick={() => dispatch(setLocalSelectedIndicator(indicator.id))} 
                          className="px-8 bg-[#1a3a32] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                        >
                          <RotateCcw size={16} /> Resolve
                        </button>
                        <button 
                          onClick={() => setHistoryViewId(indicator.id)} 
                          className="px-8 bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-slate-400 hover:text-slate-700 transition-all flex items-center justify-center gap-3"
                        >
                          <History size={16} /> Audit Trail
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {currentIndicator && (
        <ResubmissionModal 
          indicator={currentIndicator} 
          onClose={() => dispatch(setLocalSelectedIndicator(null))} 
        />
      )}
    </div>
  );
};

export default UserRejections;