import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchRejectedSubmissions,
  getRejectedSubmission,
  type IIndicatorUI,
  type ISubmissionUI,
  type IDocumentUI,
} from "../../store/slices/userIndicatorSlice";
import FilePreviewModal from "../PreviewModal";
import {
  AlertTriangle,
  Loader2,
  ArrowRight,
  FileText,
  Calendar,
  CheckCircle2,
  Eye,
  Download,
  XCircle,
  Clock,
  MessageSquare,
  Search,
  AlertOctagon,
  Layers,
  CalendarDays,
  FileWarning,
  TrendingDown,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  History as HistoryIcon,
  ExternalLink,
} from "lucide-react";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const formatDateTime = (dateStr?: string | Date): string => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normaliseQuarter = (quarter: number): string =>
  quarter === 0 ? "Annual" : `Q${quarter}`;

const getQuarterLabel = (quarter: number, year: number): string =>
  quarter === 0 || quarter === 1 ? `Annual ${year}` : `Q${quarter} ${year}`;

const getRejectedLatestSubmissions = (indicator: IIndicatorUI): ISubmissionUI[] => {
  const seen = new Set<string>();
  return Object.entries(indicator.submissions ?? {})
    .map(([, bucket]) => {
      const rejected = getRejectedSubmission(bucket as ISubmissionUI[]);
      return rejected ?? null;
    })
    .filter((s): s is ISubmissionUI => {
      if (!s) return false;
      const key = String(s.quarter);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const hasActivePendingResubmission = (
  indicator: IIndicatorUI,
  quarter: number
): boolean => {
  const currentYear = new Date().getFullYear();
  const key = `${normaliseQuarter(quarter)}_${currentYear}`;
  const bucket = indicator.submissions?.[key];
  if (!bucket) return false;
  return (
    bucket.some((s) => s.reviewStatus === "Pending") &&
    bucket.some((s) => s.reviewStatus === "Rejected")
  );
};

const getRejectedDocuments = (submission: ISubmissionUI): IDocumentUI[] =>
  (submission.documents ?? []).filter((doc) => doc.status === "Rejected");

const getLatestRejectedSubmission = (
  submissions: ISubmissionUI[]
): ISubmissionUI | undefined =>
  submissions
    .filter((s) => s.reviewStatus === "Rejected")
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    })[0];

/* ─── Document List Item (for overview card) ─────────────────────────────── */
const DocumentListItem = ({
  document,
  quarterLabel,
  year,
  onPreview,
}: {
  document: IDocumentUI;
  quarterLabel: string;
  year: number;
  onPreview: (url: string, name: string) => void;
}) => {
  const fileName =
    document.fileName || document.evidenceUrl?.split("/").pop() || "Untitled";

  return (
    <div className="bg-white rounded-lg p-3 border border-red-100 hover:shadow-md transition-all flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText size={14} className="text-red-500 shrink-0" />
          <span className="text-[11px] font-bold text-slate-800 truncate" title={fileName}>
            {fileName}
          </span>
          <span className="text-[8px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">
            {quarterLabel} {year}
          </span>
        </div>
        {document.rejectionReason && (
          <p className="text-[10px] text-red-600 italic mt-1 truncate">
            {document.rejectionReason}
          </p>
        )}
      </div>
      <button
        onClick={() => document.evidenceUrl && onPreview(document.evidenceUrl, fileName)}
        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors shrink-0"
        title="Preview document"
      >
        <ExternalLink size={14} />
      </button>
    </div>
  );
};

/* ─── Expanded document card (detail view) ────────────────────────────────── */
const RejectedDocumentCard = ({
  document,
  quarterLabel,
  year,
  onPreview,
}: {
  document: IDocumentUI;
  quarterLabel: string;
  year: number;
  onPreview: (url: string, name: string) => void;
}) => {
  const fileName =
    document.fileName || document.evidenceUrl?.split("/").pop() || "Untitled";
  const fileExt = fileName.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(fileExt);
  const isPdf = fileExt === "pdf";

  return (
    <div className="bg-white rounded-xl border border-red-100 overflow-hidden hover:shadow-md transition-all">
      <div className="flex items-center justify-between p-3 bg-red-50/30 border-b border-red-100">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">
            {isImage ? (
              <img
                src={document.evidenceUrl}
                alt="preview"
                className="w-6 h-6 object-cover rounded"
                onError={(e) =>
                  ((e.target as HTMLImageElement).style.display = "none")
                }
              />
            ) : (
              <FileText
                size={16}
                className={isPdf ? "text-red-500" : "text-gray-400"}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-700 truncate" title={fileName}>
              {fileName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black uppercase text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                Rejected
              </span>
              <span className="text-[8px] text-gray-400">
                {quarterLabel} {year}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() =>
              document.evidenceUrl && onPreview(document.evidenceUrl, fileName)
            }
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
            title="Preview"
          >
            <Eye size={14} className="text-gray-500 hover:text-[#1a3a32]" />
          </button>
          <button
            onClick={() =>
              document.evidenceUrl && window.open(document.evidenceUrl, "_blank")
            }
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
            title="Download"
          >
            <Download size={14} className="text-gray-500 hover:text-[#1a3a32]" />
          </button>
        </div>
      </div>

      {document.description && (
        <div className="px-3 py-2 bg-white">
          <p className="text-[10px] text-gray-500 italic leading-relaxed">
            "{document.description}"
          </p>
        </div>
      )}

      {document.rejectionReason && (
        <div className="px-3 py-2 bg-red-50/20 border-t border-red-100">
          <div className="flex items-start gap-1.5">
            <XCircle size={10} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-[9px] text-red-600 font-medium">
              {document.rejectionReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────────────── */
const UserRejections = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { rejectedIndicators, loading, error } = useAppSelector(
    (s) => s.userIndicators
  );

  const [searchTerm, setSearchTerm]   = useState("");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchRejectedSubmissions());
  }, [dispatch]);

  const filteredIndicators = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return rejectedIndicators;
    return rejectedIndicators.filter((ind) => {
      const activity  = ind.activity?.description?.toLowerCase()  || "";
      const objective = ind.objective?.title?.toLowerCase()        || "";
      const name      = ind.name?.toLowerCase()                    || "";
      const cycle     = ind.reporting_cycle?.toLowerCase()         || "";
      return (
        activity.includes(term) ||
        objective.includes(term) ||
        name.includes(term) ||
        cycle.includes(term)
      );
    });
  }, [rejectedIndicators, searchTerm]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-[#1a3a32] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">
          Loading Rejection Archive...
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-red-50 p-4 rounded-full">
          <AlertTriangle size={36} className="text-red-400" />
        </div>
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={() => dispatch(fetchRejectedSubmissions())}
          className="px-6 py-2.5 rounded-xl bg-[#1a3a32] text-white text-[10px]
                     font-black uppercase tracking-widest hover:bg-black transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Empty ── */
  if (rejectedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-emerald-50 p-4 rounded-full">
          <CheckCircle2 size={36} className="text-emerald-400" />
        </div>
        <p className="text-gray-400 font-medium">No rejected submissions found.</p>
        <p className="text-[9px] text-gray-300 uppercase tracking-widest">
          All filings are in good standing
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-10 bg-[#fdfcfc] min-h-screen font-sans">

        {/* ── Header — matches admin "REJECTION ARCHIVE" style ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight flex items-center gap-3">
              REJECTION ARCHIVE
              <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded-md
                               font-bold uppercase tracking-widest">
                {filteredIndicators.length} Records
              </span>
            </h1>
            <p className="text-sm text-gray-500 font-serif font-medium italic mt-1">
              Full history of declined submissions, including resubmitted cases.
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by officer, activity, or cycle..."
              className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-xl
                         text-[11px] font-bold outline-none focus:ring-4
                         focus:ring-red-600/5 transition-all w-full md:w-96 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ── Empty search state ── */}
        {filteredIndicators.length === 0 && searchTerm && (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
            <AlertTriangle className="mx-auto mb-4 text-gray-200" size={48} />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              No Matches Found for "{searchTerm}"
            </h2>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 text-xs font-bold text-red-600 underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* ── Cards ── */}
        {filteredIndicators.length > 0 && (
          <div className="space-y-6">
            {filteredIndicators.map((indicator) => {
              const isExpanded             = expandedId === indicator.id;
              const rejectedSubmissions    = getRejectedLatestSubmissions(indicator);
              const latestRejection        = getLatestRejectedSubmission(rejectedSubmissions);
              const rejectedQuartersCount  = rejectedSubmissions.length;
              const isAnnual               = indicator.reporting_cycle === "Annual";
              const hasPendingResubmission = rejectedSubmissions.some((sub) =>
                hasActivePendingResubmission(indicator, sub.quarter)
              );
              const adminComment =
                latestRejection?.adminComment ||
                "Documentation does not meet the required standards.";

              /* ── Build list of all rejected documents with quarter info ── */
              const allRejectedDocsWithQuarter = rejectedSubmissions.flatMap((sub) =>
                getRejectedDocuments(sub).map((doc) => ({
                  document: doc,
                  quarterLabel: normaliseQuarter(sub.quarter),
                  year: sub.year,
                }))
              );

              return (
                <div
                  key={indicator.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isExpanded
                      ? "border-red-600 shadow-xl"
                      : "border-gray-100 shadow-sm hover:border-gray-200"
                  }`}
                >
                  {/* ════════════════════════════════════════════════════
                      EXPANDED VIEW
                  ════════════════════════════════════════════════════ */}
                  {isExpanded ? (
                    <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                      {/* Top bar */}
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                        <button
                          onClick={() => setExpandedId(null)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase
                                     text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <ArrowLeft size={14} /> Return to Archive
                        </button>
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-[9px] px-2 py-1 rounded font-black uppercase ${
                              isAnnual
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {indicator.reporting_cycle}
                          </span>
                          <div className="text-right border-l pl-4 border-gray-100">
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter block">
                              Case ID
                            </span>
                            <span className="text-[9px] font-medium text-gray-400">
                              #{indicator.id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-black text-red-600">
                            {rejectedQuartersCount}
                          </p>
                          <p className="text-[8px] font-black uppercase text-red-400 tracking-widest mt-1">
                            Rejected Quarters
                          </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                          <p className="text-2xl font-black text-amber-600">
                            {rejectedSubmissions.reduce(
                              (acc, s) => acc + (s.resubmissionCount || 0),
                              0
                            )}
                          </p>
                          <p className="text-[8px] font-black uppercase text-amber-400 tracking-widest mt-1">
                            Total Resubmissions
                          </p>
                        </div>
                        <div
                          className={`rounded-xl p-4 text-center border ${
                            hasPendingResubmission
                              ? "bg-sky-50 border-sky-100"
                              : "bg-red-50 border-red-100"
                          }`}
                        >
                          <p
                            className={`text-[11px] font-black uppercase tracking-tight ${
                              hasPendingResubmission
                                ? "text-sky-600"
                                : "text-red-600"
                            }`}
                          >
                            {hasPendingResubmission
                              ? "Resubmitted – Pending"
                              : "Needs Action"}
                          </p>
                          <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mt-1">
                            Current Status
                          </p>
                        </div>
                      </div>

                      {/* Quarter-level breakdowns */}
                      {rejectedSubmissions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          No rejected quarters found.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {rejectedSubmissions.map((submission) => {
                            const quarterLabel = normaliseQuarter(submission.quarter);
                            const isPending    = hasActivePendingResubmission(
                              indicator,
                              submission.quarter
                            );
                            const rejectedDocs = getRejectedDocuments(submission);

                            return (
                              <div
                                key={`${submission.quarter}-${submission.id}`}
                                className="bg-gray-50/50 rounded-xl p-6 border border-gray-100"
                              >
                                {/* Quarter header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-[#1a3a32] text-white px-3 py-1.5 rounded-xl">
                                      <span className="text-[11px] font-black uppercase tracking-wider">
                                        {quarterLabel} {submission.year}
                                      </span>
                                    </div>
                                    {isPending ? (
                                      <span className="flex items-center gap-1.5 bg-sky-50 text-sky-600
                                                       border border-sky-100 px-3 py-1.5 rounded-full
                                                       text-[9px] font-bold uppercase tracking-wider">
                                        <Clock size={10} />
                                        Resubmitted — Awaiting Review
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 bg-red-50 text-red-600
                                                       border border-red-100 px-3 py-1.5 rounded-full
                                                       text-[9px] font-bold uppercase tracking-wider">
                                        <XCircle size={10} />
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                  {!isPending && (
                                    <button
                                      onClick={() =>
                                        navigate(`/user/assignments/${indicator.id}`, {
                                          state: { highlightQuarter: submission.quarter },
                                        })
                                      }
                                      className="self-start sm:self-auto px-4 py-2 rounded-xl
                                                 bg-[#1a3a32] text-white text-[9px] font-black
                                                 uppercase tracking-widest flex items-center gap-2
                                                 hover:bg-black transition-all shadow-sm"
                                    >
                                      Resubmit <ArrowRight size={12} />
                                    </button>
                                  )}
                                </div>

                                {/* Reviewer feedback — amber box matching admin */}
                                {submission.adminComment && (
                                  <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 mb-5">
                                    <div className="flex items-start gap-2">
                                      <MessageSquare
                                        size={14}
                                        className="text-amber-600 mt-0.5 shrink-0"
                                      />
                                      <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">
                                          Reviewer Feedback
                                        </p>
                                        <p className="text-[12px] text-amber-800 font-medium leading-relaxed">
                                          {submission.adminComment}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Rejected docs grid */}
                                {rejectedDocs.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <FileWarning size={12} className="text-red-500" />
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600">
                                        Rejected Documents ({rejectedDocs.length})
                                      </h4>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                      {rejectedDocs.map((doc) => (
                                        <RejectedDocumentCard
                                          key={doc.id}
                                          document={doc}
                                          quarterLabel={quarterLabel}
                                          year={submission.year}
                                          onPreview={(url, name) =>
                                            setPreviewFile({ url, name })
                                          }
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Footer meta */}
                                <div className="flex flex-wrap items-center gap-4 mt-5 pt-4
                                                border-t border-gray-100 text-[9px] text-gray-400">
                                  {submission.submittedAt && (
                                    <span className="flex items-center gap-1.5">
                                      <Calendar size={10} />
                                      Submitted: {formatDateTime(submission.submittedAt)}
                                    </span>
                                  )}
                                  {submission.resubmissionCount > 0 && (
                                    <span className="flex items-center gap-1.5">
                                      <Clock size={10} />
                                      Attempt #{submission.resubmissionCount + 1}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  ) : (
                    /* ════════════════════════════════════════════════════
                        OVERVIEW CARD — mirrors admin card layout exactly
                    ════════════════════════════════════════════════════ */
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-50">

                      {/* LEFT PANEL */}
                      <div className="p-6 lg:w-1/3 bg-gray-50/30">
                        {/* Status + cycle badges */}
                        <div className="flex items-center gap-2 mb-4">
                          <AlertOctagon size={14} className="text-red-600" />
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                            Previously Rejected
                          </span>
                          <span
                            className={`text-[8px] px-2 py-0.5 rounded font-black uppercase
                                        tracking-tighter flex items-center gap-1 border ${
                              isAnnual
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}
                          >
                            {isAnnual ? (
                              <CalendarDays size={10} />
                            ) : (
                              <Layers size={10} />
                            )}
                            {indicator.reporting_cycle}
                          </span>
                        </div>

                        {/* Activity title */}
                        <h3 className="text-sm font-bold text-slate-800 leading-snug mb-4">
                          {indicator.activity?.description ||
                            indicator.objective?.title ||
                            indicator.name}
                        </h3>

                        {/* Assignee */}
                        <div className="space-y-1 mb-4">
                          <p className="text-[9px] font-bold text-gray-400 uppercase">
                            Primary Assignee
                          </p>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full bg-slate-200 flex items-center
                                         justify-center text-[8px] font-bold uppercase"
                            >
                              {indicator.assigneeName?.charAt(0) || "?"}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">
                              {indicator.assigneeName || "Unassigned"}
                            </span>
                          </div>
                        </div>

                        {/* Rejection + resubmission count pills */}
                        <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-red-600">
                            <XCircle size={12} />
                            <span className="text-[9px] font-black uppercase">
                              {rejectedQuartersCount}x Rejected
                            </span>
                          </div>
                          {hasPendingResubmission && (
                            <div className="flex items-center gap-1.5 text-sky-600">
                              <RotateCcw size={12} />
                              <span className="text-[9px] font-black uppercase">
                                {rejectedSubmissions.filter((s) =>
                                  hasActivePendingResubmission(indicator, s.quarter)
                                ).length}x Resubmitted
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* MIDDLE PANEL — Rejection Narrative + Documents */}
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[9px] font-bold text-gray-400 uppercase
                                           tracking-widest flex items-center gap-1">
                            <MessageSquare size={12} /> Rejection Narrative
                          </span>
                          <span className="text-[9px] font-bold text-gray-300">
                            Updated: {formatDateTime(indicator.updatedAt as string | undefined)}
                          </span>
                        </div>

                        {/* Narrative box */}
                        <div className="bg-white border border-red-50 p-4 rounded-xl shadow-inner mb-4">
                          <p className="text-[12px] text-red-900 font-medium italic leading-relaxed">
                            "{adminComment}"
                          </p>
                          {latestRejection?.submittedAt && (
                            <div className="mt-2 text-[9px] font-bold text-red-500
                                            border-t border-red-100 pt-2 flex justify-between">
                              <span>Rejected by: Admin</span>
                              <span>on {formatDateTime(latestRejection.submittedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Meta stats row */}
                        <div className="flex gap-6 mb-4">
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              Target / Unit
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              {indicator.target} {indicator.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              {isAnnual ? "Reporting Year" : "Deficiency Quarter"}
                            </p>
                            <p
                              className={`text-xs font-bold ${
                                isAnnual ? "text-slate-700" : "text-red-600"
                              }`}
                            >
                              {latestRejection
                                ? getQuarterLabel(
                                    latestRejection.quarter,
                                    latestRejection.year
                                  )
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              Review Cycle
                            </p>
                            <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                              <TrendingDown size={10} />
                              Attempt #
                              {latestRejection?.resubmissionCount !== undefined
                                ? latestRejection.resubmissionCount + 1
                                : "?"}
                            </p>
                          </div>
                        </div>

                        {/* ── Rejected Documents (LIST) ── */}
                        {allRejectedDocsWithQuarter.length > 0 && (
                          <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-red-500 mb-3">
                              <FileWarning size={12} />
                              <span className="text-[9px] font-black uppercase tracking-wider">
                                Rejected Evidence Documents ({allRejectedDocsWithQuarter.length})
                              </span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {allRejectedDocsWithQuarter.map(({ document, quarterLabel, year }) => (
                                <DocumentListItem
                                  key={document.id}
                                  document={document}
                                  quarterLabel={quarterLabel}
                                  year={year}
                                  onPreview={(url, name) => setPreviewFile({ url, name })}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RIGHT PANEL — Actions */}
                      <div className="p-6 lg:w-56 bg-gray-50/30 flex flex-col justify-center gap-2">
                        <button
                          onClick={() => setExpandedId(indicator.id)}
                          className="w-full bg-[#1a3a32] text-white py-2.5 rounded-lg
                                     text-[10px] font-bold uppercase tracking-widest
                                     hover:bg-slate-800 transition-all flex items-center
                                     justify-center gap-2"
                        >
                          <HistoryIcon size={14} /> Audit History
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/user/assignments/${indicator.id}`, {
                              state: { highlightQuarter: latestRejection?.quarter },
                            })
                          }
                          className="w-full bg-white border border-gray-200 text-gray-500
                                     py-2.5 rounded-lg text-[10px] font-bold uppercase
                                     tracking-widest hover:bg-gray-50 transition-all
                                     flex items-center justify-center gap-2"
                        >
                          View Dossier <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── File Preview Modal ── */}
      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
};

export default UserRejections;