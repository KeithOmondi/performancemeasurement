import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Loader2,   
  FileText,
  Target,
  Trophy,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchMyAssignments, setSelectedIndicator } from "../../store/slices/userIndicatorSlice";

const UserApprovals = () => {
  const dispatch = useAppDispatch();
  const { myIndicators, loading } = useAppSelector((state) => state.userIndicators);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  /**
   * UPDATED FILTER LOGIC:
   * 1. Status must be one of the "Finalized" categories.
   * 2. Progress must be 100% or higher.
   * 3. Must match search term.
   */
  const approvedAssignments = useMemo(() => {
    return myIndicators
      .filter((ind) => {
        const s = ind.status?.toLowerCase();
        const isFinalizedStatus = ["reviewed", "awaiting super admin", "approved", "accepted"].includes(s);
        const isFullyComplete = ind.progress >= 100;

        return isFinalizedStatus && isFullyComplete;
      })
      .filter(ind => 
        ind.activityDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.objectiveTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [myIndicators, searchTerm]);

  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">
          Fetching Verified Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a32] tracking-tight flex items-center gap-3">
            COMPLETED REGISTRY
            <span className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-wider">
              {approvedAssignments.length} Fully Achieved
            </span>
          </h1>
          <p className="text-sm text-gray-500 font-medium italic mt-1">Official repository of 100% completed and validated targets.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="Search completed records..."
            className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:border-emerald-600 transition-all w-full md:w-80 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {approvedAssignments.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-20 text-center border border-dashed border-gray-200">
          <Trophy className="mx-auto mb-4 text-gray-200" size={48} />
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">No 100% Completed Tasks</h2>
          <p className="text-[10px] text-gray-400 mt-2 uppercase">Tasks move here once fully achieved and verified.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1100px]">
              <thead>
                <tr className="bg-[#1a3a32] text-white">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]">Finalized Activity</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-center"><Target size={12} className="inline mr-1"/> Target</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-center"><ArrowUpRight size={12} className="inline mr-1"/> Achieved</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-center"><Trophy size={12} className="inline mr-1"/> Completion</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em]">Verification Log</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-[0.15em]">Archive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approvedAssignments.map((indicator) => {
                  const lastReview = [...(indicator.reviewHistory || [])]
                    .reverse()
                    .find(h => h.action.toLowerCase().includes("review") || h.action.toLowerCase().includes("accept"));

                  return (
                    <tr key={indicator._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="max-w-xs xl:max-w-md">
                          <p className="text-[13px] font-semibold text-[#1a3a32] leading-relaxed mb-1">
                            {indicator.activityDescription}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            {indicator.objectiveTitle}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className="text-[11px] font-bold text-slate-500">
                          {indicator.target} <span className="text-[9px] opacity-70">{indicator.unit}</span>
                        </span>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span className="text-[11px] font-bold text-emerald-700">
                          {indicator.currentTotalAchieved} <span className="text-[9px] opacity-70">{indicator.unit}</span>
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1">
                             <span className="text-[11px] font-black text-emerald-600">{indicator.progress}%</span>
                             <Trophy size={12} className="text-amber-500" />
                          </div>
                          <div className="w-16 h-1 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-full" />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                            <ShieldCheck size={14} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 uppercase">
                              {lastReview?.reviewedBy?.name || "System Verified"}
                            </p>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                              Official Record
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => dispatch(setSelectedIndicator(indicator._id))}
                            className="flex items-center gap-2 px-4 py-1.5 bg-[#1a3a32] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md"
                          >
                            Full Dossier <FileText size={12} />
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

export default UserApprovals;