import { useEffect, useState } from "react";
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
  User,
  MessageSquare,
  Paperclip,
} from "lucide-react";

/* ─── Local helpers ───────────────────────────────────────────────────────── */

/**
 * Converts quarter number (0 = Annual, 1-4 = Q1-Q4) to a display prefix.
 * Used to build bucket keys like "Annual_2025" or "Q1_2025".
 */
const normaliseQuarter = (quarter: number): string => {
  if (quarter === 0) return "Annual";
  return `Q${quarter}`;
};

/**
 * Extracts one representative Rejected submission per quarter bucket.
 *
 * With the multi-row accountability model a bucket looks like:
 *   [PendingRow (index 0), RejectedRow (index 1), OlderRejectedRow (index 2)]
 *
 * We scan the whole bucket for the most recent Rejected entry (using the
 * slice's `getRejectedSubmission` helper) rather than assuming bucket[0] is Rejected.
 */
const getRejectedLatestSubmissions = (
  indicator: IIndicatorUI,
): ISubmissionUI[] => {
  const seen = new Set<string>(); // deduplicate by quarter number

  return Object.entries(indicator.submissions ?? {})
    .map(([, bucket]) => {
      const rejected = getRejectedSubmission(bucket);
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

/**
 * Returns true when a bucket has a Pending row sitting on top of a Rejected row —
 * meaning the user already resubmitted and is waiting for review.
 */
const hasActivePendingResubmission = (
  indicator: IIndicatorUI,
  quarter: number,
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

/**
 * Get rejected documents from a submission
 */
const getRejectedDocuments = (submission: ISubmissionUI): IDocumentUI[] => {
  return (submission.documents ?? []).filter((doc) => doc.status === "Rejected");
};

/* ─── Extended type (backend adds `rejectedQuarters`) ────────────────────── */
interface IIndicatorWithRejectedQuarters extends IIndicatorUI {
  rejectedQuarters?: string[];
}

/* ─── Sub-component: Rejected Document Card ───────────────────────────────── */

interface RejectedDocumentCardProps {
  document: IDocumentUI;
  quarterLabel: string;
  year: number;
  onPreview: (url: string, name: string) => void;
}

const RejectedDocumentCard = ({ document, quarterLabel, year, onPreview }: RejectedDocumentCardProps) => {
  const fileName = document.fileName || document.evidenceUrl?.split("/").pop() || "Untitled";
  const fileExt = fileName.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(fileExt);
  const isPdf = fileExt === "pdf";

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.evidenceUrl) {
      window.open(document.evidenceUrl, "_blank");
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.evidenceUrl) {
      onPreview(document.evidenceUrl, fileName);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-rose-100 overflow-hidden hover:shadow-md transition-all">
      {/* Document header */}
      <div className="flex items-center justify-between p-3 bg-rose-50/30 border-b border-rose-100">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            {isImage ? (
              <img
                src={document.evidenceUrl}
                alt="preview"
                className="w-6 h-6 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : isPdf ? (
              <FileText size={16} className="text-rose-500" />
            ) : (
              <FileText size={16} className="text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-700 truncate" title={fileName}>
              {fileName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded-full">
                Rejected
              </span>
              <span className="text-[8px] text-gray-400">
                {quarterLabel} {year}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePreview}
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
            title="Preview"
          >
            <Eye size={14} className="text-gray-500 hover:text-[#1a3a32]" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-white rounded-lg transition-colors"
            title="Download"
          >
            <Download size={14} className="text-gray-500 hover:text-[#1a3a32]" />
          </button>
        </div>
      </div>

      {/* Document description */}
      {document.description && (
        <div className="px-3 py-2 bg-white">
          <p className="text-[10px] text-gray-500 italic leading-relaxed">
            "{document.description}"
          </p>
        </div>
      )}

      {/* Rejection reason for this specific document */}
      {document.rejectionReason && (
        <div className="px-3 py-2 bg-rose-50/20 border-t border-rose-100">
          <div className="flex items-start gap-1.5">
            <XCircle size={10} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-[9px] text-rose-600 font-medium">
              {document.rejectionReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ───────────────────────────────────────────────────────── */

const UserRejections = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { rejectedIndicators, loading, error } = useAppSelector(
    (s) => s.userIndicators,
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchRejectedSubmissions());
  }, [dispatch]);

  const handlePreview = (url: string, name: string) => {
    setPreviewFile({ url, name });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#1a3a32] mx-auto mb-4" size={36} />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Loading rejected submissions...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-rose-50 p-4 rounded-full">
          <AlertTriangle size={36} className="text-rose-400" />
        </div>
        <p className="text-rose-500 font-medium">{error}</p>
        <button
          onClick={() => dispatch(fetchRejectedSubmissions())}
          className="px-6 py-2.5 rounded-xl bg-[#1a3a32] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

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
      <div className="p-4 md:p-8 lg:p-10 bg-gradient-to-br from-[#fcfdfb] to-[#f8f9fa] min-h-screen font-sans">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-rose-50 rounded-xl">
              <AlertTriangle size={20} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-serif font-black text-[#1a3a32] tracking-tight">
              Rejected Submissions
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">
            {rejectedIndicators.length} indicator
            {rejectedIndicators.length !== 1 ? "s" : ""} require{rejectedIndicators.length === 1 ? "s" : ""} your attention
          </p>
        </div>

        {/* List of rejected indicators */}
        <div className="space-y-4">
          {rejectedIndicators.map((indicatorRaw) => {
            const indicator = indicatorRaw as IIndicatorWithRejectedQuarters;
            const rejectedSubmissions = getRejectedLatestSubmissions(indicator);
            const isExpanded = expandedId === indicator.id;

            return (
              <div
                key={indicator.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : indicator.id)}
                  className="w-full text-left px-6 py-5 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-gray-100 text-gray-500 uppercase tracking-wider">
                        {indicator.reporting_cycle || "Quarterly"}
                      </span>
                      {indicator.assignee_model === "Team" && (
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 uppercase tracking-wider">
                          Team Assignment
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-bold text-[#1a3a32] leading-tight">
                      {indicator.activity?.description ||
                        indicator.objective?.title ||
                        indicator.name ||
                        "Untitled Indicator"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {indicator.reporting_cycle === "Annual" ? "Annual" : "Quarterly"} Reporting
                      </span>
                      {rejectedSubmissions.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          <AlertTriangle size={10} />
                          {rejectedSubmissions.length} quarter{rejectedSubmissions.length !== 1 ? "s" : ""} rejected
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-all ${isExpanded ? "bg-gray-100" : "bg-gray-50"}`}>
                    <ArrowRight
                      size={16}
                      className={`text-gray-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded content - rejected quarters */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30">
                    {rejectedSubmissions.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <p className="text-[11px] text-gray-400 italic">
                          No rejected quarters found.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {rejectedSubmissions.map((submission) => {
                          const quarterLabel = normaliseQuarter(submission.quarter);
                          const isPendingResubmission = hasActivePendingResubmission(
                            indicator,
                            submission.quarter,
                          );
                          const rejectedDocs = getRejectedDocuments(submission);

                          return (
                            <div key={`${submission.quarter}-${submission.id}`} className="p-6">
                              {/* Quarter header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                <div className="flex items-center gap-3">
                                  <div className="bg-[#1a3a32] text-white px-3 py-1.5 rounded-xl">
                                    <span className="text-[11px] font-black uppercase tracking-wider">
                                      {quarterLabel} {submission.year}
                                    </span>
                                  </div>
                                  {isPendingResubmission ? (
                                    <span className="flex items-center gap-1.5 bg-sky-50 text-sky-600 border border-sky-100 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                      <Clock size={10} />
                                      Resubmitted — Awaiting Review
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                      <XCircle size={10} />
                                      Rejected
                                    </span>
                                  )}
                                </div>

                                {!isPendingResubmission && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/user/assignments/${indicator.id}`,
                                        { state: { highlightQuarter: submission.quarter } }
                                      )
                                    }
                                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#1a3a32] text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-sm"
                                  >
                                    Resubmit <ArrowRight size={12} />
                                  </button>
                                )}
                              </div>

                              {/* Admin comment (overall submission rejection) */}
                              {submission.adminComment && (
                                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 mb-5">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare size={14} className="text-amber-600 mt-0.5 shrink-0" />
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

                              {/* Rejected Documents Section */}
                              {rejectedDocs.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Paperclip size={12} className="text-rose-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">
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
                                        onPreview={handlePreview}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Submission metadata */}
                              <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-gray-100 text-[9px] text-gray-400">
                                {submission.submittedAt && (
                                  <span className="flex items-center gap-1.5">
                                    <Calendar size={10} />
                                    Submitted: {new Date(submission.submittedAt).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                )}
                                {submission.resubmissionCount > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <Clock size={10} />
                                    Attempt #{submission.resubmissionCount + 1}
                                  </span>
                                )}
                                {submission.submittedAt && (
                                  <span className="flex items-center gap-1.5">
                                    <User size={10} />
                                    Submitted by: {submission.submittedAt}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
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