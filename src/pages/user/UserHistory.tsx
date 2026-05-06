import React, { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchMyAssignments,
  type IDocumentUI,
  type ISubmissionUI,
} from "../../store/slices/userIndicatorSlice";
import {
  History,
  FileCheck,
  FileX,
  Send,
  MessageSquare,
  Clock,
} from "lucide-react";

/* ─── TYPES ──────────────────────────────────────────────────────────────────*/

interface ITimelineEvent {
  type: "SUBMISSION" | "REVIEW_ACTION";
  date: Date;
  title: string;
  objective?: string;
  quarterLabel?: string;       // e.g. "Q1 · 2025" or "Annual · 2025"
  status?: string;
  value?: number;
  docs?: IDocumentUI[];
  notes?: string;
  action?: string;
  reason?: string;             // populated from adminComment, not notes
  reviewer?: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────────*/

/**
 * Converts a quarter folder key ("Q1_2025", "Annual_2025") into a
 * human-readable label ("Q1 · 2025", "Annual · 2025").
 */
const formatQuarterKey = (key: string): string =>
  key.replace("_", " · ");

/* ─── COMPONENT ──────────────────────────────────────────────────────────────*/

const UserHistory: React.FC = () => {
  const dispatch    = useAppDispatch();
  const { myIndicators, loading } = useAppSelector((s) => s.userIndicators);

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  const unifiedHistory = useMemo(() => {
    const events: ITimelineEvent[] = [];

    myIndicators.forEach((indicator) => {
      /**
       * submissions is now Record<"Q1_2025" | "Annual_2025" | …, ISubmissionUI[]>.
       * We iterate entries so we have the quarter key available for display,
       * then iterate the submissions array within each folder.
       *
       * flattenSubmissions() is available for cases where quarter context
       * isn't needed, but here we want the label so we use Object.entries().
       */
      Object.entries(indicator.submissions ?? {}).forEach(
        ([quarterKey, quarterSubmissions]) => {
          const quarterLabel = formatQuarterKey(quarterKey);

          quarterSubmissions.forEach((sub: ISubmissionUI) => {
            // Safe date parse — guard against invalid ISO strings
            const rawDate = new Date(sub.submittedAt);   // camelCase
            const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;

            // ── Submission event ─────────────────────────────────────────────
            events.push({
              type:         "SUBMISSION",
              date:         validDate,
              title:        indicator.activity?.description ?? "Indicator Update",
              objective:    indicator.objective?.title,
              quarterLabel,
              status:       sub.reviewStatus,             // camelCase
              value:        sub.achievedValue,            // camelCase
              docs:         sub.documents,
              notes:        sub.notes,
            });

            // ── Review action event ──────────────────────────────────────────
            // Only emit when there is a concrete admin decision to display.
            // Use adminComment as the reason — it's the field the backend
            // populates with admin feedback, not `notes` (which is user input).
            if (
              sub.reviewStatus === "Rejected" ||          // camelCase
              sub.reviewStatus === "Accepted" ||
              sub.reviewStatus === "Verified"
            ) {
              events.push({
                type:         "REVIEW_ACTION",
                date:         validDate,
                title:        indicator.activity?.description ?? "Indicator Review",
                objective:    indicator.objective?.title,
                quarterLabel,
                action:       sub.reviewStatus,           // camelCase
                reason:       sub.adminComment            // camelCase — admin's feedback
                               ?? "Registry verification processed.",
                reviewer:     "Registry Audit",
              });
            }
          });
        }
      );
    });

    // Most recent events first
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [myIndicators]);

  /* ── Loading state ──────────────────────────────────────────────────────── */

  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Clock className="animate-pulse text-[#1a3a32] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Syncing Audit Trail...
        </p>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#fdfcfc] p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-8">
          <div className="p-4 bg-[#1a3a32] text-white rounded-3xl shadow-xl shadow-emerald-900/20">
            <History size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1a3a32] uppercase tracking-tighter font-serif text-emerald-900">
              Registry Timeline
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Comprehensive activity log
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">

          {unifiedHistory.map((event, idx) => (
            <div
              key={`${event.date.getTime()}-${idx}`}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              {/* Dot icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow-md z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                {event.type === "SUBMISSION" ? (
                  <Send size={14} className="text-emerald-500" />
                ) : event.action === "Rejected" ? (
                  <FileX size={14} className="text-rose-500" />
                ) : (
                  <FileCheck size={14} className="text-[#c2a336]" />
                )}
              </div>

              {/* Content card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-lg transition-all">

                {/* Card header */}
                <div className="flex items-center justify-between mb-3">
                  <time className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {event.date.toLocaleDateString()} @{" "}
                    {event.date.toLocaleTimeString([], {
                      hour:   "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <span
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                      event.type === "SUBMISSION"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {event.type === "SUBMISSION" ? "Data Entry" : "Review Step"}
                  </span>
                </div>

                {/* Quarter label badge */}
                {event.quarterLabel && (
                  <span className="inline-block mb-2 text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {event.quarterLabel}
                  </span>
                )}

                <h3 className="text-xs font-black text-[#1a3a32] uppercase leading-tight mb-1">
                  {event.title}
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {event.objective}
                </p>

                {/* Card body */}
                {event.type === "SUBMISSION" ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
                      "{event.notes ?? "Standard periodic update submitted."}"
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#1a3a32] px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                        VAL: {event.value}
                      </span>
                      {event.docs && event.docs.length > 0 && (
                        <span className="text-[9px] font-black text-emerald-600 uppercase">
                          {event.docs.length} Evidence Attached
                        </span>
                      )}
                    </div>

                    {/* Document list — fileName (camelCase) with fallback */}
                    {event.docs && event.docs.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {event.docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-2 text-[9px] text-slate-400 font-semibold"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                            {doc.fileName ?? "Unnamed file"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MessageSquare size={14} className="shrink-0 text-slate-400" />
                      <p className="text-[11px] font-bold leading-relaxed">
                        <span className="font-black uppercase">{event.action}</span>
                        {": "}
                        {event.reason}
                      </p>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase text-right">
                      — {event.reviewer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {unifiedHistory.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-100">
              <Clock className="mx-auto text-slate-100 mb-4" size={64} />
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">
                Registry Clean
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHistory;