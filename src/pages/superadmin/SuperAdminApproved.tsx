import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Loader2,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Clock,
  Filter,
  FileSearch,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchSuperAdminApprovedIndicators } from "../../store/slices/indicatorSlice";
import SuperAdminApprovedModal from "./SuperAdminApprovedModal";

const SuperAdminApproved = () => {
  const dispatch = useAppDispatch();
  const { superAdminApprovedIndicators, loading } = useAppSelector(
    (state) => state.indicators
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);

  useEffect(() => {
    // Fetch ALL approved indicators (including partial approvals)
    dispatch(fetchSuperAdminApprovedIndicators());
  }, [dispatch]);

  const approvedItems = useMemo(() => {
    let filtered = superAdminApprovedIndicators;
    
    filtered = filtered.filter((ind) => {
      const matchesSearch =
        ind.objectiveTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.assigneeDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.activityDescription?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    
    if (showOnlyCompleted) {
      filtered = filtered.filter((ind) => ind.progress === 100 || ind.status === "Completed");
    }
    
    return filtered;
  }, [superAdminApprovedIndicators, searchTerm, showOnlyCompleted]);

  const stats = useMemo(() => {
    const total = superAdminApprovedIndicators.length;
    const completed = superAdminApprovedIndicators.filter(
      (ind) => ind.progress === 100 || ind.status === "Completed"
    ).length;
    const partial = total - completed;
    const avgProgress = total > 0 
      ? Math.round(superAdminApprovedIndicators.reduce((sum, ind) => sum + (ind.progress || 0), 0) / total)
      : 0;
    
    return { total, completed, partial, avgProgress };
  }, [superAdminApprovedIndicators]);

  const handleRowClick = (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
  };

  if (loading && superAdminApprovedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-[#1a3a32]" size={48} />
          <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={18} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32] animate-pulse">
          Accessing Certified Vault...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#1a3a32] rounded-2xl shadow-xl shadow-emerald-900/20 text-white">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase leading-none">
                Certified Records
              </h1>
              <div className="flex gap-2 mt-2">
                <span className="bg-emerald-50 text-emerald-700 text-[9px] px-3 py-1 rounded-lg font-black border border-emerald-100 uppercase tracking-widest">
                  {stats.total} Total Certified Records
                </span>
                {stats.partial > 0 && (
                  <span className="bg-amber-50 text-amber-700 text-[9px] px-3 py-1 rounded-lg font-black border border-amber-100 uppercase tracking-widest">
                    {stats.partial} Partial ({stats.avgProgress}% Avg)
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            ORHC Performance Management & Measurement Unit (PMMU) – Final Certification
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowOnlyCompleted(!showOnlyCompleted)}
            className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              showOnlyCompleted
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 size={14} />
            {showOnlyCompleted ? "Showing: Completed Only" : "Showing: All Certified"}
          </button>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1a3a32] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by activity or lead officer..."
              className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-[#1a3a32]/5 transition-all w-full md:w-96 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {approvedItems.length === 0 ? (
        <div className="bg-white rounded-[0.5rem] py-40 text-center border border-dashed border-slate-200 shadow-2xl shadow-slate-200/30">
          <FileSearch className="mx-auto mb-6 text-slate-100" size={80} />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
            {showOnlyCompleted ? "No fully completed records found" : "No certified records found"}
          </h2>
          {showOnlyCompleted && stats.partial > 0 && (
            <button
              onClick={() => setShowOnlyCompleted(false)}
              className="mt-4 text-[10px] font-black text-[#1a3a32] underline underline-offset-4"
            >
              Show all {stats.total} certified records instead
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[0.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Dossier</th>
                  <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-48">Execution</th>
                  <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Certification Pipeline</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approvedItems.map((indicator) => {
                  const isCompleted = indicator.progress === 100 || indicator.status === "Completed";
                  const isPartial = !isCompleted && indicator.progress > 0;
                  const history = indicator.reviewHistory || [];

                  const adminEntry = [...history].reverse().find(
                    (h) => h.reviewerRole === "admin" && h.action === "Verified"
                  );
                  const superEntry = [...history].reverse().find(
                    (h) => h.reviewerRole === "superadmin" && (h.action === "Approved" || h.action === "Partially Approved")
                  );

                  const partialApprovals = [...history].reverse().filter(
                    (h) => h.reviewerRole === "superadmin" && h.action === "Partially Approved"
                  );

                  return (
                    <tr
                      key={indicator.id}
                      className="hover:bg-slate-50/60 transition-all cursor-pointer group"
                      onClick={() => handleRowClick(indicator.id)}
                    >
                      <td className="px-10 py-7">
                        <div className="max-w-md">
                          <h3 className="text-[13px] font-black text-[#1a3a32] tracking-tight mb-3 line-clamp-2 leading-snug">
                            {indicator.activityDescription || "N/A"}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-[#1a3a32] group-hover:border-[#1a3a32] transition-colors">
                                <UserCheck size={12} className="text-slate-400 group-hover:text-white" />
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                                {indicator.assigneeDisplayName || "Unassigned"}
                              </span>
                            </div>
                            
                            {isPartial && (
                              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                <TrendingUp size={10} className="text-amber-500" />
                                <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest">
                                  {partialApprovals.length} Partial Approvals
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-7">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-black ${isCompleted ? "text-emerald-600" : isPartial ? "text-amber-600" : "text-[#1a3a32]"}`}>
                              {indicator.progress}%
                            </span>
                            {isPartial && (
                              <span className="text-[7px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                {indicator.target - indicator.progress}% remaining
                              </span>
                            )}
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                isCompleted
                                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                  : isPartial
                                  ? "bg-amber-500"
                                  : "bg-[#1a3a32]"
                              }`}
                              style={{ width: `${indicator.progress}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            Target: {indicator.target} {indicator.unit}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-7">
                        <div className="flex items-center justify-center gap-4">
                          {/* Registry Node */}
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all border ${
                                adminEntry
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                  : "bg-slate-50 border-slate-100 text-slate-300"
                              }`}
                            >
                              <ShieldCheck size={16} />
                            </div>
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest ${
                                adminEntry ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              Registry
                            </span>
                          </div>

                          {/* Connector */}
                          <div className="flex items-center">
                            <div
                              className={`w-12 h-[2px] rounded-full transition-all ${
                                superEntry ? "bg-emerald-500" : "bg-slate-100"
                              }`}
                            />
                            <ArrowRight
                              size={10}
                              className={superEntry ? "text-emerald-500" : "text-slate-200"}
                            />
                          </div>

                          {/* Super Admin Node */}
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all border ${
                                superEntry
                                  ? isCompleted
                                    ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10"
                                    : "bg-amber-50 border-amber-100 text-amber-600"
                                  : "bg-slate-50 border-slate-100 text-slate-300"
                              }`}
                            >
                              <ShieldAlert size={16} />
                            </div>
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest ${
                                superEntry
                                  ? isCompleted
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {isCompleted ? "Certified" : "Partially Approved"}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="ml-6">
                            <div
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : isPartial
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-[#1a3a32] text-white border-[#1a3a32]"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={10} />
                              ) : isPartial ? (
                                <TrendingUp size={10} />
                              ) : (
                                <Clock size={10} className="animate-pulse" />
                              )}
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                {isCompleted
                                  ? "Fully Certified"
                                  : isPartial
                                  ? `${indicator.progress}% Certified`
                                  : indicator.status?.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-10 py-7 text-right">
                        {isPartial && (
                          <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-full inline-flex">
                            <AlertCircle size={10} />
                            <span className="text-[7px] font-black uppercase tracking-wider">
                              Needs {indicator.target - indicator.progress} more
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedIndicatorId && (
        <SuperAdminApprovedModal
          indicatorId={selectedIndicatorId}
          onClose={() => setSelectedIndicatorId(null)}
        />
      )}
    </div>
  );
};

export default SuperAdminApproved;