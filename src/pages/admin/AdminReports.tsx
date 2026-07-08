import { useEffect, useState } from "react";
import {
  fetchTrackerReport,
  fetchReportSummary,
  downloadTrackerPdf,
  clearReportFilters,
  type IPerspective,
  type IIndicator,
  type ISubmission,
} from "../../store/slices/reportSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ORHC from "../../assets/ORHC.jpg";

/* ─── STATUS BADGE ──────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  const isCompleted = status === "Completed";
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        isCompleted
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-amber-100 text-amber-700 border border-amber-200"
      }`}
    >
      {isCompleted ? "Complete" : "Incomplete"}
    </span>
  );
};

/* ─── EVIDENCE CELL – only shows the latest submission's notes and document descriptions ── */
const EvidenceCell = ({ submissions }: { submissions: ISubmission[] }) => {
  if (!submissions || submissions.length === 0) {
    return (
      <span className="text-slate-400 italic text-[10px] font-medium">
        No submissions yet
      </span>
    );
  }

  // Find the latest submission based on submittedAt
  const latestSubmission = submissions.reduce((latest, current) => {
    const latestDate = new Date(latest.submittedAt);
    const currentDate = new Date(current.submittedAt);
    return currentDate > latestDate ? current : latest;
  }, submissions[0]);

  // Filter documents to only show those with descriptions
  const documentsWithDescriptions = latestSubmission.documents?.filter(
    (doc) => doc.description?.trim()
  ) || [];

  // Check if there's anything to show
  const hasNotes = latestSubmission.notes?.trim();
  const hasDocuments = documentsWithDescriptions.length > 0;

  if (!hasNotes && !hasDocuments) {
    return (
      <span className="text-slate-400 italic text-[10px] font-medium">
        No evidence provided
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {/* Notes from the latest submission */}
      {hasNotes && (
        <p className="text-slate-600 text-[10px] mb-1.5 pl-3 italic border-l-2 border-slate-200">
          {latestSubmission.notes}
        </p>
      )}
      
      {/* Document descriptions from the latest submission */}
      {hasDocuments && (
        <ul className="space-y-1 pl-3 mt-1.5">
          {documentsWithDescriptions.map((doc, idx) => (
            <li key={idx} className="flex gap-2 text-[10px] text-slate-700">
              <span className="text-[#c2a336] mt-0.5 shrink-0">❖</span>
              <span className="font-medium">{doc.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ─── SUMMARY CARDS ────────────────────────────────────────────────── */
const SummaryCards = () => {
  const { summary, summaryLoading } = useAppSelector((s) => s.reports);

  if (summaryLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse shadow-sm"
          >
            <div className="h-3 bg-slate-200 rounded w-2/3 mb-2" />
            <div className="h-7 bg-slate-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const totals = summary.reduce(
    (acc, s) => ({
      total:          acc.total          + s.totalIndicators,
      completed:      acc.completed      + s.completed,
      awaitingReview: acc.awaitingReview + s.awaitingReview,
      overdue:        acc.overdue        + s.overdue,
    }),
    { total: 0, completed: 0, awaitingReview: 0, overdue: 0 }
  );

  const cards: { label: string; value: number; colour: string; bg: string }[] = [
    { label: "Total Indicators", value: totals.total,          colour: "text-[#1d3331]", bg: "bg-slate-50" },
    { label: "Complete",         value: totals.completed,      colour: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Incomplete",       value: totals.total - totals.completed, colour: "text-amber-700", bg: "bg-amber-50" },
    { label: "Overdue",          value: totals.overdue,        colour: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`${c.bg} rounded-xl border border-slate-200 p-5 shadow-sm`}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            {c.label}
          </p>
          <p className={`text-2xl font-black font-serif ${c.colour}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
};

/* ─── LOADING SKELETON ────────────────────────────────────────────── */
const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />
    ))}
  </div>
);

/* ─── TABLE PERSPECTIVE ROWS ──────────────────────────────────────── */
const TablePerspectiveRows = ({
  perspective,
  getIndex,
}: {
  perspective: IPerspective;
  getIndex: () => number;
}) => {
  // Flatten objective → activity → indicator into a single array first,
  // computing "isFirstForObjective" as plain data — no mutation during render.
  type FlatRow = {
    objective: IPerspective["objectives"][number];
    activity: IPerspective["objectives"][number]["activities"][number];
    indicator: IIndicator;
    isFirstForObjective: boolean;
  };

  const flatRows: FlatRow[] = [];
  let prevObjectiveId: string | null = null;

  for (const objective of perspective.objectives) {
    for (const activity of objective.activities) {
      for (const indicator of activity.indicators) {
        flatRows.push({
          objective,
          activity,
          indicator,
          isFirstForObjective: objective.id !== prevObjectiveId,
        });
        prevObjectiveId = objective.id;
      }
    }
  }

  return (
    <>
      {/* Perspective section header */}
      <tr>
        <td
          colSpan={6}
          className="border border-slate-200 px-4 py-2.5 font-black text-[10px]
                     text-[#1d3331] uppercase tracking-wider bg-[#1d3331]/5"
        >
          {perspective.perspective}
        </td>
      </tr>

      {flatRows.map(({ objective, activity, indicator, isFirstForObjective }) => {
        getIndex();
        const indicatorLabel = objective.title?.trim() || activity.description;

        return (
          <tr
            key={indicator.indicatorId}
            className="align-top hover:bg-slate-50/80 transition-colors"
          >
            {/* ── Indicators column ── */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] font-bold text-[#1a2c2c]">
              {isFirstForObjective && (
                <div className="font-bold">
                  {indicatorLabel}
                </div>
              )}
            </td>

            {/* ── Unit of Measure ── */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] text-slate-600 text-center">
              {indicator.unit || "%"}
            </td>

            {/* ── Explanatory Notes ── */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] text-slate-700">
              {activity.description}
              {indicator.instructions && (
                <p className="mt-1 text-[10px] text-slate-400 italic font-medium">
                  {indicator.instructions}
                </p>
              )}
            </td>

            {/* ── Responsibility ── */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] text-slate-700">
              <div className="font-semibold" title={indicator.assigneeDisplayName || undefined}>
                {indicator.assigneeDisplayName || "Unassigned"}
              </div>
            </td>

            {/* ── Evidence ── */}
            <td className="border border-slate-200 px-4 py-3">
              <EvidenceCell submissions={indicator.submissions} />
            </td>

            {/* ── Status ── */}
            <td className="border border-slate-200 px-4 py-3">
              <StatusBadge status={indicator.status} />
            </td>
          </tr>
        );
      })}
    </>
  );
};

/* ─── MAIN COMPONENT ───────────────────────────────────────────────── */
const AdminReports = () => {
  const dispatch = useAppDispatch();
  const { data, loading, error, filters, pdfLoading } = useAppSelector((s) => s.reports);

  const [activePerspective, setActivePerspective] = useState<string>("all");
  const [statusFilter, setStatusFilter]           = useState<string>("");

  useEffect(() => {
    dispatch(fetchReportSummary());
    dispatch(fetchTrackerReport({}));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchTrackerReport(filters));
  }, [dispatch, filters]);

  const visibleData: IPerspective[] =
    activePerspective === "all"
      ? data
      : data.filter((p) =>
          p.perspective.toUpperCase().startsWith(activePerspective.toUpperCase())
        );

  const filteredData: IPerspective[] = statusFilter
    ? visibleData
        .map((p) => ({
          ...p,
          objectives: p.objectives
            .map((o) => ({
              ...o,
              activities: o.activities
                .map((a) => ({
                  ...a,
                  indicators: a.indicators.filter(
                    (ind) => ind.status === statusFilter
                  ),
                }))
                .filter((a) => a.indicators.length > 0),
            }))
            .filter((o) => o.activities.length > 0),
        }))
        .filter((p) => p.objectives.length > 0)
    : visibleData;

  const handleDownloadPdf = () => {
    dispatch(downloadTrackerPdf(filters));
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setActivePerspective("all");
    dispatch(clearReportFilters());
  };

  let indicatorIndex = 0;

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">

      {/* ── HEADER ── */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-32 h-20 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200">
            <img
              src={ORHC}
              alt="ORHC logo"
              className="w-full h-full object-contain p-2"
            />
          </div>
        </div>
        <h1 className="text-xl font-black font-serif text-[#1d3331] tracking-tight uppercase">
          RHC 2025/2026 PMMU 1ST JULY 2025 TO 30TH JUNE 2026
        </h1>
        <p className="text-[10px] font-black font-serif text-[#c2a336] uppercase tracking-[0.3em] mt-1">
          Implementation and Evaluation Tracker
        </p>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <SummaryCards />

      {/* ── FILTERS ── */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {["all", "A", "B", "C", "D"].map((p) => (
            <button
              key={p}
              onClick={() => setActivePerspective(p)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                activePerspective === p
                  ? "bg-[#1d3331] text-white shadow-lg"
                  : "bg-transparent text-slate-400 hover:text-[#1d3331]"
              }`}
            >
              {p === "all" ? "All Sections" : `Section ${p}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[9px] font-black uppercase tracking-wider border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 focus:border-[#1d3331] transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Complete</option>
            <option value="Incomplete">Incomplete</option>
          </select>

          {(statusFilter || activePerspective !== "all") && (
            <button
              onClick={handleClearFilters}
              className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-red-600 border border-slate-200
                         rounded-xl px-4 py-2.5 bg-white transition-all hover:border-red-300"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => dispatch(fetchTrackerReport(filters))}
            disabled={loading}
            className="text-[9px] font-black uppercase tracking-wider border border-slate-200 rounded-xl px-4 py-2.5 bg-white
                       text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading || loading}
            className="text-[9px] font-black uppercase tracking-wider bg-[#1d3331] text-white rounded-xl px-5 py-2.5
                       hover:bg-[#c2a336] hover:text-[#1d3331] disabled:opacity-50 transition-all
                       flex items-center gap-2"
          >
            {pdfLoading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl text-[11px] text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* ── TABLE ── */}
      {loading && <TableSkeleton />}

      {!loading && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1d3331] text-white">
                <th className="border border-[#2d4a48] px-4 py-3.5 text-left font-black text-[9px] uppercase tracking-wider w-28">
                  Indicators
                </th>
                <th className="border border-[#2d4a48] px-4 py-3.5 text-left font-black text-[9px] uppercase tracking-wider w-20">
                  Unit of Measure
                </th>
                <th className="border border-[#2d4a48] px-4 py-3.5 text-left font-black text-[9px] uppercase tracking-wider w-44">
                  Explanatory Notes
                </th>
                <th className="border border-[#2d4a48] px-4 py-3.5 text-left font-black text-[9px] uppercase tracking-wider w-36">
                  Responsibility
                </th>
                <th className="border border-[#2d4a48] px-4 py-3.5 text-left font-black text-[9px] uppercase tracking-wider">
                  Evidence
                </th>
                <th className="border border-[#2d4a48] px-4 py-3.5 text-left font-black text-[9px] uppercase tracking-wider w-32">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-[11px] text-slate-400 font-bold uppercase tracking-widest"
                  >
                    No indicators found.
                  </td>
                </tr>
              ) : (
                filteredData.map((perspective) => (
                  <TablePerspectiveRows
                    key={perspective.perspective}
                    perspective={perspective}
                    getIndex={() => { indicatorIndex += 1; return indicatorIndex; }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-6 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
          RHC PMMU Tracker · FY 2024/2025 · Generated{" "}
          {new Date().toLocaleDateString("en-KE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
};

export default AdminReports;