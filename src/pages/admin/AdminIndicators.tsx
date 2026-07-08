// SuperAdminIndicators.tsx – with proper activity addition
import React from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Plus, ArrowRight, Loader2, AlertCircle, Calendar, X, Pencil, 
  Search, Filter, ChevronDown, ChevronUp, FolderPlus, FilePlus 
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  getAllStrategicPlans,
  //addObjective,
  //updateObjective,
  //addActivity,
  //updateActivity,
} from "../../store/slices/strategicPlan/strategicPlanSlice";
import {
  fetchIndicators,
  fetchAssignedIndicators,
  fetchUnassignedIndicators,
  fetchReviewIndicators,
  clearIndicatorError,
  unassignIndicator,
  fetchIndicatorCounts,
  optimisticUnassign,
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
import type { ModalMode } from "../superadmin/ActivityIndicatorModal";
import SuperAdminAssign from "../superadmin/SuperAdminAssign";
import SuperAdminEditIndicator from "../superadmin/SuperAdminEditIndicator";
import StrategicPlanEditModal from "../superadmin/ActivityIndicatorModal";
//import StrategicPlanEditModal, { type ModalMode } from "./StrategicPlanEditModal";

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
  onEdit: (indicator: IIndicator) => void;
  onAddObjective: (planId: string, planPerspective: string) => void;
  onEditObjective: (planId: string, objectiveId: string, currentTitle: string) => void;
  onAddActivity: (planId: string, objectiveId: string, objectiveTitle: string) => void;
  onEditActivity: (planId: string, objectiveId: string, activityId: string, currentDescription: string) => void;
  activeFilter: string;
  optimisticUnassignId?: string | null;
  optimisticAssignId?: string | null;
}

/* ─── SERVER COUNTS SHAPE ────────────────────────────────────────────────── */

interface IIndicatorCounts {
  total:        number;
  assigned:     number;
  unassigned:   number;
  review:       number;
  overdue:      number;
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
  "CORE BUSINESS":        1,
  "CUSTOMER PERSPECTIVE": 2,
  FINANCIAL:              3,
  INNOVATION:             4,
  "INTERNAL PROCESS":     5,
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Needs review", label: "Needs review" },
  { value: "Rejected", label: "Rejected" },
];

const CYCLE_OPTIONS = [
  { value: "ALL", label: "All cycles" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Annual", label: "Annual" },
];

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
  onEdit,
  //onAddObjective,
  onEditObjective,
  onAddActivity,
  onEditActivity,
  optimisticUnassignId,
  optimisticAssignId,
}: IndicatorSectionProps) => {
  const visibleActivities = getActivities(objective);
  const total = visibleActivities.length;

  const assignedCount = visibleActivities.filter((act) =>
    (indicators || []).some((ind) => matchId(ind.activityId, act.id)),
  ).length;

  return (
    <React.Fragment>
      {/* Objective header row */}
      <tr className="bg-white border-b border-gray-50">
        <td className="p-4 py-6 align-top">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-[#1a3a32] text-[15px] leading-tight mb-2">
                {objective.title}
              </h3>
              <div className="flex gap-2 text-[10px] font-black uppercase tracking-tight">
                <span className="text-orange-600">{total} activities</span>
                <span className="text-gray-300">
                  • {assignedCount}/{total} assigned
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEditObjective(plan.id, objective.id, objective.title)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit objective"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onAddActivity(plan.id, objective.id, objective.title)}
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors"
                title="Add activity"
              >
                <FilePlus size={14} />
              </button>
            </div>
          </div>
        </td>
        <td className="p-4 align-top">
          <div className="text-[10px] text-[#d9b929] font-black uppercase tracking-widest mt-1">
            {perspective?.replace(" PERSPECTIVE", "")}
          </div>
        </td>
        <td colSpan={7}></td>
      </tr>

      {/* Activity rows */}
      {visibleActivities.map((activity: IActivity) => {
        const activityId = activity.id;
        let assignment = (indicators || []).find((ind) =>
          matchId(ind.activityId, activityId),
        );
        
        const isOptimisticallyUnassigning = optimisticUnassignId === assignment?.id;
        const isOptimisticallyAssigning = optimisticAssignId === activityId;
        
        if (isOptimisticallyUnassigning) {
          assignment = undefined;
        }
        
        const ids = resolveIds(assignment?.assigneeId || assignment?.assignee);
        const primaryUser = userMap[ids[0]];

        const needsReview =
          assignment?.needsAction ||
          assignment?.status === "Awaiting Admin Approval" ||
          assignment?.status === "Awaiting Super Admin";

        const hasAssigneeValue = assignment && (assignment.assigneeId || assignment.assignee);
        const hasValidDisplayName =
          assignment?.assigneeDisplayName &&
          assignment.assigneeDisplayName !== "Unassigned" &&
          assignment.assigneeDisplayName !== "";
        const hasPrimaryUser = primaryUser && primaryUser.name;
        const isAssigned = hasAssigneeValue || hasValidDisplayName || hasPrimaryUser || isOptimisticallyAssigning;

        const getAssigneeDisplayName = () => {
          if (isOptimisticallyAssigning) return "Assigning...";
          if (assignment?.assigneeDisplayName && assignment.assigneeDisplayName !== "Unassigned") {
            return assignment.assigneeDisplayName;
          }
          if (primaryUser?.name) return primaryUser.name;
          if (assignment?.assigneeId) return "Assigned";
          return "Unassigned";
        };

        return (
          <tr
            key={activityId}
            className={`bg-white border-b border-gray-50 hover:bg-gray-50/50 ${
              isOptimisticallyAssigning ? "opacity-60" : ""
            }`}
          >
            <td className="p-4 pl-12">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-lg leading-none">↳</span>
                <div className="flex-1">
                  <span className="italic text-[13px] font-medium text-gray-600 leading-relaxed">
                    {activity.description}
                  </span>
                  {assignment && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                      {assignment.reportingCycle === "Annual" ? "Annual" : "Quarterly"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onEditActivity(plan.id, objective.id, activity.id, activity.description)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                  title="Edit activity"
                >
                  <Pencil size={12} />
                </button>
              </div>
            </td>

            <td></td>

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
                      day:   "2-digit",
                      month: "short",
                      year:  "numeric",
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
              {isOptimisticallyAssigning ? (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-blue-100">
                  <Loader2 size={10} className="animate-spin" />
                  Assigning...
                </span>
              ) : needsReview ? (
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
              {isAssigned && assignment && !isOptimisticallyAssigning ? (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onViewIndicator(assignment.id)}
                    className={`border px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all ${
                      needsReview
                        ? "border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
                        : "border-[#1a3a32] text-[#1a3a32] hover:bg-[#1a3a32] hover:text-white"
                    }`}
                  >
                    {needsReview ? "Review" : "View"} <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() => onEdit(assignment)}
                    title="Edit reporting cycle"
                    className="border border-sky-200 text-sky-500 p-1.5 rounded-lg hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => onUnassign(assignment.id)}
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
                      objectiveId:     objective.id,
                      activityId:      activityId,
                    })
                  }
                  disabled={isOptimisticallyAssigning}
                  className="border border-slate-400 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-slate-800 hover:text-white transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOptimisticallyAssigning ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Assign"
                  )}
                  <ArrowRight size={12} />
                </button>
              )}
            </td>
          </tr>
        );
      })}

      {/* Spacer row */}
      <tr className="h-4 bg-[#fcfdfb]">
        <td colSpan={9}></td>
      </tr>
    </React.Fragment>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */

const SuperAdminIndicators = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optimisticUnassignId, setOptimisticUnassignId] = useState<string | null>(null);
  const [optimisticAssignId, setOptimisticAssignId] = useState<string | null>(null);

  // Modal state
  const [editModalMode, setEditModalMode] = useState<ModalMode | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [cycleFilter, setCycleFilter] = useState("ALL");
  const [progressMin, setProgressMin] = useState<number>(0);
  const [progressMax, setProgressMax] = useState<number>(100);

  // Debounce search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setAssigneeFilter("ALL");
    setCycleFilter("ALL");
    setProgressMin(0);
    setProgressMax(100);
  };

  /* Server-side counts */
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

  /* Redux selectors */
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

  /* Modal state */
  const [assignPrefill, setAssignPrefill]         = useState<AssignPrefill | undefined>();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator]   = useState<IIndicator | null>(null);

  /* Initial load */
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
          dispatch(fetchIndicatorCounts()).unwrap(),
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

  /* Refresh after mutations */
  const refreshAllLists = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(getAllStrategicPlans()).unwrap(),
        dispatch(fetchIndicators()).unwrap(),
        dispatch(fetchAssignedIndicators()).unwrap(),
        dispatch(fetchUnassignedIndicators()).unwrap(),
        dispatch(fetchReviewIndicators()).unwrap(),
        dispatch(fetchIndicatorCounts()).unwrap(),
        fetchCounts(),
      ]);
    } catch (error) {
      console.error("Failed to refresh indicators:", error);
    } finally {
      setIsRefreshing(false);
      setOptimisticUnassignId(null);
      setOptimisticAssignId(null);
    }
  }, [dispatch, fetchCounts, isRefreshing]);

  /* Handlers */
  const handleViewIndicator = useCallback((indicatorId: string) => {
    navigate(`/superadmin/indicators/${indicatorId}`);
  }, [navigate]);

  const handleOpenAssign = useCallback((prefill?: AssignPrefill) => {
    setAssignPrefill(prefill);
    setIsAssignModalOpen(true);
  }, []);

  const handleCloseAssign = useCallback(async () => {
    setIsAssignModalOpen(false);
    setAssignPrefill(undefined);
    await refreshAllLists();
  }, [refreshAllLists]);

  const handleCloseEdit = useCallback(async () => {
    setEditingIndicator(null);
    await refreshAllLists();
  }, [refreshAllLists]);

  const handleUnassign = useCallback(async (indicatorId: string) => {
    if (!window.confirm("Remove this assignment? This cannot be undone.")) return;
    setOptimisticUnassignId(indicatorId);
    dispatch(optimisticUnassign({ id: indicatorId }));
    try {
      await dispatch(unassignIndicator(indicatorId)).unwrap();
      toast.success("Activity unassigned successfully.");
      await refreshAllLists();
    } catch (error) {
      console.error("Unassign failed:", error);
      toast.error("Failed to unassign. Please try again.");
      await refreshAllLists();
    } finally {
      setOptimisticUnassignId(null);
    }
  }, [dispatch, refreshAllLists]);

  // Strategic Plan Modal handlers
  const handleOpenEditModal = useCallback((mode: ModalMode) => {
    setEditModalMode(mode);
  }, []);

  const handleCloseEditModal = useCallback(async () => {
    setEditModalMode(null);
    // Wait a moment for the modal to close, then refresh
    setTimeout(async () => {
      await refreshAllLists();
    }, 300);
  }, [refreshAllLists]);

  /* User map */
  const userMap = useMemo(() => {
    const map: Record<string, IUser> = {};
    (users ?? []).forEach((u) => {
      if (u.id) map[String(u.id)] = u as IUser;
    });
    return map;
  }, [users]);

  /* Helper to check if an activity+indicator matches all filters */
  const matchesAllFilters = useCallback((
    activity: IActivity,
    indicator: IIndicator | undefined,
    objective: IObjective,
    planPerspective: string
  ): boolean => {
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const activityMatch = activity.description?.toLowerCase().includes(searchLower);
      const objectiveMatch = objective.title?.toLowerCase().includes(searchLower);
      const perspectiveMatch = planPerspective?.toLowerCase().includes(searchLower);
      const assigneeName = indicator ? (userMap[indicator.assigneeId || '']?.name || indicator.assigneeDisplayName || '') : '';
      const assigneeMatch = assigneeName.toLowerCase().includes(searchLower);
      const indicatorTitleMatch = indicator?.activityDescription?.toLowerCase().includes(searchLower);
      if (!(activityMatch || objectiveMatch || perspectiveMatch || assigneeMatch || indicatorTitleMatch)) {
        return false;
      }
    }

    if (statusFilter !== "ALL") {
      if (!indicator) return false;
      let indicatorStatus = "";
      if (indicator.needsAction || indicator.status === "Awaiting Admin Approval" || indicator.status === "Awaiting Super Admin") {
        indicatorStatus = "Needs review";
      } else if (indicator.status === "Completed") {
        indicatorStatus = "Completed";
      } else if (indicator.status?.toLowerCase().includes("rejected")) {
        indicatorStatus = "Rejected";
      } else {
        indicatorStatus = "Active";
      }
      if (indicatorStatus !== statusFilter) return false;
    }

    if (assigneeFilter !== "ALL") {
      if (!indicator) return false;
      if (String(indicator.assigneeId) !== String(assigneeFilter)) return false;
    }

    if (cycleFilter !== "ALL") {
      if (!indicator) return false;
      if (indicator.reportingCycle !== cycleFilter) return false;
    }

    if (indicator) {
      const progress = indicator.progress ?? 0;
      if (progress < progressMin || progress > progressMax) return false;
    } else {
      if (progressMin > 0) return false;
    }

    return true;
  }, [debouncedSearch, statusFilter, assigneeFilter, cycleFilter, progressMin, progressMax, userMap]);

  /* Filtered table data (integrates tab filter + extra filters) */
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
            // First filter activities by the tab filter (assigned/unassigned/review)
            let filteredActivities = getActivities(obj).filter((act: IActivity) => {
              const actId = act.id;
              const indicator = (currentIndicators ?? []).find((ind) =>
                matchId(ind.activityId, actId),
              );
              const hasIndicator = !!indicator;

              if (activeFilter === "ASSIGNED")   return hasIndicator;
              if (activeFilter === "UNASSIGNED") return hasIndicator;
              if (activeFilter === "REVIEW") {
                return hasIndicator && (
                  indicator.needsAction ||
                  indicator.status === "Awaiting Admin Approval" ||
                  indicator.status === "Awaiting Super Admin"
                );
              }
              return true;
            });

            // Apply extra filters (search, status, assignee, cycle, progress)
            filteredActivities = filteredActivities.filter((act) => {
              const actId = act.id;
              const indicator = (currentIndicators ?? []).find((ind) =>
                matchId(ind.activityId, actId),
              );
              return matchesAllFilters(act, indicator, obj, plan.perspective);
            });

            const objectiveIndicators = (currentIndicators ?? []).filter((ind) =>
              matchId(ind.objectiveId, obj.id) && 
              filteredActivities.some(act => matchId(act.id, ind.activityId))
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
    matchesAllFilters,
  ]);

  /* Tab counts (server counts or fallback) */
  const counts = serverCounts ?? {
    total:        allIndicators.length,
    assigned:     assignedIndicators.length,
    unassigned:   unassignedIndicators.length,
    review:       reviewIndicators.length,
    overdue:      0,
    perspectives: {},
  };

  const getPerspectiveCount = (label: string): number => {
    if (serverCounts) {
      const key = Object.keys(serverCounts.perspectives).find((k) =>
        k.toUpperCase().includes(label),
      );
      return key ? serverCounts.perspectives[key] : 0;
    }
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

  /* Loading state */
  if (
    (plansLoading || indicatorsLoading || usersLoading) &&
    (plans ?? []).length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
        <p className="mt-4 text-[#1a3a32] font-medium">
          Syncing PMMU Data...
        </p>
      </div>
    );
  }

  /* Render */
  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
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
            {(debouncedSearch || statusFilter !== "ALL" || assigneeFilter !== "ALL" || cycleFilter !== "ALL" || progressMin > 0 || progressMax < 100) && (
              <span className="ml-2 text-amber-600">(filtered)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider hover:bg-gray-50 transition-all"
          >
            <Filter size={14} />
            Filters
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => {
              if (plans && plans.length > 0) {
                handleOpenEditModal({ 
                  type: "add-objective", 
                  planId: plans[0]?.id || "", 
                  planPerspective: plans[0]?.perspective || "" 
                });
              } else {
                toast.error("No strategic plans found. Please create a plan first.");
              }
            }}
            disabled={!plans || plans.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            <FolderPlus size={14} /> Add Objective
          </button>
          {(actionLoading || isRefreshing) && (
            <Loader2 className="animate-spin text-[#1a3a32]" size={20} />
          )}
          <button
            onClick={() => handleOpenAssign()}
            disabled={isRefreshing}
            className="bg-[#1a3a32] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-[#1a3a32]/10 disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={3} /> Assign KPI
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Activity, objective, perspective, assignee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1a3a32]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a3a32]"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Assignee</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a3a32]"
              >
                <option value="ALL">All assignees</option>
                {Object.values(userMap).map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Reporting Cycle</label>
              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a3a32]"
              >
                {CYCLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-gray-500">Progress Range (%)</label>
              <span className="text-xs text-gray-500">{progressMin}% – {progressMax}%</span>
            </div>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={progressMin}
                onChange={(e) => setProgressMin(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={progressMax}
                onChange={(e) => setProgressMax(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1">
                <X size={12} /> Clear all filters
              </button>
            </div>
          </div>
        </div>
      )}

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
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeFilter === f.label
                ? "bg-white/20"
                : "bg-gray-100 text-gray-400"
            }`}>
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
                filteredData.flatMap((plan: IStrategicPlan) =>
                  (plan.objectives as IObjectiveWithIndicators[]).map((objective) => (
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
                      onEdit={setEditingIndicator}
                      onAddObjective={(planId, planPerspective) => 
                        handleOpenEditModal({ type: "add-objective", planId, planPerspective })
                      }
                      onEditObjective={(planId, objectiveId, currentTitle) =>
                        handleOpenEditModal({ type: "edit-objective", planId, objectiveId, currentTitle })
                      }
                      onAddActivity={(planId, objectiveId, objectiveTitle) =>
                        handleOpenEditModal({ type: "add-activity", planId, objectiveId, objectiveTitle })
                      }
                      onEditActivity={(planId, objectiveId, activityId, currentDescription) =>
                        handleOpenEditModal({ type: "edit-activity", planId, objectiveId, activityId, currentDescription })
                      }
                      activeFilter={activeFilter}
                      optimisticUnassignId={optimisticUnassignId}
                      optimisticAssignId={optimisticAssignId}
                    />
                  ))
                )
              ) : (
                <tr>
                  <td colSpan={9} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="text-gray-200" size={48} />
                      <p className="text-gray-400 font-medium italic">
                        No activities match the current filters.
                      </p>
                      <button onClick={resetFilters} className="mt-2 text-sm text-[#1a3a32] underline">
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign modal */}
      {isAssignModalOpen && (
        <SuperAdminAssign
          prefill={assignPrefill}
          onClose={handleCloseAssign}
        />
      )}

      {/* Edit reporting cycle modal */}
      {editingIndicator && (
        <SuperAdminEditIndicator
          indicator={editingIndicator}
          onClose={handleCloseEdit}
        />
      )}

      {/* Strategic Plan Edit Modal */}
      {editModalMode && (
        <StrategicPlanEditModal
          mode={editModalMode}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  );
};

export default SuperAdminIndicators;