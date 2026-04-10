import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X, CheckCircle2, FileText, ShieldCheck,
  RotateCcw, Loader2, Lock, User, Users,
  ExternalLink, UserMinus, Settings2, RefreshCw, CalendarClock,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  superAdminReview,
  fetchIndicatorById,
  deleteIndicator,
  type IIndicator,
  type ISubmission,
} from "../../store/slices/indicatorSlice";
import {
  reopenIndicator,
} from "../../store/slices/adminIndicatorSlice";
import type { User as StaffUser } from "../../store/slices/user/userSlice";
import FilePreviewModal from "../PreviewModal";
import SuperAdminEditIndicator from "./SuperAdminEditIndicator";
import toast from "react-hot-toast";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

/* ─── TYPES & HELPERS ────────────────────────────────────────────────── */

interface IActivity {
  id?: string;
  _id?: string;
  description: string;
}

interface IObjective {
  id?: string;
  _id?: string;
  title: string;
  activities?: IActivity[];
}

interface IStrategicPlan {
  id: string;
  perspective?: string;
  objectives?: IObjective[];
}

export interface Props {
  indicator: IIndicator | null | undefined;
  allStaff: StaffUser[];
  onClose: () => void;
}

const getInitials = (name: string) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "??";

const pickActiveSubmission = (submissions: ISubmission[], quarter: number): ISubmission | null => {
  if (!submissions || submissions.length === 0) return null;
  const forQuarter = submissions.filter((s) => s.quarter === quarter);
  if (forQuarter.length === 0) return null;

  const priority: Array<ISubmission["reviewStatus"]> = ["Verified", "Pending", "Accepted", "Rejected"];
  for (const status of priority) {
    const match = forQuarter.find((s) => s.reviewStatus === status);
    if (match) return match;
  }
  return forQuarter[forQuarter.length - 1];
};

/* Statuses where it makes sense for a super-admin to reopen a period */
const REOPENABLE_STATUSES = new Set([
  "Completed",
  "Rejected",
  "Overdue",
  "Closed",
]);

/* ─── COMPONENT ──────────────────────────────────────────────────────── */

const IndicatorsPageIdModal = ({ indicator, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const isClosingRef = useRef(false);

  // State from Redux
  const isProcessing = useAppSelector((s) => s.indicators.actionLoading);
  const detailLoading = useAppSelector((s) => s.indicators.detailLoading);
  const fullIndicator = useAppSelector((s) => s.indicators.selectedIndicator);
  const isReopening = useAppSelector((s) => s.adminIndicators.isReopening);
  const { plans } = useAppSelector((s) => s.strategicPlan) as { plans: IStrategicPlan[] };

  // Stabilized Data Source
  const ind = useMemo(() => {
    if (!fullIndicator || String(fullIndicator.id) !== String(indicator?.id)) {
      return indicator;
    }
    return fullIndicator;
  }, [fullIndicator, indicator]);

  // Derived Progress Calculation
  const calculatedProgress = useMemo(() => {
    const targetQ = ind?.activeQuarter ?? 1;
    const activeSub = pickActiveSubmission(ind?.submissions ?? [], targetQ);
    return activeSub ? activeSub.achievedValue : (ind?.currentTotalAchieved ?? 0);
  }, [ind]);

  /* ── Local UI State ── */
  const [decisionReason, setDecisionReason] = useState("");
  const [nextDeadline, setNextDeadline] = useState<string>("");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [progressOverride, setProgressOverride] = useState<number>(calculatedProgress);

  // Reopen-specific state
  const [showReopenPanel, setShowReopenPanel] = useState(false);
  const [reopenDeadline, setReopenDeadline] = useState("");
  const [reopenReason, setReopenReason] = useState("");

  /**
   * FIX: Cascading Render Error Solution
   * We store the last processed ID in state. If the current indicator ID
   * doesn't match, we update the state synchronously during render.
   */
  const [prevId, setPrevId] = useState(ind?.id);

  if (ind?.id !== prevId) {
    setPrevId(ind?.id);
    setDecisionReason("");
    setNextDeadline("");
    setShowRejectReason(false);
    setProgressOverride(calculatedProgress);
    setShowReopenPanel(false);
    setReopenDeadline("");
    setReopenReason("");
  }

  /* ── Lifecycle ── */
  useEffect(() => {
    if (indicator?.id) {
      dispatch(fetchIndicatorById(indicator.id));
    }
  }, [indicator?.id, dispatch]);

  useEffect(() => {
    if (plans.length === 0) {
      dispatch(getAllStrategicPlans());
    }
  }, [dispatch, plans.length]);

  /* ── Actions ── */
  const handleInternalClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onClose();
  }, [onClose]);

  const handleUnassign = async () => {
    if (!ind?.id) return;
    const confirmUnassign = window.confirm("Are you sure you want to unassign this activity?");
    if (!confirmUnassign) return;

    try {
      await dispatch(deleteIndicator(ind.id)).unwrap();
      toast.success("Activity successfully unassigned.");
      handleInternalClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to unassign activity.";
      toast.error(errorMessage);
    }
  };

  const handleCertification = useCallback(async (decision: "Approved" | "Rejected") => {
    if (!ind?.id) return;
    if (decision === "Rejected" && !showRejectReason) return setShowRejectReason(true);
    if (decision === "Rejected" && !decisionReason.trim()) return toast.error("Please provide a reason for rejection.");

    const targetQ = ind?.activeQuarter ?? 1;
    const isLastQuarter = ind?.reportingCycle === "Annual" || targetQ === 4;

    if (decision === "Approved" && ind.reportingCycle === "Quarterly" && !isLastQuarter && !nextDeadline) {
      return toast.error(`Please set the Q${targetQ + 1} deadline.`);
    }

    try {
      await dispatch(superAdminReview({
        id: ind.id,
        reviewData: {
          decision,
          reason: decision === "Approved" ? "" : decisionReason.trim(),
          progressOverride,
          nextDeadline: nextDeadline || undefined,
        },
      })).unwrap();
      toast.success(decision === "Approved" ? "Certified successfully" : "Returned for correction");
      handleInternalClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Certification failed.";
      toast.error(errorMessage);
    }
  }, [dispatch, decisionReason, ind, nextDeadline, handleInternalClose, progressOverride, showRejectReason]);

  const handleReopen = useCallback(async () => {
    if (!ind?.id) return;
    if (!reopenDeadline) return toast.error("Please set a new deadline before reopening.");

    try {
      await dispatch(
        reopenIndicator({
          id: ind.id,
          payload: {
            newDeadline: new Date(reopenDeadline).toISOString(),
            reason: reopenReason.trim() || undefined,
          },
        })
      ).unwrap();
      toast.success("Indicator reopened successfully.");
      setShowReopenPanel(false);
      setReopenDeadline("");
      setReopenReason("");
      // Refresh the detail view so the updated status/deadline appear
      dispatch(fetchIndicatorById(ind.id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reopen indicator.";
      toast.error(errorMessage);
    }
  }, [dispatch, ind, reopenDeadline, reopenReason]);

  /* ── Derived Data for UI ── */
  const targetQ = ind?.activeQuarter ?? 1;
  const isLastQuarter = ind?.reportingCycle === "Annual" || targetQ === 4;
  const cycleLabel = ind?.reportingCycle === "Annual" ? "Annual" : `Q${targetQ}`;

  const activeSubmission = useMemo(() =>
    pickActiveSubmission(ind?.submissions ?? [], targetQ),
  [ind?.submissions, targetQ]);

  const planContext = useMemo(() => {
    if (!ind || plans.length === 0) return { perspective: "N/A", objectiveTitle: "N/A", activityDescription: "N/A" };
    const plan = plans.find((p) => String(p.id) === String(ind.strategicPlanId));
    const objective = plan?.objectives?.find((o) => String(o.id || o._id) === String(ind.objectiveId));
    const activity = objective?.activities?.find((a) => String(a.id || a._id) === String(ind.activityId));

    return {
      perspective: plan?.perspective ?? ind.perspective ?? "N/A",
      objectiveTitle: objective?.title ?? ind.objectiveTitle ?? "Strategic Objective",
      activityDescription: activity?.description ?? ind.activityDescription ?? "No description provided",
    };
  }, [ind, plans]);

  const isCertified = activeSubmission?.reviewStatus === "Accepted" || ind?.status === "Completed";
  const canAct = ind?.status === "Awaiting Super Admin" && !isCertified;
  const canReopen = ind?.status != null && REOPENABLE_STATUSES.has(ind.status);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  if (!ind) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-10">
        <Loader2 className="animate-spin text-slate-200 mb-4" size={40} />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Entry not found</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfcf7] w-full h-full flex flex-col shadow-2xl overflow-hidden font-sans relative">
      <header className="bg-[#1d3331] px-8 py-7 flex justify-between items-start shrink-0 border-b-4 border-[#c2a336]">
        <div className="flex items-start gap-5">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border mt-1 ${
            isCertified ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-[#c2a336]/10 border-[#c2a336]/20 text-[#c2a336]"
          }`}>
            {isCertified ? <ShieldCheck size={26} /> : <FileText size={24} />}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-[#c2a336] tracking-[0.2em]">{planContext.perspective}</p>
            <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">{planContext.objectiveTitle}</p>
            <h2 className="text-lg font-bold text-white font-serif leading-tight max-w-xl uppercase">{planContext.activityDescription}</h2>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="bg-[#c2a336] text-[9px] text-[#1d3331] px-3 py-1 rounded-full font-black uppercase">
                {ind.status?.replace(/-/g, " ") ?? "Pending"}
              </span>
              <div className="bg-white/10 text-[9px] text-white px-3 py-1 rounded-full font-black uppercase flex items-center gap-1.5 border border-white/10">
                {ind.assignmentType === "Team" ? <Users size={10} className="text-[#c2a336]" /> : <User size={10} className="text-[#c2a336]" />}
                {ind.assigneeDisplayName ?? "Unassigned"}
              </div>
            </div>
          </div>
        </div>
        <button onClick={handleInternalClose} className="text-white/30 hover:text-white p-2 bg-white/5 rounded-lg transition-colors"><X size={20} /></button>
      </header>

      <main className="flex-1 overflow-y-auto bg-white">
        {detailLoading && !fullIndicator ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-[#1d3331]" size={36} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Details...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-8 px-8 space-y-12">
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-slate-100 pb-8">
              {[
                { label: "Weight", val: `${ind.weight}%` },
                { label: "Unit", val: ind.unit },
                { label: "Target", val: ind.target },
                { label: "Progress", val: `${ind.progress}%` }
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                  <p className="text-base font-black text-[#1d3331]">{item.val ?? 0}</p>
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">KPI Management</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 text-[#1d3331] hover:text-[#c2a336] text-[10px] font-black uppercase transition-colors"
                  >
                    <Settings2 size={14} />
                    Configure KPI
                  </button>

                  {!isCertified && ind.assignee && (
                    <button
                      onClick={handleUnassign}
                      className="flex items-center gap-2 text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase transition-colors"
                    >
                      <UserMinus size={14} />
                      Unassign
                    </button>
                  )}
                </div>
              </div>

              {ind.assignee ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-[#1d3331] text-[#c2a336] flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm shrink-0">
                    {getInitials(ind.assigneeDisplayName || "")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-[#1d3331] uppercase">{ind.assigneeDisplayName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Current Responsible Official</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                  <p className="text-xs font-bold text-slate-400">Activity is currently unassigned.</p>
                </div>
              )}
            </section>

            {activeSubmission && (
              <section className="space-y-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 pb-3">
                  Submission Data — {cycleLabel}
                </h3>
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Quarterly Achieved</span>
                    <span className="text-lg font-black text-[#1d3331]">{activeSubmission.achievedValue} {ind.unit}</span>
                  </div>
                  {activeSubmission.notes && (
                    <div className="bg-white p-4 rounded-xl border border-slate-100 text-xs text-slate-600 italic">"{activeSubmission.notes}"</div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(activeSubmission.documents || []).map((doc, i) => (
                    <button key={i} onClick={() => setPreviewFile({ url: doc.evidenceUrl, name: doc.fileName ?? "Evidence" })}
                      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-[#1d3331] group transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="text-slate-400 group-hover:text-[#1d3331]" size={16} />
                        <span className="text-[11px] font-black text-slate-600 truncate uppercase">{doc.fileName ?? "Evidence File"}</span>
                      </div>
                      <ExternalLink size={14} className="text-slate-300 group-hover:text-[#1d3331]" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Certification Verdict ── */}
            <div className={`p-8 rounded-[2.5rem] shadow-2xl space-y-8 border-b-[10px] transition-all duration-500 ${
              isCertified ? "bg-emerald-900 border-emerald-500" : "bg-[#1d3331] border-[#c2a336]"
            } text-white`}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isCertified ? "bg-emerald-500/20" : "bg-white/10"}`}>
                  {isCertified ? <ShieldCheck size={24} className="text-emerald-400" /> : <Lock size={24} className={canAct ? "text-[#c2a336]" : "text-white/20"} />}
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">
                  {isCertified ? "Record Certified" : canAct ? "Certification Verdict" : "Awaiting Verification"}
                </h3>
              </div>

              {canAct && (
                <div className="space-y-6 animate-in fade-in duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-[#c2a336]">Verified Value ({ind.unit})</label>
                      <input type="number" value={progressOverride} onChange={(e) => setProgressOverride(Number(e.target.value))}
                        className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black text-white focus:border-[#c2a336] outline-none" />
                    </div>
                    {!isLastQuarter && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-amber-400">Next Q Deadline</label>
                        <input type="date" min={todayStr} value={nextDeadline} onChange={(e) => setNextDeadline(e.target.value)}
                          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl font-black text-white focus:border-amber-400 outline-none" />
                      </div>
                    )}
                  </div>
                  {showRejectReason && (
                    <textarea autoFocus value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)}
                      className="w-full p-5 bg-black/40 border border-rose-500/30 rounded-2xl text-sm min-h-[100px] text-white outline-none"
                      placeholder="Explain required corrections..." />
                  )}
                  <div className="flex flex-col md:flex-row gap-4">
                    <button onClick={() => handleCertification("Approved")} disabled={isProcessing}
                      className="flex-[2] py-5 bg-[#c2a336] text-[#1d3331] rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-3">
                      <CheckCircle2 size={18} /> {isLastQuarter ? "Final Certification" : "Certify Period"}
                    </button>
                    <button onClick={() => handleCertification("Rejected")} disabled={isProcessing}
                      className={`flex-1 py-5 border rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                        showRejectReason ? "bg-rose-600 border-rose-600" : "border-rose-500/50 text-rose-400 hover:bg-rose-600 hover:text-white"
                      }`}>
                      <RotateCcw size={18} /> {showRejectReason ? "Confirm" : "Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Reopen Panel ── */}
            {canReopen && (
              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 overflow-hidden">
                {/* Header row — always visible */}
                <button
                  onClick={() => setShowReopenPanel((v) => !v)}
                  className="w-full flex items-center justify-between px-8 py-5 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-600">
                      <RefreshCw size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-amber-800 uppercase tracking-[0.2em]">Reopen Indicator</p>
                      <p className="text-[10px] font-bold text-amber-600 mt-0.5">
                        Current status: <span className="uppercase">{ind.status}</span>
                        {ind.deadline && (
                          <> &mdash; last deadline {new Date(ind.deadline).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`text-amber-400 transition-transform duration-200 ${showReopenPanel ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>

                {/* Expandable form */}
                {showReopenPanel && (
                  <div className="px-8 pb-8 space-y-6 animate-in fade-in duration-300 border-t border-amber-200 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* New deadline (required) */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-700 tracking-widest">
                          <CalendarClock size={12} />
                          New Deadline <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={reopenDeadline}
                          onChange={(e) => setReopenDeadline(e.target.value)}
                          className="w-full p-4 bg-white border border-amber-200 rounded-2xl font-black text-[#1d3331] focus:border-amber-500 outline-none text-sm"
                        />
                      </div>

                      {/* Reason (optional) */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-amber-700 tracking-widest">
                          Reason <span className="text-amber-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="e.g. Data correction required"
                          className="w-full p-4 bg-white border border-amber-200 rounded-2xl font-black text-[#1d3331] placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleReopen}
                        disabled={isReopening || !reopenDeadline}
                        className="flex-[2] py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                      >
                        {isReopening ? (
                          <><Loader2 size={16} className="animate-spin" /> Reopening…</>
                        ) : (
                          <><RefreshCw size={16} /> Confirm Reopen</>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowReopenPanel(false);
                          setReopenDeadline("");
                          setReopenReason("");
                        }}
                        disabled={isReopening}
                        className="flex-1 py-4 border border-amber-300 text-amber-700 hover:bg-amber-100 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {previewFile && <FilePreviewModal url={previewFile.url} fileName={previewFile.name} onClose={() => setPreviewFile(null)} />}

      {isEditModalOpen && (
        <SuperAdminEditIndicator
          indicator={ind}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {(isProcessing || isReopening) && (
        <div className="absolute inset-0 z-[100] bg-[#1d3331]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
          <Loader2 className="animate-spin text-[#c2a336]" size={70} />
          <span className="text-[12px] font-black text-white uppercase tracking-[0.8em]">
            {isReopening ? "Reopening Period…" : "Updating Registry..."}
          </span>
        </div>
      )}
    </div>
  );
};

export default IndicatorsPageIdModal;