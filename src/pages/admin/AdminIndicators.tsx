import { useEffect, useMemo, useState } from "react";
import { 
  Loader2, 
  Search, 
  UserCheck,  
  LayoutGrid,
  MapPin,
  ShieldCheck,
  Activity,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import {
  fetchAllAdminIndicators,
  getIndicatorByIdAdmin,
  setSelectedIndicator,
} from "../../store/slices/adminIndicatorSlice";
import AdminIndicatorModal from "./AdminIndicatorModal";

const AdminIndicators = () => {
  const dispatch = useAppDispatch();

  const { plans, loading: plansLoading } = useAppSelector((state) => state.strategicPlan);
  const {
    allAssignments,
    pendingAdminReview,
    pendingSuperAdminReview,
    isLoading: adminIndicatorsLoading,
    selectedIndicator,
  } = useAppSelector((state) => state.adminIndicators);

  const [viewMode, setViewMode] = useState<"ALL" | "REGISTRY" | "SUPER_ADMIN">("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadRegistryData = async () => {
      try {
        // Syncing all core registry data in parallel
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

  // Logic: Map activities to assignments based on the active View Mode (Queue)
  const indicatorMap = useMemo(() => {
    let pool = allAssignments;
    if (viewMode === "REGISTRY") pool = pendingAdminReview;
    if (viewMode === "SUPER_ADMIN") pool = pendingSuperAdminReview;

    return new Map(pool.map((ind: any) => [String(ind.activityId), ind]));
  }, [allAssignments, pendingAdminReview, pendingSuperAdminReview, viewMode]);

  // Calculate stats based on the Perspective field
  const filterStats = useMemo(() => {
    const counts: Record<string, number> = { ALL: allAssignments.length };
    allAssignments.forEach(ind => {
      if (ind.perspective) {
        // Normalize key to match the filter buttons (e.g., "FINANCIAL")
        const key = ind.perspective.toUpperCase().split(" ")[0]; 
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [allAssignments]);

  const filteredPlans = useMemo(() => {
    return plans
      .filter((plan: any) => {
        if (activeFilter === "ALL") return true;
        // Logic to match "CORE BUSINESS" with "CORE" etc.
        return plan.perspective.toUpperCase().includes(activeFilter.split(" ")[0]);
      })
      .map((plan: any) => {
        const processedObjectives = plan.objectives
          .map((obj: any) => {
            const filteredActivities = obj.activities.filter((act: any) => {
              const assignment = indicatorMap.get(String(act._id));
              
              // If in a specific queue (Audit/Certify), hide activities without assignments
              if (viewMode !== "ALL" && !assignment) return false;

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
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-[#1a3a32]" size={48} />
          <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={18} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32] animate-pulse">Syncing Registry...</p>
      </div>
    );

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans text-slate-900">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start mb-10 gap-8">
        <div>
          <h1 className="text-2xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase mb-2">
            PMMU 2026
          </h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-serif px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
              <Activity size={10} /> Admin ManagemenT
            </span>
            <p className="text-[11px] font-serif text-slate-400 font-bold uppercase tracking-tight">
              Audit Trail: <span className="text-slate-600">{allAssignments.length} Performance Indicators</span>
            </p>
          </div>
        </div>

        {/* Queue Controls */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Search by activity, officer, or unit..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold w-full md:w-[350px] outline-none focus:ring-4 focus:ring-[#1a3a32]/5 focus:border-[#1a3a32] transition-all shadow-sm"
            />
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner border border-slate-200/50">
            <button onClick={() => setViewMode("ALL")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "ALL" ? "bg-white text-[#1a3a32] shadow-md border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}>
              Workload
            </button>
            <button onClick={() => setViewMode("REGISTRY")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "REGISTRY" ? "bg-[#1a3a32] text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}>
              {pendingAdminReview.length > 0 && <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />}
              Audit ({pendingAdminReview.length})
            </button>
            <button onClick={() => setViewMode("SUPER_ADMIN")} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "SUPER_ADMIN" ? "bg-emerald-700 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}>
              {pendingSuperAdminReview.length > 0 && <ShieldCheck size={12} className="text-emerald-300" />}
              Certify ({pendingSuperAdminReview.length})
            </button>
          </div>
        </div>
      </div>

      {/* Perspective Tabs */}
      <div className="flex items-center gap-3 mb-10 overflow-x-auto no-scrollbar pb-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.label)}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[9px] font-black border transition-all uppercase whitespace-nowrap tracking-widest shadow-sm
            ${activeFilter === f.label ? "bg-[#1a3a32] text-white border-[#1a3a32]" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"}`}
          >
            {f.label}
            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black ${activeFilter === f.label ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
              {filterStats[f.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-8 w-[35%]">Indicator / Activity Cluster</th>
                <th className="px-6 py-8 text-center">Weight</th>
                <th className="px-6 py-8">UoM</th>
                <th className="px-6 py-8">Assignee</th>
                <th className="px-6 py-8 text-center">Progress</th>
                <th className="px-6 py-8">Lifecycle Status</th>
                <th className="px-10 py-8 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPlans.length > 0 ? (
                filteredPlans.map((plan: any) =>
                  plan.objectives.map((objective: any) => (
                    <ObjectiveSection
                      key={objective._id}
                      perspective={plan.perspective}
                      objective={objective}
                      indicatorMap={indicatorMap}
                      onReview={(id: string) => {
                          dispatch(setSelectedIndicator(null));
                          dispatch(getIndicatorByIdAdmin(id));
                      }}
                    />
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={7} className="py-40">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Inbox size={64} className="mb-6 opacity-20" />
                      <p className="text-[11px] font-black uppercase tracking-[0.3em]">Registry stream empty for this selection</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Review Modal Overlay */}
      {selectedIndicator && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          <div 
            className="absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm transition-opacity duration-500" 
            onClick={() => dispatch(setSelectedIndicator(null))} 
          />
          <div className="relative h-full w-100 md:w-[85vw] lg:w-[70vw] xl:w-[850px] bg-[#fcfdfb] shadow-2xl animate-in slide-in-from-right duration-500 ease-out border-l border-slate-200 overflow-y-auto">
            <AdminIndicatorModal 
              indicator={selectedIndicator} 
              onClose={() => dispatch(setSelectedIndicator(null))} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* --- Sub-component: Objective & Activity Rows --- */

const ObjectiveSection = ({ perspective, objective, indicatorMap, onReview }: any) => {
  return (
    <>
      <tr className="bg-slate-50/30">
        <td className="px-10 py-8 align-top" colSpan={7}>
          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 bg-[#1a3a32] text-white rounded-xl shadow-lg shadow-emerald-900/20">
              <LayoutGrid size={16} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100">
                  {perspective.replace(" PERSPECTIVE", "")}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                  {objective.activities.length} Tactical Nodes
                </span>
              </div>
              <h3 className="font-black text-[#1a3a32] text-[15px] tracking-tight leading-tight">
                {objective.title}
              </h3>
            </div>
          </div>
        </td>
      </tr>

      {objective.activities.map((act: any) => {
        const assignment = indicatorMap.get(String(act._id));
        return (
          <tr key={act._id} className="bg-white hover:bg-slate-50/80 transition-all group">
            <td className="px-10 py-6 pl-24 text-[12px] font-bold text-slate-500 group-hover:text-[#1a3a32] leading-relaxed transition-colors border-l-4 border-transparent hover:border-emerald-500">
                {act.description}
            </td>
            <td className="px-6 py-6 text-center text-[11px] font-black text-slate-400">
                {assignment?.weight ? `${assignment.weight}%` : "—"}
            </td>
            <td className="px-6 py-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <MapPin size={12} className="text-emerald-600" />
                  <span className="truncate max-w-[120px]">{assignment?.unit || "Unallocated"}</span>
               </div>
            </td>
            <td className="px-6 py-6">
              {assignment ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-700">
                    <UserCheck size={14} />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{assignment.assigneeDisplayName}</span>
                </div>
              ) : <span className="text-[9px] text-slate-200 font-black uppercase italic tracking-widest">Awaiting Deployment</span>}
            </td>
            <td className="px-6 py-6 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-black text-[#1a3a32]">{assignment?.progress || 0}%</span>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${assignment?.progress || 0}%` }} />
                </div>
              </div>
            </td>
            <td className="px-6 py-6">
               <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border shadow-sm inline-flex items-center gap-2 ${
                 assignment?.status === "Completed" 
                 ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                 : assignment?.status === "Awaiting Admin Approval"
                 ? "bg-orange-50 text-orange-700 border-orange-100"
                 : assignment?.status === "Awaiting Super Admin"
                 ? "bg-blue-50 text-blue-700 border-blue-100"
                 : "bg-slate-50 text-slate-400 border-slate-100"
               }`}>
                 {assignment?.status === "Awaiting Admin Approval" && <span className="w-1 h-1 bg-orange-400 rounded-full animate-ping" />}
                 {assignment?.status || "Inert"}
               </span>
            </td>
            <td className="px-10 py-6 text-right">
              {assignment && (
                <button 
                  onClick={() => onReview(assignment._id)} 
                  className="inline-flex items-center gap-3 bg-[#1a3a32] text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-black hover:shadow-xl hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  View Dossier
                  <ArrowUpRight size={14} />
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