import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchMyAssignments,
} from "../../store/slices/userIndicatorSlice";
import type { IIndicatorUI, ISubmissionUI } from "../../store/slices/userIndicatorSlice";
import {
  ArrowLeft, RotateCcw, FileText, AlertCircle,
  Loader2, Users, User, ChevronRight,
} from "lucide-react";

/* ─── HELPERS ────────────────────────────────────────────────────────── */

const isRejected = (indicator: IIndicatorUI): boolean => {
  if (indicator.status.toLowerCase().includes("rejected")) return true;
  return (indicator.submissions ?? []).some(
    (s: ISubmissionUI) => s.review_status === "Rejected",
  );
};

const latestRejectedSubmission = (indicator: IIndicatorUI): ISubmissionUI | null => {
  const rejected = (indicator.submissions ?? [])
    .filter((s: ISubmissionUI) => s.review_status === "Rejected")
    .sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    );
  return rejected[0] ?? null;
};

/* ─── COMPONENT ──────────────────────────────────────────────────────── */

const UserRejections = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { myIndicators, loading, error } = useAppSelector(
    (state) => state.userIndicators,
  );

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  const rejectedIndicators = useMemo(
    () => myIndicators.filter(isRejected),
    [myIndicators],
  );

  /* ── Loading ── */
  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Loading Rejections...
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center p-12 bg-white rounded-[2rem] shadow-xl border border-gray-100 max-w-sm">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="font-serif font-black text-xl text-[#1a3a32]">
            Something went wrong
          </h2>
          <p className="text-xs text-gray-400 mt-2">{error}</p>
          <button
            onClick={() => dispatch(fetchMyAssignments())}
            className="mt-8 w-full py-3 bg-[#1a3a32] text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ── Nav ── */}
        <nav className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 group w-fit"
          >
            <ArrowLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">
              Dashboard
            </span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest">
            <RotateCcw size={11} />
            {rejectedIndicators.length} Rejection{rejectedIndicators.length !== 1 ? "s" : ""}
          </div>
        </nav>

        {/* ── Header ── */}
        <div className="space-y-2">
          <h1 className="text-2xl font-serif font-black text-[#1a3a32] tracking-tight">
            Rejected Submissions
          </h1>
          <p className="text-sm text-gray-400 font-medium">
            Review the feedback below and resubmit with the required corrections.
          </p>
        </div>

        {/* ── Empty State ── */}
        {rejectedIndicators.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[2rem] border border-dashed border-gray-100">
            <RotateCcw size={32} className="text-gray-200 mx-auto mb-4" />
            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
              No rejected submissions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rejectedIndicators.map((indicator) => {
              const rejectedSub = latestRejectedSubmission(indicator);
              const isTeam = indicator.assignee_model === "Team";

              return (
                <button
                  key={indicator.id}
                  onClick={() => navigate(`/user/assignments/${indicator.id}`)}
                  className="w-full text-left bg-white border border-gray-100 hover:border-rose-200 rounded-[2rem] p-6 transition-all group space-y-5"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#c2a336]">
                        {indicator.perspective}
                      </p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">
                        {indicator.objective?.title}
                      </p>
                      <h3 className="text-sm font-black text-[#1a3a32] font-serif leading-snug">
                        {indicator.activity?.description}
                      </h3>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-gray-300 group-hover:text-rose-400 shrink-0 mt-1 transition-colors"
                    />
                  </div>

                  {/* Rejection reason */}
                  {rejectedSub?.notes && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">
                        Rejection Feedback
                      </p>
                      <p className="text-[11px] text-rose-700 font-medium leading-relaxed line-clamp-2">
                        {rejectedSub.notes}
                      </p>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400">
                      {isTeam ? <Users size={10} /> : <User size={10} />}
                      {indicator.assigneeName ?? "Unassigned"}
                    </span>

                    {indicator.reporting_cycle === "Quarterly" && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400">
                        Q{indicator.active_quarter}
                      </span>
                    )}

                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400">
                      {indicator.reporting_cycle}
                    </span>

                    {rejectedSub && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center gap-1.5">
                        <FileText size={10} />
                        {rejectedSub.documents?.length ?? 0} doc{rejectedSub.documents?.length !== 1 ? "s" : ""}
                      </span>
                    )}

                    <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-500">
                      Revision Required
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRejections;