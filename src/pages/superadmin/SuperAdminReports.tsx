import { useEffect, useCallback } from "react";
import {
  fetchTrackerReport,
  downloadTrackerPdf,
  setStatusGroupFilter,
  toggleSubmissionFilter,
  resetReportFilters,
  type IPerspective,
  type IIndicator,
  type ISubmission,
  type StatusGroup,
  STATUS_GROUP_VALUES,
} from "../../store/slices/reportSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ORHC from "../../assets/ORHC.jpg";

/* ─── STATUS GROUP HELPERS ─────────────────────────────────────────────
   The UI shows three semantic buckets. The backend receives the raw
   enum values that make up each bucket via the ?status= query param.
   ──────────────────────────────────────────────────────────────────── */

const getStatusGroup = (status: string | undefined): StatusGroup => {
  if (status === "Completed") return "Complete";
  if (status === "Partially Approved" || status === "Awaiting Super Admin") {
    return "Partial";
  }
  return "Incomplete";
};

/* ─── STATUS BADGE ──────────────────────────────────────────────────── */

const StatusBadge = ({ status }: { status: string }) => {
  const group = getStatusGroup(status);

  const styles: Record<
    StatusGroup,
    { label: string; bg: string; text: string; border: string }
  > = {
    Complete: {
      label: "Complete",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    Partial: {
      label: "Partial",
      bg: "bg-purple-100",
      text: "text-purple-700",
      border: "border-purple-200",
    },
    Incomplete: {
      label: "Incomplete",
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
    },
  };

  const s = styles[group];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text} border ${s.border}`}
    >
      {s.label}
    </span>
  );
};

/* ─── EVIDENCE CELL ────────────────────────────────────────────────── */

const EvidenceCell = ({ submissions }: { submissions: ISubmission[] }) => {
  if (!submissions || submissions.length === 0) {
    return (
      <span className="text-slate-400 text-[10px] italic">No evidence</span>
    );
  }

  const sorted = [...submissions].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  const valid = sorted.filter(
    (s) =>
      s.reviewStatus !== "Rejected" &&
      s.reviewStatus !== "Correction Needed"
  );

  if (valid.length === 0) {
    return (
      <span className="text-slate-400 text-[10px] italic">
        No valid evidence
      </span>
    );
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
      {valid.map((sub, idx) => {
        const periodLabel =
          sub.quarter === 0 ? "Annual" : `Q${sub.quarter}`;
        const hasNotes = sub.notes?.trim();
        const docsWithDesc =
          sub.documents?.filter((d) => d.description?.trim()) || [];
        const docsToShow =
          docsWithDesc.length > 0 ? docsWithDesc : sub.documents || [];

        if (!hasNotes && docsToShow.length === 0) return null;

        return (
          <div
            key={sub.submissionId || idx}
            className="border-b border-slate-100 last:border-0 pb-2 last:pb-0"
          >
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {periodLabel} {sub.year} ·{" "}
              <span
                className={`${
                  sub.reviewStatus === "Accepted"
                    ? "text-emerald-600"
                    : sub.reviewStatus === "Verified"
                    ? "text-blue-600"
                    : sub.reviewStatus === "Partially Approved"
                    ? "text-purple-600"
                    : "text-amber-600"
                }`}
              >
                {sub.reviewStatus}
              </span>
            </div>

            {hasNotes && (
              <p className="text-slate-600 text-[10px] mb-1.5 pl-2 italic border-l-2 border-slate-200">
                {sub.notes}
              </p>
            )}

            {docsToShow.length > 0 && (
              <ul className="space-y-1 pl-2">
                {docsToShow.map((doc, docIdx) => (
                  <li
                    key={docIdx}
                    className="flex gap-2 text-[10px] text-slate-700"
                  >
                    <span className="text-[#c2a336] mt-0.5 shrink-0">
                      ❖
                    </span>
                    <span className="font-medium break-words">
                      {doc.description?.trim() ||
                        doc.fileName ||
                        "Document"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ─── SUMMARY CARDS ─────────────────────────────────────────────────
   Computed from the `raw` array the tracker endpoint returns, so the
   cards always agree with whatever the table is currently showing.
   ────────────────────────────────────────────────────────────────── */

const SummaryCards = () => {
  const { raw, loading } = useAppSelector((s) => s.reports);

  if (loading && raw.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
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

  const total = raw.length;
  const completed = raw.filter((i) => i.status === "Completed").length;
  const partial = raw.filter(
    (i) =>
      i.status === "Partially Approved" ||
      i.status === "Awaiting Super Admin"
  ).length;
  const incomplete = total - completed - partial;
  const withSubmission = raw.filter(
    (i) => i.submissions && i.submissions.length > 0
  ).length;

  const submissionRate =
    total > 0 ? Math.round((withSubmission / total) * 100) : 0;

  const cards: {
    label: string;
    value: number;
    colour: string;
    bg: string;
  }[] = [
    {
      label: "Total Indicators",
      value: total,
      colour: "text-[#1d3331]",
      bg: "bg-slate-50",
    },
    {
      label: "With Submissions",
      value: withSubmission,
      colour: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Complete",
      value: completed,
      colour: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Partial",
      value: partial,
      colour: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      label: "Incomplete",
      value: incomplete,
      colour: "text-amber-700",
      bg: "bg-amber-50",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`${c.bg} rounded-xl border border-slate-200 p-5 shadow-sm`}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
              {c.label}
            </p>
            <p className={`text-2xl font-black font-serif ${c.colour}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Submission Rate
          </span>
          <span className="text-sm font-black text-blue-700">
            {submissionRate}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${submissionRate}%` }}
          />
        </div>
        <p className="text-[9px] text-slate-400 mt-1.5">
          {withSubmission} of {total} indicators have at least one submission
        </p>
      </div>
    </>
  );
};

/* ─── LOADING SKELETON ─────────────────────────────────────────────── */

const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="h-12 bg-slate-200 rounded-xl animate-pulse"
      />
    ))}
  </div>
);

/* ─── TABLE PERSPECTIVE ROWS ───────────────────────────────────────── */

const TablePerspectiveRows = ({
  perspective,
}: {
  perspective: IPerspective;
}) => {
  type FlatRow = {
    objective: IPerspective["objectives"][number];
    activity: IPerspective["objectives"][number]["activities"][number];
    indicator: IIndicator;
  };

  const flatRows: FlatRow[] = [];

  for (const objective of perspective.objectives) {
    for (const activity of objective.activities) {
      for (const indicator of activity.indicators) {
        flatRows.push({ objective, activity, indicator });
      }
    }
  }

  if (flatRows.length === 0) return null;

  return (
    <>
      <tr>
        <td
          colSpan={6}
          className="border border-slate-200 px-4 py-2.5 font-black text-[10px]
                     text-[#1d3331] uppercase tracking-wider bg-[#1d3331]/5"
        >
          {perspective.perspective}
        </td>
      </tr>

      {flatRows.map(({ objective, activity, indicator }, index) => {
        let isFirstForObjective = false;
        if (index === 0) {
          isFirstForObjective = true;
        } else {
          const prevRow = flatRows[index - 1];
          isFirstForObjective = prevRow.objective.id !== objective.id;
        }

        const indicatorLabel =
          objective.title?.trim() || activity.description;
        const hasSubmissions =
          indicator.submissions && indicator.submissions.length > 0;

        return (
          <tr
            key={indicator.indicatorId}
            className="align-top hover:bg-slate-50/80 transition-colors"
          >
            {/* Indicators */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] font-bold text-[#1a2c2c]">
              {isFirstForObjective && (
                <div className="font-bold">{indicatorLabel}</div>
              )}
            </td>

            {/* Unit of Measure */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] text-slate-600 text-center">
              {indicator.unit || "%"}
            </td>

            {/* Explanatory Notes */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] text-slate-700">
              {activity.description}

              {indicator.submissions &&
                indicator.submissions.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {[...indicator.submissions]
                      .sort((a, b) => {
                        if (a.year !== b.year)
                          return a.year - b.year;
                        return a.quarter - b.quarter;
                      })
                      .filter(
                        (s) =>
                          s.reviewStatus !== "Rejected" &&
                          s.reviewStatus !== "Correction Needed"
                      )
                      .map((sub, idx) => {
                        const periodLabel =
                          sub.quarter === 0
                            ? "Annual"
                            : `Q${sub.quarter}`;
                        return (
                          <div
                            key={idx}
                            className="text-[9px] text-slate-500"
                          >
                            <span className="font-medium">
                              {periodLabel} {sub.year}:
                            </span>
                            <span
                              className={`ml-1 ${
                                sub.reviewStatus === "Accepted"
                                  ? "text-emerald-600"
                                  : sub.reviewStatus === "Verified"
                                  ? "text-blue-600"
                                  : sub.reviewStatus ===
                                    "Partially Approved"
                                  ? "text-purple-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {sub.reviewStatus}
                            </span>
                            {sub.documents &&
                              sub.documents.length > 0 && (
                                <span className="ml-1 text-slate-400">
                                  ({sub.documents.length} doc
                                  {sub.documents.length !== 1
                                    ? "s"
                                    : ""}
                                  )
                                </span>
                              )}
                          </div>
                        );
                      })}
                  </div>
                )}

              {indicator.instructions && (
                <p className="mt-1 text-[10px] text-slate-400 italic font-medium">
                  {indicator.instructions}
                </p>
              )}

              {!hasSubmissions && (
                <p className="mt-1 text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                  No Submission
                </p>
              )}
            </td>

            {/* Responsibility */}
            <td className="border border-slate-200 px-4 py-3 text-[11px] text-slate-700">
              <div
                className="font-semibold"
                title={indicator.assigneeDisplayName || undefined}
              >
                {indicator.assigneeDisplayName || "Unassigned"}
              </div>
            </td>

            {/* Evidence */}
            <td className="border border-slate-200 px-4 py-3">
              <EvidenceCell submissions={indicator.submissions} />
            </td>

            {/* Status */}
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

const SuperAdminReports = () => {
  const dispatch = useAppDispatch();
  const { data, loading, error, filters, pdfLoading } = useAppSelector(
    (s) => s.reports
  );

  /* ── Derive UI-level view-mode & status-group from Redux filters ── */

  const statusFilter: StatusGroup | "all" = (() => {
    if (!filters.status) return "all";

    const values = filters.status.split(",").map((s) => s.trim());

    if (values.length === 1 && values[0] === "Completed") {
      return "Complete";
    }

    const partial = new Set(STATUS_GROUP_VALUES.Partial);
    if (
      values.length > 0 &&
      values.every((v) => partial.has(v))
    ) {
      return "Partial";
    }

    const incomplete = new Set(STATUS_GROUP_VALUES.Incomplete);
    if (
      values.length > 0 &&
      values.every((v) => incomplete.has(v))
    ) {
      return "Incomplete";
    }

    return "all";
  })();

  const viewMode: "all" | "submitted" =
    filters.hasSubmission === "true" ? "submitted" : "all";

  /* ── Refetch the tracker whenever filters change ── */
  useEffect(() => {
    dispatch(fetchTrackerReport(filters));
  }, [dispatch, filters]);

  /* ── Handlers that mutate Redux instead of local state ── */

  const handleSetViewMode = (mode: "all" | "submitted") => {
    dispatch(toggleSubmissionFilter(mode === "submitted"));
  };

  const handleSetStatusGroup = (group: StatusGroup | "all") => {
    dispatch(setStatusGroupFilter(group === "all" ? null : group));
  };

  const handleClearFilters = () => {
    dispatch(resetReportFilters());
  };

  const handleRefresh = useCallback(() => {
    dispatch(fetchTrackerReport(filters));
  }, [dispatch, filters]);

  const handleDownloadPdf = () => {
    dispatch(downloadTrackerPdf(filters));
  };

  const hasActiveFilter =
    statusFilter !== "all" || viewMode !== "all";

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">
      {/* HEADER */}
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

      <SummaryCards />

      {/* FILTERS */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => handleSetViewMode("submitted")}
              className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                viewMode === "submitted"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Has Approved Submission
            </button>
            <button
              onClick={() => handleSetViewMode("all")}
              className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                viewMode === "all"
                  ? "bg-[#1d3331] text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              All Indicators
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              handleSetStatusGroup(
                e.target.value as StatusGroup | "all"
              )
            }
            className="text-[9px] font-black uppercase tracking-wider border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 focus:border-[#1d3331] transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="Complete">Complete</option>
            <option value="Partial">Partial</option>
            <option value="Incomplete">Incomplete</option>
          </select>

          {hasActiveFilter && (
            <button
              onClick={handleClearFilters}
              className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-red-600 border border-slate-200
                         rounded-xl px-4 py-2.5 bg-white transition-all hover:border-red-300"
            >
              Clear
            </button>
          )}

          <button
            onClick={handleRefresh}
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

        {viewMode === "submitted" && (
          <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
            Only indicators with an approved submission
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl text-[11px] text-red-700 font-medium">
          {error}
        </div>
      )}

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
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-[11px] text-slate-400 font-bold uppercase tracking-widest"
                  >
                    No indicators match the current filters.
                  </td>
                </tr>
              ) : (
                data.map((perspective) => (
                  <TablePerspectiveRows
                    key={perspective.perspective}
                    perspective={perspective}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
          RHC PMMU Tracker · FY 2025/2026 · Generated{" "}
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

export default SuperAdminReports;