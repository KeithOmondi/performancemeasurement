import { useEffect, useState, useCallback } from "react";
import {
  fetchTrackerReport,
  fetchReportSummary,
  downloadTrackerPdf,
  clearReportFilters,
  type IPerspective,
  type IIndicator,
  type ISubmission,
  type ReportFilters,
} from "../../store/slices/reportSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import ORHC from "../../assets/ORHC.jpg";

/* ─── STATUS BADGE ──────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  const isCompleted = status === "Completed";
  const isPartiallyApproved = status === "Partially Approved" || status === "Awaiting Super Admin";
  
  let label = "Incomplete";
  let bg = "bg-amber-100";
  let text = "text-amber-700";
  let border = "border-amber-200";
  
  if (isCompleted) {
    label = "Complete";
    bg = "bg-emerald-100";
    text = "text-emerald-700";
    border = "border-emerald-200";
  } else if (isPartiallyApproved) {
    label = "Partial";
    bg = "bg-purple-100";
    text = "text-purple-700";
    border = "border-purple-200";
  }
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg} ${text} border ${border}`}
    >
      {label}
    </span>
  );
};

/* ─── EVIDENCE CELL – Shows ALL quarters with labels ──────────────── */
const EvidenceCell = ({ submissions }: { submissions: ISubmission[] }) => {
  if (!submissions || submissions.length === 0) {
    return <span className="text-slate-400 text-[10px] italic">No evidence</span>;
  }

  // Sort submissions by year and quarter
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.quarter - b.quarter;
  });

  // Filter out rejected submissions
  const validSubmissions = sortedSubmissions.filter(
    (s) => s.reviewStatus !== 'Rejected' && s.reviewStatus !== 'Correction Needed'
  );

  if (validSubmissions.length === 0) {
    return <span className="text-slate-400 text-[10px] italic">No valid evidence</span>;
  }

  return (
    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
      {validSubmissions.map((sub, idx) => {
        const periodLabel = sub.quarter === 0 ? 'Annual' : `Q${sub.quarter}`;
        const hasNotes = sub.notes?.trim();
        const docsWithDesc = sub.documents?.filter(d => d.description?.trim()) || [];
        const docsToShow = docsWithDesc.length > 0 ? docsWithDesc : sub.documents || [];

        // Skip if no notes and no documents
        if (!hasNotes && docsToShow.length === 0) return null;

        return (
          <div key={sub.submissionId || idx} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
            {/* Quarter Header */}
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {periodLabel} {sub.year} · <span className={`${
                sub.reviewStatus === 'Accepted' ? 'text-emerald-600' :
                sub.reviewStatus === 'Verified' ? 'text-blue-600' :
                sub.reviewStatus === 'Partially Approved' ? 'text-purple-600' :
                'text-amber-600'
              }`}>{sub.reviewStatus}</span>
            </div>

            {/* Notes */}
            {hasNotes && (
              <p className="text-slate-600 text-[10px] mb-1.5 pl-2 italic border-l-2 border-slate-200">
                {sub.notes}
              </p>
            )}
            
            {/* Documents with descriptions */}
            {docsToShow.length > 0 && (
              <ul className="space-y-1 pl-2">
                {docsToShow.map((doc, docIdx) => (
                  <li key={docIdx} className="flex gap-2 text-[10px] text-slate-700">
                    <span className="text-[#c2a336] mt-0.5 shrink-0">❖</span>
                    <span className="font-medium break-words">
                      {doc.description?.trim() || doc.fileName || 'Document'}
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

/* ─── SUMMARY CARDS ────────────────────────────────────────────────── */
const SummaryCards = () => {
  const { summary, summaryLoading } = useAppSelector((s) => s.reports);

  if (summaryLoading) {
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

  const totals = summary.reduce(
    (acc, s) => ({
      total: acc.total + s.totalIndicators,
      completed: acc.completed + s.completed,
      awaitingReview: acc.awaitingReview + s.awaitingReview,
      overdue: acc.overdue + s.overdue,
      hasSubmissions: acc.hasSubmissions + (s.hasSubmissions || 0),
      submittedComplete: acc.submittedComplete + (s.submittedComplete || 0),
    }),
    { total: 0, completed: 0, awaitingReview: 0, overdue: 0, hasSubmissions: 0, submittedComplete: 0 }
  );

  const submissionRate = totals.total > 0 
    ? Math.round((totals.hasSubmissions / totals.total) * 100) 
    : 0;

  const cards: { label: string; value: number; colour: string; bg: string }[] = [
    { label: "Total Indicators", value: totals.total, colour: "text-[#1d3331]", bg: "bg-slate-50" },
    { label: "Submitted", value: totals.hasSubmissions, colour: "text-blue-700", bg: "bg-blue-50" },
    { label: "Complete", value: totals.completed, colour: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Incomplete", value: totals.total - totals.hasSubmissions, colour: "text-amber-700", bg: "bg-amber-50" },
    { label: "Overdue", value: totals.overdue, colour: "text-red-600", bg: "bg-red-50" },
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
            <p className={`text-2xl font-black font-serif ${c.colour}`}>{c.value}</p>
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
          {totals.hasSubmissions} of {totals.total} indicators have been submitted
        </p>
      </div>
    </>
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
  type FlatRow = {
    objective: IPerspective["objectives"][number];
    activity: IPerspective["objectives"][number]["activities"][number];
    indicator: IIndicator;
  };

  const flatRows: FlatRow[] = [];

  for (const objective of perspective.objectives) {
    for (const activity of objective.activities) {
      for (const indicator of activity.indicators) {
        flatRows.push({
          objective,
          activity,
          indicator,
        });
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

      {flatRows.map(({ objective, activity, indicator }, index) => {
        getIndex();
        
        // Determine if this is the first activity for this objective
        let isFirstForObjective = false;
        if (index === 0) {
          isFirstForObjective = true;
        } else {
          const prevRow = flatRows[index - 1];
          isFirstForObjective = prevRow.objective.id !== objective.id;
        }

        // The indicator label is the objective title (only shown once per objective)
        const indicatorLabel = objective.title?.trim() || activity.description;

        // Check if indicator has submissions
        const hasSubmissions = indicator.submissions && indicator.submissions.length > 0;

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
              
              {/* Show submission summary */}
              {indicator.submissions && indicator.submissions.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {[...indicator.submissions]
                    .sort((a, b) => {
                      if (a.year !== b.year) return a.year - b.year;
                      return a.quarter - b.quarter;
                    })
                    .filter(s => s.reviewStatus !== 'Rejected' && s.reviewStatus !== 'Correction Needed')
                    .map((sub, idx) => {
                      const periodLabel = sub.quarter === 0 ? 'Annual' : `Q${sub.quarter}`;
                      return (
                        <div key={idx} className="text-[9px] text-slate-500">
                          <span className="font-medium">{periodLabel} {sub.year}:</span>
                          <span className={`ml-1 ${
                            sub.reviewStatus === 'Accepted' ? 'text-emerald-600' :
                            sub.reviewStatus === 'Verified' ? 'text-blue-600' :
                            sub.reviewStatus === 'Partially Approved' ? 'text-purple-600' :
                            'text-amber-600'
                          }`}>
                            {sub.reviewStatus}
                          </span>
                          {sub.documents && sub.documents.length > 0 && (
                            <span className="ml-1 text-slate-400">
                              ({sub.documents.length} doc{sub.documents.length !== 1 ? 's' : ''})
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

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"all" | "submitted">("all");

  const buildFilters = useCallback((): ReportFilters => {
    const apiFilters: ReportFilters = {};
    
    if (statusFilter) {
      apiFilters.status = statusFilter;
    }

    if (viewMode === "submitted") {
      apiFilters.hasSubmission = "true";
      apiFilters.submissionStatus = "Accepted,Verified,Partially Approved";
    }

    return apiFilters;
  }, [statusFilter, viewMode]);

  useEffect(() => {
    dispatch(fetchReportSummary());
    dispatch(fetchTrackerReport(buildFilters()));
  }, [dispatch, buildFilters]);

  useEffect(() => {
    dispatch(fetchTrackerReport(buildFilters()));
  }, [dispatch, buildFilters]);

  const visibleData: IPerspective[] = data;

  const handleDownloadPdf = () => {
    const pdfFilters: ReportFilters = { ...filters };
    
    if (viewMode === "submitted") {
      pdfFilters.hasSubmission = "true";
      pdfFilters.submissionStatus = "Accepted,Verified,Partially Approved";
    }
    
    dispatch(downloadTrackerPdf(pdfFilters));
  };

  const handleClearFilters = () => {
    setStatusFilter("");
    setViewMode("all");
    dispatch(clearReportFilters());
  };

  const handleRefresh = useCallback(() => {
    dispatch(fetchTrackerReport(buildFilters()));
  }, [dispatch, buildFilters]);

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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode("submitted")}
              className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                viewMode === "submitted"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Submitted Only
            </button>
            <button
              onClick={() => setViewMode("all")}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[9px] font-black uppercase tracking-wider border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-600
                       focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 focus:border-[#1d3331] transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Complete</option>
            <option value="Partially Approved">Partially Approved</option>
            <option value="Incomplete">Incomplete</option>
          </select>

          {(statusFilter !== "" || viewMode !== "all") && (
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
        
        {/* Show active filter count */}
        {viewMode === "submitted" && (
          <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
            Showing Completed & Partially Approved
          </div>
        )}
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
              {visibleData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-[11px] text-slate-400 font-bold uppercase tracking-widest"
                  >
                    No indicators found.
                  </td>
                </tr>
              ) : (
                visibleData.map((perspective) => (
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