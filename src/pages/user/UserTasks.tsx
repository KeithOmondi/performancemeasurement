import { useEffect, useState, useMemo, Fragment } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyAssignments, setSelectedIndicator } from "../../store/slices/userIndicatorSlice";
import { 
  Send, RefreshCcw, ChevronDown, ChevronUp, Search, AlertCircle, 
  CheckCircle2, PlayCircle, ExternalLink, Lock 
} from "lucide-react";
import type { AppDispatch, RootState } from "../../store/store";
import type { IIndicatorUI, IDocumentUI } from "../../store/slices/userIndicatorSlice";
import SubmissionModal from "./SubmissionModal";

const UserTasks = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { myIndicators, loading } = useSelector((state: RootState) => state.userIndicators);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  const filteredTasks = useMemo(() => {
    return myIndicators.filter((item: IIndicatorUI) => {
      // Logic: Keep showing until 100% or all quarters accepted
      const isComplete = item.progress >= 100;
      const allAccepted = item.reportingCycle === "Quarterly" 
        ? item.submissions.filter(s => s.reviewStatus === "Accepted").length === 4
        : item.submissions.some(s => s.reviewStatus === "Accepted");

      return !isComplete || !allAccepted;
    });
  }, [myIndicators]);

  const activeTask = useSelector((state: RootState) => state.userIndicators.currentIndicator);

  const handleOpenSubmission = (id: string) => {
    dispatch(setSelectedIndicator(id));
    setIsModalOpen(true);
  };

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
      <RefreshCcw className="animate-spin text-emerald-600" size={40} />
      <span className="font-black text-[#1d3331] uppercase tracking-widest text-[10px]">Synchronizing Registry...</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1d3331] tracking-tight uppercase">
            Active <span className="text-emerald-600">Assignments</span>
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Ongoing Performance & Cumulative Progress</p>
        </div>
        <div className="flex items-center gap-2 bg-[#1d3331] text-white px-4 py-2 rounded-lg shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-tighter">
            {filteredTasks.length} Operations in Progress
          </span>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredTasks.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Indicator & Objective</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cycle</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cumulative Progress</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((item: IIndicatorUI) => {
                  const hasPending = item.submissions.some(s => s.reviewStatus === "Pending");
                  const hasRejected = item.submissions.some(s => s.reviewStatus === "Rejected");
                  const acceptedCount = item.submissions.filter(s => s.reviewStatus === "Accepted").length;
                  const isLockedComplete = item.progress >= 100;

                  // Logic for next quarter locking
                  // Current quarter to submit is acceptedCount + 1
                  const currentQuarter = acceptedCount + 1;

                  return (
                    <Fragment key={item._id}>
                      <tr className={`transition-colors ${isLockedComplete ? 'opacity-50 grayscale bg-slate-50' : ''} ${expandedId === item._id ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-6 py-4 max-w-md">
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleExpand(item._id)} className="mt-1 text-slate-400 hover:text-[#1d3331]">
                              {expandedId === item._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <div>
                              <p className="text-xs font-black text-emerald-700 uppercase tracking-tighter mb-0.5">{item.perspective}</p>
                              <p className="text-sm font-bold text-[#1d3331] leading-tight mb-1">{item.objectiveTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-[10px] font-black px-2 py-1 bg-slate-100 rounded text-slate-600 uppercase">{item.reportingCycle}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[11px] font-black text-[#1d3331]">{item.progress}%</span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full transition-all duration-700 ${item.progress >= 100 ? 'bg-emerald-600' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(item.progress, 100)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isLockedComplete ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 bg-slate-900 text-white rounded uppercase">
                              <CheckCircle2 size={10} /> Goal Achieved
                            </span>
                          ) : hasRejected ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 bg-red-100 text-red-700 rounded uppercase">
                              <AlertCircle size={10} /> Action Required
                            </span>
                          ) : hasPending ? (
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 bg-orange-100 text-orange-700 rounded uppercase">
                              <RefreshCcw size={10} className="animate-spin" /> Under Review
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-1 bg-blue-100 text-blue-700 rounded uppercase">
                              Q{currentQuarter} Open
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            disabled={isLockedComplete || (hasPending && !hasRejected)}
                            onClick={() => handleOpenSubmission(item._id)}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ml-auto shadow-md ${
                              isLockedComplete 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-[#1d3331] text-white hover:bg-emerald-800'
                            }`}
                          >
                            {isLockedComplete ? <Lock size={14} /> : <Send size={14} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {isLockedComplete ? 'Finalized' : hasPending ? 'Awaiting Admin' : hasRejected ? 'Resubmit' : `Submit Q${currentQuarter}`}
                            </span>
                          </button>
                        </td>
                      </tr>
                      
                      {expandedId === item._id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={5} className="px-12 py-6 border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {[1, 2, 3, 4].map(q => {
                                const sub = item.submissions.find(s => s.quarter === q);
                                const isAccessible = q === 1 || !!item.submissions.find(s => s.quarter === q - 1 && s.reviewStatus === "Accepted");
                                
                                if (item.reportingCycle === "Annual" && q > 1) return null;

                                return (
                                  <div key={q} className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm transition-all bg-white min-h-[160px] ${
                                    sub?.reviewStatus === 'Rejected' ? 'border-red-200' : 
                                    sub?.reviewStatus === 'Accepted' ? 'border-emerald-200 shadow-emerald-50' :
                                    !isAccessible ? 'border-slate-100 bg-slate-50/50 opacity-40' : 'border-slate-200'
                                  }`}>
                                    <div className="flex justify-between items-center border-b pb-2">
                                      <div className="flex items-center gap-1.5">
                                        {!isAccessible && <Lock size={10} className="text-slate-400" />}
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                                          {item.reportingCycle === "Annual" ? "Annual Report" : `Quarter ${q}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        {sub?.reviewStatus === "Accepted" && <CheckCircle2 size={14} className="text-emerald-500" />}
                                        {sub?.reviewStatus === "Rejected" && <AlertCircle size={14} className="text-red-500" />}
                                        {sub?.reviewStatus === "Pending" && <RefreshCcw size={14} className="text-orange-400 animate-spin" />}
                                        {!sub && isAccessible && <PlayCircle size={14} className="text-blue-400 animate-pulse" />}
                                      </div>
                                    </div>

                                    <div className="flex-grow overflow-y-auto space-y-1.5 pr-1">
                                       <div className="flex flex-col gap-1.5">
                                          {sub?.documents?.map((doc: IDocumentUI, docIdx: number) => (
                                            <a key={docIdx} href={doc.evidenceUrl} target="_blank" rel="noopener noreferrer"
                                              className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-bold text-slate-600 hover:text-emerald-700 transition-all">
                                              <span className="truncate max-w-[80px]">Doc {docIdx + 1}</span>
                                              <ExternalLink size={8} />
                                            </a>
                                          ))}
                                          {!sub && (
                                            <p className="text-[8px] text-slate-400 uppercase mt-4 text-center italic">
                                              {isAccessible ? "Ready for data" : "Locked by Admin"}
                                            </p>
                                          )}
                                       </div>
                                    </div>

                                    {sub?.adminComment && (
                                      <div className="mt-1 p-2 bg-red-50 rounded border border-red-100 text-[9px] text-red-700 font-medium italic overflow-y-auto max-h-[50px]">
                                        "{sub.adminComment}"
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="font-black uppercase tracking-widest text-xs">No active assignments remaining</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && activeTask && (
        <SubmissionModal task={activeTask} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default UserTasks;