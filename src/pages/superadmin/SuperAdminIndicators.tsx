import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Loader2, AlertCircle, Calendar, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import {
  fetchIndicators,
  fetchAssignedIndicators,
  fetchUnassignedIndicators,
  fetchReviewIndicators,
  clearIndicatorError,
  unassignIndicator,
  type IIndicator,
} from "../../store/slices/indicatorSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import toast from "react-hot-toast";
import { shallowEqual } from "react-redux";
import { apiPrivate } from "../../api/axios";

import {
  type IStrategicPlan,
  type IObjective,
  type IActivity,
} from "../../store/slices/strategicPlan/strategicPlanService";

import type { AssignPrefill } from "../../types/types";
import SuperAdminAssign from "./SuperAdminAssign";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

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
  onViewIndicator: (indicatorId: string) => void;
  onUnassign: (indicatorId: string) => void;
  activeFilter: string;
}

/* ─── SERVER COUNTS SHAPE ────────────────────────────────────────────────── */

interface IIndicatorCounts {
  total:      number;
  assigned:   number;
  unassigned: number;
  review:     number;
  overdue:    number;
  perspectives: Record<string, number>;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

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

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */

const PERSPECTIVE_ORDER: Record<string, number> = {
  "CORE BUSINESS": 1,
  "CUSTOMER PERSPECTIVE": 2,
  FINANCIAL: 3,
  INNOVATION: 4,
  "INTERNAL PROCESS": 5,
};

/* ─── INDICATOR SECTION ──────────────────────────────────────────────────── */

const IndicatorSection = ({
  perspective,
  objective,
  plan,
  indicators,
  userMap,
  onAssign,
  onViewIndicator,
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

        const needsReview =
          assignment?.needsAction ||
          assignment?.status === "Awaiting Admin Approval" ||
          assignment?.status === "Awaiting Super Admin";

        const hasAssigneeValue = assignment && assignment.assignee && assignment.assignee !== "";
        const hasValidDisplayName =
          assignment?.assigneeDisplayName &&
          assignment.assigneeDisplayName !== "Unassigned" &&
          assignment.assigneeDisplayName !== "";
        const hasPrimaryUser = primaryUser && primaryUser.name;
        const isAssigned = hasAssigneeValue || hasValidDisplayName || hasPrimaryUser;

        const getAssigneeDisplayName = () => {
          if (
            assignment?.assigneeDisplayName &&
            assignment.assigneeDisplayName !== "Unassigned"
          ) {
            return assignment.assigneeDisplayName;
          }
          if (primaryUser?.name) return primaryUser.name;
          return "Assigned";
        };

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
              {isAssigned ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1a3a32] flex items-center justify-center text-[9px] text-white font-bold uppercase shadow-sm">
                    {getAssigneeDisplayName().charAt(0) || "U"}
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 uppercase truncate max-w-[100px]">
                    {getAssigneeDisplayName()}
                  </span>
                </div>
              ) : (
                <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded text-[9px] font-bold uppercase">
                  Unassigned
                </span>
              )}
            </td>
            <td className="p-4">
              {assignment?.deadline && isAssigned ? (
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
                <span className="text-gray-300 text-[10px]">No date</span>
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
                  Needs review
                </span>
              ) : assignment?.status?.toLowerCase().includes("rejected") ? (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-rose-100">
                  Rejected
                </span>
              ) : (
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest pl-2">
                  {assignment?.status === "Completed" ? "Completed" : "Active"}
                </span>
              )}
            </td>
            <td className="p-4 text-center">
              {isAssigned ? (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onViewIndicator(assignment!.id)}
                    className={`border px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all ${
                      needsReview
                        ? "border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
                        : "border-[#1a3a32] text-[#1a3a32] hover:bg-[#1a3a32] hover:text-white"
                    }`}
                  >
                    {needsReview ? "Review" : "View"} <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => onUnassign(assignment!.id)}
                    title="Unassign"
                    className="border border-rose-200 text-rose-400 p-1.5 rounded-lg hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all"
                  >
                    <X size={12} />
                  </button>
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

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */

const SuperAdminIndicators = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ── Server-side counts — single source of truth for tab badges ── */
  const [serverCounts, setServerCounts] = useState<IIndicatorCounts | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await apiPrivate.get<{ success: boolean; data: IIndicatorCounts }>(
        "/indicators/counts"
      );
      setServerCounts(res.data.data);
    } catch (err) {
      console.error("Failed to fetch indicator counts:", err);
    }
  }, []);

  const activeFilter = searchParams.get("filter")?.toUpperCase() || "ALL";

  const { plans, loading: plansLoading } = useAppSelector(
    (s) => s.strategicPlan,
    shallowEqual,
  );

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
  const allIndicators = useAppSelector(
    (s) => s.indicators.indicators,
    shallowEqual,
  );
  const indicatorsLoading = useAppSelector((s) => s.indicators.loading);
  const actionLoading     = useAppSelector((s) => s.indicators.actionLoading);

  const { users, isLoading: usersLoading } = useAppSelector(
    (s) => s.users,
    shallowEqual,
  );

  const [assignPrefill, setAssignPrefill]     = useState<AssignPrefill | undefined>();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  /* ── Initial load ── */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          dispatch(getAllStrategicPlans()).unwrap(),
          dispatch(fetchIndicators()).unwrap(),
          dispatch(fetchAssignedIndicators()).unwrap(),
          dispatch(fetchUnassignedIndicators()).unwrap(),
          dispatch(fetchReviewIndicators()).unwrap(),
          dispatch(fetchAllUsers()).unwrap(),
          fetchCounts(),
        ]);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        toast.error("Failed to load indicators data");
      }
    };

    loadInitialData();

    return () => {
      dispatch(clearIndicatorError());
    };
  }, [dispatch, fetchCounts]);

  /* ── Refresh after mutations ── */
  const refreshAllLists = async () => {
    if (isRefreshing || actionLoading) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchIndicators()).unwrap(),
        dispatch(fetchAssignedIndicators()).unwrap(),
        dispatch(fetchUnassignedIndicators()).unwrap(),
        dispatch(fetchReviewIndicators()).unwrap(),
        fetchCounts(),
      ]);
    } catch (error) {
      console.error("Failed to refresh indicators:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewIndicator = (indicatorId: string) => {
    navigate(`/super-admin/indicators/${indicatorId}`);
  };

  const handleOpenAssign = (prefill?: AssignPrefill) => {
    setAssignPrefill(prefill);
    setIsAssignModalOpen(true);
  };

  const handleCloseAssign = async () => {
    setIsAssignModalOpen(false);
    setAssignPrefill(undefined);
    await refreshAllLists();
  };

  const handleUnassign = async (indicatorId: string) => {
    if (!window.confirm("Remove this assignment? This cannot be undone.")) return;
    try {
      await dispatch(unassignIndicator(indicatorId)).unwrap();
      toast.success("Activity unassigned successfully.");
      await refreshAllLists();
    } catch (error) {
      console.error("Unassign failed:", error);
      toast.error("Failed to unassign. Please try again.");
    }
  };

  /* ── User map ── */
  const userMap = useMemo(() => {
    const map: Record<string, IUser> = {};
    (users ?? []).forEach((u) => {
      if (u.id) map[String(u.id)] = u as IUser;
    });
    return map;
  }, [users]);

  /* ── Filtered table data (unchanged logic, still needed for the table rows) ── */
  const filteredData = useMemo(() => {
    const getIndicatorsForFilter = () => {
      if (activeFilter === "ASSIGNED")   return assignedIndicators;
      if (activeFilter === "UNASSIGNED") return unassignedIndicators;
      if (activeFilter === "REVIEW")     return reviewIndicators;
      return allIndicators;
    };

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
                const actId    = act.id;
                const isActAssigned = (currentIndicators ?? []).some((ind) =>
                  matchId(ind.activityId, actId),
                );

                if (activeFilter === "ASSIGNED")   return isActAssigned;
                if (activeFilter === "UNASSIGNED") return !isActAssigned;
                if (activeFilter === "REVIEW") {
                  return (currentIndicators ?? []).some(
                    (ind) =>
                      matchId(ind.activityId, actId) &&
                      (ind.needsAction ||
                        ind.status === "Awaiting Admin Approval" ||
                        ind.status === "Awaiting Super Admin"),
                  );
                }
                return true;
              },
            );

            const objectiveIndicators = (currentIndicators ?? []).filter((ind) =>
              matchId(ind.objectiveId, obj.id),
            );

            return { ...obj, activities: filteredActivities, objectiveIndicators };
          })
          .filter((obj) => obj.activities.length > 0);

        return { ...plan, objectives };
      })
      .filter((plan) => plan.objectives.length > 0);
  }, [
    activeFilter,
    plans,
    assignedIndicators,
    unassignedIndicators,
    reviewIndicators,
    allIndicators,
  ]);

  /* ── Tab counts — server values when available, fallback to array length ── */
  const counts = serverCounts ?? {
    total:      allIndicators.length,
    assigned:   assignedIndicators.length,
    unassigned: unassignedIndicators.length,
    review:     reviewIndicators.length,
    overdue:    0,
    perspectives: {},
  };

  const getPerspectiveCount = (label: string): number => {
    if (serverCounts) {
      const key = Object.keys(serverCounts.perspectives).find((k) =>
        k.toUpperCase().includes(label),
      );
      return key ? serverCounts.perspectives[key] : 0;
    }
    /* Fallback — derive from plans */
    return (plans ?? [])
      .filter((p) => p?.perspective?.toUpperCase().includes(label))
      .reduce(
        (acc, p) =>
          acc + getObjectives(p).reduce((o, obj) => o + getActivities(obj).length, 0),
        0,
      );
  };

  const filterTabs = [
    { label: "ALL",                  count: counts.total },
    { label: "ASSIGNED",             count: counts.assigned },
    { label: "UNASSIGNED",           count: counts.unassigned },
    { label: "REVIEW",               count: counts.review },
    { label: "CORE BUSINESS",        count: getPerspectiveCount("CORE BUSINESS") },
    { label: "CUSTOMER PERSPECTIVE", count: getPerspectiveCount("CUSTOMER PERSPECTIVE") },
    { label: "FINANCIAL",            count: getPerspectiveCount("FINANCIAL") },
    { label: "INNOVATION",           count: getPerspectiveCount("INNOVATION") },
    { label: "INTERNAL PROCESS",     count: getPerspectiveCount("INTERNAL PROCESS") },
  ];

  /* ─── LOADING ────────────────────────────────────────────────────────── */

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

  /* ─── RENDER ─────────────────────────────────────────────────────────── */

  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1a3a32] tracking-tight">
            PMMU Indicators — 2025/2026
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {activeFilter === "ASSIGNED"   && `${counts.assigned} assigned activities`}
            {activeFilter === "UNASSIGNED" && `${counts.unassigned} unassigned activities`}
            {activeFilter === "REVIEW"     && `${counts.review} pending review`}
            {activeFilter === "ALL"        && `Monitoring ${counts.total} total activities`}
            {!["ASSIGNED", "UNASSIGNED", "REVIEW", "ALL"].includes(activeFilter) &&
              `Viewing ${activeFilter.toLowerCase()}`}
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

      {/* Filter tabs */}
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
              f.label === "REVIEW" && counts.review > 0
                ? "ring-2 ring-amber-400 ring-opacity-50"
                : ""
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

      {/* Table */}
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
                        indicators={objective.objectiveIndicators}
                        userMap={userMap}
                        onAssign={handleOpenAssign}
                        onViewIndicator={handleViewIndicator}
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
                        {activeFilter === "ASSIGNED"   && "No assigned indicators found"}
                        {activeFilter === "UNASSIGNED" && "No unassigned indicators found"}
                        {activeFilter === "REVIEW"     && "No pending reviews"}
                        {!["ASSIGNED", "UNASSIGNED", "REVIEW"].includes(activeFilter) &&
                          "No indicators found"}
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
        />
      )}
    </div>
  );
};

export default SuperAdminIndicators;