import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, ArrowRight, Loader2, AlertCircle, Calendar, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import {
  fetchIndicators,
  fetchIndicatorById,
  fetchAssignedIndicators,
  fetchUnassignedIndicators,
  fetchReviewIndicators,
  clearSelectedIndicator,
  clearIndicatorError,
  unassignIndicator,
  type IIndicator,
} from "../../store/slices/indicatorSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import toast from "react-hot-toast";
import { shallowEqual } from "react-redux";

import {
  type IStrategicPlan,
  type IObjective,
  type IActivity,
} from "../../store/slices/strategicPlan/strategicPlanService";

import IndicatorsPageIdModal from "./IndicatorsPageIdModal";
import type { AssignPrefill } from "../../types/types";
import SuperAdminAssign from "./SuperAdminAssign";

/* ─── ADDITIONAL TYPES ───────────────────────────────────────────────── */

interface IUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface IObjectiveWithIndicators extends IObjective {
  objectiveIndicators: IIndicator[];
}

interface IndicatorSectionProps {
  perspective: string;
  objective: IObjectiveWithIndicators;
  plan: IStrategicPlan;
  indicators: IIndicator[];
  userMap: Record<string, IUser>;
  onAssign: (prefill: AssignPrefill) => void;
  onSelectAssignment: (indicator: IIndicator) => void;
  onUnassign: (indicatorId: string) => void;
  activeFilter: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────── */

const matchId = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

const getObjectives = (plan: IStrategicPlan): IObjective[] =>
  Array.isArray(plan?.objectives) ? plan.objectives : [];

const getActivities = (obj: IObjective): IActivity[] =>
  Array.isArray(obj?.activities) ? obj.activities : [];

const resolveIds = (
  assignee: string | string[] | IUser | IUser[] | undefined,
): string[] => {
  if (!assignee) return [];
  const items = Array.isArray(assignee) ? assignee : [assignee];
  return items
    .map((item) => (typeof item === "object" ? item.id : String(item)))
    .filter(Boolean);
};

/* ─── CONSTANTS ──────────────────────────────────────────────────────── */

const PERSPECTIVE_ORDER: Record<string, number> = {
  "CORE BUSINESS": 1,
  "CUSTOMER PERSPECTIVE": 2,
  FINANCIAL: 3,
  INNOVATION: 4,
  "INTERNAL PROCESS": 5,
};

/* ─── INDICATOR SECTION ──────────────────────────────────────────────── */

const IndicatorSection = ({
  perspective,
  objective,
  plan,
  indicators,
  userMap,
  onAssign,
  onSelectAssignment,
  onUnassign,
}: IndicatorSectionProps) => {
  const visibleActivities = getActivities(objective);
  const total = visibleActivities.length;

  const assignedCount = visibleActivities.filter((act) =>
    (indicators || []).some((ind) => matchId(ind.activityId, act.id)),
  ).length;

  return (
    <>
      <tr className="bg-white border-b border-gray-50">
        <td className="p-4 py-6 align-top">
          <h3 className="font-bold text-[#1a3a32] text-[15px] leading-tight mb-2">
            {objective.title}
          </h3>
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-tight">
            <span className="text-orange-600">{total} activities</span>
            <span className="text-gray-300">
              • {assignedCount}/{total} assigned
            </span>
          </div>
        </td>
        <td className="p-4 align-top">
          <div className="text-[10px] text-[#d9b929] font-black uppercase tracking-widest mt-1">
            {perspective?.replace(" PERSPECTIVE", "")}
          </div>
        </td>
        <td colSpan={7} />
      </tr>

      {visibleActivities.map((activity: IActivity) => {
        const activityId = activity.id;
        const assignment = (indicators || []).find((ind) =>
          matchId(ind.activityId, activityId),
        );
        const ids = resolveIds(assignment?.assignee);
        const primaryUser = userMap[ids[0]];

        // Determine if this indicator needs review
        const needsReview = assignment?.needsAction || 
                           assignment?.status === "Awaiting Admin Approval" ||
                           assignment?.status === "Awaiting Super Admin";

        return (
          <tr
            key={activityId}
            className="bg-white border-b border-gray-50 hover:bg-gray-50/50"
          >
            <td className="p-4 pl-12">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-lg leading-none">↳</span>
                <span className="italic text-[13px] font-medium text-gray-600 leading-relaxed">
                  {activity.description}
                </span>
              </div>
            </td>

            <td />

            <td className="p-4 text-center">
              {assignment ? (
                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[11px] font-bold border border-amber-100">
                  {assignment.weight}
                </span>
              ) : (
                "—"
              )}
            </td>

            <td className="p-4 text-center text-[12px] font-bold text-gray-500">
              {assignment?.unit || "—"}
            </td>

            <td className="p-4">
              {assignment ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1a3a32] flex items-center justify-center text-[9px] text-white font-bold uppercase shadow-sm">
                    {primaryUser?.name?.charAt(0) ||
                      assignment.assigneeDisplayName?.charAt(0) ||
                      "U"}
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 uppercase truncate max-w-[100px]">
                    {assignment.assigneeDisplayName ||
                      primaryUser?.name ||
                      "Assigned"}
                  </span>
                </div>
              ) : (
                <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded text-[9px] font-bold uppercase">
                  Unassigned
                </span>
              )}
            </td>

            <td className="p-4">
              {assignment?.deadline ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar size={12} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    {new Date(assignment.deadline).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ) : (
                <span className="text-gray-300 text-[10px]">No Date</span>
              )}
            </td>

            <td className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${assignment?.progress || 0}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-500">
                  {assignment?.progress || 0}%
                </span>
              </div>
            </td>

            <td className="p-4">
              {needsReview ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-amber-100">
                  Needs Review
                </span>
              ) : assignment?.status?.toLowerCase().includes("rejected") ? (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-rose-100">
                  Rejected
                </span>
              ) : assignment?.status === "Unassigned" ? (
                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest pl-2">
                  Open
                </span>
              ) : (
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest pl-2">
                  {assignment?.status || "Active"}
                </span>
              )}
            </td>

            {/* ── Action cell ── */}
            <td className="p-4 text-center">
              {assignment ? (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onSelectAssignment(assignment)}
                    className={`border px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all ${
                      needsReview
                        ? "border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
                        : "border-[#1a3a32] text-[#1a3a32] hover:bg-[#1a3a32] hover:text-white"
                    }`}
                  >
                    {needsReview ? "Review" : "View"} <ArrowRight size={12} />
                  </button>
                  {assignment.status !== "Unassigned" && (
                    <button
                      onClick={() => onUnassign(assignment.id)}
                      title="Unassign"
                      className="border border-rose-200 text-rose-400 p-1.5 rounded-lg hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() =>
                    onAssign({
                      strategicPlanId: plan.id,
                      objectiveId: objective.id,
                      activityId: activityId,
                    })
                  }
                  className="border border-slate-400 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-slate-800 hover:text-white transition-all mx-auto"
                >
                  Assign <ArrowRight size={12} />
                </button>
              )}
            </td>
          </tr>
        );
      })}
      <tr className="h-4 bg-[#fcfdfb]">
        <td colSpan={9} />
      </tr>
    </>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

const SuperAdminIndicators = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ renderKey: incremented after every successful unassign.
  // Guarantees filteredData memo recomputes and React re-renders the table
  // even if the selector equality check doesn't catch the new array reference.
  const [renderKey, setRenderKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeFilter = searchParams.get("filter")?.toUpperCase() || "ALL";

  const { plans, loading: plansLoading } = useAppSelector(
    (s) => s.strategicPlan,
    shallowEqual,
  );

  // ✅ Use the categorized lists from the slice
  const assignedIndicators = useAppSelector(
    (s) => s.indicators.assignedIndicators,
    shallowEqual,
  );
  const unassignedIndicators = useAppSelector(
    (s) => s.indicators.unassignedIndicators,
    shallowEqual,
  );
  const reviewIndicators = useAppSelector(
    (s) => s.indicators.reviewIndicators,
    shallowEqual,
  );
  
  // ✅ Master list for filtering
  const allIndicators = useAppSelector(
    (s) => s.indicators.indicators,
    shallowEqual,
  );
  
  const selectedIndicator = useAppSelector(
    (s) => s.indicators.selectedIndicator,
  );
  const indicatorsLoading = useAppSelector((s) => s.indicators.loading);
  const actionLoading = useAppSelector((s) => s.indicators.actionLoading);

  const { users, isLoading: usersLoading } = useAppSelector(
    (s) => s.users,
    shallowEqual,
  );

  const [assignPrefill, setAssignPrefill] = useState<AssignPrefill | undefined>();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Refresh all indicator lists
  const refreshAllLists = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchIndicators()).unwrap(),
        dispatch(fetchAssignedIndicators()).unwrap(),
        dispatch(fetchUnassignedIndicators()).unwrap(),
        dispatch(fetchReviewIndicators()).unwrap(),
      ]);
      setRenderKey((k) => k + 1);
    } catch (error) {
      console.error("Failed to refresh indicators:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch all data on mount
    const loadInitialData = async () => {
      await Promise.all([
        dispatch(getAllStrategicPlans()).unwrap(),
        dispatch(fetchIndicators()).unwrap(),
        dispatch(fetchAssignedIndicators()).unwrap(),
        dispatch(fetchUnassignedIndicators()).unwrap(),
        dispatch(fetchReviewIndicators()).unwrap(),
        dispatch(fetchAllUsers()).unwrap(),
      ]);
    };
    
    loadInitialData().catch((error) => {
      console.error("Failed to load initial data:", error);
      toast.error("Failed to load indicators data");
    });
    
    return () => {
      dispatch(clearIndicatorError());
    };
  }, [dispatch]);

  const handleSelectAssignment = (indicator: IIndicator) => {
    dispatch(fetchIndicatorById(indicator.id));
  };

  const handleCloseDrawer = () => {
    dispatch(clearSelectedIndicator());
    // Refresh after closing drawer in case of changes
    refreshAllLists();
  };

  const handleOpenAssign = (prefill?: AssignPrefill) => {
    setAssignPrefill(prefill);
    setIsAssignModalOpen(true);
  };

  const handleCloseAssign = async () => {
    setIsAssignModalOpen(false);
    setAssignPrefill(undefined);
    // Refresh all lists when modal closes (in case assignment was made)
    await refreshAllLists();
  };

  const handleUnassign = async (indicatorId: string) => {
    if (!window.confirm("Remove this assignment? This cannot be undone.")) return;

    try {
      await dispatch(unassignIndicator(indicatorId)).unwrap();
      toast.success("Activity unassigned successfully.");
      await refreshAllLists();
    } catch {
      toast.error("Failed to unassign. Please try again.");
    }
  };

  const userMap = useMemo(() => {
    const map: Record<string, IUser> = {};
    (users ?? []).forEach((u) => {
      const key = u.id;
      if (key) map[String(key)] = u as IUser;
    });
    return map;
  }, [users]);

  // ✅ Use the appropriate indicator list based on filter
  const getIndicatorsForFilter = () => {
    if (activeFilter === "ASSIGNED") return assignedIndicators;
    if (activeFilter === "UNASSIGNED") return unassignedIndicators;
    if (activeFilter === "REVIEW") return reviewIndicators;
    return allIndicators;
  };

  // ✅ renderKey in deps: even if indicators reference didn't change in React's
  // eyes, bumping renderKey guarantees this memo recomputes with fresh data.
  const filteredData = useMemo(() => {
    let basePlans = [...(plans ?? [])];

    basePlans.sort((a, b) => {
      const orderA = PERSPECTIVE_ORDER[a?.perspective?.toUpperCase()] ?? 99;
      const orderB = PERSPECTIVE_ORDER[b?.perspective?.toUpperCase()] ?? 99;
      return orderA - orderB;
    });

    if (activeFilter !== "ALL" && PERSPECTIVE_ORDER[activeFilter]) {
      basePlans = basePlans.filter((p) =>
        p?.perspective?.toUpperCase().includes(activeFilter),
      );
    }

    const currentIndicators = getIndicatorsForFilter();

    return basePlans
      .map((plan: IStrategicPlan) => {
        const objectives = getObjectives(plan)
          .map((obj: IObjective): IObjectiveWithIndicators => {
            const filteredActivities = getActivities(obj).filter(
              (act: IActivity) => {
                const actId = act.id;
                const isAssigned = (currentIndicators ?? []).some((ind) =>
                  matchId(ind.activityId, actId),
                );
                
                // Filter based on active filter type
                if (activeFilter === "ASSIGNED") return isAssigned;
                if (activeFilter === "UNASSIGNED") return !isAssigned;
                if (activeFilter === "REVIEW") {
                  return (currentIndicators ?? []).some((ind) =>
                    matchId(ind.activityId, actId) && 
                    (ind.needsAction || 
                     ind.status === "Awaiting Admin Approval" ||
                     ind.status === "Awaiting Super Admin")
                  );
                }
                return true;
              },
            );

            // Pre-filtered per objective — passed directly as prop so
            // IndicatorSection never derives stale data via an inline filter.
            const objectiveIndicators = (currentIndicators ?? []).filter((ind) =>
              matchId(ind.objectiveId, obj.id),
            );

            return {
              ...obj,
              activities: filteredActivities,
              objectiveIndicators,
            };
          })
          .filter((obj) => obj.activities.length > 0);

        return { ...plan, objectives };
      })
      .filter((plan) => plan.objectives.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, plans, assignedIndicators, unassignedIndicators, reviewIndicators, allIndicators, renderKey]);

  const counts = useMemo(() => {
    const allActs = (plans ?? []).flatMap((p) =>
      getObjectives(p).flatMap((o) => getActivities(o)),
    );

    return {
      total: allActs.length,
      assigned: assignedIndicators.length,
      unassigned: unassignedIndicators.length,
      review: reviewIndicators.length,
      getPerspective: (label: string) =>
        (plans ?? [])
          .filter((p) => p?.perspective?.toUpperCase().includes(label))
          .reduce(
            (acc, p) =>
              acc +
              getObjectives(p).reduce(
                (oAcc, obj) => oAcc + getActivities(obj).length,
                0,
              ),
            0,
          ),
    };
  }, [plans, assignedIndicators.length, unassignedIndicators.length, reviewIndicators.length]);

  const filterTabs = [
    { label: "ALL", count: counts.total },
    { label: "ASSIGNED", count: counts.assigned },
    { label: "UNASSIGNED", count: counts.unassigned },
    { label: "REVIEW", count: counts.review },
    { label: "CORE BUSINESS", count: counts.getPerspective("CORE BUSINESS") },
    {
      label: "CUSTOMER PERSPECTIVE",
      count: counts.getPerspective("CUSTOMER PERSPECTIVE"),
    },
    { label: "FINANCIAL", count: counts.getPerspective("FINANCIAL") },
    { label: "INNOVATION", count: counts.getPerspective("INNOVATION") },
    {
      label: "INTERNAL PROCESS",
      count: counts.getPerspective("INTERNAL PROCESS"),
    },
  ];

  if (
    (plansLoading || indicatorsLoading || usersLoading) &&
    (plans ?? []).length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
        <p className="mt-4 text-[#1a3a32] font-medium">
          Syncing Judicial Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1a3a32] tracking-tight">
            PMMU Indicators — 2025/2026
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {activeFilter === "ASSIGNED" && `📋 ${counts.assigned} assigned activities`}
            {activeFilter === "UNASSIGNED" && `📌 ${counts.unassigned} unassigned activities`}
            {activeFilter === "REVIEW" && `⚠️ ${counts.review} pending review`}
            {activeFilter !== "ASSIGNED" && activeFilter !== "UNASSIGNED" && activeFilter !== "REVIEW" && activeFilter !== "ALL" && 
              `Viewing ${activeFilter.toLowerCase()}`}
            {activeFilter === "ALL" && `Monitoring ${counts.total} total activities`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {(actionLoading || isRefreshing) && (
            <Loader2 className="animate-spin text-[#1a3a32]" size={20} />
          )}
          <button
            onClick={() => handleOpenAssign()}
            disabled={isRefreshing}
            className="bg-[#1a3a32] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-[#1a3a32]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} strokeWidth={3} /> Assign KPI
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-2 mb-8 no-scrollbar">
        {filterTabs.map((f) => (
          <button
            key={f.label}
            onClick={() => setSearchParams({ filter: f.label })}
            className={`px-4 py-2 rounded-full text-[11px] font-bold border transition-all flex items-center gap-2 whitespace-nowrap uppercase ${
              activeFilter === f.label
                ? "bg-[#1a3a32] text-white border-[#1a3a32]"
                : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
            } ${
              (f.label === "REVIEW" && counts.review > 0) ? "ring-2 ring-amber-400 ring-opacity-50" : ""
            }`}
          >
            {f.label === "REVIEW" && "⚠️ "}
            {f.label}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeFilter === f.label
                  ? "bg-white/20"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
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
                <th className="p-4 font-bold">Deadline</th>
                <th className="p-4 font-bold text-center">Progress</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((plan: IStrategicPlan) =>
                  (plan.objectives as IObjectiveWithIndicators[]).map(
                    (objective) => (
                      <IndicatorSection
                        key={objective.id}
                        perspective={plan.perspective}
                        objective={objective}
                        plan={plan}
                        // ✅ Always fresh — computed inside filteredData memo
                        indicators={objective.objectiveIndicators}
                        userMap={userMap}
                        onAssign={handleOpenAssign}
                        onSelectAssignment={handleSelectAssignment}
                        onUnassign={handleUnassign}
                        activeFilter={activeFilter}
                      />
                    ),
                  ),
                )
              ) : (
                <tr>
                  <td colSpan={9} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="text-gray-200" size={48} />
                      <p className="text-gray-400 font-medium italic">
                        {activeFilter === "ASSIGNED" && "No assigned indicators found"}
                        {activeFilter === "UNASSIGNED" && "No unassigned indicators found"}
                        {activeFilter === "REVIEW" && "No pending reviews"}
                        {!["ASSIGNED", "UNASSIGNED", "REVIEW"].includes(activeFilter) && "No indicators found"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAssignModalOpen && (
        <SuperAdminAssign
          prefill={assignPrefill}
          onClose={handleCloseAssign}
          //onAssignSuccess={refreshAllLists}
        />
      )}

      <div
        className={`fixed inset-0 z-[300] transition-all duration-300 ${
          selectedIndicator ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleCloseDrawer}
        />
        <div
          className={`fixed right-0 top-0 h-full w-full md:w-[700px] bg-white shadow-2xl transition-transform duration-500 transform ${
            selectedIndicator ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {selectedIndicator ? (
            <IndicatorsPageIdModal
              indicator={selectedIndicator}
              allStaff={users}
              onClose={handleCloseDrawer}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminIndicators;