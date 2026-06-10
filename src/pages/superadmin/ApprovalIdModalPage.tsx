import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  CalendarDays,
  Award,
  Clock,
  FileText,
  User,
  Calendar,
  Repeat,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  File,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchIndicatorById,
  clearSelectedIndicator,
  superAdminReview,
  type IPartialApproval,
  type IDocument,
  fetchPartialApprovalsHistory,
} from "../../store/slices/indicatorSlice";
import { toast } from "react-hot-toast";

interface Props {
  indicatorId: string;
  onClose: () => void;
}

const DocIcon = ({ fileType }: { fileType?: string }) => {
  if (fileType === "image") return <ImageIcon size={14} className="text-blue-400" />;
  if (fileType === "video") return <Video size={14} className="text-purple-400" />;
  return <File size={14} className="text-slate-400" />;
};

const ApprovalIdModalPage = ({ indicatorId, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const { selectedIndicator, detailLoading, actionLoading, partialApprovals } =
    useAppSelector((state) => state.indicators);

  // ── Decision state (always visible, not behind a click) ──────────────────
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [progressValue, setProgressValue] = useState<string>("");
  const [nextDeadline, setNextDeadline] = useState<string>("");
  const [comment, setComment] = useState("");
  const [progressError, setProgressError] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [commentError, setCommentError] = useState("");

  // ── Doc preview ──────────────────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type?: string } | null>(null);

  useEffect(() => {
    dispatch(clearSelectedIndicator());
    dispatch(fetchIndicatorById(indicatorId));
    dispatch(fetchPartialApprovalsHistory(indicatorId));
  }, [dispatch, indicatorId]);

  const indicator = selectedIndicator;
  const isAnnual = indicator?.reportingCycle === "Annual";
  const isCompleted = indicator?.status === "Completed";
  const canReview = !isCompleted && indicator?.status === "Awaiting Super Admin";

  const currentProgress = indicator?.progress ?? 0;
  const target = indicator?.target ?? 100;
  const unit = indicator?.unit ?? "%";
  const remainingNeeded = Math.max(0, target - currentProgress);
  const isFullyComplete = currentProgress >= target;
  const hasPartialApprovals = partialApprovals && partialApprovals.length > 0;

  // All submissions sorted newest-first; the first is the one awaiting review
  const allSubmissions = [...(indicator?.submissions ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  const latestSubmission = allSubmissions[0];

  // Build a lookup: quarter+year → approved amount from partialApprovals history
  const approvalByQuarterYear = (partialApprovals as IPartialApproval[]).reduce<
    Record<string, IPartialApproval>
  >((acc, a) => {
    const key = `${a.quarter}-${a.year}`;
    // keep most recent if dupes
    if (!acc[key] || new Date(a.approvedAt) > new Date(acc[key].approvedAt)) {
      acc[key] = a;
    }
    return acc;
  }, {});

  // Live preview: what will the bar look like after approval?
  const parsedProgress = parseFloat(progressValue) || 0;
  const previewProgress = Math.min(target, currentProgress + parsedProgress);
  const previewPct = target > 0 ? Math.min(100, (previewProgress / target) * 100) : 0;
  const currentPct = target > 0 ? Math.min(100, (currentProgress / target) * 100) : 0;

  // For quarterly partial approvals, does the admin need to set a next deadline?
  const needsNextDeadline =
    decision === "approve" &&
    !isAnnual &&
    parsedProgress > 0 &&
    previewProgress < target;

  const formatDate = (d?: string) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };
  const formatDateTime = (d?: string) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  };

  // Min date for next deadline: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDeadline = tomorrow.toISOString().split("T")[0];

  const handleReview = async () => {
    let hasError = false;
    setProgressError(""); setDeadlineError(""); setCommentError("");

    if (decision === "reject") {
      if (!comment.trim()) { setCommentError("A reason is required when rejecting."); hasError = true; }
    }

    if (decision === "approve") {
      const parsed = parseFloat(progressValue);
      if (!progressValue.trim() || isNaN(parsed) || parsed <= 0) {
        setProgressError("Enter the value being approved."); hasError = true;
      } else if (!isAnnual && parsed > remainingNeeded) {
        setProgressError(`Max approvable is ${remainingNeeded} ${unit}.`); hasError = true;
      } else if (isAnnual && parsed !== target) {
        setProgressError(`Annual certification requires exactly ${target} ${unit}.`); hasError = true;
      }
      if (needsNextDeadline && !nextDeadline) {
        setDeadlineError("Set the next submission deadline for the remaining work."); hasError = true;
      }
    }

    if (hasError) return;

    const parsed = parseFloat(progressValue);
    const isPartial = decision === "approve" && !isAnnual && !isFullyComplete && parsed < remainingNeeded;

    try {
      await dispatch(
        superAdminReview({
          id: indicatorId,
          reviewData: {
            decision: decision === "approve" ? "Approved" : "Rejected",
            reason: comment.trim() || undefined,
            progressOverride: decision === "approve" ? parsed : 0,
            isPartialApproval: isPartial,
            year: latestSubmission?.year ?? new Date().getFullYear(),
            quarter: latestSubmission?.quarter,
            ...(needsNextDeadline && nextDeadline ? { nextDeadline } : {}),
          },
        })
      ).unwrap();

      if (decision === "approve") {
        const stillRemaining = Math.max(0, remainingNeeded - parsed);
        toast.success(
          stillRemaining === 0
            ? "Indicator fully certified."
            : `+${parsed} ${unit} approved. ${stillRemaining} ${unit} remaining.`
        );
      } else {
        toast.success("Submission rejected. Assignee has been notified.");
      }

      await dispatch(fetchIndicatorById(indicatorId));
      await dispatch(fetchPartialApprovalsHistory(indicatorId));
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed.");
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (detailLoading && !indicator) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4 shadow-xl">
          <Loader2 className="animate-spin text-[#1a3a32]" size={36} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading…</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!indicator) return null;

  // ── Quick stats for the header strip ─────────────────────────────────────
  const statusColors: Record<string, string> = {
    "Awaiting Super Admin": "bg-amber-50 border-amber-200 text-amber-700",
    "Completed": "bg-emerald-50 border-emerald-200 text-emerald-700",
    "Rejected by Super Admin": "bg-rose-50 border-rose-200 text-rose-700",
  };
  const statusColor = statusColors[indicator.status ?? ""] ?? "bg-slate-50 border-slate-200 text-slate-600";

  const StatusIcon = isCompleted ? CheckCircle2
    : indicator.status === "Rejected by Super Admin" ? XCircle
    : Clock;

  return createPortal(
    <>
      {/* ── Main modal ─────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${isAnnual ? "bg-amber-100" : "bg-blue-100"}`}>
                  {isAnnual
                    ? <CalendarDays size={18} className="text-amber-600" />
                    : <Repeat size={18} className="text-blue-600" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#1a3a32] leading-snug">
                    {indicator.activityDescription || "Performance Indicator"}
                  </h2>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                    {indicator.objectiveTitle}
                    {indicator.perspective && <> <span className="text-slate-300">•</span> {indicator.perspective}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                  <StatusIcon size={11} />
                  {indicator.status}
                </span>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Body: two columns ──────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex min-h-0">

            {/* LEFT: Submission info */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r border-slate-100">

              {/* Progress bar — live preview when approving */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Progress</p>
                    <p className="text-xl font-bold text-[#1a3a32]">
                      {currentProgress} <span className="text-sm font-medium text-slate-400">/ {target} {unit}</span>
                    </p>
                  </div>
                  {decision === "approve" && parsedProgress > 0 && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">After Approval</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {previewProgress} {unit}
                        {previewProgress >= target && <span className="ml-1 text-[9px]">✓ Complete</span>}
                      </p>
                    </div>
                  )}
                </div>
                {/* Bar */}
                <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  {/* Current */}
                  <div
                    className="absolute left-0 top-0 h-full bg-[#2c5f2e] rounded-full transition-all duration-300"
                    style={{ width: `${currentPct}%` }}
                  />
                  {/* Preview addition */}
                  {decision === "approve" && parsedProgress > 0 && previewPct > currentPct && (
                    <div
                      className="absolute top-0 h-full bg-emerald-400 rounded-full transition-all duration-300"
                      style={{ left: `${currentPct}%`, width: `${previewPct - currentPct}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-slate-400">{currentPct.toFixed(0)}% complete</span>
                  {!isFullyComplete && <span className="text-[8px] text-amber-500">{remainingNeeded} {unit} remaining</span>}
                </div>
              </div>

              {/* Partial approval history */}
              {hasPartialApprovals && (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                    <TrendingUp size={10} className="text-slate-400" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Approval History</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {(partialApprovals as IPartialApproval[]).map((a) => (
                      <div key={a.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-[10px] font-bold text-emerald-600">
                            +{a.approvedAmount ?? "?"} {unit}
                          </span>
                          {a.isPartial && (
                            <span className="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Partial</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-500">{formatDate(a.approvedAt)}</p>
                          <p className="text-[8px] text-slate-400">by {a.approvedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Submission timeline ───────────────────────────────── */}
              {allSubmissions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={10} />
                    {isAnnual ? "Submission" : `Submissions (${allSubmissions.length})`}
                  </p>

                  {allSubmissions.map((sub, idx) => {
                    const isLatest = idx === 0;
                    const quarterLabel = sub.quarter ? `Q${sub.quarter}` : "Annual";
                    const periodKey = `${sub.quarter}-${sub.year}`;
                    const matchedApproval = approvalByQuarterYear[periodKey];

                    // Status chip config
                    const statusChip: Record<string, { label: string; cls: string }> = {
                      Pending:            { label: "Awaiting Review", cls: "bg-amber-100 text-amber-700" },
                      Verified:           { label: "Verified",        cls: "bg-sky-100 text-sky-700" },
                      Accepted:           { label: "Accepted",        cls: "bg-emerald-100 text-emerald-700" },
                      "Partially Approved": { label: "Partial",       cls: "bg-violet-100 text-violet-700" },
                      Rejected:           { label: "Rejected",        cls: "bg-rose-100 text-rose-700" },
                    };
                    const chip = statusChip[sub.reviewStatus] ?? { label: sub.reviewStatus, cls: "bg-slate-100 text-slate-600" };

                    return (
                      <div
                        key={sub.id}
                        className={`rounded-xl border overflow-hidden ${
                          isLatest
                            ? "border-[#2c5f2e]/30 shadow-sm"
                            : "border-slate-100 opacity-80"
                        }`}
                      >
                        {/* Submission header */}
                        <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${
                          isLatest
                            ? "bg-[#f0f7f0] border-[#2c5f2e]/15"
                            : "bg-slate-50 border-slate-100"
                        }`}>
                          {/* Quarter pill */}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isLatest ? "bg-[#1a3a32] text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {quarterLabel} {sub.year}
                          </span>

                          {isLatest && (
                            <span className="text-[8px] font-black text-[#2c5f2e] uppercase tracking-wider">
                              ← Current
                            </span>
                          )}

                          {/* Review status */}
                          <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${chip.cls}`}>
                            {chip.label}
                          </span>
                        </div>

                        {/* Submission body */}
                        <div className="p-3 grid grid-cols-2 gap-2.5 bg-white">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Submitted</p>
                            <p className="text-[11px] font-bold text-[#1a3a32]">
                              {sub.achievedValue} {unit}
                            </p>
                          </div>

                          {/* Approved amount — from matched partial approval record */}
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">
                              {isLatest ? "Approved" : "Was Approved"}
                            </p>
                            {matchedApproval ? (
                              <p className="text-[11px] font-bold text-emerald-600">
                                +{matchedApproval.approvedAmount} {unit}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-300 font-medium">—</p>
                            )}
                          </div>

                          <div className="col-span-2 flex items-center gap-2 text-[8px] text-slate-400">
                            <Clock size={9} />
                            {formatDateTime(sub.submittedAt)}
                            {sub.resubmissionCount > 0 && (
                              <span className="ml-auto bg-orange-50 text-orange-500 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                Resubmitted ×{sub.resubmissionCount}
                              </span>
                            )}
                          </div>

                          {sub.adminComment && (
                            <div className="col-span-2 bg-slate-50 rounded-lg px-2.5 py-2">
                              <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Admin Comment</p>
                              <p className="text-[9px] text-slate-600 italic">{sub.adminComment}</p>
                            </div>
                          )}

                          {sub.notes && (
                            <div className="col-span-2">
                              <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Notes</p>
                              <p className="text-[9px] text-slate-600 italic leading-relaxed">{sub.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Documents */}
                        {sub.documents && sub.documents.length > 0 && (
                          <div className={`border-t p-3 ${isLatest ? "border-[#2c5f2e]/15 bg-[#f8fbf8]" : "border-slate-100 bg-slate-50/50"}`}>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">
                              Evidence · {sub.documents.length} file{sub.documents.length !== 1 ? "s" : ""}
                              {!isLatest && matchedApproval && (
                                <span className="ml-2 text-emerald-600 normal-case font-medium">
                                  (approved {formatDate(matchedApproval.approvedAt)})
                                </span>
                              )}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(sub.documents as IDocument[]).map((doc, di) => (
                                <button
                                  key={doc.id ?? di}
                                  onClick={() => setPreviewDoc({
                                    url: doc.evidenceUrl,
                                    name: doc.fileName || `Document ${di + 1}`,
                                    type: doc.fileType,
                                  })}
                                  className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-[#2c5f2e]/30 hover:bg-[#f0f7f0] transition-all group text-left bg-white"
                                >
                                  <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-white flex items-center justify-center shrink-0 transition-colors">
                                    <DocIcon fileType={doc.fileType} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-semibold text-slate-700 truncate leading-tight">
                                      {doc.fileName || `Document ${di + 1}`}
                                    </p>
                                    <p className="text-[7px] text-slate-400 uppercase">{doc.fileType ?? "file"}</p>
                                  </div>
                                  <ExternalLink size={9} className="text-slate-300 group-hover:text-[#2c5f2e] shrink-0 transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Assignee */}
              <div className="border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1a3a32] flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {indicator.assigneeDisplayName?.charAt(0) ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-[#1a3a32] truncate">{indicator.assigneeDisplayName || "Unassigned"}</p>
                  <p className="text-[8px] text-slate-400">{indicator.assignmentType} Assignment</p>
                </div>
                {indicator.deadline && (
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500 shrink-0">
                    <Calendar size={10} />
                    <span>Due {formatDate(indicator.deadline)}</span>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT: Decision panel */}
            <div className="w-[320px] shrink-0 overflow-y-auto p-5 space-y-4 bg-slate-50/50">

              {/* Cycle badge */}
              <div className={`rounded-xl p-3 flex items-center gap-2 ${isAnnual ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"}`}>
                {isAnnual
                  ? <CalendarDays size={14} className="text-amber-500 shrink-0" />
                  : <Repeat size={14} className="text-blue-500 shrink-0" />}
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-wider ${isAnnual ? "text-amber-700" : "text-blue-700"}`}>
                    {isAnnual ? "Annual Indicator" : "Quarterly Indicator"}
                  </p>
                  <p className="text-[8px] text-slate-500 mt-0.5">
                    {isAnnual
                      ? `Full target of ${target} ${unit} required`
                      : `Partial approvals allowed · ${remainingNeeded} ${unit} remaining`}
                  </p>
                </div>
              </div>

              {/* ── Readonly states ── */}
              {isCompleted && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                  <Award size={24} className="text-emerald-500 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Fully Certified</p>
                  <p className="text-[9px] text-emerald-600 mt-1">No further action required.</p>
                </div>
              )}

              {indicator.status === "Rejected by Super Admin" && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-center">
                  <XCircle size={24} className="text-rose-400 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Rejected</p>
                  <p className="text-[9px] text-slate-500 mt-1">Awaiting resubmission from assignee.</p>
                </div>
              )}

              {!canReview && !isCompleted && indicator.status !== "Rejected by Super Admin" && (
                <div className="rounded-xl bg-slate-100 p-4 text-center">
                  <p className="text-[9px] text-slate-500">No action required at this stage.</p>
                </div>
              )}

              {/* ── Active review panel ── */}
              {canReview && (
                <>
                  {/* Decision toggle */}
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">Your Decision</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDecision(decision === "approve" ? null : "approve")}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                          decision === "approve"
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                            : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                        }`}
                      >
                        <ThumbsUp size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setDecision(decision === "reject" ? null : "reject")}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                          decision === "reject"
                            ? "bg-rose-600 border-rose-600 text-white shadow-md"
                            : "bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50"
                        }`}
                      >
                        <ThumbsDown size={13} /> Reject
                      </button>
                    </div>
                  </div>

                  {/* Approve fields */}
                  {decision === "approve" && (
                    <div className="space-y-3">
                      {/* Value to approve */}
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                          Approve This Amount *
                        </label>
                        {/* Slider */}
                        <div className="mb-2">
                          <input
                            type="range"
                            min={0}
                            max={isAnnual ? target : remainingNeeded}
                            step={isAnnual ? target : Math.max(1, Math.floor(remainingNeeded / 10))}
                            value={parsedProgress || 0}
                            onChange={(e) => {
                              setProgressValue(e.target.value);
                              if (progressError) setProgressError("");
                            }}
                            className="w-full h-2 appearance-none rounded-full bg-slate-200 accent-[#2c5f2e] cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                            <span>0</span>
                            {!isAnnual && !isFullyComplete && (
                              <button
                                type="button"
                                onClick={() => { setProgressValue(String(remainingNeeded)); if (progressError) setProgressError(""); }}
                                className="text-emerald-600 font-bold hover:underline"
                              >
                                Full ({remainingNeeded} {unit})
                              </button>
                            )}
                            <span>{isAnnual ? target : remainingNeeded} {unit}</span>
                          </div>
                        </div>
                        {/* Number input */}
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={isAnnual ? target : remainingNeeded}
                            value={progressValue}
                            onChange={(e) => {
                              setProgressValue(e.target.value);
                              if (progressError) setProgressError("");
                            }}
                            placeholder={isAnnual ? `Must be ${target}` : `0 – ${remainingNeeded}`}
                            className={`w-full rounded-xl border text-sm font-bold px-3 py-2.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#1a3a32]/20 bg-white ${
                              progressError ? "border-rose-300" : "border-slate-200"
                            }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">{unit}</span>
                        </div>
                        {progressError && <p className="text-[9px] text-rose-500 font-bold mt-1">{progressError}</p>}

                        {/* Smart hint */}
                        {parsedProgress > 0 && !progressError && (
                          <div className={`mt-2 p-2 rounded-lg text-[9px] font-medium ${
                            previewProgress >= target
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {previewProgress >= target
                              ? <span className="flex items-center gap-1"><CheckCircle2 size={10} /> This will fully complete the indicator.</span>
                              : <span className="flex items-center gap-1"><ChevronRight size={10} /> {Math.max(0, remainingNeeded - parsedProgress)} {unit} will remain after this approval.</span>
                            }
                          </div>
                        )}
                      </div>

                      {/* Next deadline — only for quarterly partial approvals */}
                      {needsNextDeadline && (
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                            Next Submission Deadline *
                          </label>
                          <div className="relative">
                            <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              min={minDeadline}
                              value={nextDeadline}
                              onChange={(e) => { setNextDeadline(e.target.value); if (deadlineError) setDeadlineError(""); }}
                              className={`w-full rounded-xl border text-[11px] px-3 py-2.5 pl-8 focus:outline-none focus:ring-2 focus:ring-[#1a3a32]/20 bg-white ${
                                deadlineError ? "border-rose-300" : "border-slate-200"
                              }`}
                            />
                          </div>
                          {deadlineError && <p className="text-[9px] text-rose-500 font-bold mt-1">{deadlineError}</p>}
                          <p className="text-[8px] text-slate-400 mt-1">
                            Assignee must resubmit the remaining {Math.max(0, remainingNeeded - parsedProgress)} {unit} by this date.
                          </p>
                        </div>
                      )}

                      {/* Optional comment */}
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                          Comment <span className="text-slate-400 normal-case font-medium">(optional)</span>
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={2}
                          placeholder="Any notes for the assignee…"
                          className="w-full resize-none rounded-xl border border-slate-200 text-[11px] p-3 focus:outline-none focus:ring-2 focus:ring-[#1a3a32]/20 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Reject fields */}
                  {decision === "reject" && (
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                        Reason for Rejection *
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => { setComment(e.target.value); if (commentError) setCommentError(""); }}
                        rows={4}
                        placeholder="Explain clearly what needs to be corrected before resubmission…"
                        className={`w-full resize-none rounded-xl border text-[11px] p-3 focus:outline-none focus:ring-2 focus:ring-[#1a3a32]/20 bg-white ${
                          commentError ? "border-rose-300" : "border-slate-200"
                        }`}
                      />
                      {commentError && <p className="text-[9px] text-rose-500 font-bold mt-1">{commentError}</p>}
                      <p className="text-[8px] text-slate-400 mt-1.5">
                        This message will be sent to {indicator.assigneeDisplayName || "the assignee"}.
                      </p>
                    </div>
                  )}

                  {/* Confirm button */}
                  {decision && (
                    <button
                      onClick={handleReview}
                      disabled={actionLoading}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        decision === "approve"
                          ? "bg-[#1a3a32] hover:bg-[#0f2219] text-white"
                          : "bg-rose-600 hover:bg-rose-700 text-white"
                      } disabled:opacity-60`}
                    >
                      {actionLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : decision === "approve" ? (
                        <><ThumbsUp size={13} /> Confirm Approval</>
                      ) : (
                        <><ThumbsDown size={13} /> Confirm Rejection</>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* User info bottom */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <User size={10} className="text-slate-400" />
                  <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Assigned To</p>
                </div>
                <p className="text-[10px] font-semibold text-slate-600 mt-1">{indicator.assigneeDisplayName || "—"}</p>
                {indicator.assigneePjNumber && (
                  <p className="text-[8px] text-slate-400">{indicator.assigneePjNumber}</p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Document preview — full-screen ─────────────────────────────── */}
      {previewDoc && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex flex-col bg-black/90"
          onClick={() => setPreviewDoc(null)}
        >
          {/* Preview toolbar */}
          <div
            className="flex items-center justify-between px-5 py-3 bg-[#1a3a32] shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <DocIcon fileType={previewDoc.type} />
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{previewDoc.name}</p>
                <p className="text-emerald-300 text-[9px] uppercase tracking-wider">{previewDoc.type ?? "document"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={11} /> Open in new tab
              </a>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div className="flex-1 min-h-0 p-4" onClick={(e) => e.stopPropagation()}>
            {previewDoc.type === "image" ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            ) : (
              <iframe
                src={previewDoc.url}
                title={previewDoc.name}
                className="w-full h-full rounded-lg bg-white"
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
};

export default ApprovalIdModalPage;