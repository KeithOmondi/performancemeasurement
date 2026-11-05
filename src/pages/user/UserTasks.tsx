import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useNavigate } from "react-router-dom";
import { fetchMyAssignments } from "../../store/slices/userIndicatorSlice";
import { fetchTeams } from "../../store/slices/teamSlice";
import {
  ArrowUpRight, AlertCircle, CheckCircle2, PlayCircle,
  ShieldCheck, Clock, Activity, Loader2,
  RotateCcw, Users, User, FileText, Search, UserCheck,
  ChevronDown, FilterX,
} from "lucide-react";
import type { IIndicatorUI, ISubmissionUI } from "../../store/slices/userIndicatorSlice";

// Extra fields the backend sends with each task
interface ITask extends IIndicatorUI {
  active_quarter?: number;
  teamName?: string | null;
  perspectiveRank?: number | null;
  objectiveOrder?: number | null;
  activityOrder?: number | null;
}

/* ─── HELPERS ────────────────────────────────────────────────────────── */

/** Map quarter number (1-4) to "Q1".."Q4", return "Annual" for reporting_cycle = Annual */
const getQuarterPrefix = (
  reportingCycle: string | undefined,
  quarterNum: number | undefined
): string => {
  if (reportingCycle === "Annual") return "Annual";
  const q = quarterNum ?? new Date().getMonth() / 3 + 1;
  return `Q${Math.floor(q)}`;
};

/**
 * Finds the latest submission for the indicator's active quarter.
 * Backend stores submissions keyed as "Q1_2025", "Annual_2025", etc.
 */
const getActiveQuarterSub = (indicator: ITask): ISubmissionUI | undefined => {
  if (!indicator.submissions) return undefined;
  const prefix = getQuarterPrefix(
    indicator.reporting_cycle,
    indicator.active_quarter ?? indicator.currentQuarter
  );
  const matchingKey = Object.keys(indicator.submissions).find((k) => k.startsWith(prefix));
  return matchingKey ? indicator.submissions[matchingKey][0] : undefined;
};

const PERSPECTIVE_LETTERS = ["A", "B", "C", "D", "E"];
const perspectiveLetter = (rank?: number | null) =>
  rank && rank >= 1 && rank <= 5 ? PERSPECTIVE_LETTERS[rank - 1] : "";
const activityLetter = (order?: number | null) =>
  order === null || order === undefined ? "" : String.fromCharCode(97 + Number(order));

/** PMMU reference as used in the signed document, e.g. "A.5(e)" */
const pmmuCode = (t: ITask) => {
  const p = perspectiveLetter(t.perspectiveRank);
  if (!p || !t.objectiveOrder) return "";
  const a = activityLetter(t.activityOrder);
  return `${p}.${t.objectiveOrder}${a ? `(${a})` : ""}`;
};

type StatusKey = "filing" | "audit" | "certification" | "revision" | "certified";

const statusKeyOf = (status?: string): StatusKey => {
  switch (status) {
    case "Awaiting Admin Approval": return "audit";
    case "Awaiting Super Admin":
    case "Partially Approved": return "certification";
    case "Rejected by Admin":
    case "Rejected by Super Admin":
    case "Correction Needed": return "revision";
    case "Completed": return "certified";
    default: return "filing";
  }
};

const STATUS_OPTIONS: { value: "open" | "all" | StatusKey; label: string }[] = [
  { value: "open", label: "All open (not certified)" },
  { value: "filing", label: "Filing open" },
  { value: "audit", label: "Registry audit" },
  { value: "certification", label: "Final certification" },
  { value: "revision", label: "Revision required" },
  { value: "certified", label: "Certified" },
  { value: "all", label: "Everything (incl. certified)" },
];

const getLifecycleConfig = (status: string, activeQuarter: number, cycle: "Quarterly" | "Annual") => {
  const periodLabel = cycle === "Annual" ? "Annual" : `Q${activeQuarter || 1}`;
  switch (statusKeyOf(status)) {
    case "audit":
      return { label: "Registry Audit", bg: "bg-amber-50 text-amber-700 border-amber-100", icon: <Clock size={12} /> };
    case "certification":
      return { label: "Final Certification", bg: "bg-blue-50 text-blue-700 border-blue-100", icon: <ShieldCheck size={12} /> };
    case "revision":
      return { label: "Revision Required", bg: "bg-rose-50 text-rose-700 border-rose-100", icon: <AlertCircle size={12} /> };
    case "certified":
      return { label: "Certified", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <CheckCircle2 size={12} /> };
    default:
      return { label: `${periodLabel} Filing Open`, bg: "bg-slate-50 text-slate-500 border-slate-200", icon: <PlayCircle size={12} /> };
  }
};

const selectClass =
  "w-full appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 text-[11px] font-bold text-[#1a3a32] outline-none focus:border-[#1a3a32] cursor-pointer";

/* ─── COMPONENT ──────────────────────────────────────────────────────── */

const UserTasks = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { myIndicators, loading: assignmentsLoading } = useAppSelector((state) => state.userIndicators);
  const { teams } = useAppSelector((state) => state.teams);
  const { user } = useAppSelector((state) => state.auth);

  // Evidence uploader (selected by super admin) receives every indicator
  const isUploader = !!user?.canUploadForAll;

  /* Filters */
  const [search, setSearch] = useState("");
  const [perspectiveFilter, setPerspectiveFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("open");
  const [cycleFilter, setCycleFilter] = useState<"all" | "Quarterly" | "Annual">("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "User" | "Team">("all");
  const [scope, setScope] = useState<"all" | "mine" | "others">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    dispatch(fetchMyAssignments());
    dispatch(fetchTeams());
  }, [dispatch]);

  const tasks = myIndicators as ITask[];

  const teamNameOf = (t: ITask) =>
    t.teamName || teams.find((tm) => tm.id === t.assignee_id)?.name || "System Team";

  const assigneeLabel = (t: ITask) =>
    t.assignee_model === "Team"
      ? teamNameOf(t)
      : t.isOwn === false
        ? t.assigneeName || "Officer"
        : "Personal";

  // Perspectives present, in PMMU order
  const perspectives = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of tasks) if (t.perspective && !seen.has(t.perspective)) seen.set(t.perspective, t.perspectiveRank ?? 9);
    return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([name, rank]) => ({ name, rank }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const key = statusKeyOf(t.status);
      if (statusFilter === "open" && key === "certified") return false;
      if (statusFilter !== "open" && statusFilter !== "all" && key !== statusFilter) return false;
      if (perspectiveFilter !== "all" && t.perspective !== perspectiveFilter) return false;
      if (cycleFilter !== "all" && t.reporting_cycle !== cycleFilter) return false;
      if (assignmentFilter !== "all" && t.assignee_model !== assignmentFilter) return false;
      if (isUploader && scope === "mine" && t.isOwn === false) return false;
      if (isUploader && scope === "others" && t.isOwn !== false) return false;
      if (!term) return true;

      // "Search everything": every field a person might remember about a task
      const sub = getActiveQuarterSub(t);
      const haystack = [
        pmmuCode(t),
        t.perspective,
        t.objective?.title,
        t.activity?.description,
        t.assigneeName,
        t.assignee_model === "Team" ? teamNameOf(t) : "",
        t.assignedByName,
        t.status,
        getLifecycleConfig(t.status || "Pending", t.active_quarter ?? 1, t.reporting_cycle as "Quarterly" | "Annual").label,
        t.reporting_cycle,
        getQuarterPrefix(t.reporting_cycle, t.active_quarter),
        t.unit,
        String(t.id),
        ...(sub?.documents ?? []).map((d) => d.fileName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return term.split(/\s+/).every((word) => haystack.includes(word));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, teams, search, statusFilter, perspectiveFilter, cycleFilter, assignmentFilter, scope, isUploader]);

  // perspective → objective → tasks, preserving the server's PMMU order
  const grouped = useMemo(() => {
    const out: {
      perspective: string;
      rank: number;
      objectives: { key: string; title: string; order: number | null; tasks: ITask[] }[];
      count: number;
    }[] = [];
    for (const t of filteredTasks) {
      const pName = t.perspective || "Unassigned perspective";
      let p = out.find((g) => g.perspective === pName);
      if (!p) { p = { perspective: pName, rank: t.perspectiveRank ?? 9, objectives: [], count: 0 }; out.push(p); }
      const oKey = `${t.objectiveOrder ?? "x"}|${t.objective?.title ?? ""}`;
      let o = p.objectives.find((g) => g.key === oKey);
      if (!o) { o = { key: oKey, title: t.objective?.title || "Strategic Objective", order: t.objectiveOrder ?? null, tasks: [] }; p.objectives.push(o); }
      o.tasks.push(t);
      p.count++;
    }
    return out.sort((a, b) => a.rank - b.rank);
  }, [filteredTasks]);

  const teamCount = filteredTasks.filter((i) => i.assignee_model === "Team").length;
  const individualCount = filteredTasks.length - teamCount;

  const filtersActive =
    !!search || perspectiveFilter !== "all" || statusFilter !== "open" ||
    cycleFilter !== "all" || assignmentFilter !== "all" || scope !== "all";

  const clearFilters = () => {
    setSearch(""); setPerspectiveFilter("all"); setStatusFilter("open");
    setCycleFilter("all"); setAssignmentFilter("all"); setScope("all");
  };

  if (assignmentsLoading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa] space-y-6">
        <div className="relative">
          <Loader2 className="w-14 h-14 animate-spin text-[#1a3a32]" />
          <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#c2a336]" size={16} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8c94a4]">Syncing Judicial Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 md:p-10 lg:p-14 text-[#1a3a32]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-200 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#c2a336] text-[10px] font-black uppercase tracking-[0.3em]">
              <Activity size={16} /> Strategic Performance Unit
            </div>
            <h1 className="text-2xl font-black font-serif tracking-tighter leading-tight">
              Active{" "}
              <span className="text-gray-300 font-serif font-light italic">Assignments</span>
            </h1>
          </div>

          <div className="bg-[#1a3a32] text-white p-6 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={60} /></div>
            <div className="relative z-10">
              <p className="text-[#c2a336] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Showing</p>
              <p className="text-4xl font-black leading-none tracking-tighter">
                {filteredTasks.length.toString().padStart(2, "0")}
              </p>
            </div>
            <div className="h-10 w-[1px] bg-white/10 relative z-10" />
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2">
                <User size={11} className="text-white/50" />
                <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest">{individualCount} Individual</span>
              </div>
              {teamCount > 0 && (
                <div className="flex items-center gap-2">
                  <Users size={11} className="text-[#c2a336]" />
                  <span className="text-[9px] text-[#c2a336] font-bold uppercase tracking-widest">{teamCount} Team</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {isUploader && (
          <div className="mb-4 flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 text-violet-800">
            <UserCheck size={18} className="shrink-0" />
            <p className="text-[11px] font-bold">
              You are the <span className="font-black">evidence uploader</span> — you can upload evidence on every
              indicator, including other officers&apos;.
            </p>
          </div>
        )}

        {/* ── Search & filters ── */}
        <div className="mb-6 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search everything — PMMU code (e.g. A.5(e)), objective, activity, officer, team, status, quarter, document name…"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-[12px] font-medium outline-none focus:border-[#1a3a32] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <select value={perspectiveFilter} onChange={(e) => setPerspectiveFilter(e.target.value)} className={selectClass}>
                <option value="all">All perspectives</option>
                {perspectives.map((p) => (
                  <option key={p.name} value={p.name}>
                    {perspectiveLetter(p.rank) ? `${perspectiveLetter(p.rank)}. ` : ""}{p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={selectClass}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={cycleFilter} onChange={(e) => setCycleFilter(e.target.value as typeof cycleFilter)} className={selectClass}>
                <option value="all">All cycles</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value as typeof assignmentFilter)} className={selectClass}>
                <option value="all">Individual &amp; team</option>
                <option value="User">Individual only</option>
                <option value="Team">Team only</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {isUploader ? (
              <div className="flex bg-gray-50 rounded-xl border border-gray-100 p-1">
                {([["all", "All"], ["mine", "Mine"], ["others", "Others'"]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setScope(key)}
                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                      scope === key ? "bg-[#1a3a32] text-white" : "text-gray-400 hover:text-[#1a3a32]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : <span />}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500"
              >
                <FilterX size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Grouped by perspective → objective, in PMMU order ── */}
        {grouped.length === 0 ? (
          <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm py-32 flex flex-col items-center justify-center text-gray-300">
            <Activity size={48} className="opacity-10 mb-6" />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-2 text-gray-400">
              {filtersActive ? "No matches" : "Registry Clear"}
            </h3>
            <p className="text-[9px] font-bold uppercase text-gray-400 text-center max-w-xs">
              {filtersActive ? "No indicators match these filters." : "All assigned indicators finalized."}
            </p>
            {filtersActive && (
              <button onClick={clearFilters} className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#1a3a32] underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((p) => {
              const letter = perspectiveLetter(p.rank);
              const isCollapsed = collapsed[p.perspective];
              return (
                <section key={p.perspective} className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [p.perspective]: !c[p.perspective] }))}
                    className="w-full flex items-center justify-between gap-4 px-8 py-5 bg-[#1a3a32] text-white text-left"
                  >
                    <div className="flex items-center gap-4">
                      {letter && (
                        <span className="w-9 h-9 rounded-xl bg-[#c2a336] text-[#1a3a32] flex items-center justify-center font-black text-sm">
                          {letter}
                        </span>
                      )}
                      <div>
                        <p className="text-[12px] font-black uppercase tracking-widest">{p.perspective}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mt-0.5">
                          {p.objectives.length} objective{p.objectives.length !== 1 ? "s" : ""} · {p.count} indicator{p.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            {["Activity", "Assignment", "Cycle", "Registry Status", "Achievement", "Action"].map((h) => (
                              <th
                                key={h}
                                className={`px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest ${h === "Action" ? "text-right" : "text-left"} ${h === "Activity" ? "pl-8" : ""}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        {p.objectives.map((o) => (
                          <tbody key={o.key} className="divide-y divide-gray-50">
                            {/* Objective heading */}
                            <tr className="bg-[#fbfaf5]">
                              <td colSpan={6} className="px-8 py-3 border-y border-gray-100">
                                <p className="text-[11px] font-black text-[#1a3a32]">
                                  {o.order ? <span className="text-[#c2a336] mr-2">{letter}.{o.order}</span> : null}
                                  {o.title}
                                </p>
                              </td>
                            </tr>

                            {o.tasks.map((indicator) => {
                              const currentQuarterSub = getActiveQuarterSub(indicator);
                              const achieved = currentQuarterSub?.achievedValue ?? 0;
                              const calculatedProgress =
                                indicator.target && indicator.target > 0 ? (achieved / indicator.target) * 100 : 0;
                              const lifecycle = getLifecycleConfig(
                                indicator.status || "Pending",
                                indicator.active_quarter ?? 1,
                                indicator.reporting_cycle as "Quarterly" | "Annual",
                              );
                              const isFlagged = statusKeyOf(indicator.status) === "revision";
                              const isUnderReview = ["audit", "certification"].includes(statusKeyOf(indicator.status));
                              const code = pmmuCode(indicator);

                              return (
                                <tr
                                  key={indicator.id}
                                  className="group hover:bg-emerald-50/30 transition-all cursor-pointer"
                                  onClick={() => navigate(`/user/assignments/${indicator.id}`)}
                                >
                                  <td className="pl-8 pr-6 py-5">
                                    <div className="flex gap-3 max-w-md">
                                      {code && (
                                        <span className="shrink-0 h-fit px-2 py-1 rounded-md bg-[#1a3a32]/5 text-[#1a3a32] text-[9px] font-black tracking-wider">
                                          {code}
                                        </span>
                                      )}
                                      <div>
                                        <p className="text-[12px] font-bold leading-snug">
                                          {indicator.activity?.description || "Activity"}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {currentQuarterSub?.documents?.slice(0, 2).map((doc, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">
                                              <FileText size={10} className="text-gray-400" />
                                              <span className="text-[8px] font-bold text-gray-500 truncate max-w-[120px]">
                                                {doc.fileName || doc.evidenceUrl?.split("/").pop() || "UNTITLED_EVIDENCE"}
                                              </span>
                                            </div>
                                          ))}
                                          {(currentQuarterSub?.documents?.length ?? 0) > 2 && (
                                            <span className="text-[8px] font-black text-[#c2a336] self-center">
                                              +{(currentQuarterSub?.documents?.length ?? 0) - 2} MORE
                                            </span>
                                          )}
                                          {isFlagged && (
                                            <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-rose-100">
                                              <RotateCcw size={10} /> Revision Required
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-6 py-5">
                                    <div
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                        indicator.assignee_model === "Team"
                                          ? "bg-violet-50 text-violet-700 border border-violet-100"
                                          : "bg-slate-50 text-slate-500 border border-slate-200"
                                      }`}
                                    >
                                      {indicator.assignee_model === "Team" ? <Users size={10} /> : <User size={10} />}
                                      {assigneeLabel(indicator)}
                                    </div>
                                    {indicator.isOwn === false && (
                                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-violet-500">
                                        Uploading on behalf
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-6 py-5">
                                    <span
                                      className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border ${
                                        indicator.reporting_cycle === "Annual"
                                          ? "bg-blue-50 text-blue-600 border-blue-100"
                                          : "bg-gray-100 text-gray-500 border-gray-200"
                                      }`}
                                    >
                                      {indicator.reporting_cycle}
                                    </span>
                                  </td>

                                  <td className="px-6 py-5">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest ${lifecycle.bg}`}>
                                      {lifecycle.icon} {lifecycle.label}
                                    </div>
                                  </td>

                                  <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                        <div
                                          className={`h-full transition-all duration-700 ${isFlagged ? "bg-rose-500" : "bg-[#1a3a32]"}`}
                                          style={{ width: `${Math.min(calculatedProgress, 100)}%` }}
                                        />
                                      </div>
                                      <div className="flex flex-col min-w-[40px]">
                                        <span className="text-[10px] font-black tabular-nums">{Math.round(calculatedProgress)}%</span>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                          {achieved}/{indicator.target} {indicator.unit}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-8 py-5 text-right">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/user/assignments/${indicator.id}`);
                                      }}
                                      className="bg-white text-[#1a3a32] border border-gray-200 p-3 rounded-xl transition-all inline-flex items-center gap-3 hover:bg-[#1a3a32] hover:text-white hover:border-[#1a3a32]"
                                    >
                                      <span className="text-[10px] font-black uppercase tracking-widest">
                                        {isUnderReview ? "Audit Mode" : isFlagged ? "Resolve" : "View"}
                                      </span>
                                      <ArrowUpRight size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        ))}
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTasks;
