import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  User,
  Clock,
  CalendarDays,
  Layers,
  FileSearch,
  Eye,
  CheckCircle,
  MessageSquare,
  Hash,
  AlertTriangle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchPendingFinalApprovals,
  type IPendingFinalItem,
} from "../../store/slices/indicatorSlice";
import ApprovalIdModalPage from "./ApprovalIdModalPage";

/**
 * Final Approvals: shows ONLY what is waiting for the super admin.
 * One row per quarter (or annual period), driven by the submission's status
 * on the server, not by the indicator's status.
 */

const periodLabel = (item: IPendingFinalItem) =>
  item.quarter === 0 ? `Annual ${item.year}` : `Q${item.quarter} ${item.year}`;

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const SuperAdminApprovals = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCycle, setFilterCycle] = useState<"all" | "quarterly" | "annual">(
    "all"
  );
  const [selected, setSelected] = useState<IPendingFinalItem | null>(null);

  const { pendingFinal, pendingFinalLoading } = useAppSelector(
    (state) => state.indicators
  );

  useEffect(() => {
    dispatch(fetchPendingFinalApprovals());
  }, [dispatch]);

  const counts = useMemo(
    () => ({
      all: pendingFinal.length,
      quarterly: pendingFinal.filter((i) => i.reportingCycle === "Quarterly")
        .length,
      annual: pendingFinal.filter((i) => i.reportingCycle === "Annual").length,
      noEvidence: pendingFinal.filter((i) => i.documentsCount === 0).length,
    }),
    [pendingFinal]
  );

  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pendingFinal.filter((item) => {
      if (filterCycle === "quarterly" && item.reportingCycle !== "Quarterly")
        return false;
      if (filterCycle === "annual" && item.reportingCycle !== "Annual")
        return false;
      if (!term) return true;
      return (
        item.activityDescription?.toLowerCase().includes(term) ||
        item.objectiveTitle?.toLowerCase().includes(term) ||
        item.assigneeDisplayName?.toLowerCase().includes(term)
      );
    });
  }, [pendingFinal, searchTerm, filterCycle]);

  const handleCloseModal = () => {
    setSelected(null);
    // The thunks that call superAdminReview already refresh the queue, but
    // a manual refresh here guarantees the modal's last action is reflected.
    dispatch(fetchPendingFinalApprovals());
  };

  if (pendingFinalLoading && pendingFinal.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
          Loading Approvals Queue...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-10 bg-[#fdfcfc] min-h-screen font-sans">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-serif font-black text-[#1d3331] tracking-tighter uppercase flex items-center gap-3 flex-wrap">
                FINAL APPROVALS
                <span className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">
                  {counts.all} Pending
                </span>
                {counts.noEvidence > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle size={11} />
                    {counts.noEvidence} No Evidence
                  </span>
                )}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
                Admin-verified submissions awaiting your final certification
              </p>
            </div>

            <div className="relative">
              <FileSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by activity or officer..."
                className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-600/5 w-full md:w-96 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Cycle filter */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => setFilterCycle("all")}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterCycle === "all"
                  ? "bg-[#1d3331] text-white shadow-md"
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilterCycle("quarterly")}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                filterCycle === "quarterly"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Layers size={12} />
              Quarterly ({counts.quarterly})
            </button>
            <button
              onClick={() => setFilterCycle("annual")}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                filterCycle === "annual"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <CalendarDays size={12} />
              Annual ({counts.annual})
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
            {searchTerm ? (
              <>
                <FileSearch className="mx-auto mb-4 text-gray-200" size={48} />
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  No matches found for "{searchTerm}"
                </h2>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 text-xs font-bold text-emerald-600 underline"
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <CheckCircle
                  className="mx-auto mb-4 text-emerald-200"
                  size={48}
                />
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                  Nothing waiting for final approval
                </h2>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredList.map((item) => {
              const isAnnual = item.reportingCycle === "Annual";
              const target = Number(item.target) || 0;
              const awarded = Number(item.currentTotalAchieved) || 0;
              const awardedPct =
                target > 0
                  ? Math.min(Math.round((awarded / target) * 100), 100)
                  : 0;

              return (
                <div
                  key={item.submissionId}
                  className="bg-white rounded-2xl border border-emerald-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                            isAnnual
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isAnnual ? (
                            <CalendarDays size={10} />
                          ) : (
                            <Layers size={10} />
                          )}
                          {periodLabel(item)}
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          <CheckCircle size={10} />
                          {item.reviewStatus === "Partially Approved"
                            ? "Partially Approved"
                            : "Verified by Admin"}
                        </span>

                        {item.resubmissionCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock size={10} />
                            Resubmission #{item.resubmissionCount}
                          </span>
                        )}

                        {item.documentsCount === 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertTriangle size={10} />
                            No evidence on file
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#1d3331] leading-tight mb-2">
                        {item.activityDescription ||
                          item.objectiveTitle ||
                          "Untitled Activity"}
                      </h3>

                      {/* Numbers */}
                      <div className="flex flex-wrap items-center gap-6 mb-3">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            Submitted Value
                          </p>
                          <p className="text-lg font-bold text-emerald-600">
                            {item.achievedValue ?? 0}
                            <span className="text-xs font-normal text-slate-400 ml-1">
                              {item.unit || "%"}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            Annual Target
                          </p>
                          <p className="text-sm font-bold text-[#1d3331]">
                            {target} {item.unit || "%"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            Certified So Far
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${awardedPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">
                              {awardedPct}% · {item.remaining}{" "}
                              {item.unit || "%"} left
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* People / dates */}
                      <div className="flex flex-wrap items-center gap-4 text-[10px] mb-3">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-700">
                            Assignee: {item.assigneeDisplayName || "Unassigned"}
                          </span>
                        </div>
                        {item.submittedByName && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            Submitted by: {item.submittedByName}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-slate-500">
                            Submitted: {formatDateTime(item.submittedAt)}
                          </span>
                        </div>
                      </div>

                      {item.adminComment && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border-l-4 border-emerald-400">
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-500 flex items-center gap-1">
                            <MessageSquare size={10} /> Admin Note:
                          </p>
                          <p className="text-[11px] font-medium text-slate-700">
                            "{item.adminComment}"
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-1 text-[9px] font-mono text-slate-400">
                        <Hash size={9} />
                        Submission ID:{" "}
                        {item.submissionId.slice(-12).toUpperCase()}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex flex-row lg:flex-col items-center gap-3 min-w-[160px]">
                      <button
                        onClick={() => setSelected(item)}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                      >
                        <Eye size={14} /> Review Details
                      </button>
                      <div className="w-full text-center px-5 py-2.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        Pending Review
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The modal must review THIS quarter. Add optional `quarter` and
          `year` props to ApprovalIdModalPage and send them in the review
          payload (the server otherwise defaults to the indicator's
          active_quarter, which is often the wrong one). */}
      {selected && (
        <ApprovalIdModalPage
          indicatorId={selected.id}
          quarter={selected.quarter}
          year={selected.year}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default SuperAdminApprovals;