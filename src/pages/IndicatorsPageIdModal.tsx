import { useState } from "react";
import {
  X,
  ExternalLink,
  CheckCircle2,
  User,
  AlertCircle,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Image as ImageIcon,
  Video,
  CalendarDays,
  BarChart3,
  Repeat,
  TrendingUp,
  Award,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { superAdminReview } from "../store/slices/indicatorSlice";
import {
  type IIndicator,
  type ISubmission,
  type IReviewHistory,
} from "../store/slices/indicatorSlice";
import { type User as UserType } from "../store/slices/user/userSlice";

/* ─── TYPES ────────────────────────────────────────────────────────────── */

interface Props {
  indicator: IIndicator;
  allStaff: UserType[];
  onClose: () => void;
}

/* ─── HELPERS ──────────────────────────────────────────────────────────── */

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fileIcon = (type: ISubmission["documents"][0]["fileType"]) => {
  if (type === "image") return <ImageIcon size={15} />;
  if (type === "video") return <Video size={15} />;
  return <FileText size={15} />;
};

const statusConfig = (status: IIndicator["status"]) => {
  const map: Record<string, { pill: string; dot: string }> = {
    Completed: {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    "Rejected by Admin": {
      pill: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
    "Rejected by Super Admin": {
      pill: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
    Pending: {
      pill: "bg-slate-50 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    },
    "Awaiting Admin Approval": {
      pill: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    "Awaiting Super Admin": {
      pill: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
  };
  return (
    map[status] ?? {
      pill: "bg-slate-50 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    }
  );
};

const reviewStatusConfig = (s: ISubmission["reviewStatus"]) => {
  const map: Record<string, { cls: string; label: string }> = {
    Accepted: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: "Accepted",
    },
    Verified: {
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      label: "Verified",
    },
    Rejected: {
      cls: "bg-rose-50 text-rose-700 border-rose-200",
      label: "Rejected",
    },
    Pending: {
      cls: "bg-slate-50 text-slate-500 border-slate-200",
      label: "Pending",
    },
  };
  return (
    map[s] ?? { cls: "bg-slate-50 text-slate-500 border-slate-200", label: s }
  );
};

const historyActionColor = (action: IReviewHistory["action"]) => {
  if (action === "Approved") return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (action === "Rejected" || action === "Correction Requested")
    return "text-rose-600 bg-rose-50 border-rose-100";
  if (action === "Verified") return "text-blue-600 bg-blue-50 border-blue-100";
  return "text-slate-500 bg-slate-50 border-slate-100";
};

const quarterLabel = (q: number) => {
  const map: Record<number, string> = {
    1: "Q1 · Jan–Mar",
    2: "Q2 · Apr–Jun",
    3: "Q3 · Jul–Sep",
    4: "Q4 · Oct–Dec",
  };
  return map[q] ?? `Q${q}`;
};

/* ─── QUARTERLY TRACKER ─────────────────────────────────────────────────── */

const QuarterlyTracker = ({
  submissions,
  activeQuarter,
}: {
  submissions: ISubmission[];
  activeQuarter: number;
}) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
      <TrendingUp size={10} className="text-slate-300" />
      Quarterly Submission Progress
    </p>
    <div className="grid grid-cols-4 gap-2">
      {([1, 2, 3, 4] as const).map((q) => {
        const sub = submissions.find((s) => s.quarter === q);
        const isActive = q === activeQuarter;
        const isFuture = q > activeQuarter;

        const containerClass = sub
          ? sub.reviewStatus === "Accepted"
            ? "bg-emerald-50 border-emerald-200"
            : sub.reviewStatus === "Rejected"
            ? "bg-rose-50 border-rose-200"
            : "bg-blue-50 border-blue-200"
          : isActive
          ? "bg-amber-50 border-amber-300"
          : "bg-slate-50 border-slate-100";

        const textClass = sub
          ? sub.reviewStatus === "Accepted"
            ? "text-emerald-700"
            : sub.reviewStatus === "Rejected"
            ? "text-rose-700"
            : "text-blue-700"
          : isActive
          ? "text-amber-700"
          : "text-slate-400";

        return (
          <div
            key={q}
            className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${containerClass}`}
          >
            {isActive && !sub && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black rounded uppercase tracking-wider whitespace-nowrap shadow-sm">
                Active
              </span>
            )}
            <span className={`text-[10px] font-black uppercase ${textClass}`}>
              Q{q}
            </span>
            <span className="text-[8px] text-slate-400 font-medium mt-0.5 text-center">
              {sub
                ? sub.reviewStatus
                : isFuture
                ? "Pending"
                : isActive
                ? "Open"
                : "Missed"}
            </span>
            {sub && (
              <span className={`text-[10px] font-bold mt-1 ${textClass}`}>
                {sub.achievedValue}
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/* ─── ANNUAL SUMMARY ────────────────────────────────────────────────────── */

const AnnualSummary = ({ indicator }: { indicator: IIndicator }) => {
  const achieved = indicator.currentTotalAchieved ?? 0;
  const target = indicator.target ?? 0;
  const pct =
    target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={13} className="text-violet-500" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Annual Reporting Window
        </p>
      </div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">
            Achieved
          </p>
          <p className="text-3xl font-serif font-bold text-emerald-600 leading-none">
            {achieved}
            <span className="text-sm text-slate-400 font-medium ml-1">
              {indicator.unit}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">
            Target
          </p>
          <p className="text-3xl font-serif font-bold text-[#1d3331] leading-none">
            {target}
            <span className="text-sm text-slate-400 font-medium ml-1">
              {indicator.unit}
            </span>
          </p>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              pct >= 100
                ? "#10b981"
                : pct >= 60
                ? "#3b82f6"
                : "#f59e0b",
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-slate-300 font-medium">0</span>
        <span className="text-[9px] font-black text-slate-500">
          {pct}% of annual target
        </span>
        <span className="text-[9px] text-slate-300 font-medium">{target}</span>
      </div>
    </div>
  );
};

/* ─── SUBMISSION CARD ───────────────────────────────────────────────────── */

const SubmissionCard = ({
  sub,
  isAnnual,
}: {
  sub: ISubmission;
  isAnnual: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);
  const { cls, label } = reviewStatusConfig(sub.reviewStatus);

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 bg-[#1d3331] text-white text-[9px] font-black rounded-lg uppercase tracking-widest shrink-0">
            {isAnnual ? "ANNUAL" : `Q${sub.quarter}`}
          </span>
          <div className="text-left min-w-0">
            <p className="text-[11px] font-bold text-[#1d3331] uppercase tracking-tight truncate">
              {isAnnual ? "Annual Report" : quarterLabel(sub.quarter)} ·{" "}
              Submitted {fmt(sub.submittedAt)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {sub.documents.length} document
              {sub.documents.length !== 1 ? "s" : ""}
              {sub.resubmissionCount > 0 && (
                <span className="ml-2 text-amber-500">
                  · {sub.resubmissionCount}× resubmitted
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${cls}`}
          >
            {label}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-50">
          <div className="pt-4 flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase">
              {isAnnual ? "Annual Achieved:" : "Achieved This Quarter:"}
            </span>
            <span className="text-[13px] font-bold text-[#1d3331]">
              {sub.achievedValue}
            </span>
          </div>

          {sub.documents.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-slate-300">
              <AlertCircle size={14} />
              <span className="text-[10px] font-bold uppercase">
                No documents attached
              </span>
            </div>
          ) : (
            sub.documents.map((doc) => (
              <div
                key={doc.evidencePublicId}
                className="group flex items-center justify-between p-3.5 bg-[#fcfcf7] border border-slate-100 rounded-xl hover:border-[#1d3331]/20 hover:bg-white transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 group-hover:text-[#1d3331] group-hover:border-[#1d3331]/20 transition-colors shadow-sm shrink-0">
                    {fileIcon(doc.fileType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-700 truncate max-w-[200px]">
                      {doc.fileName || `Evidence_${doc.fileType}`}
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">
                      {doc.fileType}
                      {doc.uploadedAt && (
                        <span className="ml-2 normal-case font-medium">
                          · {fmt(doc.uploadedAt)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-300 hover:text-[#1d3331] transition-colors rounded-lg hover:bg-slate-100 shrink-0"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            ))
          )}

          {sub.notes && (
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100/60">
              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">
                Contributor Notes
              </p>
              <p className="text-[12px] text-amber-900 leading-relaxed font-medium italic">
                "{sub.notes}"
              </p>
            </div>
          )}

          {sub.adminComment && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Admin Comment
              </p>
              <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                {sub.adminComment}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── HISTORY ITEM ──────────────────────────────────────────────────────── */

const HistoryItem = ({ entry }: { entry: IReviewHistory }) => (
  <div className="flex gap-4 items-start">
    <div
      className={`mt-0.5 p-1.5 rounded-lg shrink-0 border ${historyActionColor(
        entry.action
      )}`}
    >
      <ShieldCheck size={12} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#1d3331]">
          {entry.action}
        </span>
        <span className="text-[9px] text-slate-400 font-medium shrink-0">
          {fmt(entry.at)}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
        by{" "}
        <span className="font-bold text-slate-600">
          {entry.reviewedByName || entry.reviewedBy}
        </span>{" "}
        · {entry.reviewerRole}
      </p>
      {entry.reason && (
        <p className="text-[10px] text-slate-400 mt-1.5 italic bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
          "{entry.reason}"
        </p>
      )}
    </div>
  </div>
);

/* ─── MAIN MODAL ─────────────────────────────────────────────────────────── */

const IndicatorsPageIdModal = ({ indicator, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((s) => s.indicators);

  const isAnnual = indicator.reportingCycle === "Annual";

  /* ── KEY FIX: buttons visible for all statuses except Completed ── */
  const isCompleted = indicator.status === "Completed";
  const canReview = !isCompleted;

  const [activeTab, setActiveTab] = useState<
    "overview" | "evidence" | "history" | "team"
  >("overview");

  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  const submissions: ISubmission[] = indicator.submissions ?? [];
  const history: IReviewHistory[] = indicator.reviewHistory ?? [];

  const acceptedTotal = isAnnual
    ? indicator.currentTotalAchieved
    : submissions
        .filter((s) => s.reviewStatus === "Accepted")
        .reduce((acc, s) => acc + s.achievedValue, 0);

  /* ── handlers ── */

  const handleReview = async () => {
    if (reviewAction === "reject" && !comment.trim()) {
      setCommentError("A reason is required when rejecting.");
      return;
    }
    setCommentError("");

    await dispatch(
      superAdminReview({
        id: indicator.id,
        reviewData: {
          decision: reviewAction === "approve" ? "Approved" : "Rejected",
          reason: comment.trim() || "Approved by Super Admin",
        },
      })
    );

    setReviewAction(null);
    setComment("");
  };

  const cancelReview = () => {
    setReviewAction(null);
    setComment("");
    setCommentError("");
  };

  /* ── tabs ── */
  const tabs = [
    { key: "overview", label: "Overview" },
    {
      key: "evidence",
      label: "Evidence",
      badge: submissions.length || undefined,
    },
    {
      key: "history",
      label: "History",
      badge: history.length || undefined,
    },
    { key: "team", label: "Team" },
  ] as const;

  const { pill, dot } = statusConfig(indicator.status);

  return (
    <div className="flex flex-col h-full bg-[#fcfcf7] font-sans">

      {/* ── HEADER ── */}
      <div className="px-6 pt-6 pb-5 bg-white border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={`mt-0.5 p-2.5 rounded-xl shrink-0 ${
                isCompleted
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {isCompleted ? <Award size={20} /> : <Clock size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  {indicator.id.slice(-8).toUpperCase()}
                </span>
                <span className="text-slate-200">·</span>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                    isAnnual
                      ? "bg-violet-50 text-violet-600 border-violet-200"
                      : "bg-sky-50 text-sky-600 border-sky-200"
                  }`}
                >
                  {isAnnual ? (
                    <CalendarDays size={9} />
                  ) : (
                    <Repeat size={9} />
                  )}
                  {indicator.reportingCycle}
                </span>
                {indicator.perspective && (
                  <>
                    <span className="text-slate-200">·</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {indicator.perspective}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-[15px] font-bold text-[#1d3331] leading-snug line-clamp-2">
                {indicator.activityDescription || "Indicator Details"}
              </h2>
              {indicator.objectiveTitle && (
                <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                  ↳ {indicator.objectiveTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {indicator.status}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            Wt. {indicator.weight}%
          </span>
          <span className="text-slate-200">·</span>
          {!isAnnual && (
            <>
              <span className="text-[10px] font-bold text-slate-400">
                Q{indicator.activeQuarter} active
              </span>
              <span className="text-slate-200">·</span>
            </>
          )}
          <span className="text-[10px] font-bold text-slate-400">
            Due {fmt(indicator.deadline)}
          </span>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex px-6 bg-white border-b border-slate-100 gap-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === t.key
                ? "border-[#1d3331] text-[#1d3331]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
            {"badge" in t && t.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  activeTab === t.key
                    ? "bg-[#1d3331] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {isAnnual ? (
              <AnnualSummary indicator={indicator} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Overall Progress
                    </p>
                    <p className="text-3xl font-serif font-bold text-[#1d3331] leading-none">
                      {indicator.progress}
                      <span className="text-lg text-slate-400">%</span>
                    </p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${indicator.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Target
                      </p>
                      <p className="text-lg font-bold text-[#1d3331]">
                        {indicator.target}{" "}
                        <span className="text-slate-400 text-sm font-medium">
                          {indicator.unit}
                        </span>
                      </p>
                    </div>
                    <div className="border-t border-slate-50 pt-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Accepted Total
                      </p>
                      <p className="text-lg font-bold text-emerald-600">
                        {acceptedTotal}{" "}
                        <span className="text-slate-400 text-sm font-medium">
                          {indicator.unit}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <QuarterlyTracker
                  submissions={submissions}
                  activeQuarter={indicator.activeQuarter}
                />
              </>
            )}

            {/* Instructions */}
            {(indicator.instructions || indicator.objectiveTitle) && (
              <div className="p-5 bg-[#1d3331] text-white rounded-2xl">
                <h4 className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">
                  Instructions / Objective
                </h4>
                <p className="text-[13px] leading-relaxed font-medium opacity-90">
                  {indicator.instructions || indicator.objectiveTitle}
                </p>
              </div>
            )}

            {/* Admin overall comments */}
            {indicator.adminOverallComments && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5">
                  Admin Overall Comments
                </p>
                <p className="text-[12px] text-blue-900 leading-relaxed font-medium">
                  {indicator.adminOverallComments}
                </p>
              </div>
            )}

            {/* Cycle info note */}
            <div
              className={`flex items-start gap-3 p-4 rounded-2xl border ${
                isAnnual
                  ? "bg-violet-50 border-violet-100"
                  : "bg-sky-50 border-sky-100"
              }`}
            >
              <BarChart3
                size={15}
                className={`mt-0.5 shrink-0 ${
                  isAnnual ? "text-violet-500" : "text-sky-500"
                }`}
              />
              <div>
                <p
                  className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
                    isAnnual ? "text-violet-700" : "text-sky-700"
                  }`}
                >
                  {isAnnual ? "Annual Reporting" : "Quarterly Reporting"}
                </p>
                <p
                  className={`text-[10px] font-medium leading-relaxed ${
                    isAnnual ? "text-violet-800" : "text-sky-800"
                  }`}
                >
                  {isAnnual
                    ? "This indicator is reported once per financial year. One consolidated submission covers the full year's performance."
                    : `This indicator reports across 4 quarters. Q${indicator.activeQuarter} is currently active. Each quarter is reviewed independently before final completion.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── EVIDENCE ── */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            {!isAnnual && submissions.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as const).map((q) => {
                  const sub = submissions.find((s) => s.quarter === q);
                  const { cls } = sub
                    ? reviewStatusConfig(sub.reviewStatus)
                    : { cls: "" };
                  return (
                    <div
                      key={q}
                      className={`text-center py-2 px-1 rounded-xl text-[9px] font-black uppercase border ${
                        sub
                          ? cls
                          : q === indicator.activeQuarter
                          ? "bg-amber-50 border-amber-200 text-amber-600"
                          : "bg-slate-50 border-slate-100 text-slate-300"
                      }`}
                    >
                      Q{q}
                      <span className="block text-[8px] font-medium normal-case mt-0.5">
                        {sub
                          ? sub.reviewStatus
                          : q === indicator.activeQuarter
                          ? "Active"
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {submissions.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
                <AlertCircle className="mx-auto text-slate-200 mb-3" size={36} />
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                  No submissions yet
                </p>
                <p className="text-[10px] text-slate-300 mt-1">
                  {isAnnual
                    ? "The annual report will appear here once submitted"
                    : "Quarterly evidence will appear here as each quarter is submitted"}
                </p>
              </div>
            ) : (
              submissions
                .slice()
                .sort((a, b) => a.quarter - b.quarter)
                .map((sub) => (
                  <SubmissionCard key={sub.id} sub={sub} isAnnual={isAnnual} />
                ))
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === "history" && (
          <div className="space-y-1">
            {history.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-3xl">
                <History className="mx-auto text-slate-200 mb-3" size={36} />
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                  No review history
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-5 shadow-sm">
                {history
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.at).getTime() - new Date(a.at).getTime()
                  )
                  .map((entry, i) => (
                    <div key={entry.id ?? i}>
                      <HistoryItem entry={entry} />
                      {i < history.length - 1 && (
                        <div className="ml-9 mt-4 border-l-2 border-dashed border-slate-100 h-3" />
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── TEAM ── */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Lead Assignee
              </p>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#1d3331] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {indicator.assigneeDisplayName?.[0] ?? <User size={20} />}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#1d3331]">
                    {indicator.assigneeDisplayName || "Unassigned"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    {indicator.assignmentType} Assignment
                    {indicator.assigneePjNumber &&
                      ` · ${indicator.assigneePjNumber}`}
                  </p>
                </div>
              </div>
            </div>

            {indicator.assignedByName && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Assigned By
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                    {indicator.assignedByName[0]}
                  </div>
                  <p className="text-[13px] font-bold text-slate-700">
                    {indicator.assignedByName}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER / REVIEW PANEL ── */}
      <div className="border-t border-slate-100 bg-white">

        {/* Completed banner */}
        {isCompleted && (
          <div className="mx-6 mt-5 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">
              This activity has been marked complete
            </p>
          </div>
        )}

        {/* Review actions — visible for ALL statuses except Completed */}
        {canReview && (
          <div className="px-6 pt-5 pb-2">
            {!reviewAction ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewAction("approve")}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-md shadow-emerald-900/10"
                >
                  <ThumbsUp size={14} strokeWidth={2.5} />
                  Mark Complete
                </button>
                <button
                  onClick={() => setReviewAction("reject")}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-60 text-rose-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  <ThumbsDown size={14} strokeWidth={2.5} />
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    {reviewAction === "approve"
                      ? "Final Comment (optional)"
                      : "Reason for Rejection *"}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      if (commentError) setCommentError("");
                    }}
                    rows={3}
                    placeholder={
                      reviewAction === "approve"
                        ? "Add any final notes before marking complete..."
                        : "Describe why this is being rejected..."
                    }
                    className={`w-full resize-none rounded-xl border text-[12px] font-medium text-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 transition-all placeholder:text-slate-300 bg-[#fcfcf7] ${
                      commentError ? "border-rose-300" : "border-slate-200"
                    }`}
                  />
                  {commentError && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">
                      {commentError}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReview}
                    disabled={actionLoading}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-md disabled:opacity-60 ${
                      reviewAction === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10"
                        : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/10"
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : reviewAction === "approve" ? (
                      <>
                        <CheckCircle2 size={14} /> Confirm Complete
                      </>
                    ) : (
                      <>
                        <ThumbsDown size={14} /> Confirm Reject
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelReview}
                    disabled={actionLoading}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 pt-4 pb-5 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Weight: {indicator.weight}%
          </span>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Unit: {indicator.unit}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsPageIdModal;