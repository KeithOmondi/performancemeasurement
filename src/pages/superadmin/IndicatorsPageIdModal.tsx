import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, CheckCircle2, FileText, Calendar, ShieldCheck,
  RotateCcw, Loader2, Lock, User, Users, Paperclip,
  ExternalLink
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  superAdminReview,
  fetchIndicatorById,
  clearSelectedIndicator,
  type IIndicator,
  type ISubmission,
} from "../../store/slices/indicatorSlice";
import type { User as StaffUser } from "../../store/slices/user/userSlice";
import FilePreviewModal from "../PreviewModal";
import toast from "react-hot-toast";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

export interface Props {
  indicator: IIndicator | null | undefined;
  allStaff: StaffUser[];
  onClose: () => void;
}

/* ─── HELPERS ─────────────────────────────────────────────────────────── */

const getInitials = (name: string) =>
  name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
    : "??";

const pickActiveSubmission = (
  submissions: ISubmission[],
  quarter: number
): ISubmission | null => {
  const forQuarter = submissions.filter((s) => s.quarter === quarter);
  if (forQuarter.length === 0) return null;

  const priority: Array<ISubmission["reviewStatus"]> = [
    "Verified", "Pending", "Accepted", "Rejected",
  ];

  for (const status of priority) {
    const match = forQuarter.find((s) => s.reviewStatus === status);
    if (match) return match;
  }
  return forQuarter[forQuarter.length - 1];
};

/* ─── MODAL INNER ─────────────────────────────────────────────────────── */

const ModalInner = ({
  indicator,
  allStaff,
  onClose,
}: {
  indicator: IIndicator;
  allStaff: StaffUser[];
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const isProcessing   = useAppSelector((s) => s.indicators.actionLoading);
  const detailLoading  = useAppSelector((s) => s.indicators.detailLoading);
  // ✅ Use selectedIndicator (full detail with submissions) if available,
  //    otherwise fall back to the list-level indicator passed as prop
  const fullIndicator  = useAppSelector((s) => s.indicators.selectedIndicator);
  const ind = fullIndicator?.id === indicator.id ? fullIndicator : indicator;

  const { plans } = useAppSelector((s) => s.strategicPlan);

  const [decisionReason, setDecisionReason]     = useState("");
  const [progressOverride, setProgressOverride] = useState<number>(0);
  const [nextDeadline, setNextDeadline]         = useState<string>("");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [previewFile, setPreviewFile]           = useState<{ url: string; name: string } | null>(null);

  // ✅ Fetch full indicator (with submissions + documents) on open
  useEffect(() => {
    dispatch(fetchIndicatorById(indicator.id));
    return () => { dispatch(clearSelectedIndicator()); };
  }, [dispatch, indicator.id]);

  useEffect(() => {
    if (plans.length === 0) dispatch(getAllStrategicPlans());
  }, [dispatch, plans.length]);

  useEffect(() => {
    setDecisionReason("");
    setNextDeadline("");
    setShowRejectReason(false);
  }, [indicator.id]);

  const targetQ      = ind.activeQuarter ?? 1;
  const isLastQuarter =
    ind.reportingCycle === "Annual" || targetQ === 4;
  const cycleLabel   =
    ind.reportingCycle === "Annual" ? "Annual" : `Q${targetQ}`;

  const activeSubmission = useMemo(
    () => pickActiveSubmission(ind.submissions ?? [], targetQ),
    [ind.submissions, targetQ]
  );

  useEffect(() => {
    setProgressOverride(
      activeSubmission?.achievedValue ?? ind.currentTotalAchieved ?? 0
    );
  }, [activeSubmission, ind.currentTotalAchieved]);

  /* ── Plan context ── */
  const { perspective, objectiveTitle, activityDescription } = useMemo(() => {
    if (ind.perspective && ind.objectiveTitle && ind.activityDescription) {
      return {
        perspective:         ind.perspective,
        objectiveTitle:      ind.objectiveTitle,
        activityDescription: ind.activityDescription,
      };
    }
    const plan      = plans.find((p) => p.id === ind.strategicPlanId);
    const objective = plan?.objectives?.find((o) => o.id === ind.objectiveId);
    const activity  = objective?.activities?.find((a) => a.id === ind.activityId);
    return {
      perspective:         plan?.perspective         ?? ind.perspective         ?? "N/A",
      objectiveTitle:      objective?.title          ?? ind.objectiveTitle      ?? "Strategic Objective",
      activityDescription: activity?.description     ?? ind.activityDescription ?? "No description provided",
    };
  }, [ind, plans]);

  /* ── Derived booleans ── */
  const isCertified =
    activeSubmission?.reviewStatus === "Accepted" ||
    ind.status === "Completed";

  const canAct =
    ind.status === "Awaiting Super Admin" && !isCertified;

  const isTeamAssignment = ind.assignmentType === "Team";

  // ✅ Use flat assigneeDisplayName from backend — no more nested assignee object
  const assigneeLabel = ind.assigneeDisplayName ?? "Unassigned";

  /* ── Assignee resolution ── */
  const assigneeStaff = useMemo(() => {
    if (isTeamAssignment) return null;
    // ✅ Use flat assigneeId field
    if (!ind.assignee) return null;
    return (
      allStaff.find(
        (s) => s._id === ind.assignee || (s as any).id === ind.assignee
      ) ?? null
    );
  }, [allStaff, ind.assignee, isTeamAssignment]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  /* ── Actions ── */
  const handleCertification = useCallback(
    async (decision: "Approved" | "Rejected") => {
      if (decision === "Rejected" && !showRejectReason) {
        setShowRejectReason(true);
        return;
      }
      if (decision === "Rejected" && !decisionReason.trim()) {
        toast.error("Please provide a reason for rejecting this submission.");
        return;
      }
      if (
        decision === "Approved" &&
        ind.reportingCycle === "Quarterly" &&
        !isLastQuarter &&
        !nextDeadline
      ) {
        toast.error(`Please set the Q${targetQ + 1} submission deadline before certifying.`);
        return;
      }

      try {
        if (!ind.id) throw new Error("Indicator ID is missing");
        await dispatch(
          superAdminReview({
            id: ind.id,
            reviewData: {
              decision,
              reason: decision === "Approved" ? "" : decisionReason.trim(),
              progressOverride,
              nextDeadline: nextDeadline || undefined,
            },
          })
        ).unwrap();

        toast.success(
          decision === "Approved"
            ? isLastQuarter
              ? `${cycleLabel} — Final certification complete.`
              : `Q${targetQ} certified. Q${targetQ + 1} is now open.`
            : `${cycleLabel} returned for correction.`
        );
        onClose();
      } catch (err: any) {
        toast.error(err?.message ?? err ?? "Certification failed. Please try again.");
      }
    },
    [
      dispatch, decisionReason, ind.id, ind.reportingCycle,
      isLastQuarter, nextDeadline, onClose, progressOverride,
      showRejectReason, targetQ, cycleLabel,
    ]
  );

  /* ── Render ── */
  return (
    <div className="bg-[#fcfcf7] w-full h-full flex flex-col shadow-2xl overflow-hidden font-sans relative">

      {/* Header */}
      <header className="bg-[#1d3331] px-8 py-7 flex justify-between items-start shrink-0 border-b-4 border-[#c2a336]">
        <div className="flex items-start gap-5">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all mt-1 ${
            isCertified
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-[#c2a336]/10 border-[#c2a336]/20 text-[#c2a336]"
          }`}>
            {isCertified ? <ShieldCheck size={26} /> : <FileText size={24} />}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-[#c2a336] tracking-[0.2em]">
              {perspective}
            </p>
            <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">
              {objectiveTitle}
            </p>
            <h2 className="text-lg font-bold text-white font-serif leading-tight max-w-xl uppercase tracking-tight">
              {activityDescription}
            </h2>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="bg-[#c2a336] text-[9px] text-[#1d3331] px-3 py-1 rounded-full font-black uppercase">
                {ind.status?.replace(/-/g, " ") ?? "Pending"}
              </span>
              <div className="bg-white/10 text-[9px] text-white px-3 py-1 rounded-full font-black uppercase flex items-center gap-1.5 border border-white/10">
                {isTeamAssignment
                  ? <Users size={10} className="text-[#c2a336]" />
                  : <User size={10} className="text-[#c2a336]" />}
                {assigneeLabel}
              </div>
              <div className="bg-white/10 text-[9px] text-white px-3 py-1 rounded-full font-black uppercase flex items-center gap-1.5 border border-white/10">
                <Calendar size={10} className="text-[#c2a336]" />
                {ind.deadline
                  ? new Date(ind.deadline).toISOString().split("T")[0]
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white p-2 bg-white/5 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-white">

        {/* Loading overlay while fetching full detail */}
        {detailLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-[#1d3331]" size={36} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Loading submission details...
            </p>
          </div>
        )}

        {!detailLoading && (
          <div className="max-w-3xl mx-auto py-8 px-8 space-y-12">

            {/* Indicator details */}
            <section className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
                Indicator Details
              </h3>
              <div className="grid grid-cols-2 gap-y-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight</p>
                  <p className="text-base font-black text-[#1d3331]">{ind.weight ?? 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</p>
                  <p className="text-base font-black text-[#1d3331]">{ind.unit ?? "Unit"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</p>
                  <p className="text-base font-black text-[#1d3331]">{ind.target ?? 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                  <p className="text-base font-black text-[#1d3331]">{ind.progress ?? 0}%</p>
                </div>
              </div>
            </section>

            {/* Submission info */}
            {activeSubmission && (
              <section className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
                  Submission — {cycleLabel}
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${
                    activeSubmission.reviewStatus === "Verified"
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : activeSubmission.reviewStatus === "Accepted"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : activeSubmission.reviewStatus === "Rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {activeSubmission.reviewStatus}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Achieved:{" "}
                    <span className="text-[#1d3331] font-black">
                      {activeSubmission.achievedValue}
                    </span>{" "}
                    {ind.unit}
                  </span>
                  {activeSubmission.resubmissionCount > 0 && (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase">
                      Resubmission #{activeSubmission.resubmissionCount}
                    </span>
                  )}
                </div>
                {activeSubmission.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Assignee Notes
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      {activeSubmission.notes}
                    </p>
                  </div>
                )}
                {activeSubmission.adminComment && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">
                      Admin Comment
                    </p>
                    <p className="text-xs font-medium text-blue-700">
                      {activeSubmission.adminComment}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Assignee (individual) */}
            {!isTeamAssignment && assigneeStaff && (
              <section className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
                  Assignee
                </h3>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-[#1d3331] text-[#c2a336] flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm shrink-0">
                    {getInitials(assigneeStaff.name)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#1d3331] uppercase">
                      {assigneeStaff.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {(assigneeStaff as any).title ?? assigneeStaff.role} · {assigneeStaff.email}
                    </p>
                  </div>
                  <span className={`ml-auto text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                    assigneeStaff.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {assigneeStaff.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </section>
            )}

            {/* Evidence */}
            <section className="space-y-6 pb-4">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
                Evidence / Supporting Documents
              </h3>
              {(activeSubmission?.documents ?? []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeSubmission!.documents.map((doc, i) => (
                    <button
                      key={doc.id ?? i}
                      onClick={() =>
                        setPreviewFile({
                          url: doc.evidenceUrl,
                          name: doc.fileName ?? "Evidence",
                        })
                      }
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-[#1d3331] group transition-all text-left"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText
                          className="text-slate-400 group-hover:text-[#1d3331] shrink-0"
                          size={16}
                        />
                        <span className="text-[11px] font-black text-slate-600 truncate uppercase">
                          {doc.fileName ?? "Evidence File"}
                        </span>
                      </div>
                      <ExternalLink
                        size={14}
                        className="text-slate-300 group-hover:text-[#1d3331] shrink-0"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 bg-[#fcfcf7] border-2 border-dashed border-emerald-100 rounded-3xl flex flex-col items-center justify-center text-center">
                  <Paperclip size={32} className="text-slate-400 mb-4" strokeWidth={1.5} />
                  <p className="text-xs font-bold text-slate-600 mb-1">
                    No evidence uploaded yet
                  </p>
                </div>
              )}
            </section>

            {/* Review History */}
            {(ind.reviewHistory ?? []).length > 0 && (
              <section className="space-y-4 pb-4">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
                  Review History
                </h3>
                <div className="space-y-3">
                  {ind.reviewHistory!.map((h, i) => (
                    <div
                      key={h.id ?? i}
                      className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        h.action === "Approved"  ? "bg-emerald-500" :
                        h.action === "Rejected"  ? "bg-rose-500"    :
                        h.action === "Verified"  ? "bg-blue-500"    :
                                                   "bg-amber-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black text-[#1d3331] uppercase">
                            {h.action}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-bold">
                            by {h.reviewedByName ?? h.reviewedBy} · {h.reviewerRole}
                          </span>
                        </div>
                        {h.reason && (
                          <p className="text-[10px] text-slate-500 mt-1">{h.reason}</p>
                        )}
                        <p className="text-[9px] text-slate-300 mt-1 uppercase font-bold">
                          {new Date(h.at).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certification card */}
            <div className={`p-8 rounded-[2rem] shadow-2xl space-y-8 border-b-[10px] transition-all duration-500 mb-10 ${
              isCertified
                ? "bg-emerald-900 border-emerald-500"
                : "bg-[#1d3331] border-[#c2a336]"
            } text-white`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isCertified ? "bg-emerald-500/20" : "bg-white/10"}`}>
                  {isCertified
                    ? <ShieldCheck size={24} className="text-emerald-400" />
                    : <Lock size={24} className={canAct ? "text-[#c2a336]" : "text-white/20"} />
                  }
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">
                    {isCertified
                      ? "Record Certified"
                      : canAct
                      ? "Certification Verdict"
                      : "Not Ready for Certification"}
                  </h3>
                  {!canAct && !isCertified && (
                    <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                      Status: {ind.status}
                    </p>
                  )}
                </div>
              </div>

              {canAct && (
                <div className="space-y-6 animate-in fade-in duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c2a336]">
                        Verified Value ({ind.unit})
                      </label>
                      <input
                        type="number"
                        value={progressOverride}
                        onChange={(e) => setProgressOverride(Number(e.target.value))}
                        className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black text-lg text-white outline-none focus:border-[#c2a336] transition-all"
                      />
                    </div>
                    {!isLastQuarter && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                          Next Q Deadline
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={nextDeadline}
                          onChange={(e) => setNextDeadline(e.target.value)}
                          className="w-full p-4 bg-black/40 border border-amber-500/30 rounded-2xl font-bold text-white outline-none focus:border-amber-400 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {showRejectReason && (
                    <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">
                        Rejection Feedback
                      </label>
                      <textarea
                        autoFocus
                        value={decisionReason}
                        onChange={(e) => setDecisionReason(e.target.value)}
                        className="w-full p-5 bg-black/40 border border-rose-500/30 rounded-2xl text-sm font-medium outline-none min-h-[100px] resize-none text-white placeholder:text-white/30 focus:border-rose-400 transition-all"
                        placeholder="Explain corrections required..."
                      />
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-4 pt-2">
                    <button
                      onClick={() => handleCertification("Approved")}
                      disabled={isProcessing || !activeSubmission}
                      className="flex-[2] py-5 bg-[#c2a336] text-[#1d3331] rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] hover:bg-white hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 size={18} />
                      {isLastQuarter ? "Approve & Certify" : "Approve & Open Next Period"}
                    </button>
                    <button
                      onClick={() => handleCertification("Rejected")}
                      disabled={isProcessing || !activeSubmission}
                      className={`flex-1 py-5 border rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed ${
                        showRejectReason
                          ? "bg-rose-600 border-rose-600 text-white"
                          : "border-rose-500/50 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600"
                      }`}
                    >
                      <RotateCcw size={18} />
                      {showRejectReason ? "Confirm Rejection" : "Reject"}
                    </button>
                  </div>
                </div>
              )}

              {isCertified && (
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 size={20} />
                  <p className="text-[11px] font-black uppercase tracking-widest">
                    This record has been fully certified.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {isProcessing && (
        <div className="absolute inset-0 z-[100] bg-[#1d3331]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
          <Loader2 className="animate-spin text-[#c2a336]" size={70} />
          <span className="text-[12px] font-black text-white uppercase tracking-[0.8em]">
            Syncing Registry...
          </span>
        </div>
      )}
    </div>
  );
};

/* ─── PUBLIC WRAPPER ──────────────────────────────────────────────────── */

const IndicatorsPageIdModal = ({ indicator, allStaff, onClose }: Props) => {
  if (!indicator) return null;
  return <ModalInner indicator={indicator} allStaff={allStaff} onClose={onClose} />;
};

export default IndicatorsPageIdModal;