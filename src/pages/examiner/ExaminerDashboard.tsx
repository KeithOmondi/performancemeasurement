import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  Folder,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileText,
} from "lucide-react";

import { fetchMyFolders } from "../../store/slices/examinerSlice";
import type { IMyFolder, ICompletedIndicator } from "../../store/slices/examinerSlice";
import type { AppDispatch, RootState } from "../../store/store";

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

const formatDate = (dateString: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil(
    Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const getPerspectiveColor = (perspective: string): string => {
  const map: Record<string, string> = {
    "Core Business / Mandate": "#1d3331",
    "Customer Perspective":    "#185FA5",
    "Finance Perspective":     "#3B6D11",
    "Innovation & Learning":   "#BA7517",
    "Internal Process":        "#7C3B8C",
  };
  return map[perspective] ?? "#475569";
};

/* ─── DONUT CHART ─────────────────────────────────────────────────────────── */

interface DonutProps {
  completed: number;
  total:     number;
}

const DonutChart = ({ completed, total }: DonutProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const size = 120;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx     = size / 2;
    const cy     = size / 2;
    const radius = 46;
    const cutout = 30;

    const remaining = Math.max(0, total - completed);
    const pct = total > 0 ? completed / total : 0;

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f1f5f9";
    ctx.fill();

    // Completed arc
    if (pct > 0) {
      const endAngle = -Math.PI / 2 + pct * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, -Math.PI / 2, endAngle);
      ctx.closePath();
      ctx.fillStyle = "#3B6D11";
      ctx.fill();
    }

    // Remaining arc
    if (remaining > 0 && pct < 1) {
      const startAngle = -Math.PI / 2 + pct * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, -Math.PI / 2 + Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#cbd5e1";
      ctx.fill();
    }

    // Cutout
    ctx.beginPath();
    ctx.arc(cx, cy, cutout, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }, [completed, total]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Completion donut chart"
      style={{ width: 120, height: 120 }}
    />
  );
};

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */

interface StatCardProps {
  label:  string;
  value:  number;
  icon:   React.ElementType;
  color:  string;
  accent: string;
}

const StatCard = ({ label, value, icon: Icon, color, accent }: StatCardProps) => (
  <div
    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
    style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-4xl font-serif font-bold" style={{ color }}>
          {value}
        </p>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-2">
          {label}
        </p>
      </div>
      <Icon size={20} className="text-slate-300" />
    </div>
  </div>
);

/* ─── FOLDER CARD ────────────────────────────────────────────────────────── */

const FolderCard = ({ folder }: { folder: IMyFolder }) => {
  const total     = folder.completedIndicators.length;
  const completed = folder.completedIndicators.filter(
    (i) => i.status === "Completed"
  ).length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const perspectiveColor = getPerspectiveColor(folder.perspective);

  return (
    <Link
      to={`/examiner/folders/${folder.objectiveId}`}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden block"
    >
      {/* Perspective colour bar */}
      <div className="h-1 w-full" style={{ background: perspectiveColor }} />

      <div className="p-5">
        {/* Perspective tag */}
        <span
          className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-3 inline-block"
          style={{
            color:           perspectiveColor,
            background:      `${perspectiveColor}15`,
            border:          `1px solid ${perspectiveColor}30`,
          }}
        >
          {folder.perspective}
        </span>

        <h4 className="text-[13px] font-bold text-[#1a2c2c] leading-snug group-hover:text-emerald-700 transition-colors mb-4">
          {folder.objectiveTitle}
        </h4>

        <div className="flex items-center gap-4">
          <DonutChart completed={completed} total={total} />
          <div className="flex-1 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
              Progress
            </div>
            <div
              className="text-3xl font-serif font-bold"
              style={{ color: pct === 100 ? "#3B6D11" : "#1d3331" }}
            >
              {pct}%
            </div>
            <div className="text-[10px] text-slate-400">
              {completed} / {total} indicators completed
            </div>
            <div className="text-[9px] text-slate-400 uppercase tracking-tighter">
              Assigned {formatDate(folder.assignedAt)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:      `${pct}%`,
              background: pct === 100 ? "#3B6D11" : perspectiveColor,
            }}
          />
        </div>
      </div>
    </Link>
  );
};

/* ─── RECENT INDICATORS TABLE ─────────────────────────────────────────────── */

const RecentIndicators = ({ folders }: { folders: IMyFolder[] }) => {
  const all: (ICompletedIndicator & { perspective: string })[] = folders.flatMap(
    (f) =>
      f.completedIndicators.map((i) => ({ ...i, perspective: f.perspective }))
  );

  // Sort by most recently updated
  const recent = [...all]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 6);

  if (recent.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
        <FileText size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">No indicators in your folders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recent.map((ind) => {
        const isCompleted = ind.status === "Completed";
        const isOverdue =
          ind.deadline && new Date(ind.deadline) < new Date() && !isCompleted;

        return (
          <div
            key={ind.id}
            className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all"
          >
            <div className="flex gap-4 flex-1">
              <div
                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isOverdue
                    ? "bg-red-500"
                    : "bg-amber-400"
                }`}
              />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-slate-700 leading-snug">
                  {ind.activityDescription}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {ind.objectiveTitle}
                </p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  <span
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{
                      color:      getPerspectiveColor(ind.perspective),
                      background: `${getPerspectiveColor(ind.perspective)}15`,
                    }}
                  >
                    {ind.perspective}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                    {isCompleted ? "Completed" : isOverdue ? "Overdue" : "In progress"}
                  </span>
                  {ind.deadline && (
                    <span
                      className={`text-[10px] font-bold ${
                        isOverdue ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      Due {formatDate(ind.deadline)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="ml-4 flex-shrink-0 text-right">
              <div
                className={`text-[11px] font-bold ${
                  isCompleted ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {ind.progress}%
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[100px]">
                {ind.assigneeDisplayName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

const ExaminerDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { myFolders, loading, error } = useSelector(
    (s: RootState) => s.examiner
  );

  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    dispatch(fetchMyFolders());
  }, [dispatch]);

  /* ─── LOADING ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center flex-col">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
          Loading your folders...
        </p>
      </div>
    );
  }

  /* ─── ERROR ── */
  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center flex-col gap-3">
        <AlertCircle className="text-red-500" size={36} />
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  /* ─── DERIVED STATS ── */
  const totalFolders = myFolders.length;

  const allIndicators = myFolders.flatMap((f) => f.completedIndicators);
  const totalIndicators = allIndicators.length;

  const completedCount = allIndicators.filter(
    (i) => i.status === "Completed"
  ).length;

  const overdueCount = allIndicators.filter(
    (i) =>
      i.deadline &&
      new Date(i.deadline) < new Date() &&
      i.status !== "Completed"
  ).length;

  const inProgressCount = totalIndicators - completedCount - overdueCount;

  const overallPct =
    totalIndicators > 0
      ? Math.round((completedCount / totalIndicators) * 100)
      : 0;

  /* ─── PERSPECTIVE SUMMARY ── */
  const perspectiveMap = new Map<string, { total: number; completed: number }>();
  myFolders.forEach((f) => {
    const existing = perspectiveMap.get(f.perspective) ?? {
      total: 0,
      completed: 0,
    };
    existing.total     += f.completedIndicators.length;
    existing.completed += f.completedIndicators.filter(
      (i) => i.status === "Completed"
    ).length;
    perspectiveMap.set(f.perspective, existing);
  });

  const perspectiveSummary = Array.from(perspectiveMap.entries()).map(
    ([name, data]) => ({
      name,
      total:     data.total,
      completed: data.completed,
      pct:
        data.total > 0
          ? Math.round((data.completed / data.total) * 100)
          : 0,
    })
  );

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">

      {/* ── Page header ── */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
          Examiner Portal
        </p>
        <h1 className="text-2xl font-serif font-bold text-[#1d3331]">
          Welcome back, {user?.name?.split(" ")[0] ?? "Examiner"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          You have {totalFolders} folder{totalFolders !== 1 ? "s" : ""} assigned
          across {perspectiveMap.size} perspective{perspectiveMap.size !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* ── Alert banner ── */}
      {overdueCount > 0 && (
        <div className="bg-[#fff9e6] border border-[#f5e6b3] rounded-lg p-3 mb-8 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600" />
          <p className="text-[12px] font-medium text-amber-900">
            <span className="font-bold">{overdueCount} indicator{overdueCount !== 1 ? "s" : ""}</span>{" "}
            in your folders {overdueCount !== 1 ? "are" : "is"} overdue.
          </p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Folders assigned"
          value={totalFolders}
          icon={Folder}
          color="#1d3331"
          accent="#1d3331"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          color="#3B6D11"
          accent="#3B6D11"
        />
        <StatCard
          label="In progress"
          value={inProgressCount}
          icon={Clock}
          color="#185FA5"
          accent="#185FA5"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertCircle}
          color="#E24B4A"
          accent="#E24B4A"
        />
      </div>

      {/* ── Overall progress bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Overall completion
          </h3>
          <span className="text-2xl font-serif font-bold text-[#1d3331]">
            {overallPct}%
          </span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:      `${overallPct}%`,
              background: overallPct === 100 ? "#3B6D11" : "#1d3331",
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-2">
          <span>{completedCount} completed</span>
          <span>{totalIndicators - completedCount} remaining</span>
        </div>

        {/* Per-perspective breakdown */}
        {perspectiveSummary.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            {perspectiveSummary.map(({ name, total, completed, pct }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 w-44 flex-shrink-0 truncate">
                  {name}
                </span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width:      `${pct}%`,
                      background: getPerspectiveColor(name),
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold w-8 text-right flex-shrink-0"
                  style={{ color: getPerspectiveColor(name) }}
                >
                  {pct}%
                </span>
                <span className="text-[10px] text-slate-400 w-16 text-right flex-shrink-0">
                  {completed}/{total}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Folders grid + recent indicators ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

        {/* Recent indicators */}
        <div className="lg:col-span-7">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-bold text-[#1d3331]">
              Recent indicators
            </h3>
            <Link
              to="/examiner/review"
              className="text-[10px] font-black bg-[#1d3331] text-white px-4 py-2 rounded uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-800 transition-colors"
            >
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <RecentIndicators folders={myFolders} />
        </div>

        {/* My folders */}
        <div className="lg:col-span-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-bold text-[#1d3331]">
              My folders
            </h3>
            <Link
              to="/examiner/folders"
              className="text-[10px] font-black border border-slate-200 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-[#1d3331] hover:text-white transition-colors"
            >
              All folders →
            </Link>
          </div>

          {myFolders.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <Folder size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                No folders assigned to you yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myFolders.slice(0, 4).map((folder) => (
                <FolderCard key={folder.objectiveId} folder={folder} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExaminerDashboard;