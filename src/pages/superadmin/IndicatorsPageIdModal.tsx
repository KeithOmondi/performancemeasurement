import { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  FileText,
  Calendar,
  Loader2,
  ChevronDown,
  Target,
  Download,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  History
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  updateIndicator,
  superAdminReview,
  type IIndicator,
  type ISubmission
} from "../../store/slices/indicatorSlice";
import { fetchRegistryStatus } from "../../store/slices/registrySlice";
import toast from "react-hot-toast";

interface Props {
  indicator: IIndicator;
  allStaff: any[];
  onClose: () => void;
}

const IndicatorsPageIdModal = ({ indicator, allStaff, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [activeView, setActiveView] = useState<"audit" | "reassign">("audit");
  const isProcessing = useAppSelector((state) => state.indicators.actionLoading);
  
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [allocationDeadline, setAllocationDeadline] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [progressOverride, setProgressOverride] = useState<number>(0);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);

  // Match backend logic: Annual uses 0, Quarterly uses activeQuarter
  const targetQ = useMemo(() => 
    indicator.reportingCycle === "Annual" ? 0 : indicator.activeQuarter
  , [indicator]);

  const { activeSubmission, cycleLabel } = useMemo(() => {
    const label = indicator.reportingCycle === "Annual" ? "Annual" : `Q${indicator.activeQuarter}`;
    const submission = indicator.submissions?.find((s: ISubmission) => s.quarter === targetQ);
    return { activeSubmission: submission || null, cycleLabel: label };
  }, [indicator, targetQ]);

  useEffect(() => {
    dispatch(fetchRegistryStatus());
    const initialId = typeof indicator.assignee === "object" ? indicator.assignee?._id : indicator.assignee;
    setAssigneeId(initialId || "");
    setAllocationDeadline(indicator.deadline ? indicator.deadline.split("T")[0] : "");
    
    // Default the override to the user's submitted value if it exists
    if (activeSubmission) {
      setProgressOverride(activeSubmission.achievedValue);
    } else {
      setProgressOverride(indicator.progress || 0);
    }
    
    setSelectedQuarter(indicator.activeQuarter || 1);
  }, [dispatch, indicator, activeSubmission]);

  const isCertified = activeSubmission?.reviewStatus === "Accepted" || indicator.status === "Completed";

  const handleFinalCertification = async (decision: "Approved" | "Rejected") => {
    try {
      if (!decisionReason && decision === "Rejected") {
        return toast.error("Please provide an audit narrative for rejection.");
      }

      await dispatch(
        superAdminReview({
          id: indicator._id,
          reviewData: {
            decision,
            reason: decisionReason || `${cycleLabel} certification validated.`,
            progressOverride: progressOverride 
          },
        })
      ).unwrap();

      toast.success(decision === "Approved" 
        ? `${cycleLabel} Performance Certified` 
        : "Submission Returned for Correction"
      );
      
      onClose();
    } catch (err: any) {
      toast.error(err || "Certification failed");
    }
  };

  const handleUpdateGovernance = async () => {
    try {
      await dispatch(
        updateIndicator({
          id: indicator._id,
          data: {
            assignee: assigneeId,
            deadline: allocationDeadline,
            activeQuarter: indicator.reportingCycle === "Annual" ? 0 : selectedQuarter,
          },
        })
      ).unwrap();
      
      toast.success(`Governance Parameters Updated`);
      setActiveView("audit");
    } catch (err: any) {
      toast.error(err || "Update failed");
    }
  };

  return (
    <div className="bg-[#f4f7f5] w-full h-full flex flex-col shadow-2xl overflow-hidden font-sans relative">
      <header className="bg-[#1d3331] px-8 py-6 flex justify-between items-center shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="h-12 w-12 rounded-xl bg-[#c2a336]/10 border border-[#c2a336]/20 flex items-center justify-center text-[#c2a336]">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c2a336]" />
              <p className="text-[9px] font-black uppercase text-white/40 tracking-[0.2em]">
                Registry Certification — {indicator.reportingCycle}
              </p>
            </div>
            <h2 className="text-sm font-bold text-white leading-tight mt-1 max-w-xl line-clamp-1 uppercase">
              {indicator.activityDescription}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-black/20 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveView("audit")}
              className={`px-4 py-2 rounded-lg transition-all text-[10px] font-black uppercase ${
                activeView === "audit" ? "bg-[#c2a336] text-[#1d3331]" : "text-white/40 hover:text-white"
              }`}
            >
              Audit & Certify
            </button>
            <button
              onClick={() => setActiveView("reassign")}
              className={`px-4 py-2 rounded-lg transition-all text-[10px] font-black uppercase ${
                activeView === "reassign" ? "bg-[#c2a336] text-[#1d3331]" : "text-white/40 hover:text-white"
              }`}
            >
              Phase Control
            </button>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-2">
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        <div className="max-w-4xl mx-auto py-12 px-6">
          {activeView === "audit" ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* STATUS BAR */}
              <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isCertified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    {isCertified ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Status</p>
                    <p className="text-xs font-black text-[#1d3331] uppercase">
                      {isCertified ? "CERTIFIED & LOCKED" : indicator.status} — {cycleLabel}
                    </p>
                  </div>
                </div>
                <div className="flex gap-8">
                    <div className="text-right border-l pl-6 border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Officer</p>
                      <p className="text-xs font-black text-[#1d3331]">{indicator.assigneeDisplayName}</p>
                    </div>
                    {activeSubmission && (
                      <div className="text-right border-l pl-6 border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Iterations</p>
                        <p className="text-xs font-black text-[#1d3331]">{activeSubmission.resubmissionCount || 0} Submissions</p>
                      </div>
                    )}
                </div>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Target", val: `${indicator.target}${indicator.unit}`, icon: <Target size={12} /> },
                  { label: "User Achievement", val: `${activeSubmission?.achievedValue || 0}${indicator.unit}`, icon: <CheckCircle2 size={12} /> },
                  { label: "Overall Progress", val: `${indicator.progress}%`, icon: <div className="h-2 w-2 rounded-full bg-[#c2a336]" /> },
                  { label: "Deadline", val: allocationDeadline, icon: <Calendar size={12} /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-slate-400">
                      {stat.icon}
                      <p className="text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
                    </div>
                    <p className="text-xs font-black text-[#1d3331]">{stat.val}</p>
                  </div>
                ))}
              </div>

              {/* EVIDENCE SECTION */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                  <FileText size={14} className="text-[#c2a336]" /> {cycleLabel} Submitted Evidence
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSubmission?.documents?.length ? (
                    activeSubmission.documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-[#1d3331] hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-50 text-[#1d3331] rounded-xl group-hover:bg-[#1d3331] group-hover:text-white transition-colors">
                            <FileText size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-[#1d3331] uppercase">{doc.fileName || `Artifact ${i + 1}`}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{doc.fileType} format</span>
                          </div>
                        </div>
                        <Download size={16} className="text-slate-300 group-hover:text-[#c2a336]" />
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 py-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-3">
                       <AlertCircle size={24} className="text-slate-200" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Waiting for {cycleLabel} submission</p>
                    </div>
                  )}
                </div>
              </section>

              {/* USER NOTES BOX */}
              {activeSubmission?.notes && (
                <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <History size={12} /> Submitter's Remarks
                    </p>
                    <p className="text-xs text-blue-900 font-medium leading-relaxed italic">"{activeSubmission.notes}"</p>
                </div>
              )}

              {/* AUDIT PANEL */}
              <div className="bg-[#1d3331] p-10 rounded-3xl shadow-2xl text-white space-y-8 border-b-4 border-[#c2a336]">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-[#c2a336]" />
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]">Certification Verdict</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#c2a336] uppercase tracking-[0.2em]">Verified Achievement ({indicator.unit})</label>
                    <div className="relative">
                      <select
                        value={progressOverride}
                        onChange={(e) => setProgressOverride(Number(e.target.value))}
                        disabled={isProcessing || isCertified}
                        className="w-full appearance-none p-5 bg-black/30 border border-white/10 rounded-xl font-black text-lg text-white outline-none focus:border-[#c2a336] disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                          <option key={val} value={val} className="text-black">{val}{indicator.unit} Verified</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-[#c2a336] pointer-events-none" size={20} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#c2a336] uppercase tracking-[0.2em]">Audit Narrative (Internal Review)</label>
                    <textarea
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      disabled={isProcessing || isCertified}
                      className="w-full p-6 bg-black/30 border border-white/10 rounded-xl text-sm font-medium outline-none focus:bg-black/40 min-h-[120px] disabled:opacity-50"
                      placeholder="Detail the grounds for this certification decision..."
                    />
                  </div>
                </div>

                {isCertified ? (
                  <div className="py-6 px-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-4">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                      {indicator.reportingCycle} Performance Verified & Record Locked.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      onClick={() => handleFinalCertification("Approved")}
                      disabled={isProcessing || !activeSubmission}
                      className="flex-1 py-5 bg-[#c2a336] text-[#1d3331] rounded-xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} /> Finalize Certification
                    </button>
                    <button
                      onClick={() => handleFinalCertification("Rejected")}
                      disabled={isProcessing || !activeSubmission}
                      className="px-10 py-5 border border-red-500/50 text-red-500 rounded-xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <RotateCcw size={18} /> Return for Correction
                    </button>
                  </div>
                )}
                {!activeSubmission && !isCertified && (
                    <p className="text-[10px] text-center text-white/40 font-bold uppercase tracking-widest italic">
                        Decision disabled: Waiting for user submission.
                    </p>
                )}
              </div>
            </div>
          ) : (
            /* PHASE GOVERNANCE VIEW */
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <button onClick={() => setActiveView("audit")} className="flex items-center gap-2 text-[10px] font-black text-[#1d3331] uppercase tracking-widest hover:opacity-60 transition-opacity">
                <ChevronDown size={14} className="rotate-90" /> Return to Audit
              </button>

              <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldCheck size={120} />
                </div>
                
                <div className="space-y-3 relative z-10">
                  <h3 className="text-2xl font-black text-[#1d3331] tracking-tight">Phase Governance</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Access & Timeline Control</p>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#1d3331] uppercase ml-1">Assigned Lead Officer</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs text-[#1d3331] outline-none focus:ring-2 focus:ring-[#c2a336]/20"
                    >
                      <option value="">Select Officer</option>
                      {allStaff.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} — {s.groupName || 'Personnel'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-[#1d3331] uppercase ml-1">Active Reporting Cycle</label>
                        {indicator.reportingCycle === "Annual" ? (
                          <div className="w-full p-5 bg-slate-100 border border-slate-200 rounded-2xl font-black text-xs text-slate-500">
                               ANNUAL CYCLE
                          </div>
                        ) : (
                          <select
                          value={selectedQuarter}
                          onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                          className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs text-[#1d3331] outline-none focus:ring-2 focus:ring-[#c2a336]/20"
                          >
                          {[1, 2, 3, 4].map((q) => (
                              <option key={q} value={q}>Quarter {q}</option>
                          ))}
                          </select>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-[#1d3331] uppercase ml-1">New Deadline</label>
                        <input
                        type="date"
                        value={allocationDeadline}
                        onChange={(e) => setAllocationDeadline(e.target.value)}
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs text-[#1d3331] outline-none focus:ring-2 focus:ring-[#c2a336]/20"
                        />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                        onClick={handleUpdateGovernance} 
                        className="w-full py-4 bg-[#1d3331] text-white rounded-xl font-black text-[12px] uppercase tracking-[0.4em] hover:bg-[#c2a336] hover:text-[#1d3331] transition-all shadow-lg"
                    >
                        SAVE GOVERNANCE UPDATES
                    </button>
                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase mt-6 tracking-widest px-4 leading-relaxed italic">
                        Note: Updating lead officer or cycle will trigger a fresh review cycle and reset status to 'Pending'.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isProcessing && (
        <div className="absolute inset-0 z-[100] bg-[#1d3331]/95 backdrop-blur-md flex flex-col items-center justify-center gap-6">
          <Loader2 className="animate-spin text-[#c2a336]" size={60} />
          <div className="text-center space-y-2">
            <span className="text-[11px] font-black text-white uppercase tracking-[0.6em] block">Updating Audit Trail</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorsPageIdModal;