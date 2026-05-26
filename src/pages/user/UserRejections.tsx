import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchRejectedSubmissions,
  getRejectedSubmission,
  type IIndicatorUI,
  type ISubmissionUI,
} from "../../store/slices/userIndicatorSlice";
import {
  AlertTriangle,
  Loader2,
  ArrowRight,
  FileText,
  Calendar,
  CheckCircle2,
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
 * slice’s `getRejectedSubmission` helper) rather than assuming bucket[0] is Rejected.
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

/* ─── Extended type (backend adds `rejectedQuarters`) ────────────────────── */
interface IIndicatorWithRejectedQuarters extends IIndicatorUI {
  rejectedQuarters?: string[];
}

/* ─── Component ───────────────────────────────────────────────────────────── */

const UserRejections = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { rejectedIndicators, loading, error } = useAppSelector(
    (s) => s.userIndicators,
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchRejectedSubmissions());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#1a3a32]" size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertTriangle size={36} className="text-rose-400" />
        <p className="text-rose-500 font-medium">{error}</p>
        <button
          onClick={() => dispatch(fetchRejectedSubmissions())}
          className="px-4 py-2 rounded-lg bg-[#1a3a32] text-white text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (rejectedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <CheckCircle2 size={48} className="text-emerald-300" />
        <p className="text-gray-400 font-medium">No rejected submissions.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-[#1a3a32] tracking-tight">
          Rejected Submissions
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          {rejectedIndicators.length} indicator
          {rejectedIndicators.length !== 1 ? "s" : ""} with quarters requiring
          attention
        </p>
      </div>

      <div className="space-y-4">
        {rejectedIndicators.map((indicatorRaw) => {
          const indicator = indicatorRaw as IIndicatorWithRejectedQuarters;
          const rejectedSubmissions = getRejectedLatestSubmissions(indicator);
          const isExpanded = expandedId === indicator.id;

          return (
            <div
              key={indicator.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <button
                type="button"
                onClick={() =>
                  setExpandedId(isExpanded ? null : indicator.id)
                }
                className="w-full text-left px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1a3a32] truncate">
                    {indicator.activity?.description ||
                      indicator.objective?.title ||
                      indicator.name ||
                      indicator.id}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {indicator.reporting_cycle}
                    </span>
                    {indicator.rejectedQuarters &&
                      indicator.rejectedQuarters.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          <AlertTriangle size={10} />
                          {indicator.rejectedQuarters.length} quarter
                          {indicator.rejectedQuarters.length !== 1 ? "s" : ""}{" "}
                          rejected
                        </span>
                      )}
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className={`text-gray-300 shrink-0 mt-0.5 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expanded quarters */}
              {isExpanded && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                  {rejectedSubmissions.length === 0 ? (
                    <p className="px-6 py-4 text-[12px] text-gray-400 italic">
                      No rejected quarters found.
                    </p>
                  ) : (
                    rejectedSubmissions.map((submission) => {
                      const quarterLabel = normaliseQuarter(submission.quarter);
                      const isPendingResubmission = hasActivePendingResubmission(
                        indicator,
                        submission.quarter,
                      );

                      return (
                        <div
                          key={`${submission.quarter}-${submission.id}`}
                          className="px-6 py-4"
                        >
                          {/* Quarter + status row */}
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black uppercase tracking-widest text-[#1a3a32]">
                                {quarterLabel} {submission.year}
                              </span>
                              {isPendingResubmission ? (
                                <span className="bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                  Resubmitted — awaiting review
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                  Rejected
                                </span>
                              )}
                            </div>

                            {!isPendingResubmission && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/user/indicators/${indicator.id}?quarter=${submission.quarter}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#1a3a32] text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:opacity-90 transition-all"
                              >
                                Resubmit <ArrowRight size={11} />
                              </button>
                            )}
                          </div>

                          {/* Admin comment */}
                          {submission.adminComment && (
                            <div className="bg-rose-50 border border-rose-100 rounded-lg px-4 py-3 mb-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-1">
                                Reviewer comment
                              </p>
                              <p className="text-[12px] text-rose-700 font-medium leading-relaxed">
                                {submission.adminComment}
                              </p>
                            </div>
                          )}

                          {/* Submission meta */}
                          <div className="flex items-center gap-4 text-[10px] text-gray-400 font-medium">
                            {submission.submittedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(submission.submittedAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            )}
                            {submission.documents?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText size={10} />
                                {submission.documents.length} document
                                {submission.documents.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {submission.resubmissionCount > 0 && (
                              <span>
                                Attempt #{submission.resubmissionCount + 1}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserRejections;