import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ArrowRight, Loader2,  AlertCircle, Calendar } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import { fetchIndicators, type IIndicator, clearIndicatorError } from "../../store/slices/indicatorSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";

import SuperAdminAssign from "./SuperAdminAssign";
import IndicatorsPageIdModal from "./IndicatorsPageIdModal";

// --- Types & Interfaces ---
interface IndicatorSectionProps {
  perspective: string;
  objective: any;
  indicators: IIndicator[];
  userMap: Record<string, any>;
  onAssign: () => void;
  onSelectAssignment: (indicator: IIndicator) => void;
  activeFilter: string;
}

const PERSPECTIVE_ORDER: Record<string, number> = {
  "CORE BUSINESS": 1,
  "CUSTOMER PERSPECTIVE": 2,
  "FINANCIAL": 3,
  "INNOVATION": 4,
  "INTERNAL PROCESS": 5,
};

const SuperAdminIndicators = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeFilter = searchParams.get("filter")?.toUpperCase() || "ALL";

  const { plans, loading: plansLoading } = useAppSelector((state) => state.strategicPlan);
  const { indicators, loading: indicatorsLoading, actionLoading } = useAppSelector((state) => state.indicators);
  const { users, isLoading: usersLoading } = useAppSelector((state) => state.users);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<IIndicator | null>(null);

  useEffect(() => {
    dispatch(getAllStrategicPlans());
    dispatch(fetchIndicators());
    dispatch(fetchAllUsers());
    return () => { dispatch(clearIndicatorError()); };
  }, [dispatch]);

  const userMap = useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach((u) => { map[String(u._id)] = u; });
    return map;
  }, [users]);

  const totalActivities = useMemo(() => 
    plans.reduce((acc, p) => acc + p.objectives.reduce((oAcc, obj) => oAcc + obj.activities.length, 0), 0),
    [plans]
  );

  const getPerspectiveCount = (label: string) => {
    const prefix = label.toUpperCase();
    return plans
      .filter((p) => p.perspective.toUpperCase().includes(prefix))
      .reduce((acc, p) => acc + p.objectives.reduce((oAcc, obj) => oAcc + obj.activities.length, 0), 0);
  };

  const filters = [
    { label: "ALL", count: totalActivities },
    { label: "CORE BUSINESS", count: getPerspectiveCount("CORE BUSINESS") },
    { label: "CUSTOMER PERSPECTIVE", count: getPerspectiveCount("CUSTOMER PERSPECTIVE") },
    { label: "FINANCIAL", count: getPerspectiveCount("FINANCIAL") },
    { label: "INNOVATION", count: getPerspectiveCount("INNOVATION") },
    { label: "INTERNAL PROCESS", count: getPerspectiveCount("INTERNAL PROCESS") },
  ];

  const handleFilterChange = (label: string) => {
    setSearchParams({ filter: label });
  };

  const filteredData = useMemo(() => {
    let processedPlans = [...plans];

    processedPlans.sort((a, b) => {
      const orderA = PERSPECTIVE_ORDER[a.perspective.toUpperCase()] || 99;
      const orderB = PERSPECTIVE_ORDER[b.perspective.toUpperCase()] || 99;
      return orderA - orderB;
    });

    if (activeFilter !== "ALL" && PERSPECTIVE_ORDER[activeFilter]) {
      processedPlans = processedPlans.filter((p) => 
        p.perspective.toUpperCase().includes(activeFilter)
      );
    }

    return processedPlans.map(plan => ({
      ...plan,
      objectives: plan.objectives.map((obj: any) => {
        const objIndicators = indicators.filter(ind => String(ind.objectiveId) === String(obj._id));
        const filteredActivities = obj.activities.filter((act: any) => {
          const assignment = objIndicators.find(ind => String(ind.activityId) === String(act._id));
          switch (activeFilter) {
            case "ASSIGNED": return !!assignment;
            case "UNASSIGNED": return !assignment;
            default: return true;
          }
        });
        return { ...obj, activities: filteredActivities };
      }).filter((obj: any) => obj.activities.length > 0)
    })).filter(plan => plan.objectives.length > 0);

  }, [activeFilter, plans, indicators]);

  if ((plansLoading || indicatorsLoading || usersLoading) && plans.length === 0)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
        <p className="mt-4 text-[#1a3a32] font-medium animate-pulse">Syncing Judicial Registry...</p>
      </div>
    );

  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a32] tracking-tight">PMMU Indicators — 2026</h1>
          <p className="text-sm text-gray-500 font-medium">
            {activeFilter !== "ALL" ? `Viewing ${activeFilter}` : `Monitoring ${totalActivities} activities`}
          </p>
        </div>
        <div className="flex gap-2">
          {actionLoading && <Loader2 className="animate-spin text-[#1a3a32] mt-2" size={20} />}
          <button 
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-[#1a3a32] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-[#1a3a32]/10"
          >
            <Plus size={16} strokeWidth={3} /> Assign KPI
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-4 gap-2 mb-8 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => handleFilterChange(f.label)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold border transition-all flex items-center gap-2 whitespace-nowrap uppercase
              ${activeFilter === f.label ? "bg-[#1a3a32] text-white border-[#1a3a32]" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"}`}
          >
            {f.label}
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeFilter === f.label ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1250px]">
            <thead>
              <tr className="bg-[#1a3a32] text-white text-[10px] uppercase tracking-[0.15em]">
                <th className="p-4 font-bold w-[25%]">Indicator / Activity</th>
                <th className="p-4 font-bold">Perspective</th>
                <th className="p-4 font-bold text-center">Wt.</th>
                <th className="p-4 font-bold text-center">Unit</th>
                <th className="p-4 font-bold">Assignee</th>
                <th className="p-4 font-bold">Deadline</th> {/* 🔹 New Column */}
                <th className="p-4 font-bold text-center">Progress</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? filteredData.map((plan) =>
                plan.objectives.map((objective: any) => (
                  <IndicatorSection
                    key={objective._id}
                    perspective={plan.perspective}
                    objective={objective}
                    indicators={indicators.filter(ind => String(ind.objectiveId) === String(objective._id))}
                    userMap={userMap} 
                    onAssign={() => setIsAssignModalOpen(true)}
                    onSelectAssignment={setSelectedIndicator}
                    activeFilter={activeFilter}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <AlertCircle className="text-gray-200" size={48} />
                       <p className="text-gray-400 font-medium italic">No indicators found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAssignModalOpen && <SuperAdminAssign onClose={() => setIsAssignModalOpen(false)} />}

      {/* Modal Drawer */}
      <div className={`fixed inset-0 z-[300] transition-all duration-300 ${selectedIndicator ? "visible opacity-100" : "invisible opacity-0"}`}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedIndicator(null)} />
        <div className={`absolute right-0 top-0 h-full w-full md:max-w-[700px] bg-white shadow-2xl transition-transform duration-500 transform ${selectedIndicator ? "translate-x-0" : "translate-x-full"}`}>
            {selectedIndicator && (
                <IndicatorsPageIdModal 
                    indicator={selectedIndicator} 
                    allStaff={users} 
                    onClose={() => setSelectedIndicator(null)} 
                />
            )}
        </div>
      </div>
    </div>
  );
};

const IndicatorSection = ({ perspective, objective, indicators, userMap, onAssign, onSelectAssignment }: IndicatorSectionProps) => {
  const visibleActivities = objective.activities;
  const total = visibleActivities.length;
  const assignedCount = visibleActivities.filter((act: any) => indicators.some(ind => String(ind.activityId) === String(act._id))).length;

  const resolveIds = (assignee: any): string[] => {
    if (!assignee) return [];
    if (Array.isArray(assignee)) return assignee.map((a: any) => (typeof a === 'object' ? String(a._id) : String(a)));
    return [typeof assignee === 'object' ? String(assignee._id) : String(assignee)];
  };

  return (
    <>
      <tr className="bg-white group border-b border-gray-50">
        <td className="p-4 py-6 align-top">
          <h3 className="font-bold text-[#1a3a32] text-[15px] leading-tight mb-2">{objective.title}</h3>
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-tight">
            <span className="text-orange-600">{total} activities</span>
            <span className="text-gray-300">• {assignedCount}/{total} assigned</span>
          </div>
        </td>
        <td className="p-4 align-top">
          <div className="text-[10px] text-[#d9b929] font-black uppercase tracking-widest mt-1">
            {perspective.replace(" PERSPECTIVE", "")}
          </div>
        </td>
        <td colSpan={7}></td>
      </tr>

      {objective.activities.map((activity: any) => {
        const assignment = indicators.find((ind) => String(ind.activityId) === String(activity._id));
        const ids = resolveIds(assignment?.assignee);
        
        return (
          <tr key={activity._id} className="bg-white border-b border-gray-50 group/row hover:bg-gray-50/50">
            <td className="p-4 pl-12">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-lg leading-none">↳</span>
                <span className="italic text-[13px] font-medium text-gray-600 leading-relaxed">{activity.description}</span>
              </div>
            </td>
            <td colSpan={1}></td>
            <td className="p-4 text-center">
              {assignment ? (
                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[11px] font-bold border border-amber-100">
                  {assignment.weight}
                </span>
              ) : "—"}
            </td>
            <td className="p-4 text-center text-[12px] font-bold text-gray-500">{assignment?.unit || "—"}</td>
            
            {/* 🔹 ASSIGNEE COLUMN */}
            <td className="p-4">
              {assignment ? (
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-[#1a3a32] flex items-center justify-center text-[9px] text-white font-bold uppercase shadow-sm">
                      {userMap[ids[0]]?.name?.charAt(0) || 'U'}
                   </div>
                   <span className="text-[10px] font-bold text-gray-700 uppercase truncate max-w-[100px]">{userMap[ids[0]]?.name || "Assigned"}</span>
                </div>
              ) : (
                <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded text-[9px] font-bold uppercase">Unassigned</span>
              )}
            </td>

            {/* 🔹 DEADLINE COLUMN (NEW) */}
            <td className="p-4">
              {assignment?.deadline ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={12} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    {new Date(assignment.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ) : (
                <span className="text-gray-300 text-[10px]">No Date</span>
              )}
            </td>

            {/* 🔹 PROGRESS COLUMN */}
            <td className="p-4 text-center">
               <div className="flex items-center justify-center gap-2">
                  <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500" style={{ width: `${assignment?.progress || 0}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">{assignment?.progress || 0}%</span>
               </div>
            </td>

            <td className="p-4">
               {assignment?.status?.includes('Awaiting') ? (
                 <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-emerald-100">
                    Pending Review
                 </span>
               ) : assignment?.status?.includes('Rejected') ? (
                 <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-rose-100">
                    Rejected
                 </span>
               ) : (
                 <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest pl-2">
                   {assignment?.status || "Open"}
                 </span>
               )}
            </td>
            <td className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {assignment ? (
                  <button onClick={() => onSelectAssignment(assignment)} className="border border-[#1a3a32] text-[#1a3a32] px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-[#1a3a32] hover:text-white transition-all">
                    Review <ArrowRight size={12} />
                  </button>
                ) : (
                  <button onClick={onAssign} className="border border-slate-400 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-slate-800 hover:text-white transition-all">
                    Assign <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
      <tr className="h-4 bg-[#fcfdfb]"></tr>
    </>
  );
};

export default SuperAdminIndicators;