import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  User,
  History,
  Search,
  ShieldCheck,
  Hourglass,
  CheckCircle2,
  CalendarDays,
  Layers,
  FileText,
  Filter,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAllAdminIndicators,
  type IAdminIndicator,
  type ISubmissionsByPeriod,
} from "../../store/slices/adminIndicatorSlice";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterType = "all" | "quarterly" | "annual" | "resubmitted";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flattenSubmissions = (submissions: ISubmissionsByPeriod | undefined) =>
  Object.values(submissions ?? {}).flat();

const hasResubmission = (indicator: IAdminIndicator): boolean =>
  flattenSubmissions(indicator.submissions).some(
    (s) => s.resubmissionCount > 0 && s.reviewStatus === "Pending"
  );

const getLatestSubmission = (indicator: IAdminIndicator) => {
  const submissions = flattenSubmissions(indicator.submissions);
  return submissions.length > 0 ? submissions[0] : null;
};

/**
 * Count documents only from Pending submissions — those are what the admin
 * is actually reviewing right now. Rejected/Verified rows may carry old docs.
 */
const getDocumentCount = (indicator: IAdminIndicator): number => {
  const submissions = flattenSubmissions(indicator.submissions);
  return submissions
    .filter((s) => s.reviewStatus === "Pending")
    .reduce((total, sub) => total + (sub.documents?.length ?? 0), 0);
};

const getDocumentNames = (indicator: IAdminIndicator): string[] => {
  const submissions = flattenSubmissions(indicator.submissions);
  return submissions
    .filter((s) => s.reviewStatus === "Pending")
    .flatMap((sub) => (sub.documents ?? []).map((doc) => doc.fileName));
};

/**
 * An indicator qualifies for the audit queue only when at least one
 * of its Pending submissions has one or more attached documents.
 */
const hasPendingDocuments = (indicator: IAdminIndicator): boolean => {
  const submissions = flattenSubmissions(indicator.submissions);
  return submissions
    .filter((s) => s.reviewStatus === "Pending")
    .some((s) => (s.documents?.length ?? 0) > 0);
};

// ─── Component ───────────────────────────────────────────────────────────────

const AdminPendingReviews = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { pendingAdminReview, isLoading } = useAppSelector(
    (state) => state.adminIndicators
  );

  useEffect(() => {
    dispatch(fetchAllAdminIndicators({ status: "Awaiting Admin Approval" }));
  }, [dispatch]);

  const handleOpenDossier = useCallback(
    (id: string) => {
      setOpeningId(id);
      navigate(`/admin/review/${id}`);
    },
    [navigate]
  );

  /**
   * Base pool: only indicators that have at least one document on a Pending
   * submission. Indicators with 0 documents are intentionally excluded.
   */
  const withDocuments = useMemo(
    () => pendingAdminReview.filter(hasPendingDocuments),
    [pendingAdminReview]
  );

  // Counts derived from the already-filtered pool
  const counts = useMemo(
    () => ({
      all: withDocuments.length,
      quarterly: withDocuments.filter((ind) => ind.reportingCycle === "Quarterly").length,
      annual: withDocuments.filter((ind) => ind.reportingCycle === "Annual").length,
      resubmitted: withDocuments.filter(hasResubmission).length,
    }),
    [withDocuments]
  );

  const filteredRecords = useMemo(() => {
    return withDocuments.filter((ind) => {
      const matchesSearch =
        !searchTerm ||
        ind.objective?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.assigneeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.perspective?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ind.activity?.description?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "quarterly") return ind.reportingCycle === "Quarterly";
      if (activeFilter === "annual") return ind.reportingCycle === "Annual";
      if (activeFilter === "resubmitted") return hasResubmission(ind);

      return true;
    });
  }, [withDocuments, searchTerm, activeFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setActiveFilter("all");
  };

  // ── Loading ─────────────────────────────────────────────────────────────

  if (isLoading && pendingAdminReview.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#fdfcfc]">
        <div className="relative mb-4">
          <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
          <ShieldCheck
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600"
            size={14}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32] animate-pulse">
          Syncing Registry Ledger...
        </p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 bg-[#fdfcfc] min-h-screen font-sans">

      {/* HEADER */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase leading-none">
              Audit Queue
            </h1>
            <div className="flex items-center bg-[#1a3a32] text-white text-[9px] px-3 py-1.5 rounded-full font-black shadow-lg">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
              {filteredRecords.length} PENDING VERIFICATION
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Registry Evidence Review & Frequency Verification
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by objective, activity or officer..."
            className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-[#1a3a32]/5 w-72 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* FILTER TOGGLES */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Filter size={12} className="text-slate-400" />
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
              Filter:
            </span>
          </div>

          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeFilter === "all"
                ? "bg-[#1a3a32] text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setActiveFilter("quarterly")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === "quarterly"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Layers size={12} />
            Quarterly ({counts.quarterly})
          </button>

          <button
            onClick={() => setActiveFilter("annual")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === "annual"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <CalendarDays size={12} />
            Annual ({counts.annual})
          </button>

          <button
            onClick={() => setActiveFilter("resubmitted")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeFilter === "resubmitted"
                ? "bg-amber-500 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <History size={12} />
            Resubmitted ({counts.resubmitted})
          </button>
        </div>

        {(activeFilter !== "all" || searchTerm) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-[8px] font-black uppercase tracking-wider text-slate-600"
          >
            <X size={10} />
            Clear Filters
          </button>
        )}
      </div>

      {/* Active filter pill */}
      {activeFilter !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              activeFilter === "quarterly"
                ? "bg-blue-500"
                : activeFilter === "annual"
                ? "bg-amber-500"
                : "bg-amber-500"
            }`}
          />
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
            Showing{" "}
            {activeFilter === "quarterly"
              ? "Quarterly"
              : activeFilter === "annual"
              ? "Annual"
              : "Resubmitted"}{" "}
            submissions only
          </span>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-[0.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Submission Details
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                  Cycle Type
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Performance
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Documents
                </th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={48} className="text-emerald-100 mb-4" />
                      <p className="text-sm font-black text-[#1a3a32] uppercase tracking-widest">
                        {activeFilter !== "all"
                          ? `No ${activeFilter} submissions pending review`
                          : "Registry Queue Clear"}
                      </p>
                      {(activeFilter !== "all" || searchTerm) && (
                        <button
                          onClick={clearFilters}
                          className="mt-4 text-[9px] font-black text-emerald-600 underline underline-offset-4"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((indicator) => {
                  const isResub = hasResubmission(indicator);
                  const isAnnual = indicator.reportingCycle === "Annual";
                  const isOpening = openingId === indicator.id;
                  const latestSubmission = getLatestSubmission(indicator);
                  const documentCount = getDocumentCount(indicator);
                  const documentNames = getDocumentNames(indicator);
                  const latestDocuments = latestSubmission?.documents ?? [];

                  return (
                    <tr
                      key={indicator.id}
                      className="group hover:bg-slate-50/80 transition-all"
                    >
                      {/* Submission Details */}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <span className="w-fit text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                            {indicator.perspective}
                          </span>
                          <h3 className="text-[13.5px] font-black text-[#1a3a32] leading-tight max-w-sm">
                            {indicator.objective?.title || "Untitled Objective"}
                          </h3>
                          <div className="flex items-start gap-2 max-w-md">
                            <FileText
                              size={12}
                              className="text-slate-300 mt-0.5 shrink-0"
                            />
                            <p className="text-[11px] font-medium text-slate-500 leading-snug">
                              {indicator.activity?.description || "No description."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <User size={10} className="text-emerald-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase">
                              {indicator.assigneeName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cycle Type */}
                      <td className="px-6 py-6 text-center">
                        <div className="flex flex-col items-center justify-center">
                          {isAnnual ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                                <CalendarDays size={14} />
                              </div>
                              <span className="text-[9px] font-black text-amber-800 uppercase tracking-tighter">
                                Annual Cycle
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                                <Layers size={14} />
                              </div>
                              <span className="text-[9px] font-black text-blue-800 uppercase tracking-tighter">
                                Quarter {indicator.activeQuarter}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-[#1a3a32]">
                              {indicator.progress}%
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              Target: {indicator.target} {indicator.unit}
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                isResub ? "bg-amber-500" : "bg-[#1a3a32]"
                              }`}
                              style={{ width: `${indicator.progress}%` }}
                            />
                          </div>
                          {latestSubmission && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Reported: {latestSubmission.achievedValue}{" "}
                                {indicator.unit}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Documents */}
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <FileText size={12} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-600">
                              {documentCount} document{documentCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {documentNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {documentNames.slice(0, 2).map((name, idx) => (
                                <span
                                  key={idx}
                                  className="text-[8px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate max-w-[80px]"
                                  title={name}
                                >
                                  {name.length > 15
                                    ? name.substring(0, 12) + "..."
                                    : name}
                                </span>
                              ))}
                              {documentNames.length > 2 && (
                                <span className="text-[8px] font-black text-slate-400">
                                  +{documentNames.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                          {latestDocuments.length > 0 &&
                            latestDocuments[0].description && (
                              <div className="mt-1 p-1.5 bg-slate-50 rounded border border-slate-100">
                                <p className="text-[8px] italic text-slate-500 line-clamp-2">
                                  "
                                  {latestDocuments[0].description.substring(
                                    0,
                                    80
                                  )}
                                  "
                                </p>
                              </div>
                            )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-6">
                        {isResub ? (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-xl border border-amber-100">
                            <History size={12} className="animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                              Resubmitted
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-xl border border-blue-100">
                            <Hourglass size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                              Initial Audit
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleOpenDossier(indicator.id)}
                          disabled={isOpening}
                          className={`group/btn relative inline-flex items-center gap-3 px-6 py-3 rounded-[0.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                            isResub
                              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-200"
                              : "bg-[#1a3a32] text-white hover:bg-black shadow-lg shadow-emerald-900/10"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isOpening ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <span className="relative z-10">Review Dossier</span>
                              <ArrowRight
                                size={14}
                                className="relative z-10 group-hover/btn:translate-x-1 transition-transform"
                              />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPendingReviews;