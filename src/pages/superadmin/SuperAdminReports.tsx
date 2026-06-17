import { useEffect, useState, type JSX } from "react";
import {
  fetchTrackerReport,
  fetchReportSummary,
  downloadTrackerPdf,
  clearReportFilters,
  type IPerspective,
  type IIndicator,
  type ISubmission,
  type IDocument,
} from "../../store/slices/reportSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ORHC from "../../assets/ORHC.jpg"

/* ─── STATUS BADGE ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  const colours: Record<string, string> = {
    Completed:                 "bg-green-100 text-green-800",
    "Awaiting Super Admin":    "bg-blue-100 text-blue-800",
    "Awaiting Admin Approval": "bg-yellow-100 text-yellow-800",
    Pending:                   "bg-gray-100 text-gray-700",
    "Rejected by Admin":       "bg-red-100 text-red-700",
    "Rejected by Super Admin": "bg-red-200 text-red-800",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
        colours[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
};

/* ─── DOCUMENT LINK ───────────────────────────────────────────────────────── */
const DocumentLink = ({ doc }: { doc: IDocument }): JSX.Element => {
  if (doc.evidenceUrl) {
    return (
      <a
        href={doc.evidenceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {doc.fileName || doc.description || "View Document"}
      </a>
    );
  }

  return <span>{doc.fileName || doc.description}</span>;
};

/* ─── EVIDENCE CELL ───────────────────────────────────────────────────────── */
const EvidenceCell = ({ submissions }: { submissions: ISubmission[] }) => {
  if (!submissions || submissions.length === 0) {
    return (
      <span className="text-gray-400 italic text-[11px]">
        No submissions yet
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => (
        <div key={sub.submissionId}>
          {/* Period + review status */}
          <p className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <span>
              • {sub.quarter === 0 ? "Annual" : `Q${sub.quarter}`} {sub.year}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                sub.reviewStatus === "Accepted"
                  ? "bg-green-100 text-green-700"
                  : sub.reviewStatus === "Rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {sub.reviewStatus}
            </span>
          </p>

          {/* Notes */}
          {sub.notes && (
            <p className="text-gray-600 text-[11px] mb-1 italic pl-2">
              {sub.notes}
            </p>
          )}

          {/* Documents */}
          {sub.documents && sub.documents.length > 0 && (
            <ul className="space-y-1 pl-2">
              {sub.documents.map((doc, idx) => (
                <li key={idx} className="flex gap-2 text-gray-700">
                  <span className="text-gray-400 mt-0.5 shrink-0">❖</span>
                  <DocumentLink doc={doc} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── SUMMARY CARDS ───────────────────────────────────────────────────────── */
const SummaryCards = () => {
  const { summary, summaryLoading } = useAppSelector((s) => s.reports);

  if (summaryLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-1/3" />
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

  const cards: { label: string; value: number; colour: string }[] = [
    { label: "Total Indicators", value: totals.total,          colour: "text-gray-800" },
    { label: "Completed",        value: totals.completed,       colour: "text-green-700" },
    { label: "Awaiting Review",  value: totals.awaitingReview,  colour: "text-blue-700" },
    { label: "Overdue",          value: totals.overdue,         colour: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <p className="text-[11px] text-gray-500 mb-1">{c.label}</p>
          <p className={`text-2xl font-semibold ${c.colour}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
};

/* ─── LOADING SKELETON ────────────────────────────────────────────────────── */
const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
);

/* ─── TABLE PERSPECTIVE ROWS ──────────────────────────────────────────────── */
const TablePerspectiveRows = ({
  perspective,
  getIndex,
}: {
  perspective: IPerspective;
  getIndex: () => number;
}) => (
  <>
    {/* Perspective section header */}
    <tr>
      <td
        colSpan={6}
        className="border border-gray-300 px-3 py-2 font-semibold
                   text-green-900 text-xs bg-green-100"
      >
        {perspective.perspective}
      </td>
    </tr>

    {perspective.objectives.map((objective) =>
      objective.activities.map((activity) =>
        activity.indicators.map((indicator: IIndicator) => {
          const idx = getIndex();
          return (
            <tr
              key={indicator.indicatorId}
              className="align-top hover:bg-gray-50 transition-colors"
            >
              {/* ── Indicators column ── */}
              <td className="border border-gray-300 px-3 py-3 text-gray-800">
                <div className="font-medium mb-1">
                  {idx}. {objective.title}
                </div>
                <StatusBadge status={indicator.status} />
                {indicator.progress > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>Progress</span>
                      <span>{indicator.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(indicator.progress, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </td>

              {/* ── Unit of Measure ── */}
              <td className="border border-gray-300 px-3 py-3 text-gray-700 text-center">
                {indicator.unit || "%"}
              </td>

              {/* ── Explanatory Notes ── */}
              <td className="border border-gray-300 px-3 py-3 text-gray-800">
                {activity.description}
                {indicator.instructions && (
                  <p className="mt-1 text-[11px] text-gray-500 italic">
                    {indicator.instructions}
                  </p>
                )}
              </td>

              {/* ── Responsibility ── */}
              <td className="border border-gray-300 px-3 py-3 text-gray-800">
                <div className="font-medium">
                  {indicator.assigneeDisplayName || "Unassigned"}
                </div>
                {indicator.assignedByName && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Assigned by: {indicator.assignedByName}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-0.5 capitalize">
                  {indicator.assignmentType || "—"}
                </div>
              </td>

              {/* ── Evidence ── */}
              <td className="border border-gray-300 px-3 py-3">
                <EvidenceCell submissions={indicator.submissions} />
              </td>

              {/* ── Evaluation Point Person ── */}
              <td className="border border-gray-300 px-3 py-3 text-gray-800 font-medium">
                {indicator.assignedByName || "—"}
                {indicator.deadline && (
                  <div className="text-[10px] text-gray-400 mt-1">
                    Due:{" "}
                    {new Date(indicator.deadline).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}
              </td>
            </tr>
          );
        })
      )
    )}
  </>
);

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */
const SuperAdminReports = () => {
  const dispatch   = useAppDispatch();
  const { data, loading, error, filters } = useAppSelector((s) => s.reports);

  const [activePerspective, setActivePerspective] = useState<string>("all");
  const [statusFilter, setStatusFilter]           = useState<string>("");
  const [pdfLoading, setPdfLoading]               = useState<boolean>(false);

  /* Initial fetch */
  useEffect(() => {
    dispatch(fetchReportSummary());
    dispatch(fetchTrackerReport({}));
  }, [dispatch]);

  /* Re-fetch when redux filters change */
  useEffect(() => {
    dispatch(fetchTrackerReport(filters));
  }, [dispatch, filters]);

  /* ── Client-side perspective filter ── */
  const visibleData: IPerspective[] =
    activePerspective === "all"
      ? data
      : data.filter((p) =>
          p.perspective.toUpperCase().startsWith(activePerspective.toUpperCase())
        );

  /* ── Client-side status filter ── */
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

  /* ── PDF download ── */
  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    await dispatch(downloadTrackerPdf(filters));
    setPdfLoading(false);
  };

  /* ── Clear all filters ── */
  const handleClearFilters = () => {
    setStatusFilter("");
    setActivePerspective("all");
    dispatch(clearReportFilters());
  };

  /* Running indicator counter (resets each render) */
  let indicatorIndex = 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ── Page Header ── */}
<div className="mb-6 text-center">
  <div className="flex items-center justify-center gap-3 mb-3">
    <div className="w-100 h-50 rounded-[0.5rem] overflow-hidden flex items-center justify-center bg-white">
      <img
        src={ORHC}
        alt="ORHC logo"
        className="w-full h-full object-contain"
      />
    </div>
  </div>
  <h1 className="text-base font-serif font-semibold text-gray-800 tracking-wide">
    RHC 2025/2026 PMMU 1ST JULY 2025 TO 30TH JUNE 2026
  </h1>
  <p className="text-sm font-semibold font-serif text-gray-700 tracking-widest mt-1">
    IMPLEMENTATION AND EVALUATION TRACKER
  </p>
</div>

      {/* ── Summary Cards ── */}
      <SummaryCards />

      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

        {/* Perspective tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", "A", "B", "C", "D"].map((p) => (
            <button
              key={p}
              onClick={() => setActivePerspective(p)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                activePerspective === p
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {p === "all" ? "All Sections" : `Section ${p}`}
            </button>
          ))}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700
                       focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Awaiting Admin Approval">Awaiting Admin Approval</option>
            <option value="Awaiting Super Admin">Awaiting Super Admin</option>
            <option value="Rejected by Admin">Rejected by Admin</option>
            <option value="Rejected by Super Admin">Rejected by Super Admin</option>
          </select>

          {/* Clear filters — only shown when something is active */}
          {(statusFilter || activePerspective !== "all") && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-gray-500 hover:text-red-500 border border-gray-300
                         rounded px-2 py-1.5 bg-white transition-colors"
            >
              Clear
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={() => dispatch(fetchTrackerReport(filters))}
            disabled={loading}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white
                       text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading || loading}
            className="text-xs bg-green-700 text-white rounded px-3 py-1.5
                       hover:bg-green-800 disabled:opacity-50 transition-colors
                       flex items-center gap-1"
          >
            {pdfLoading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && <TableSkeleton />}

      {/* ── Tracker Table ── */}
      {!loading && (
        <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-green-200 text-green-900">
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold w-28">
                  INDICATORS
                </th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold w-16">
                  Unit of Measure
                </th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold w-44">
                  Explanatory Notes
                </th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold w-36">
                  Responsibility
                </th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold">
                  Evidence
                </th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold w-28">
                  Evaluation Point Person
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-gray-400 text-sm"
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

      {/* ── Footer ── */}
      <div className="mt-4 text-center text-xs text-gray-400">
        RHC PMMU Tracker · FY 2024/2025 · Generated{" "}
        {new Date().toLocaleDateString("en-KE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
    </div>
  );
};

export default SuperAdminReports;