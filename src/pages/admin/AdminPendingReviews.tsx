import { useEffect } from "react";
import { 
  ArrowRight, 
  Loader2, 
  FileCheck, 
  User, 
  Users,
  History,
  Calendar,
  Files,
  Search,
  Filter
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchAllAdminIndicators, 
  getIndicatorByIdAdmin, 
  clearSelectedIndicator 
} from "../../store/slices/adminIndicatorSlice";
import AdminIndicatorModal from "./AdminIndicatorModal";

const AdminPendingReviews = () => {
  const dispatch = useAppDispatch();
  
  const { 
    pendingReview, 
    isLoading, 
    selectedIndicator 
  } = useAppSelector((state) => state.adminIndicators);

  useEffect(() => {
    dispatch(fetchAllAdminIndicators());
  }, [dispatch]);

  if (isLoading && pendingReview.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-[#1a3a32] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32] animate-pulse">Syncing Registry...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#fdfcfc] min-h-screen font-sans">
      {/* Header Section */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-[#1a3a32] tracking-tighter uppercase">Review Queue</h1>
            <span className="bg-[#1a3a32] text-white text-[10px] px-3 py-1 rounded-md font-black shadow-sm">
              {pendingReview.length} RECORDS
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">
            Judicial Performance Monitoring & Verification System
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter by objective..." 
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1a3a32]/5 outline-none w-64 shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Perspective / Objective</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quarter</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignee</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidence</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingReview.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center">
                       <FileCheck size={40} className="text-emerald-200 mb-4" />
                       <p className="text-sm font-black text-[#1a3a32] uppercase tracking-widest">Registry Synchronized</p>
                       <p className="text-xs text-slate-400 mt-1 uppercase font-bold">No items requiring immediate verification</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingReview.map((indicator) => {
                  const activeSub = indicator.submissions?.find(s => s.reviewStatus === "Pending") || indicator.latestSubmission;
                  const isResubmission = indicator.isResubmission;
                  const docCount = activeSub?.documents?.length || 0;

                  return (
                    <tr key={indicator._id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            isResubmission ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {indicator.perspective}
                          </span>
                          <h3 className="text-[13px] font-black text-[#1a3a32] leading-snug max-w-sm">
                            {indicator.objectiveTitle}
                          </h3>
                          {isResubmission && (
                             <div className="flex items-center gap-1.5 text-amber-600">
                               <History size={10} className="animate-pulse" />
                               <span className="text-[9px] font-bold uppercase">Pending Revision Review</span>
                             </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-[#1a3a32] font-black text-xs">
                           <Calendar size={12} className="text-slate-400" />
                           Q{activeSub?.quarter || 1}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-black text-slate-600">
                            <span>{indicator.progress}%</span>
                            <span className="text-slate-300">/ {indicator.target}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${isResubmission ? 'bg-amber-500' : 'bg-[#1a3a32]'}`}
                              style={{ width: `${indicator.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1a3a32] group-hover:bg-[#1a3a32] group-hover:text-white transition-colors shadow-sm">
                              {Array.isArray(indicator.assignee) ? <Users size={14} /> : <User size={14} />}
                           </div>
                           <span className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[100px]">
                             {indicator.assigneeDisplayName}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-emerald-600 transition-colors">
                           <Files size={14} />
                           <span className="text-[10px] font-black">{docCount} Files</span>
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button 
                          onClick={() => dispatch(getIndicatorByIdAdmin(indicator._id))}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            isResubmission 
                              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20" 
                              : "bg-[#1a3a32] text-white hover:bg-black shadow-lg shadow-emerald-900/20"
                          }`}
                        >
                          {isResubmission ? "Verify Fix" : "Review"}
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Modal Container (Remains same as your original) */}
      <div className={`fixed inset-0 z-[1000] transition-all duration-300 ${selectedIndicator ? "visible" : "invisible"}`}>
        <div 
          className={`absolute inset-0 bg-[#1a3a32]/60 backdrop-blur-md transition-opacity duration-500 ${selectedIndicator ? "opacity-100" : "opacity-0"}`} 
          onClick={() => dispatch(clearSelectedIndicator())} 
        />
        <div className={`fixed right-0 top-0 h-full w-full md:max-w-[90vw] lg:max-w-[1100px] bg-white transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) transform ${selectedIndicator ? "translate-x-0" : "translate-x-full"} md:rounded-l-[3rem] overflow-hidden shadow-2xl flex flex-col`}>
          {selectedIndicator && (
            <AdminIndicatorModal 
              indicator={selectedIndicator} 
              onClose={() => dispatch(clearSelectedIndicator())} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPendingReviews;