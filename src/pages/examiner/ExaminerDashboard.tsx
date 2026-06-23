import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  Folder,
  FileText,
  Clock,
  ArrowUpRight,
} from "lucide-react";

import { fetchMyFolders } from "../../store/slices/examinerSlice";
import type { IMyFolder } from "../../store/slices/examinerSlice";
import type { AppDispatch, RootState } from "../../store/store";

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

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

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */

interface StatCardProps {
  label:  string;
  value:  number;
  icon:   React.ElementType;
  color:  string;
  bg:     string;
}

const StatCard = ({ label, value, icon: Icon, color, bg }: StatCardProps) => (
  <div className={`${bg} rounded-2xl border border-slate-200 p-6 shadow-sm`}>
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
  const totalIndicators = folder.completedIndicators.length;
  const pendingReview = folder.completedIndicators.filter(
    (i) => i.status === "Pending Review" || i.status === "Awaiting Admin Approval"
  ).length;
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

        <h4 className="text-[14px] font-bold text-[#1a2c2c] leading-snug group-hover:text-emerald-700 transition-colors mb-3">
          {folder.objectiveTitle}
        </h4>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-slate-400" />
            <span className="text-[13px] font-bold text-[#1d3331]">
              {totalIndicators}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Total</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-amber-500" />
            <span className="text-[13px] font-bold text-amber-600">
              {pendingReview}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Pending</span>
          </div>
        </div>
      </div>
    </Link>
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

  const pendingReviewCount = allIndicators.filter(
    (i) => i.status === "Pending Review" || i.status === "Awaiting Admin Approval"
  ).length;

  const overdueCount = allIndicators.filter(
    (i) =>
      i.deadline &&
      new Date(i.deadline) < new Date() &&
      i.status !== "Completed"
  ).length;

  /* ─── PERSPECTIVE SUMMARY ── */
  const perspectiveMap = new Map<string, { total: number; pending: number }>();
  myFolders.forEach((f) => {
    const existing = perspectiveMap.get(f.perspective) ?? {
      total: 0,
      pending: 0,
    };
    const indicators = f.completedIndicators;
    existing.total += indicators.length;
    existing.pending += indicators.filter(
      (i) => i.status === "Pending Review" || i.status === "Awaiting Admin Approval"
    ).length;
    perspectiveMap.set(f.perspective, existing);
  });

  const perspectiveSummary = Array.from(perspectiveMap.entries()).map(
    ([name, data]) => ({
      name,
      total: data.total,
      pending: data.pending,
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
          {totalFolders} folder{totalFolders !== 1 ? "s" : ""} assigned across{" "}
          {perspectiveMap.size} perspective{perspectiveMap.size !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Alert banner ── */}
      {overdueCount > 0 && (
        <div className="bg-[#fff9e6] border border-[#f5e6b3] rounded-lg p-3 mb-8 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600" />
          <p className="text-[12px] font-medium text-amber-900">
            <span className="font-bold">{overdueCount} indicator{overdueCount !== 1 ? "s" : ""}</span>{" "}
            {overdueCount !== 1 ? "are" : "is"} overdue for review.
          </p>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Folders"
          value={totalFolders}
          icon={Folder}
          color="#1d3331"
          bg="bg-white"
        />
        <StatCard
          label="Indicators"
          value={totalIndicators}
          icon={FileText}
          color="#185FA5"
          bg="bg-white"
        />
        <StatCard
          label="Pending Review"
          value={pendingReviewCount}
          icon={Clock}
          color="#BA7517"
          bg="bg-white"
        />
      </div>

      {/* ── Perspective breakdown ── */}
      {perspectiveSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
            Perspectives overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perspectiveSummary.map(({ name, total, pending }) => {
              const color = getPerspectiveColor(name);
              return (
                <div
                  key={name}
                  className="p-4 rounded-xl border border-slate-100"
                  style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                >
                  <p className="text-[12px] font-bold text-[#1a2c2c]">{name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600">{total}</span>
                      <span className="text-[10px] text-slate-400">Total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-amber-500" />
                      <span className="text-[11px] font-bold text-amber-600">{pending}</span>
                      <span className="text-[10px] text-slate-400">Pending</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── My folders ── */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-serif font-bold text-[#1d3331]">
            My folders
          </h3>
          <Link
            to="/examiner/folders"
            className="text-[10px] font-black border border-slate-200 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-[#1d3331] hover:text-white transition-colors flex items-center gap-2"
          >
            View all <ArrowUpRight size={12} />
          </Link>
        </div>

        {myFolders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
            <Folder size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-sm text-slate-500 font-medium">
              No folders assigned to you yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Your administrator will assign folders for review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myFolders.map((folder) => (
              <FolderCard key={folder.objectiveId} folder={folder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExaminerDashboard;