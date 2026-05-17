import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchArchivedYears,
  fetchArchiveByYear,
  fetchArchivePreview,
  runYearArchive,
  clearArchiveDetail,
  clearPreview,
  type IArchivedYear,
  type IArchivedIndicator,
} from "../../store/slices/archiveslice";
import { shallowEqual } from "react-redux";
import toast from "react-hot-toast";
import {
  Archive,
  ArchiveX,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  RefreshCw,
  Eye,
  X,
  TrendingUp,
} from "lucide-react";

/* ─── CONSTANTS ───────────────────────────────────────────────────────────── */

const PERSPECTIVES = [
  "All",
  "CORE BUSINESS",
  "CUSTOMER PERSPECTIVE",
  "FINANCIAL",
  "INNOVATION",
  "INTERNAL PROCESS",
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Completed:                 { label: "Completed",          color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  Pending:                   { label: "Pending",            color: "text-amber-600 bg-amber-50 border-amber-100" },
  "Awaiting Admin Approval": { label: "Awaiting Review",    color: "text-blue-600 bg-blue-50 border-blue-100" },
  "Awaiting Super Admin":    { label: "Awaiting Super Admin", color: "text-purple-600 bg-purple-50 border-purple-100" },
  "Rejected by Admin":       { label: "Rejected",           color: "text-rose-600 bg-rose-50 border-rose-100" },
  "Rejected by Super Admin": { label: "Rejected",           color: "text-rose-600 bg-rose-50 border-rose-100" },
};

/* ─── STAT CARD ───────────────────────────────────────────────────────────── */

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent = "text-[#1a3a32]",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
}) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <Icon size={16} className={accent} />
    </div>
    <span className="text-2xl font-serif font-bold text-[#1a3a32]">{value}</span>
  </div>
);

/* ─── ARCHIVE DETAIL PANEL ────────────────────────────────────────────────── */

const ArchiveDetailPanel = ({
  year,
  onClose,
}: {
  year: number;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const { archiveDetail, detailLoading } = useAppSelector(
    (s) => s.archive,
    shallowEqual,
  );
  const [perspective, setPerspective] = useState("All");

  useEffect(() => {
    dispatch(clearArchiveDetail());
    dispatch(
      fetchArchiveByYear({
        year,
        perspective: perspective === "All" ? undefined : perspective,
      }),
    );
  }, [dispatch, year, perspective]);

  const grouped = useMemo(() => {
    const map: Record<string, IArchivedIndicator[]> = {};
    archiveDetail.forEach((ind) => {
      const key = ind.perspective || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(ind);
    });
    return map;
  }, [archiveDetail]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end">
      <div className="h-full w-full max-w-3xl bg-[#fcfdfb] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#1a3a32]">
              {year} Archive
            </h2>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {archiveDetail.length} indicators archived
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Perspective filter */}
        <div className="flex overflow-x-auto gap-2 px-8 py-3 border-b border-gray-50 no-scrollbar">
          {PERSPECTIVES.map((p) => (
            <button
              key={p}
              onClick={() => setPerspective(p)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap border transition-all ${
                perspective === p
                  ? "bg-[#1a3a32] text-white border-[#1a3a32]"
                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="animate-spin text-[#1a3a32]" size={32} />
              <p className="text-sm text-gray-400">Loading archive data…</p>
            </div>
          ) : archiveDetail.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <ArchiveX className="text-gray-200" size={48} />
              <p className="text-sm text-gray-400 italic">
                No records found for this filter.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([persp, indicators]) => (
              <div key={persp}>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-3">
                  {persp}
                </h3>
                <div className="space-y-2">
                  {indicators.map((ind) => {
                    const statusCfg = STATUS_CONFIG[ind.status] ?? {
                      label: ind.status,
                      color: "text-gray-600 bg-gray-50 border-gray-100",
                    };
                    const completionPct =
                      ind.target > 0
                        ? Math.min(100, Math.round((ind.finalAchieved / ind.target) * 100))
                        : 0;

                    return (
                      <div
                        key={ind.id}
                        className="bg-white border border-gray-100 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <p className="text-[11px] text-gray-400 font-medium mb-0.5">
                              {ind.objectiveTitle}
                            </p>
                            <p className="text-[13px] font-medium text-gray-700 leading-relaxed italic">
                              {ind.activityDescription}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-gray-500">
                          <span>
                            <span className="font-bold text-[#1a3a32]">
                              {ind.finalAchieved}
                            </span>
                            /{ind.target} {ind.unit}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>Wt. {ind.weight}</span>
                          {ind.assigneeName && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span>{ind.assigneeName}</span>
                            </>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                completionPct >= 100
                                  ? "bg-emerald-500"
                                  : completionPct >= 50
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                              }`}
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 w-8 text-right">
                            {completionPct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── PREVIEW MODAL ───────────────────────────────────────────────────────── */

const PreviewModal = ({
  year,
  onClose,
  onConfirm,
  archiving,
}: {
  year: number;
  onClose: () => void;
  onConfirm: () => void;
  archiving: boolean;
}) => {
  const { preview, loading } = useAppSelector((s) => s.archive, shallowEqual);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif font-bold text-[#1a3a32]">
            Archive {year} — Preview
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-400 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading || !preview ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="animate-spin text-[#1a3a32]" size={28} />
              <p className="text-sm text-gray-400">Loading preview…</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-serif font-bold text-[#1a3a32]">
                    {preview.summary.total}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                    Total
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-serif font-bold text-emerald-700">
                    {preview.summary.completed}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mt-1">
                    Completed
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-serif font-bold text-amber-700">
                    {preview.summary.incomplete}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mt-1">
                    Incomplete
                  </p>
                </div>
              </div>

              {preview.incompleteIndicators.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
                      {preview.incompleteIndicators.length} incomplete indicators
                      will be carried forward
                    </p>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {preview.incompleteIndicators.map((ind) => (
                      <div
                        key={ind.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <p className="text-[11px] text-gray-600 italic flex-1 truncate">
                          {ind.activityDescription}
                        </p>
                        <span className="text-[9px] font-bold text-amber-600 shrink-0">
                          {ind.progress}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[12px] text-gray-500 mb-5 leading-relaxed">
                Running the archive will snapshot all {year} indicators, reset
                progress for the new year, and cannot be undone.
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={archiving}
                  className="px-5 py-2 rounded-lg bg-[#1a3a32] text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {archiving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Archive size={13} />
                  )}
                  Confirm Archive
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

const SuperAdminArchives = () => {
  const dispatch = useAppDispatch();

  const { archivedYears, loading, archiving, successMessage, error } =
    useAppSelector((s) => s.archive, shallowEqual);

  const [previewYear, setPreviewYear] = useState<number | null>(null);
  const [detailYear,  setDetailYear]  = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    dispatch(fetchArchivedYears());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) toast.success(successMessage);
  }, [successMessage]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleOpenPreview = (year: number) => {
    dispatch(clearPreview());
    dispatch(fetchArchivePreview(year));
    setPreviewYear(year);
  };

  const handleConfirmArchive = async () => {
    if (!previewYear) return;
    try {
      await dispatch(runYearArchive(previewYear)).unwrap();
      setPreviewYear(null);
    } catch {
      toast.error("Archive failed. Please try again.");
    }
  };

  const totalArchived  = archivedYears.reduce((s, y) => s + y.total, 0);
  const totalCompleted = archivedYears.reduce((s, y) => s + y.completed, 0);
  const overallRate    =
    totalArchived > 0 ? Math.round((totalCompleted / totalArchived) * 100) : 0;

  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1a3a32] tracking-tight">
            PMMU Archives
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Historical performance records across all fiscal years
          </p>
        </div>
        <button
          onClick={() => handleOpenPreview(currentYear)}
          className="bg-[#1a3a32] text-white px-5 py-2.5 rounded-lg text-[11px] font-bold flex items-center gap-2 uppercase tracking-wider hover:opacity-90 transition-all shadow-md shadow-[#1a3a32]/10"
        >
          <Archive size={15} strokeWidth={2.5} />
          Archive {currentYear}
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Years Archived"   value={archivedYears.length} icon={Calendar} />
        <StatCard label="Total Indicators" value={totalArchived}        icon={BarChart3} />
        <StatCard
          label="Completed"
          value={totalCompleted}
          icon={CheckCircle2}
          accent="text-emerald-500"
        />
        <StatCard
          label="Completion Rate"
          value={`${overallRate}%`}
          icon={TrendingUp}
          accent={
            overallRate >= 70 ? "text-emerald-500"
            : overallRate >= 40 ? "text-amber-500"
            : "text-rose-500"
          }
        />
      </div>

      {/* Archived years list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
            Archived Years
          </h2>
          <button
            onClick={() => dispatch(fetchArchivedYears())}
            disabled={loading}
            className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading && archivedYears.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#1a3a32]" size={32} />
            <p className="text-sm text-gray-400">Loading archives…</p>
          </div>
        ) : archivedYears.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ArchiveX className="text-gray-200" size={48} />
            <p className="text-sm text-gray-400 italic">
              No archives yet. Run the first archive above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...archivedYears]
              .sort((a, b) => b.year - a.year)
              .map((yr: IArchivedYear) => {
                const completionPct =
                  yr.total > 0
                    ? Math.round((yr.completed / yr.total) * 100)
                    : 0;

                return (
                  <div
                    key={yr.year}
                    className="flex items-center gap-6 px-6 py-4 hover:bg-gray-50/50 transition-all"
                  >
                    <div className="w-16 h-16 rounded-xl bg-[#1a3a32]/5 flex items-center justify-center shrink-0">
                      <span className="text-lg font-serif font-bold text-[#1a3a32]">
                        {yr.year}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-[13px] font-bold text-gray-700">
                          {yr.total} indicators
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                          <CheckCircle2 size={11} />
                          {yr.completed} completed
                        </span>
                        {yr.incomplete > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
                            <XCircle size={11} />
                            {yr.incomplete} incomplete
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              completionPct >= 70
                                ? "bg-emerald-500"
                                : completionPct >= 40
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                            }`}
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 w-8 text-right">
                          {completionPct}%
                        </span>
                      </div>

                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Archived{" "}
                        {new Date(yr.archivedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · by {yr.archivedBy}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setDetailYear(yr.year)}
                        className="border border-[#1a3a32] text-[#1a3a32] px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:bg-[#1a3a32] hover:text-white transition-all"
                      >
                        <Eye size={11} />
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {previewYear !== null && (
        <PreviewModal
          year={previewYear}
          onClose={() => setPreviewYear(null)}
          onConfirm={handleConfirmArchive}
          archiving={archiving}
        />
      )}

      {detailYear !== null && (
        <ArchiveDetailPanel
          year={detailYear}
          onClose={() => {
            setDetailYear(null);
            dispatch(clearArchiveDetail());
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminArchives;