import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
// Importing exactly what is defined in your slice
import { fetchMyAssignments } from "../../store/slices/userIndicatorSlice";
import type { IIndicatorUI, ISubmissionUI } from "../../store/slices/userIndicatorSlice";
import {
  ArrowLeft, RotateCcw, FileText, AlertCircle,
  Loader2, Users, User, ChevronRight, MessageSquare
} from "lucide-react";

/* ─── HELPERS ────────────────────────────────────────────────────────── */

/**
 * Logic: An indicator belongs in this view ONLY if the LATEST submission
 * for a specific quarter is currently in 'Rejected' status.
 */
const hasActiveRejection = (indicator: IIndicatorUI): boolean => {
  const subs = indicator.submissions ?? [];
  if (subs.length === 0) return false;

  // DEBUG: Uncomment this to see data in console
  // console.log(`Indicator ${indicator.id} subs:`, subs);

  const latestByQuarter: Record<number, ISubmissionUI> = {};

  subs.forEach((s) => {
    const q = s.quarter;
    const existing = latestByQuarter[q];
    
    // Fallback to 0 if date is missing to prevent "Invalid Date"
    const currentMillis = new Date(s.submitted_at || 0).getTime();
    const existingMillis = new Date(existing?.submitted_at || 0).getTime();

    if (!existing || currentMillis > existingMillis) {
      latestByQuarter[q] = s;
    }
  });

  // Check if any "latest" submission is specifically "Rejected"
  const hasRejection = Object.values(latestByQuarter).some(
    (s) => s.review_status === "Rejected"
  );

  return hasRejection;
};

const getLatestRejectedSubmission = (indicator: IIndicatorUI): ISubmissionUI | null => {
  return [...(indicator.submissions ?? [])]
    .filter((s) => s.review_status === "Rejected")
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0] || null;
};

/* ─── COMPONENT ──────────────────────────────────────────────────────── */

const UserRejections = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Accessing state exactly as defined in your UserIndicatorState interface
  const { myIndicators, loading, error } = useAppSelector(
    (state) => state.userIndicators
  );

  // Trigger fetch on mount
  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  // Derived state: Filtered list based on active rejections
  const rejectedIndicators = useMemo(
    () => myIndicators.filter(hasActiveRejection),
    [myIndicators]
  );

  // 1. Loading State: Only show full-screen loader if we have no data yet
  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1a3a32] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Fetching Registry Assignments...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-6">
        <div className="text-center p-12 bg-white rounded-[2rem] shadow-xl border border-gray-100 max-w-sm">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="font-serif font-black text-xl text-[#1a3a32]">Sync Failure</h2>
          <p className="text-xs text-gray-400 mt-2">{error}</p>
          <button
            onClick={() => dispatch(fetchMyAssignments())}
            className="mt-8 w-full py-4 bg-[#1a3a32] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Navigation */}
        <nav className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 group"
          >
            <div className="p-2 bg-white rounded-full border border-gray-100 shadow-sm group-hover:bg-gray-50 transition-colors">
              <ArrowLeft size={16} className="text-[#1a3a32]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">
              Exit to Dashboard
            </span>
          </button>

          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {rejectedIndicators.length} Unresolved Issues
            </span>
          </div>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl font-serif font-black text-[#1a3a32] tracking-tight">
            Returned Submissions
          </h1>
          <p className="text-sm text-gray-400 font-medium max-w-xl leading-relaxed">
            These filings were reviewed and returned for correction. Re-submitting these will update the existing registry record.
          </p>
        </header>

        {/* List Content */}
        {rejectedIndicators.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <RotateCcw size={28} className="text-gray-200" />
            </div>
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em]">
              All clearances processed
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rejectedIndicators.map((indicator) => {
              const rejectedSub = getLatestRejectedSubmission(indicator);
              const isTeam = indicator.assignee_model === "Team";

              return (
                <button
                  key={indicator.id}
                  onClick={() => navigate(`/user/assignments/${indicator.id}`)}
                  className="w-full text-left bg-white border border-gray-100 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-500/5 rounded-[2.5rem] p-8 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-6 relative z-10">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c2a336] bg-[#c2a336]/5 px-2 py-0.5 rounded">
                          {indicator.perspective}
                        </span>
                        {isTeam && (
                          <span className="flex items-center gap-1 text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                             <Users size={10} /> Collaborative
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-black text-[#1a3a32] font-serif leading-tight">
                        {indicator.activity?.description}
                      </h3>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      <ChevronRight size={20} />
                    </div>
                  </div>

                  {/* Feedback Section */}
                  <div className="mt-6 bg-rose-50/50 border border-rose-100/50 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <MessageSquare size={40} className="text-rose-900" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-2 flex items-center gap-2">
                      <AlertCircle size={12} /> Registry Feedback
                    </p>
                    <p className="text-xs text-rose-800 font-bold leading-relaxed italic relative z-10">
                      "{rejectedSub?.overallRejectionReason || rejectedSub?.notes || "No specific feedback provided. Please verify all document requirements."}"
                    </p>
                  </div>

                  {/* Metadata Footer */}
                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-lg">
                      <User size={10} />
                      {indicator.assigneeName}
                    </div>
                    
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-lg">
                      Period: Q{rejectedSub?.quarter || indicator.active_quarter}
                    </div>

                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-lg">
                      <FileText size={10} />
                      {rejectedSub?.documents?.length || 0} Files
                    </div>

                    <div className="ml-auto flex items-center gap-2 text-[9px] font-black uppercase text-rose-500">
                      Update Required
                    </div>
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