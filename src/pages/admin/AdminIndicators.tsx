import { useEffect, useMemo, useState } from "react";
import { 
  Loader2, 
  Search, 
  UserCheck,  
  LayoutGrid,
  MapPin
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import {
  fetchAllAdminIndicators,
  getIndicatorByIdAdmin,
  clearSelectedIndicator,
} from "../../store/slices/adminIndicatorSlice";
import AdminIndicatorModal from "./AdminIndicatorModal";

const AdminIndicators = () => {
  const dispatch = useAppDispatch();

  const { plans, loading: plansLoading } = useAppSelector((state) => state.strategicPlan);
  const {
    allAssignments,
    pendingReview,
    isLoading: adminIndicatorsLoading,
    selectedIndicator,
  } = useAppSelector((state) => state.adminIndicators);

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"ALL" | "PENDING">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadRegistryData = async () => {
      try {
        await Promise.all([
          dispatch(getAllStrategicPlans()).unwrap(),
          dispatch(fetchAllUsers()).unwrap(),
          dispatch(fetchAllAdminIndicators()).unwrap()
        ]);
      } catch (err) {
        console.error("Registry Sync Error:", err);
      }
    };
    loadRegistryData();
  }, [dispatch]);

  // Map activities to their assignments (IAdminIndicator) from the slice
  const indicatorMap = useMemo(() => {
    const pool = viewMode === "ALL" ? allAssignments : pendingReview;
    return new Map(pool.map((ind) => [String(ind.activityId), ind]));
  }, [allAssignments, pendingReview, viewMode]);

  const filterStats = useMemo(() => {
    const counts: Record<string, number> = { ALL: allAssignments.length };
    allAssignments.forEach(ind => {
      const key = ind.perspective?.toUpperCase().split(" ")[0] || "OTHER";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allAssignments]);

  const filteredPlans = useMemo(() => {
    return plans
      .filter((plan: any) => {
        if (activeFilter === "ALL") return true;
        return plan.perspective.toUpperCase().includes(activeFilter.split(" ")[0]);
      })
      .map((plan: any) => {
        const processedObjectives = plan.objectives
          .map((obj: any) => {
            const filteredActivities = obj.activities.filter((act: any) => {
              const assignment = indicatorMap.get(String(act._id));
              if (viewMode === "PENDING" && !assignment) return false;

              const searchLower = searchTerm.toLowerCase();
              return (
                !searchTerm ||
                obj.title.toLowerCase().includes(searchLower) ||
                act.description.toLowerCase().includes(searchLower) ||
                assignment?.assigneeDisplayName?.toLowerCase().includes(searchLower) ||
                assignment?.unit?.toLowerCase().includes(searchLower)
              );
            });
            return { ...obj, activities: filteredActivities };
          })
          .filter((obj: any) => obj.activities.length > 0);
        return { ...plan, objectives: processedObjectives };
      })
      .filter((plan: any) => plan.objectives.length > 0);
  }, [plans, indicatorMap, activeFilter, searchTerm, viewMode]);

  const filters = [
    { label: "ALL", key: "ALL" },
    { label: "CORE BUSINESS", key: "CORE" },
    { label: "CUSTOMER", key: "CUSTOMER" },
    { label: "FINANCIAL", key: "FINANCIAL" },
    { label: "INNOVATION", key: "INNOVATION" },
    { label: "INTERNAL PROCESS", key: "INTERNAL" }
  ];

  if ((plansLoading || adminIndicatorsLoading) && plans.length === 0)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <Loader2 className="animate-spin text-[#1a3a32] mb-4" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32]">Syncing Registry...</p>
      </div>
    );

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans text-slate-900">
      <div className="flex flex-col xl:flex-row justify-between items-start mb-10 gap-8">
        <div>
          <h1 className="text-3xl font-black text-[#1a3a32] tracking-tighter uppercase mb-2">Registry 2026</h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
            Monitoring <span className="text-slate-600">{allAssignments.length} indicators</span>
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold w-full md:w-[320px] outline-none transition-all"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setViewMode("ALL")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "ALL" ? "bg-white text-[#1a3a32] shadow-sm" : "text-slate-400"}`}>
              Workload
            </button>
            <button onClick={() => setViewMode("PENDING")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "PENDING" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"}`}>
              Queue ({pendingReview.length})
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-10 overflow-x-auto no-scrollbar pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.label)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[9px] font-black border transition-all uppercase whitespace-nowrap tracking-widest
            ${activeFilter === f.label ? "bg-[#1a3a32] text-white border-[#1a3a32]" : "bg-white text-slate-400 border-slate-200"}`}
          >
            {f.label}
            <span className={`px-2 py-0.5 rounded-lg text-[8px] ${activeFilter === f.label ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {filterStats[f.key] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-8 w-[30%]">Indicator / Activity</th>
                <th className="px-6 py-8">Perspective</th>
                <th className="px-6 py-8 text-center">Wt.</th>
                <th className="px-6 py-8">Unit</th>
                <th className="px-6 py-8">Assignee</th>
                <th className="px-6 py-8 text-center">Progress</th>
                <th className="px-6 py-8">Status</th>
                <th className="px-10 py-8 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPlans.map((plan: any) =>
                plan.objectives.map((objective: any) => (
                  <ObjectiveSection
                    key={objective._id}
                    perspective={plan.perspective}
                    objective={objective}
                    indicatorMap={indicatorMap}
                    onReview={(id: string) => {
                        dispatch(clearSelectedIndicator());
                        dispatch(getIndicatorByIdAdmin(id));
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIndicator && (
        <div className="fixed inset-0 z-[300] flex justify-end">
            <div className="absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm" onClick={() => dispatch(clearSelectedIndicator())} />
            <div className="relative h-full w-full md:max-w-[800px] bg-white animate-in slide-in-from-right duration-500">
                <AdminIndicatorModal indicator={selectedIndicator} onClose={() => dispatch(clearSelectedIndicator())} />
            </div>
        </div>
      )}
    </div>
  );
};

const ObjectiveSection = ({ perspective, objective, indicatorMap, onReview }: any) => {
  return (
    <>
      <tr className="bg-slate-50/20">
        <td className="px-10 py-8 align-top">
          <div className="flex items-start gap-4">
             <div className="mt-1 p-1 bg-[#1a3a32] text-white rounded shadow-sm">
                <LayoutGrid size={12} />
             </div>
             <div>
                <h3 className="font-black text-[#1a3a32] text-[14px] tracking-tighter leading-tight mb-2">{objective.title}</h3>
                <span className="text-[8px] font-black uppercase tracking-widest text-[#1a3a32] bg-[#1a3a32]/5 px-2 py-1 rounded border border-[#1a3a32]/10">
                    {objective.activities.length} Tactical Activities
                </span>
             </div>
          </div>
        </td>
        <td className="px-6 py-8 align-top">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                {perspective.replace(" PERSPECTIVE", "")}
            </span>
        </td>
        <td colSpan={6} className="px-6 py-8"></td>
      </tr>

      {objective.activities.map((act: any) => {
        const assignment = indicatorMap.get(String(act._id));
        return (
          <tr key={act._id} className="bg-white hover:bg-slate-50/80 transition-all group">
            <td className="px-10 py-6 pl-24 text-[13px] font-bold text-slate-500 group-hover:text-[#1a3a32] leading-relaxed">
                {act.description}
            </td>
            <td className="px-6 py-6"></td>
            <td className="px-6 py-6 text-center text-[11px] font-black text-slate-400">
                {/* Picked from assignment data (IAdminIndicator) */}
                {assignment?.weight ? `${assignment.weight}%` : "—"}
            </td>
            <td className="px-6 py-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <MapPin size={12} className="text-emerald-600" />
                  {/* Picked from assigned unit */}
                  {assignment?.unit || "Unallocated"}
               </div>
            </td>
            <td className="px-6 py-6">
              {assignment ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center text-white"><UserCheck size={12} /></div>
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{assignment.assigneeDisplayName}</span>
                </div>
              ) : <span className="text-[9px] text-slate-200 font-black uppercase italic">Unassigned</span>}
            </td>
            <td className="px-6 py-6 text-center">
              <span className="text-[11px] font-black text-[#1a3a32]">{assignment?.progress || 0}%</span>
            </td>
            <td className="px-6 py-6">
               <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${assignment?.status === "Reviewed" || assignment?.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                 {assignment?.status || "Awaiting"}
               </span>
            </td>
            <td className="px-10 py-6 text-right">
              {assignment && (
                <button onClick={() => onReview(assignment._id)} className="bg-[#1a3a32] text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">
                  Dossier
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
};

export default AdminIndicators;