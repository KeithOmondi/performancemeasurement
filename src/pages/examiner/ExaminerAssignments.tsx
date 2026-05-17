import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, Folder, Search, ShieldCheck,
  AlertCircle, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchMyFolders } from "../../store/slices/examinerSlice";
import type { IMyFolder, ICompletedIndicator } from "../../store/slices/examinerSlice";

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

const formatDate = (dateString: string): string => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/* ─── INDICATOR ROW ──────────────────────────────────────────────────────── */

const IndicatorRow = ({ indicator }: { indicator: ICompletedIndicator }) => {
  const isOverdue =
    indicator.deadline &&
    new Date(indicator.deadline) < new Date() &&
    indicator.status !== "Completed";

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
          <ShieldCheck size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#1a2c2c] truncate">
            {indicator.activityDescription}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium">
              {indicator.assigneeDisplayName}
            </span>
            {indicator.deadline && (
              <span
                className={`text-[10px] font-bold ${
                  isOverdue ? "text-red-500" : "text-slate-400"
                }`}
              >
                Due {formatDate(indicator.deadline)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <span className="text-[13px] font-bold text-emerald-700">
          {indicator.progress}%
        </span>
        <span className="text-[8px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wider border border-emerald-100">
          Completed
        </span>
        <Link
          to={`/examiner/review/${indicator.id}`}
          className="px-3 py-1.5 bg-[#1d3331] text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-800 transition-colors"
        >
          Review
        </Link>
      </div>
    </div>
  );
};

/* ─── FOLDER CARD ────────────────────────────────────────────────────────── */

interface FolderCardProps {
  folder:   IMyFolder;
  expanded: boolean;
  onToggle: () => void;
}

const FolderCard = ({ folder, expanded, onToggle }: FolderCardProps) => {
  const total = folder.completedIndicators.length;
  const color = getPerspectiveColor(folder.perspective);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
        expanded ? "border-emerald-200 shadow-md" : "border-slate-100 shadow-sm"
      }`}
    >
      {/* Perspective colour bar */}
      <div className="h-1 w-full" style={{ background: color }} />

      {/* Header */}
      <div
        onClick={onToggle}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-2xl flex-shrink-0"
            style={{ background: `${color}15`, color }}
          >
            {total > 0 ? <ShieldCheck size={20} /> : <Folder size={20} />}
          </div>
          <div>
            <h3 className="text-[13px] font-black text-[#1d3331] uppercase tracking-tight">
              {folder.objectiveTitle}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span
                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  color,
                  background: `${color}15`,
                  border:     `1px solid ${color}30`,
                }}
              >
                {folder.perspective}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {total} completed indicator{total !== 1 ? "s" : ""}
              </span>
              <span className="text-[10px] text-slate-400">
                · Assigned {formatDate(folder.assignedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className={`transition-colors ${expanded ? "text-emerald-600" : "text-slate-300"}`}>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded indicators */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-50 pt-4">
          {total === 0 ? (
            <div className="py-8 text-center">
              <FileText size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-[11px] text-slate-400 font-medium">
                No completed indicators in this folder yet.
              </p>
            </div>
          ) : (
            folder.completedIndicators.map((ind) => (
              <IndicatorRow key={ind.id} indicator={ind} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */

const ExaminerAssignments = () => {
  const dispatch = useAppDispatch();

  const { myFolders, loading, error } = useAppSelector((s) => s.examiner);

  const [search,            setSearch]            = useState("");
  const [filterPerspective, setFilterPerspective] = useState("All");

  /* ── Manual toggle overrides per folder.
        No setState in effects — auto-expand is derived below. ── */
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({});

  const toggleFolder = (id: string) =>
    setManualToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ── If the user hasn't touched a folder, auto-expand when only one exists ── */
  const isExpanded = (id: string): boolean => {
    if (id in manualToggles) return manualToggles[id];
    return myFolders.length === 1;
  };

  /* ── Fetch ── */
  useEffect(() => {
    dispatch(fetchMyFolders());
  }, [dispatch]);

  /* ── Perspective filter list ── */
  const perspectives = useMemo(() => {
    const set = new Set(myFolders.map((f) => f.perspective));
    return ["All", ...Array.from(set).sort()];
  }, [myFolders]);

  /* ── Filtered folders ── */
  const filtered = useMemo(() => {
    return myFolders.filter((f) => {
      const matchPerspective =
        filterPerspective === "All" || f.perspective === filterPerspective;
      const matchSearch =
        f.objectiveTitle.toLowerCase().includes(search.toLowerCase());
      return matchPerspective && matchSearch;
    });
  }, [myFolders, filterPerspective, search]);

  /* ── Summary counts ── */
  const totalIndicators = myFolders.reduce(
    (acc, f) => acc + f.completedIndicators.length,
    0
  );

  /* ─── LOADING ── */
  if (loading && myFolders.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={36} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading your folders...
        </p>
      </div>
    );
  }

  /* ─── ERROR ── */
  if (error) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center gap-3">
        <AlertCircle className="text-red-500" size={36} />
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  /* ─── RENDER ─────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-[#1d3331] p-2 rounded-lg shadow-lg shadow-[#1d3331]/20">
            <Folder className="text-[#c2a336]" size={20} />
          </div>
          <h1 className="text-2xl font-black font-serif text-[#1d3331] uppercase tracking-tight">
            Assigned Folders
          </h1>
        </div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-12">
          Objective folders assigned to you for examination
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-3xl font-serif font-bold text-[#1d3331]">
            {myFolders.length}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
            Folders assigned
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-3xl font-serif font-bold text-emerald-700">
            {totalIndicators}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
            Completed indicators
          </p>
        </div>
      </div>

      {/* No folders state */}
      {myFolders.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
          <Folder size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            No folders assigned yet
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            Your administrator will assign folders to you.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex flex-wrap gap-1 flex-1">
              {perspectives.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPerspective(p)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                    filterPerspective === p
                      ? "bg-[#1d3331] text-white shadow-sm"
                      : "text-slate-400 hover:text-[#1d3331]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                size={14}
              />
              <input
                type="text"
                placeholder="Search folders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-[12px] font-medium outline-none border border-slate-100 focus:border-[#1d3331] transition-colors"
              />
            </div>
          </div>

          {/* Folder list */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-100">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                  No folders match your search.
                </p>
              </div>
            ) : (
              filtered.map((folder) => (
                <FolderCard
                  key={folder.objectiveId}
                  folder={folder}
                  expanded={isExpanded(folder.objectiveId)}
                  onToggle={() => toggleFolder(folder.objectiveId)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExaminerAssignments;