import { useEffect, useState } from "react";
import { 
  AlertCircle, 
  RotateCcw, 
  MessageSquare, 
  History, 
  Search, 
  Loader2, 
  ChevronLeft,
  Clock,
  X,
  Upload,
  FileText
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchMyAssignments, 
  setSelectedIndicator,
  resubmitIndicatorProgress,
  type IIndicatorUI
} from "../../store/slices/userIndicatorSlice";

/* --- SUB-COMPONENT: RESUBMISSION MODAL --- */
const ResubmissionModal = ({ indicator, onClose }: { indicator: IIndicatorUI; onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const { uploading, error } = useAppSelector((state) => state.userIndicators);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const rejectedSub = [...indicator.submissions].reverse().find(s => s.reviewStatus === "Rejected");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectedSub) return;

    const formData = new FormData();
    formData.append("notes", notes);
    if (file) formData.append("evidence", file);

    const result = await dispatch(resubmitIndicatorProgress({
      indicatorId: indicator._id,
      submissionId: rejectedSub._id,
      formData
    }));

    if (resubmitIndicatorProgress.fulfilled.match(result)) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <header className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Resubmit Evidence</h2>
            <p className="text-[10px] font-bold text-red-500 uppercase mt-1">Quarter {rejectedSub?.quarter} Correction</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold"><AlertCircle size={16} /> {error}</div>}

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <p className="text-[9px] font-black text-amber-600 uppercase mb-1 tracking-widest">Admin Feedback</p>
            <p className="text-xs font-medium italic text-amber-900">"{rejectedSub?.adminComment}"</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14}/> Resolution Notes</label>
            <textarea required placeholder="Describe changes made..." className="w-full h-28 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-slate-500/5 resize-none font-medium" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Upload size={14}/> Evidence File</label>
            <div className="relative group">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div className={`p-6 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 group-hover:border-slate-400'}`}>
                {file ? <FileText className="text-emerald-500 mb-2" size={24} /> : <Upload className="text-slate-300 mb-2" size={24} />}
                <p className="text-[10px] font-black text-slate-600 uppercase">{file ? file.name : "Select new file"}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
            <button disabled={uploading} type="submit" className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20">
              {uploading ? <Loader2 className="animate-spin" size={16} /> : "Update Submission"}
            </button>
          </div>
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

  const rejectedIndicators = myIndicators.filter((ind) =>
    ind.submissions.some((sub) => sub.reviewStatus === "Rejected") || 
    ind.status === "Rejected by Admin"
  ).filter(ind => 
    ind.activityDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-red-500 mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Scanning Judiciary portal<br/>for rejections...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fffcfc] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
          Rejections & Audit
          <span className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-md">
            {rejectedIndicators.length}
          </span>
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search activities..." className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm w-full md:w-80 shadow-sm outline-none focus:ring-4 focus:ring-red-500/5" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="space-y-6">
        {rejectedIndicators.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-slate-200">
            <AlertCircle className="mx-auto mb-4 text-emerald-500" size={40} />
            <h2 className="text-xl font-black text-slate-800 uppercase">Clear of Rejections</h2>
          </div>
        ) : (
          rejectedIndicators.map((indicator) => {
            const isViewingHistory = historyViewId === indicator._id;
            const rejectedSub = [...indicator.submissions].reverse().find(s => s.reviewStatus === "Rejected");

            return (
              <div key={indicator._id} className={`bg-white rounded-[2.5rem] border transition-all duration-300 ${isViewingHistory ? 'border-slate-900 shadow-xl scale-[1.01]' : 'border-red-100 shadow-sm'}`}>
                <div className="p-8">
                  {isViewingHistory ? (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                      <button onClick={() => setHistoryViewId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 mb-6"><ChevronLeft size={14} /> Back to Correction</button>
                      <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight leading-snug">{indicator.activityDescription}</h3>
                      <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {indicator.reviewHistory?.map((log, idx) => (
                          <div key={idx} className="relative pl-12">
                            <div className="absolute left-0 top-1 w-9 h-9 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center z-10"><Clock size={14} className="text-slate-400" /></div>
                            <div className="bg-slate-50 p-4 rounded-2xl">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(log.at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium italic">"{log.reason}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                      <div className="flex-1 space-y-4">
                        <h3 className="text-xl font-black text-slate-800 leading-tight">{indicator.activityDescription}</h3>
                        <div className="flex gap-2">
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-1 rounded">Q{rejectedSub?.quarter}</span>
                          <span className="bg-red-50 text-red-600 text-[9px] font-black px-2 py-1 rounded tracking-widest uppercase">Needs Correction</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-red-50/50 rounded-3xl p-6 border border-red-100 relative">
                        <MessageSquare className="absolute -top-3 -left-3 text-red-500 bg-white rounded-full p-1 border border-red-100" size={28} />
                        <p className="text-sm text-red-900 font-medium italic">"{rejectedSub?.adminComment || "Please review submission guidelines."}"</p>
                      </div>
                      <div className="flex flex-col justify-center gap-3 min-w-[220px]">
                        <button onClick={() => dispatch(setSelectedIndicator(indicator._id))} className="w-full bg-[#1a3a32] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/10"><RotateCcw size={16} /> Resubmit Work</button>
                        <button onClick={() => setHistoryViewId(indicator._id)} className="w-full bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3"><History size={16} /> View Audit Trail</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {currentIndicator && <ResubmissionModal indicator={currentIndicator} onClose={() => dispatch(setSelectedIndicator(""))} />}
    </div>
  );
};

export default UserRejections;