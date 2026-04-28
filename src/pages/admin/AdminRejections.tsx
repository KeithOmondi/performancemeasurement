import { useEffect, useState, useMemo } from "react";
import {  
  Search, 
  Loader2, 
  User, 
  MessageSquare, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  History as HistoryIcon,
  AlertOctagon,
  ShieldAlert,
  CalendarDays,
  Layers
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchAllAdminIndicators, 
  setSelectedIndicator 
} from "../../store/slices/adminIndicatorSlice";
import { type IAdminIndicator } from "../../store/slices/adminIndicatorSlice";

const AdminRejections = () => {
  const dispatch = useAppDispatch();
  const { allAssignments, isLoading } = useAppSelector((state) => state.adminIndicators);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAllAdminIndicators({ status: "all" }));
  }, [dispatch]);

  // Filter for items explicitly rejected, using reportingCycle for type-safety
  const rejectedItems = useMemo(() => {
    return allAssignments
      .filter((ind) => 
        ind.status === "Rejected by Admin" || ind.status === "Rejected by Super Admin"
      )
      .filter((ind) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          ind.activity?.description?.toLowerCase().includes(searchLower) ||
          ind.objective?.title?.toLowerCase().includes(searchLower) ||
          ind.assigneeName?.toLowerCase().includes(searchLower) ||
          ind.reportingCycle?.toLowerCase().includes(searchLower)
        );
      });
  }, [allAssignments, searchTerm]);

  const handleSelectIndicator = (indicator: IAdminIndicator) => {
    dispatch(setSelectedIndicator(indicator));
  };

  if (isLoading && allAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-red-900 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-red-900">Accessing Rejection Archive...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fdfcfc] min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            REJECTION ARCHIVE
            <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">
              {rejectedItems.length} Non-Compliant
            </span>
          </h1>
          <p className="text-sm text-gray-500 font-medium italic mt-1">
            Official record of declined submissions and required corrections.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="Search by officer, activity, or cycle (Annual/Quarterly)..."
            className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-red-600/5 transition-all w-full md:w-96 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {rejectedItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          <ShieldAlert className="mx-auto mb-4 text-gray-200" size={48} />
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Archive Empty: No Active Rejections</h2>
        </div>
      ) : (
        <div className="space-y-6">
          {rejectedItems.map((indicator) => {
            const isViewingHistory = selectedHistoryId === indicator.id;
            
            // Matches reportingCycle from your IDocument interface
            const isAnnual = indicator.reportingCycle === "Annual";
            
            const latestRejection = [...(indicator.submissions || [])]
              .reverse()
              .find(s => s.reviewStatus === "Rejected");

            return (
              <div 
                key={indicator.id} 
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isViewingHistory ? 'border-red-600 shadow-xl' : 'border-gray-100 shadow-sm hover:border-gray-200'
                }`}
              >
                <div className="p-0">
                  {isViewingHistory ? (
                    /* --- INLINE AUDIT TRAIL VIEW --- */
                    <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                        <button 
                          onClick={() => setSelectedHistoryId(null)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <ArrowLeft size={14} /> Return to Archive
                        </button>
                        <div className="flex items-center gap-4">
                           <span className={`text-[9px] px-2 py-1 rounded font-black uppercase ${isAnnual ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {indicator.reportingCycle}
                          </span>
                          <div className="text-right border-l pl-4 border-gray-100">
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter block">Audit Case ID</span>
                            <span className="text-[9px] font-medium text-gray-400">#{indicator.id.slice(-8).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                        {indicator.reviewHistory?.map((log, idx) => (
                          <div key={idx} className="relative pl-12">
                            <div className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 ${
                              log.action.includes('Reject') ? 'bg-red-50 border-red-100 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-400'
                            }`}>
                              <Clock size={14} />
                            </div>
                            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                                    {log.action.replace(/_/g, ' ')}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                                      <User size={10}/> 
                                      {log.reviewerName || 'System/Admin'}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">
                                  {new Date(log.at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[12px] text-gray-600 font-medium leading-relaxed italic border-l-2 border-red-200 pl-3">
                                {log.reason || "Formal notification: Requirements not met."}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* --- OVERVIEW CARD VIEW --- */
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-50">
                      <div className="p-6 lg:w-1/3 bg-gray-50/30">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertOctagon size={14} className="text-red-600" />
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                            {indicator.status}
                          </span>
                          {/* Cycle Badge using reportingCycle */}
                          <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1 ${
                            isAnnual ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}>
                            {isAnnual ? <CalendarDays size={10} /> : <Layers size={10} />}
                            {indicator.reportingCycle}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 leading-snug mb-4">
                          {indicator.activity?.description}
                        </h3>
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Primary Assignee</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold uppercase">
                              {indicator.assigneeName?.charAt(0)}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{indicator.assigneeName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <MessageSquare size={12} /> Rejection Narrative
                          </span>
                          <span className="text-[9px] font-bold text-gray-300">Updated: {new Date(indicator.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="bg-white border border-red-50 p-4 rounded-xl shadow-inner">
                          <p className="text-[12px] text-red-900 font-medium italic leading-relaxed">
                            "{indicator.adminOverallComments || latestRejection?.adminComment || "Documentation provided does not align with the statutory reporting guidelines."}"
                          </p>
                        </div>
                        <div className="mt-4 flex gap-6">
                            <div>
                             <p className="text-[8px] font-bold text-gray-400 uppercase">Target / Unit</p>
                             <p className="text-xs font-bold text-slate-700">{indicator.target} {indicator.unit}</p>
                            </div>
                            <div>
                             <p className="text-[8px] font-bold text-gray-400 uppercase">
                               {isAnnual ? "Reporting Year" : "Deficiency Quarter"}
                             </p>
                             <p className={`text-xs font-bold ${isAnnual ? "text-slate-700" : "text-red-600"}`}>
                               {isAnnual 
                                 ? (latestRejection?.year || new Date().getFullYear()) 
                                 : `Q${latestRejection?.quarter || indicator.activeQuarter}`
                               }
                             </p>
                            </div>
                            <div>
                             <p className="text-[8px] font-bold text-gray-400 uppercase">Review Cycle</p>
                             <p className="text-xs font-bold text-red-600">Attempt #{latestRejection?.resubmissionCount ?? 1}</p>
                            </div>
                        </div>
                      </div>

                      <div className="p-6 lg:w-64 bg-gray-50/30 flex flex-col justify-center gap-2">
                        <button 
                          onClick={() => setSelectedHistoryId(indicator.id)}
                          className="w-full bg-[#1a3a32] text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                          <HistoryIcon size={14} /> Audit History
                        </button>
                        <button 
                          onClick={() => handleSelectIndicator(indicator)}
                          className="w-full bg-white border border-gray-200 text-gray-500 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                          View Dossier <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRejections;