import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, ListChecks, Clock, Search, UserCheck,  Users } from "lucide-react";
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

  // 1. Redux State
  const { plans, loading: plansLoading } = useAppSelector((state) => state.strategicPlan);
  const {
    allAssignments,
    pendingReview,
    isLoading: adminIndicatorsLoading,
    selectedIndicator,
  } = useAppSelector((state) => state.adminIndicators);

  // 2. UI State
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"ALL" | "PENDING">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // 3. Lifecycle
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

  // 4. Logic: Normalized Lookup Map
  const indicatorMap = useMemo(() => {
    const pool = viewMode === "ALL" ? allAssignments : pendingReview;
    return new Map(pool.map((ind) => [String(ind.activityId), ind]));
  }, [allAssignments, pendingReview, viewMode]);

  // 5. Logic: Filtering
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
                assignment?.assigneeDisplayName?.toLowerCase().includes(searchLower)
              );
            });
            return { ...obj, activities: filteredActivities };
          })
          .filter((obj: any) => obj.activities.length > 0);
        return { ...plan, objectives: processedObjectives };
      })
      .filter((plan: any) => plan.objectives.length > 0);
  }, [plans, indicatorMap, activeFilter, searchTerm, viewMode]);

  const stats = useMemo(() => ({
    total: allAssignments.length,
    pending: pendingReview.length,
  }), [allAssignments, pendingReview]);

  const filters = ["ALL", "CORE BUSINESS", "CUSTOMER", "FINANCIAL", "INNOVATION", "INTERNAL PROCESS"];

  if ((plansLoading || adminIndicatorsLoading) && plans.length === 0)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
        <p className="mt-4 text-[#1a3a32] font-medium animate-pulse">Syncing Admin Registry...</p>
      </div>
    );

  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a32] tracking-tight flex items-center gap-2">
            ADMIN PANEL — 2026 
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Registry</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium italic">
            Monitoring {stats.total} assignments across {plans.length} departments.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Objective or Staff..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-lg text-[11px] font-bold w-full md:w-[250px] outline-none focus:border-[#1a3a32] transition-all shadow-sm"
            />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("ALL")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === "ALL" ? "bg-white text-[#1a3a32] shadow-sm" : "text-gray-400"
              }`}
            >
              <ListChecks size={14} /> Global Workload ({stats.total})
            </button>
            <button
              onClick={() => setViewMode("PENDING")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === "PENDING" ? "bg-white text-orange-600 shadow-sm" : "text-gray-400"
              }`}
            >
              <Clock size={14} /> Review Queue ({stats.pending})
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-2 mb-8 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold border transition-all uppercase whitespace-nowrap
              ${activeFilter === f ? "bg-[#1a3a32] text-white border-[#1a3a32]" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#1a3a32] text-white text-[10px] uppercase tracking-[0.15em]">
                <th className="p-4 font-bold w-[30%]">Indicator / Activity</th>
                <th className="p-4 font-bold">Perspective</th>
                <th className="p-4 font-bold text-center">Wt.</th>
                <th className="p-4 font-bold text-center">Target</th>
                <th className="p-4 font-bold">Assignee</th>
                <th className="p-4 font-bold text-center">Progress</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan: any) =>
                plan.objectives.map((objective: any) => (
                  <ObjectiveSection
                    key={objective._id}
                    perspective={plan.perspective}
                    objective={objective}
                    indicatorMap={indicatorMap}
                    onReview={(id: string) => dispatch(getIndicatorByIdAdmin(id))}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Slide-over Modal */}
      <div className={`fixed inset-0 z-[300] transition-all duration-300 ${selectedIndicator ? "visible opacity-100" : "invisible opacity-0"}`}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => dispatch(clearSelectedIndicator())} />
        <div className={`absolute right-0 top-0 h-full w-full md:max-w-[800px] bg-white shadow-2xl transition-transform duration-500 transform ${selectedIndicator ? "translate-x-0" : "translate-x-full"}`}>
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

/* ---------------- SUB-COMPONENT ---------------- */

const ObjectiveSection = ({ perspective, objective, indicatorMap, onReview }: any) => {
  return (
    <>
      <tr className="bg-white border-b border-gray-50">
        <td className="p-4 py-6 align-top">
          <h3 className="font-bold text-[#1a3a32] text-[15px] leading-tight mb-2">{objective.title}</h3>
          <span className="text-[10px] font-bold uppercase tracking-tight text-orange-500 bg-orange-50 px-2 py-0.5 rounded">
            {objective.activities.length} Activities
          </span>
        </td>
        <td className="p-4 align-top">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            {perspective.replace(" PERSPECTIVE", "")}
          </div>
        </td>
        <td className="p-4 align-top text-center">
          <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[11px] font-bold border border-amber-100 mt-1 inline-block">
            {objective.weight || 0}%
          </span>
        </td>
        <td colSpan={5} className="p-4"></td>
      </tr>

      {objective.activities.map((act: any) => {
        const assignment = indicatorMap.get(String(act._id));
        return (
          <tr key={act._id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-all">
            <td className="p-4 pl-12">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-lg leading-none font-bold">↳</span>
                <span className="italic text-[13px] font-medium text-gray-600 leading-relaxed">
                  {act.description}
                </span>
              </div>
            </td>
            <td className="p-4"></td>
            <td className="p-4 text-center">
               <span className="text-[11px] font-bold text-emerald-800">{assignment?.weight || "—"}</span>
            </td>
            <td className="p-4 text-center">
               <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#1a3a32]">{assignment?.target || "—"}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">{assignment?.unit || "Units"}</span>
               </div>
            </td>
            <td className="p-4">
              {assignment ? (
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white shadow-sm ${Array.isArray(assignment.assignee) ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                      {Array.isArray(assignment.assignee) ? <Users size={12} /> : <UserCheck size={12} />}
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 uppercase truncate max-w-[120px]">
                    {assignment.assigneeDisplayName}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-gray-200 italic font-bold">Unassigned</span>
              )}
            </td>
            <td className="p-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-gray-500">{assignment?.progress || 0}%</span>
                <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${assignment?.progress || 0}%` }} />
                </div>
              </div>
            </td>
            <td className="p-4">
              <div className="flex flex-col items-center gap-1">
                 <span className={`text-[9px] font-bold px-3 py-1 rounded-full border uppercase ${
                   assignment?.status === "Submitted" ? "bg-orange-50 text-orange-600 border-orange-100" : 
                   assignment?.status === "Reviewed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                   "bg-gray-50 text-gray-400 border-gray-100"
                 }`}>
                   {assignment?.status || "Open"}
                 </span>
                 {assignment?.isOverdue && (
                   <span className="text-[7px] text-red-500 font-bold uppercase animate-pulse">Overdue</span>
                 )}
              </div>
            </td>
            <td className="p-4 text-center">
              {assignment && (
                <button
                  onClick={() => onReview(assignment._id)}
                  className="border border-[#1a3a32] text-[#1a3a32] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-[#1a3a32] hover:text-white transition-all mx-auto"
                >
                  Review <ArrowRight size={12} />
                </button>
              )}
            </td>
          </tr>
        );
      })}
      <tr className="h-4 bg-[#fcfdfb]"></tr>
    </>
  );
};

export default AdminIndicators;