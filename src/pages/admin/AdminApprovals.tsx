import { useEffect, useState } from "react";
import { 
  Search, 
  Loader2,  
  ExternalLink, 
  FileCheck,
  ShieldCheck,
  History as HistoryIcon,
  Scale,
  UserCheck,
  Zap,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAllAdminIndicators, getIndicatorByIdAdmin, clearSelectedIndicator } from "../../store/slices/adminIndicatorSlice";

const AdminApprovals = () => {
  const dispatch = useAppDispatch();
  const { allAssignments, isLoading,  } = useAppSelector((state) => state.adminIndicators);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchAllAdminIndicators());
  }, [dispatch]);

  const approvedItems = allAssignments
    .filter((ind) => ["Reviewed", "Awaiting Super Admin"].includes(ind.status))
    .filter(ind => 
      ind.activityDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.assigneeDisplayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleViewDossier = (id: string) => {
    // Clear previous selection to trigger loaders in modals if necessary
    dispatch(clearSelectedIndicator());
    dispatch(getIndicatorByIdAdmin(id));
    // Example: setModalOpen(true);
    console.log("Fetching Dossier for Detail View:", id);
  };

  if (isLoading && allAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <Loader2 className="animate-spin text-[#1a3a32] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32] animate-pulse">Syncing Approval Registry...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a32] tracking-tight flex items-center gap-3">
            APPROVED REGISTRY
            <span className="bg-[#1a3a32] text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-wider">
              {approvedItems.length} Records
            </span>
          </h1>
          <p className="text-sm text-gray-500 font-medium italic mt-1">Verified records and historical performance data.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="Search activities or officers..."
            className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:border-[#1a3a32] transition-all w-full md:w-80 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {approvedItems.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-20 text-center border border-dashed border-gray-200 shadow-sm">
          <FileCheck className="mx-auto mb-4 text-gray-200" size={48} />
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Approved Records Found</h2>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1200px]">
              <thead>
                <tr className="bg-[#1a3a32] text-white">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]">Activity & Officer</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-center"><Scale size={12} className="inline mr-1"/> Wt.</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-center"><Zap size={12} className="inline mr-1"/> Progress</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]">Review Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]">Admin Review</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]">Super Admin</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-[0.15em]">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approvedItems.map((indicator) => {
                  const isFullyReviewed = indicator.status === "Reviewed";
                  const history = indicator.reviewHistory || [];
                  
                  // Extracting approvers based on the action keywords
                  const adminApprover = history.find(h => h.action === "Awaiting Super Admin")?.reviewedBy?.name || "System";
                  const superApprover = history.find(h => h.action === "Reviewed")?.reviewedBy?.name || "—";

                  return (
                    <tr key={indicator._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="max-w-xs xl:max-w-md">
                          <p className="text-[12px] font-bold text-[#1a3a32] leading-relaxed mb-1 line-clamp-2">
                            {indicator.activityDescription}
                          </p>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Assigned To:</span>
                             <span className="text-[10px] font-bold text-[#1a3a32] underline decoration-slate-200">{indicator.assigneeDisplayName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className="text-[11px] font-black text-slate-600">
                          {indicator.weight}%
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-[#1a3a32]">{indicator.progress}%</span>
                          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all" 
                              style={{ width: `${indicator.progress}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {isFullyReviewed ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                            <CheckCircle2 size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tight">Closed</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                            <Clock size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tight">In-Finalization</span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                            <UserCheck size={12} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{adminApprover}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isFullyReviewed ? 'bg-[#1a3a32] text-white' : 'bg-slate-50 text-slate-300'}`}>
                            <ShieldCheck size={12} />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${isFullyReviewed ? 'text-[#1a3a32]' : 'text-slate-300 italic'}`}>
                            {superApprover}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleViewDossier(indicator._id)}
                            className="p-2 text-slate-400 hover:text-[#1a3a32] hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <HistoryIcon size={16} />
                          </button>
                          <button 
                            onClick={() => handleViewDossier(indicator._id)}
                            className="group/btn flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[#1a3a32] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#1a3a32] hover:text-white transition-all shadow-sm"
                          >
                            Dossier <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;