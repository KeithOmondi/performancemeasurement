import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyAssignments } from "../../store/slices/userIndicatorSlice";
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  ShieldCheck,
  Clock,
  Activity,
  Hash,
  Loader2,
  RotateCcw,
} from "lucide-react";
import type { AppDispatch, RootState } from "../../store/store";
import type { IIndicatorUI } from "../../store/slices/userIndicatorSlice";

const UserTasks = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { myIndicators, loading } = useSelector(
    (state: RootState) => state.userIndicators,
  );

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  // Filter: Keep active tasks and flagged corrections. Hide fully completed terminal states.
  const filteredTasks = useMemo(() => {
    return myIndicators.filter(
      (item: IIndicatorUI) => item.status !== "Completed",
    );
  }, [myIndicators]);

  /**
   * 🔄 LIFECYCLE CONFIGURATION
   * Maps backend statuses to UI visual states and labels.
   */
  const getLifecycleConfig = (
    status: string,
    activeQuarter: number,
    cycle: "Quarterly" | "Annual",
  ) => {
    const periodLabel = cycle === "Annual" || activeQuarter === 0 ? "Annual" : `Q${activeQuarter}`;

    switch (status) {
      case "Awaiting Admin Approval":
        return {
          label: "Registry Audit",
          bg: "bg-amber-50 text-amber-700 border-amber-100",
          icon: <Clock size={12} />,
        };

      case "Awaiting Super Admin":
        return {
          label: "Final Certification",
          bg: "bg-blue-50 text-blue-700 border-blue-100",
          icon: <ShieldCheck size={12} />,
        };

      case "Rejected by Admin":
      case "Rejected by Super Admin":
        return {
          label: "Revision Required",
          bg: "bg-rose-50 text-rose-700 border-rose-100",
          icon: <AlertCircle size={12} />,
        };

      case "Partially Approved":
        return {
          label: "Phase Verified",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
          icon: <CheckCircle2 size={12} />,
        };

      case "Pending":
      default:
        return {
          label: `${periodLabel} Window Open`,
          bg: "bg-slate-50 text-slate-500 border-slate-200",
          icon: <PlayCircle size={12} />,
        };
    }
  };

  if (loading && myIndicators.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa] space-y-6">
        <div className="relative">
          <Loader2 className="w-14 h-14 animate-spin text-[#1a3a32]" />
          <ShieldCheck
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#c2a336]"
            size={16}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8c94a4]">
          Syncing Judicial Ledger...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 md:p-10 lg:p-14 text-[#1a3a32] font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-200 pb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#c2a336] text-[10px] font-black uppercase tracking-[0.3em]">
              <Activity size={16} /> Strategic Performance Unit
            </div>
            <h1 className="text-4xl font-black tracking-tighter leading-tight">
              Active{" "}
              <span className="text-gray-300 font-light italic">Assignments</span>
            </h1>
          </div>

          <div className="bg-[#1a3a32] text-white p-6 rounded-2xl shadow-2xl flex items-center gap-8 min-w-[320px] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck size={80} />
            </div>
            
            <div className="relative z-10">
              <p className="text-[#c2a336] text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                Filing Queue
              </p>
              <p className="text-4xl font-black leading-none tracking-tighter">
                {filteredTasks.length.toString().padStart(2, '0')}
              </p>
            </div>
            <div className="h-10 w-[1px] bg-white/10 relative z-10" />
            <div className="relative z-10">
              <p className="text-sm font-black text-[#c2a336] uppercase tracking-widest">Portal Active</p>
              <p className="text-[9px] text-white/40 uppercase font-bold">Awaiting Evidence</p>
            </div>
          </div>
        </header>

        <main className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {filteredTasks.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Indicator & Strategic Objective
                    </th>
                    <th className="px-4 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Cycle
                    </th>
                    <th className="px-4 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Registry Status
                    </th>
                    <th className="px-4 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest w-52">
                      Achievement
                    </th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTasks.map((item: IIndicatorUI) => {
                    const lifecycle = getLifecycleConfig(
                      item.status,
                      item.activeQuarter,
                      item.reportingCycle,
                    );
                    
                    const isFlagged = item.status.includes("Rejected");
                    const isUnderReview = item.status.startsWith("Awaiting");

                    return (
                      <tr
                        key={item._id}
                        className="group hover:bg-emerald-50/30 transition-all cursor-pointer"
                        onClick={() => navigate(`/user/assignments/${item._id}`)}
                      >
                        <td className="px-10 py-7">
                          <div className="max-w-md">
                            <p className="text-[9px] font-black text-[#c2a336] uppercase tracking-[0.2em] mb-1">
                              {item.perspective}
                            </p>
                            <p className="text-sm font-bold leading-tight group-hover:text-[#1a3a32] transition-colors">
                              {item.objectiveTitle}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 opacity-40">
                                <Hash size={10} />
                                <span className="text-[9px] font-black uppercase">
                                  ID: {item._id.slice(-6).toUpperCase()}
                                </span>
                              </div>
                              {isFlagged && (
                                <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[8px] font-black uppercase animate-pulse border border-rose-100">
                                  <RotateCcw size={10} />
                                  <span>Revision Required</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-7 text-center">
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${
                            item.reportingCycle === 'Annual' 
                              ? 'bg-blue-50 text-blue-600 border-blue-100' 
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {item.reportingCycle}
                          </span>
                        </td>

                        <td className="px-4 py-7 text-center">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all group-hover:shadow-md ${lifecycle.bg}`}>
                            {lifecycle.icon}
                            {lifecycle.label}
                          </div>
                        </td>

                        <td className="px-4 py-7">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ease-out ${
                                    isFlagged ? 'bg-rose-500' : 'bg-emerald-600'
                                }`}
                                style={{ width: `${Math.min(item.progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black tabular-nums text-gray-400">
                              {Math.round(item.progress)}%
                            </span>
                          </div>
                        </td>

                        <td className="px-10 py-7 text-right">
                          <button 
                            disabled={isUnderReview}
                            className={`p-3 rounded-xl border transition-all inline-flex items-center gap-3 group/btn ${
                              isUnderReview 
                              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" 
                              : "bg-white text-[#1a3a32] border-gray-200 hover:bg-[#1a3a32] hover:text-white hover:border-[#1a3a32] hover:shadow-lg"
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {isUnderReview ? "In Audit" : isFlagged ? "Resolve" : "View"}
                            </span>
                            <ArrowUpRight
                              size={14}
                              className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform"
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-40 flex flex-col items-center justify-center text-gray-300">
                <div className="bg-gray-50 p-12 rounded-[3rem] border border-gray-100 mb-6">
                  <Activity size={48} className="opacity-10" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-2 text-gray-400">
                  Registry Clear
                </h3>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400">
                  All assigned indicators have been finalized for this cycle.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserTasks;