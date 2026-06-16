import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Loader2,
  User,
  MessageSquare,
  Clock,
  ChevronRight,
  ArrowLeft,
  History as HistoryIcon,
  AlertOctagon,
  ShieldAlert,
  CalendarDays,
  Layers,
  FileSearch,
  FileText,
  ExternalLink,
  RotateCcw,
  XCircle,
  FileWarning,
  TrendingDown,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAllAdminIndicators,
  setSelectedIndicator,
  type ISubmission,
  type IDocument,
  type IReviewHistoryEntry,
  hasEverBeenRejected,
  getRejectionCount,
  getMaxResubmissionCount,
  getLatestRejectedSubmission,
  getRejectedSubmissions,
} from "../../store/slices/adminIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// All timestamps now show date + time
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

const getQuarterLabel = (quarter: number, year: number): string =>
  quarter === 0 || quarter === 1
    ? `Annual ${year}`
    : `Q${quarter} ${year}`;

/**
 * Collect all unique rejected documents from all rejected submission rows,
 * keeping the most recent version of each document by id.
 */
const getUniqueRejectedDocuments = (
  rejectedSubs: ISubmission[]
): Array<{ document: IDocument; submission: ISubmission }> => {
  const map = new Map<string, { document: IDocument; submission: ISubmission }>();

  for (const sub of rejectedSubs) {
    for (const doc of sub.documents ?? []) {
      const existing = map.get(doc.id);
      if (
        !existing ||
        new Date(sub.submittedAt) > new Date(existing.submission.submittedAt)
      ) {
        map.set(doc.id, { document: doc, submission: sub });
      }
    }
  }

  return Array.from(map.values());
};

/**
 * Get the most recent rejection action from reviewHistory,
 * including the reviewer name and timestamp.
 */
const getLatestRejectionFromHistory = (
  reviewHistory?: IReviewHistoryEntry[]
): IReviewHistoryEntry | undefined => {
  if (!reviewHistory) return undefined;
  return reviewHistory
    .filter(
      (entry) =>
        entry.action.includes("Reject") || entry.action === "Correction Requested"
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminRejections = () => {
  const dispatch = useAppDispatch();
  const { allAssignments, isLoading } = useAppSelector(
    (state) => state.adminIndicators
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchAllAdminIndicators({ status: "all" }));
  }, [dispatch]);

  /**
   * Show indicators that are currently rejected OR have ever been rejected
   * (i.e. have at least one preserved "Rejected" submission row).
   */
  const rejectedItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return allAssignments.filter((ind) => {
      const isCurrentlyRejected =
        ind.status === "Rejected by Admin" ||
        ind.status === "Rejected by Super Admin";
      const wasEverRejected = hasEverBeenRejected(ind);

      if (!isCurrentlyRejected && !wasEverRejected) return false;
      if (!searchTerm) return true;

      return (
        ind.activity?.description?.toLowerCase().includes(searchLower) ||
        ind.objective?.title?.toLowerCase().includes(searchLower) ||
        ind.assigneeName?.toLowerCase().includes(searchLower) ||
        ind.reportingCycle?.toLowerCase().includes(searchLower)
      );
    });
  }, [allAssignments, searchTerm]);

  if (isLoading && allAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-red-900 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-red-900">
          Accessing Rejection Archive...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fdfcfc] min-h-screen font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            REJECTION ARCHIVE
            <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">
              {rejectedItems.length} Records
            </span>
          </h1>
          <p className="text-sm text-gray-500 font-medium italic mt-1">
            Full history of declined submissions, including resubmitted cases.
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by officer, activity, or cycle..."
            className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-red-600/5 transition-all w-full md:w-96 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Empty States ── */}
      {rejectedItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          {searchTerm ? (
            <>
              <FileSearch className="mx-auto mb-4 text-gray-200" size={48} />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                No Matches Found for "{searchTerm}"
              </h2>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-xs font-bold text-red-600 underline"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <ShieldAlert className="mx-auto mb-4 text-gray-200" size={48} />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                Archive Empty — No Rejection Records
              </h2>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {rejectedItems.map((indicator) => {
            const isViewingHistory = selectedHistoryId === indicator.id;
            const isAnnual = indicator.reportingCycle === "Annual";
            const isCurrentlyRejected =
              indicator.status === "Rejected by Admin" ||
              indicator.status === "Rejected by Super Admin";

            // Derived rejection stats from preserved submission rows
            const rejectionCount = getRejectionCount(indicator);
            const resubCount = getMaxResubmissionCount(indicator);
            const latestRejection = getLatestRejectedSubmission(indicator);
            const allRejectedSubs = getRejectedSubmissions(indicator);
            const rejectedDocuments = getUniqueRejectedDocuments(allRejectedSubs);
            
            // Get the latest rejection entry from reviewHistory (includes admin name)
            const latestRejectionHistory = getLatestRejectionFromHistory(indicator.reviewHistory);
            const rejectionAdminName = latestRejectionHistory?.reviewerName || "Unknown Admin";
            const rejectionTimestamp = latestRejectionHistory?.at || latestRejection?.submittedAt;

            return (
              <div
                key={indicator.id}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isViewingHistory
                    ? "border-red-600 shadow-xl"
                    : "border-gray-100 shadow-sm hover:border-gray-200"
                }`}
              >
                {isViewingHistory ? (
                  /* ── AUDIT TRAIL VIEW ── */
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                    {/* Trail header */}
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                      <button
                        onClick={() => setSelectedHistoryId(null)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400 hover:text-red-600 transition-colors"
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
                          {indicator.reportingCycle}
                        </span>
                        <div className="text-right border-l pl-4 border-gray-100">
                          <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter block">
                            Audit Case ID
                          </span>
                          <span className="text-[9px] font-medium text-gray-400">
                            #{indicator.id.slice(-8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rejection stats bar */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-red-600">
                          {rejectionCount}
                        </p>
                        <p className="text-[8px] font-black uppercase text-red-400 tracking-widest mt-1">
                          Times Rejected
                        </p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-amber-600">
                          {resubCount}
                        </p>
                        <p className="text-[8px] font-black uppercase text-amber-400 tracking-widest mt-1">
                          Resubmissions
                        </p>
                      </div>
                      <div
                        className={`rounded-xl p-4 text-center border ${
                          isCurrentlyRejected
                            ? "bg-red-50 border-red-100"
                            : "bg-emerald-50 border-emerald-100"
                        }`}
                      >
                        <p
                          className={`text-[11px] font-black uppercase tracking-tight ${
                            isCurrentlyRejected
                              ? "text-red-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {isCurrentlyRejected ? "Still Rejected" : "Resubmitted"}
                        </p>
                        <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mt-1">
                          Current Status
                        </p>
                      </div>
                    </div>

                    {/* Rejected documents */}
                    {rejectedDocuments.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <FileWarning size={16} className="text-red-600" />
                          <h3 className="text-[11px] font-black uppercase tracking-wider text-red-800">
                            Rejected Evidence Documents ({rejectedDocuments.length})
                          </h3>
                        </div>
                        <div className="grid gap-3">
                          {rejectedDocuments.map(({ document, submission }) => (
                            <div
                              key={document.id}
                              className="bg-white rounded-lg p-4 border border-red-100 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-50 rounded-lg">
                                      <FileText size={16} className="text-red-600" />
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-black text-slate-800">
                                        {document.fileName || "Untitled Document"}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[8px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">
                                          {getQuarterLabel(
                                            Number(submission.quarter),
                                            submission.year
                                          )}
                                        </span>
                                        {document.fileType && (
                                          <span className="text-[8px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                                            {document.fileType}
                                          </span>
                                        )}
                                        {document.rejectionReason && (
                                          <span className="text-[8px] font-medium text-red-500 italic">
                                            {document.rejectionReason}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {document.description && (
                                    <p className="text-[10px] text-gray-600 italic ml-11 mt-2">
                                      "{document.description}"
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    setPreviewFile({
                                      url: document.evidenceUrl,
                                      name: document.fileName || "Document",
                                    })
                                  }
                                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Preview document"
                                >
                                  <ExternalLink size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audit timeline - all entries show date+time */}
                    <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                      {indicator.reviewHistory?.map((log, idx) => (
                        <div key={idx} className="relative pl-12">
                          <div
                            className={`absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center z-10 border-2 ${
                              log.action.includes("Reject") ||
                              log.action === "Correction Requested"
                                ? "bg-red-50 border-red-100 text-red-600"
                                : "bg-gray-50 border-gray-100 text-gray-400"
                            }`}
                          >
                            <Clock size={14} />
                          </div>
                          <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                                  {log.action.replace(/_/g, " ")}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                                    <User size={10} />
                                    {log.reviewerName || "System / Admin"}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase">
                                {formatDateTime(log.at)}
                              </span>
                            </div>
                            <p className="text-[12px] text-gray-600 font-medium leading-relaxed italic border-l-2 border-red-200 pl-3">
                              {log.reason || "Formal notification: Requirements not met."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── OVERVIEW CARD ── */
                  <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-50">

                    {/* Left — identity */}
                    <div className="p-6 lg:w-1/3 bg-gray-50/30">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertOctagon size={14} className="text-red-600" />
                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
                          {isCurrentlyRejected ? indicator.status : "Previously Rejected"}
                        </span>
                        <span
                          className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1 ${
                            isAnnual
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {isAnnual ? (
                            <CalendarDays size={10} />
                          ) : (
                            <Layers size={10} />
                          )}
                          {indicator.reportingCycle}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 leading-snug mb-4">
                        {indicator.activity?.description}
                      </h3>

                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">
                          Primary Assignee
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold uppercase">
                            {indicator.assigneeName?.charAt(0)}
                          </div>
                          <span className="text-[11px] font-bold text-slate-700">
                            {indicator.assigneeName}
                          </span>
                        </div>
                      </div>

                      {/* Rejection / resubmission counters */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-red-600">
                          <XCircle size={12} />
                          <span className="text-[9px] font-black uppercase">
                            {rejectionCount}× rejected
                          </span>
                        </div>
                        {resubCount > 0 && (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <RotateCcw size={12} />
                            <span className="text-[9px] font-black uppercase">
                              {resubCount}× resubmitted
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Centre — rejection narrative with admin name and timestamp */}
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <MessageSquare size={12} /> Rejection Narrative
                        </span>
                        <span className="text-[9px] font-bold text-gray-300">
                          Updated: {formatDateTime(indicator.updatedAt)}
                        </span>
                      </div>

                      <div className="bg-white border border-red-50 p-4 rounded-xl shadow-inner">
                        <p className="text-[12px] text-red-900 font-medium italic leading-relaxed">
                          "
                          {indicator.adminOverallComments ||
                            latestRejection?.adminComment ||
                            "Documentation provided does not align with the statutory reporting guidelines."}
                          "
                        </p>
                        {/* Show who rejected and when */}
                        {rejectionTimestamp && (
                          <div className="mt-2 text-[9px] font-bold text-red-500 border-t border-red-100 pt-2 flex justify-between items-center">
                            <span>Rejected by: {rejectionAdminName}</span>
                            <span>on {formatDateTime(rejectionTimestamp)}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-6">
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
                            {isAnnual
                              ? latestRejection?.year ?? new Date().getFullYear()
                              : `Q${latestRejection?.quarter ?? indicator.activeQuarter}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">
                            Review Cycle
                          </p>
                          <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <TrendingDown size={10} />
                            Attempt #{resubCount + 1}
                          </p>
                        </div>
                      </div>

                      {/* Rejected docs summary in overview */}
                      {rejectedDocuments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-red-500 mb-2">
                            <FileWarning size={12} />
                            <span className="text-[9px] font-black uppercase tracking-wider">
                              {rejectedDocuments.length} Rejected Document
                              {rejectedDocuments.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {rejectedDocuments.slice(0, 3).map(({ document }) => (
                              <span
                                key={document.id}
                                className="text-[8px] font-bold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-lg truncate max-w-[120px]"
                                title={document.fileName}
                              >
                                {document.fileName || "Untitled"}
                              </span>
                            ))}
                            {rejectedDocuments.length > 3 && (
                              <span className="text-[8px] font-black text-red-400">
                                +{rejectedDocuments.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right — actions */}
                    <div className="p-6 lg:w-56 bg-gray-50/30 flex flex-col justify-center gap-2">
                      <button
                        onClick={() => setSelectedHistoryId(indicator.id)}
                        className="w-full bg-[#1a3a32] text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        <HistoryIcon size={14} /> Audit History
                      </button>
                      <button
                        onClick={() => dispatch(setSelectedIndicator(indicator))}
                        className="w-full bg-white border border-gray-200 text-gray-500 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
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

      {/* ── File Preview Modal ── */}
      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default AdminRejections;