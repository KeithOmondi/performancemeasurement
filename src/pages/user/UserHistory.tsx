import React, { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  fetchMyAssignments,
  type IDocumentUI, 
} from "../../store/slices/userIndicatorSlice";
import { 
  History, 
  FileCheck, 
  FileX, 
  Send, 
  MessageSquare, 
  Clock, 
} from "lucide-react";

/* ─── TYPES ──────────────────────────────────────────────────────────── */

interface ITimelineEvent {
  type: "SUBMISSION" | "REVIEW_ACTION";
  date: Date;
  title: string;
  objective?: string;
  status?: string;
  value?: number;
  docs?: IDocumentUI[]; // Strictly typed using your defined interface
  notes?: string;
  action?: string;
  reason?: string;
  reviewer?: string;
}

const UserHistory: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myIndicators, loading } = useAppSelector((state) => state.userIndicators);

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  const unifiedHistory = useMemo(() => {
    const events: ITimelineEvent[] = [];

    myIndicators.forEach((indicator) => {
      (indicator.submissions || []).forEach((sub) => {
        // Safe date parsing to avoid "Invalid Date" errors
        const submissionDate = new Date(sub.submitted_at);
        const validDate = isNaN(submissionDate.getTime()) ? new Date() : submissionDate;

        // 1. Map Submissions 
        events.push({
          type: "SUBMISSION",
          date: validDate,
          title: indicator.activity?.description || "Indicator Update",
          objective: indicator.objective?.title,
          status: sub.review_status,
          value: sub.achieved_value,
          docs: sub.documents, // IDocument[]
          notes: sub.notes
        });

        // 2. Map Review Actions (Only using defined fields: review_status & notes)
        if (sub.review_status === "Rejected" || sub.review_status === "Accepted") {
            events.push({
                type: "REVIEW_ACTION",
                date: validDate, 
                title: indicator.activity?.description || "Indicator Review",
                objective: indicator.objective?.title,
                action: sub.review_status,
                // Only using notes as the reason since admin_comment was undefined
                reason: sub.notes || "Registry verification processed.", 
                reviewer: "Registry Audit"
            });
        }
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [myIndicators]);

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

  return (
    <div className="min-h-screen bg-[#fdfcfc] p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-8">
          <div className="p-4 bg-[#1a3a32] text-white rounded-3xl shadow-xl shadow-emerald-900/20">
            <History size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1a3a32] uppercase tracking-tighter font-serif text-emerald-900">Registry Timeline</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Comprehensive activity log</p>
          </div>
        </div>

        {/* Timeline Line */}
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          
          {unifiedHistory.map((event, idx) => (
            <div key={`${event.date.getTime()}-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              
              {/* Dot Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow-md z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                {event.type === "SUBMISSION" ? (
                  <Send size={14} className="text-emerald-500" />
                ) : event.action === "Rejected" ? (
                  <FileX size={14} className="text-rose-500" />
                ) : (
                  <FileCheck size={14} className="text-[#c2a336]" />
                )}
              </div>

              {/* Content Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <time className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {event.date.toLocaleDateString()} @ {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    event.type === "SUBMISSION" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                  }`}>
                    {event.type === "SUBMISSION" ? "Data Entry" : "Review Step"}
                  </span>
                </div>

                <h3 className="text-xs font-black text-[#1a3a32] uppercase leading-tight mb-1">
                  {event.title}
                </h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {event.objective}
                </p>

                {event.type === "SUBMISSION" ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
                      "{event.notes || "Standard periodic update submitted."}"
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
                  </div>
                ) : (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MessageSquare size={14} className="shrink-0 text-slate-400" />
                      <p className="text-[11px] font-bold leading-relaxed">
                        <span className="font-black uppercase">{event.action}</span>: {event.reason}
                      </p>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase text-right">— {event.reviewer}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {unifiedHistory.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-100">
              <Clock className="mx-auto text-slate-100 mb-4" size={64} />
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">Registry Clean</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserHistory;