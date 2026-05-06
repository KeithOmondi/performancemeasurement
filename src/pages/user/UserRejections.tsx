import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchRejectedSubmissions,
  normaliseQuarter,
} from "../../store/slices/userIndicatorSlice";
import type {
  IRejectedIndicatorUI,
  ISubmissionUI,
  IReviewLog,
} from "../../store/slices/userIndicatorSlice";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  ChevronRight,
  History as HistoryIcon,
  Search,
  ShieldAlert,
  CalendarDays,
  Layers,
  Clock,
  MessageSquare,
} from "lucide-react";

/* ─── HELPERS ────────────────────────────────────────────────────────── */

/**
 * Returns the latest (index-0) submission from each quarter bucket that
 * is currently marked "Rejected". Uses the camelCase reviewStatus field
 * that matches ISubmissionUI after the slice rewrite.
 */
const getRejectedLatestSubmissions = (
  indicator: IRejectedIndicatorUI
): ISubmissionUI[] => {
  return Object.values(indicator.submissions ?? {})
    .map((bucket) => bucket[0])           // index 0 = most recent per quarter
    .filter((s) => s?.reviewStatus === "Rejected");
};

/* ─── COMPONENT ──────────────────────────────────────────────────────── */

const UserRejections = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { rejectedIndicators, loading } = useAppSelector(
    (state) => state.userIndicators
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    dispatch(fetchRejectedSubmissions());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return rejectedIndicators
      .map((ind) => ({
        indicator: ind,
        activeRejections: getRejectedLatestSubmissions(ind),
      }))
      .filter(
        ({ indicator }) =>
          indicator.activity?.description?.toLowerCase().includes(lower) ||
          indicator.objective?.title?.toLowerCase().includes(lower)
      );
  }, [rejectedIndicators, searchTerm]);

  if (loading && rejectedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-[#1a3a32] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Syncing Rejection Archive...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fdfcfc] min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 mb-4 text-[#1a3a32] group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Back
              </span>
            </button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              REJECTION ARCHIVE
              <span className="bg-rose-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">
                {filteredItems.length} Issues
              </span>
            </h1>
          </div>

          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search rejected tasks..."
              className="pl-11 pr-6 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-rose-600/5 transition-all w-full md:w-80 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
            <ShieldAlert className="mx-auto mb-4 text-gray-200" size={48} />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              No Active Rejections
            </h2>
            <p className="text-[11px] text-gray-400 mt-2 font-medium">
              Excellent work! You have no pending corrections to make.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredItems.map(({ indicator, activeRejections }) => {
              const isViewingHistory = selectedHistoryId === indicator.id;
              const isAnnual = indicator.reporting_cycle === "Annual";

              // Most recent rejected submission across all quarter buckets
              const latest = activeRejections[0];

              // Normalised quarter label for display, e.g. "Q2" or "Annual"
              const quarterLabel = latest?.quarter
                ? normaliseQuarter(latest.quarter)
                : null;

              return (
                <div
                  key={indicator.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 ${
                    isViewingHistory
                      ? "border-rose-600 shadow-xl"
                      : "border-gray-100 shadow-sm hover:border-rose-200"
                  }`}
                >
                  {isViewingHistory ? (
                    /* ── AUDIT TRAIL VIEW ── */
                    <div className="p-8 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                        <button
                          onClick={() => setSelectedHistoryId(null)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400 hover:text-rose-600"
                        >
                          <ArrowLeft size={14} /> Back to Overview
                        </button>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          {indicator.reporting_cycle} Audit Trail
                        </span>
                      </div>

                      <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                        {indicator.review_history?.map(
                          (log: IReviewLog, idx: number) => (
                            <div key={idx} className="relative pl-12">
                              <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center z-10 text-gray-400">
                                <Clock size={14} />
                              </div>
                              <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider ${
                                      log.action
                                        ?.toLowerCase()
                                        .includes("reject")
                                        ? "text-rose-600"
                                        : "text-slate-800"
                                    }`}
                                  >
                                    {log.action?.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[9px] font-bold text-gray-400">
                                    {new Date(log.at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[12px] text-gray-600 font-medium italic border-l-2 border-rose-200 pl-3">
                                  "
                                  {log.reason ||
                                    "No feedback comments provided."}
                                  "
                                </p>
                                <div className="mt-2 text-[9px] font-bold text-gray-400 uppercase">
                                  Action By: {log.reviewerName}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── OVERVIEW CARD VIEW ── */
                    <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-50">
                      {/* Left: indicator meta */}
                      <div className="p-6 lg:w-1/3 bg-gray-50/30">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle size={14} className="text-rose-600" />
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                            Revision Required
                          </span>
                          <span
                            className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1 ${
                              isAnnual
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-700"
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
                        <h3 className="text-sm font-bold text-slate-800 leading-snug mb-4">
                          {indicator.activity?.description}
                        </h3>
                        <div className="text-[9px] font-bold text-gray-400 uppercase">
                          Strategic Objective
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-1">
                          {indicator.objective?.title}
                        </div>

                        {/* Rejected quarters badges — sourced from rejectedQuarters */}
                        {indicator.rejectedQuarters?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1">
                            {indicator.rejectedQuarters.map((qKey) => (
                              <span
                                key={qKey}
                                className="text-[8px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-black uppercase tracking-tighter"
                              >
                                {qKey.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Centre: feedback & stats */}
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <MessageSquare size={12} />
                            {quarterLabel
                              ? `Feedback for ${quarterLabel}`
                              : "Rejection Feedback"}
                          </span>
                        </div>
                        <div className="bg-white border border-rose-50 p-4 rounded-xl shadow-inner min-h-[80px]">
                          <p className="text-[12px] text-rose-900 font-medium italic leading-relaxed">
                            "
                            {latest?.adminComment ||
                              latest?.notes ||
                              "Refer to review history for details."}
                            "
                          </p>
                        </div>
                        <div className="mt-4 flex gap-6">
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              Value
                            </p>
                            {/* camelCase: achievedValue */}
                            <p className="text-xs font-bold text-slate-700">
                              {latest?.achievedValue ?? "—"} /{" "}
                              {indicator.target}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              Evidence
                            </p>
                            <p className="text-xs font-bold text-slate-700">
                              {latest?.documents?.length ?? 0} Files
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">
                              Resubmission
                            </p>
                            {/* camelCase: resubmissionCount */}
                            <p className="text-xs font-bold text-rose-600">
                              Attempt #{latest?.resubmissionCount ?? 1}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="p-6 lg:w-64 bg-gray-50/30 flex flex-col justify-center gap-2">
                        <button
                          onClick={() => setSelectedHistoryId(indicator.id)}
                          className="w-full bg-[#1a3a32] text-white py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:opacity-90 flex items-center justify-center gap-2"
                        >
                          <HistoryIcon size={14} /> Full History
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/user/assignments/${indicator.id}`)
                          }
                          className="w-full bg-white border border-gray-200 text-gray-500 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                        >
                          {isAnnual ? "Fix Annual Filing" : "Resolve Issue"}{" "}
                          <ChevronRight size={14} />
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
    </div>
  );
};

export default UserRejections;