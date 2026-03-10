import { useState, useEffect } from "react";
import { 
  X, Paperclip,  
  UserMinus, CalendarDays,
  BarChart3, Lock, RefreshCw, Send, ChevronLeft, Settings2, Loader2
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateIndicator, submitSuperAdminDecision, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

interface Props {
  indicator: IIndicator;
  allStaff: any[];
  onClose: () => void;
}

const IndicatorsPageIdModal = ({ indicator, allStaff, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const [activeView, setActiveView] = useState<"review" | "allocation">("review");

  const activityDetails = useAppSelector((state) => {
    for (const plan of state.strategicPlan.plans) {
      for (const obj of plan.objectives) {
        const act = obj.activities.find((a: any) => a._id === indicator.activityId);
        if (act) return { description: act.description, perspective: plan.perspective };
      }
    }
    return null;
  });

  const [assigneeId, setAssigneeId] = useState<string | string[]>(indicator.assignee || (indicator.assignmentType === "Team" ? [] : ""));
  const [deadline, setDeadline] = useState(indicator.deadline ? indicator.deadline.split('T')[0] : "");
  const [instructions, setInstructions] = useState(indicator.instructions || "");
  const [decisionReason, setDecisionReason] = useState("");
  const [progressOverride, setProgressOverride] = useState(indicator.progress || 0);
  const [nextQuarterDeadline, setNextQuarterDeadline] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isTeam = indicator.assignmentType === "Team";
  const pendingSubmission = indicator.submissions.find(s => !s.isReviewed);
  const currentQuarter = indicator.submissions.length;

  useEffect(() => {
    setProgressOverride(indicator.progress);
  }, [indicator.progress]);

  const getSelectedStaffObjects = () => {
    const ids = Array.isArray(assigneeId) ? assigneeId : [assigneeId];
    return allStaff.filter(s => ids.includes(s._id));
  };

  const handleRemoveMember = (id: string) => {
    if (isTeam && Array.isArray(assigneeId)) {
      setAssigneeId(assigneeId.filter(m => m !== id));
    }
  };

  const handleUpdateAssignment = async () => {
    setIsProcessing(true);
    try {
      await dispatch(updateIndicator({
        id: indicator._id,
        updateData: { assignee: assigneeId, deadline, instructions }
      })).unwrap();
      toast.success("Task re-assigned successfully");
      setActiveView("review");
    } catch (err: any) {
      toast.error(err || "Update failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecision = async (decision: "Approve" | "Reject") => {
    if (decision === "Reject" && !decisionReason.trim()) return toast.error("Please provide a reason.");
    if (decision === "Approve" && indicator.reportingCycle === "Quarterly" && currentQuarter < 4 && !nextQuarterDeadline) {
      return toast.error(`Please set a deadline for Quarter ${currentQuarter + 1}`);
    }

    setIsProcessing(true);
    try {
      await dispatch(submitSuperAdminDecision({
        id: indicator._id,
        decisionData: { 
            decision, 
            reason: decisionReason, 
            progressOverride, 
            nextDeadline: nextQuarterDeadline 
        }
      })).unwrap();
      toast.success(decision === "Approve" ? "KPI Approved" : "Revision Requested");
      onClose();
    } catch (err: any) {
      toast.error(err || "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#fcfdfd] w-full h-full flex flex-col shadow-2xl overflow-hidden font-sans relative">
      
      {/* PROCESSING OVERLAY */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[#1a3a32]" size={48} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1a3a32]">Updating Registry...</span>
            </div>
        </div>
      )}

      {/* HEADER: Tightened Padding */}
      <div className="bg-[#1a3a32] text-white px-6 py-5 flex justify-between items-center shrink-0 z-20 border-b border-white/5">
        <div className="flex items-center gap-4">
          {activeView === "allocation" ? (
            <button 
                onClick={() => setActiveView("review")}
                className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={18}/>
            </button>
          ) : (
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/30">
              <BarChart3 size={18}/>
            </div>
          )}
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-[0.15em]">
              {activeView === "review" ? "Dossier Examination" : "Allocation Management"}
            </h2>
            <p className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-widest mt-0.5">
              Ref: {indicator._id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {activeView === "review" && (
            <button 
              onClick={() => setActiveView("allocation")}
              className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all"
            >
              <Settings2 size={12}/> Re-Assign
            </button>
          )}
          <button onClick={onClose} className="bg-white/5 hover:bg-white/20 p-2 rounded-full transition-all">
            <X size={18}/>
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* VIEW 1: REVIEW & HISTORY - Max width set to 100% of drawer */}
        <div className={`absolute inset-0 overflow-y-auto p-6 lg:p-10 transition-transform duration-500 ease-in-out ${activeView === "review" ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="w-full space-y-8">
                <section>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Activity</label>
                    <h1 className="text-xl font-bold text-[#1a3a32] leading-snug mt-2">
                      {activityDetails?.description}
                    </h1>
                </section>

                {/* PROGRESS METER: Compacted */}
                <div className="bg-[#1a3a32] p-6 rounded-[1.5rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Certification Progress</span>
                            <span className="text-3xl font-black text-white">{indicator.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-1000" style={{ width: `${indicator.progress}%` }} />
                        </div>
                    </div>
                </div>

                {/* DECISION AREA: Cleaned up spacing */}
                <div className="bg-white border border-slate-200 p-6 rounded-[1.5rem] shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase text-[#1a3a32] flex items-center gap-2">
                            <RefreshCw size={14} className="text-emerald-700"/> Super Admin Decision
                        </h3>
                        {pendingSubmission && (
                          <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Review Required</span>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                            <span>Adjust Cumulative Progress</span>
                            <span className="text-[#1a3a32] font-mono">{progressOverride}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={progressOverride} onChange={(e) => setProgressOverride(Number(e.target.value))} className="w-full accent-[#1a3a32] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                        
                        <textarea 
                            value={decisionReason} 
                            onChange={(e) => setDecisionReason(e.target.value)}
                            placeholder="Reason for decision (Required for rejection)..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium focus:ring-2 focus:ring-[#1a3a32]/5 min-h-[100px] outline-none transition-all"
                        />

                        {indicator.reportingCycle === "Quarterly" && currentQuarter < 4 && (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <label className="text-[9px] font-black text-emerald-800 uppercase block mb-2 flex items-center gap-2">
                                    <CalendarDays size={12}/> Q{currentQuarter + 1} Reporting Deadline
                                </label>
                                <input 
                                    type="date" 
                                    value={nextQuarterDeadline}
                                    onChange={(e) => setNextQuarterDeadline(e.target.value)}
                                    className="w-full bg-white border border-emerald-200 rounded-lg p-2.5 text-xs font-black outline-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            disabled={isProcessing}
                            onClick={() => handleDecision("Reject")} 
                            className="bg-white text-red-600 font-black py-3.5 rounded-xl text-[9px] uppercase tracking-[0.15em] border border-red-100 hover:bg-red-50 transition-all active:scale-95"
                        >
                            Request Revision
                        </button>
                        <button 
                            disabled={isProcessing}
                            onClick={() => handleDecision("Approve")} 
                            className="bg-[#1a3a32] text-white font-black py-3.5 rounded-xl text-[9px] uppercase tracking-[0.15em] shadow-lg flex items-center justify-center gap-2 hover:bg-[#0e2a22] transition-all active:scale-95"
                        >
                            <Send size={12}/> Final Certify
                        </button>
                    </div>
                </div>

                {/* HISTORY: High contrast list */}
                <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Verification Audit Trail</h4>
                    {indicator.submissions.map((sub, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className="text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100"><Lock size={14}/></div>
                                <div>
                                    <p className="text-[11px] font-black text-[#1a3a32]">Quarter {sub.quarter} Filing</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{sub.achievedValue} {indicator.unit} Logged</p>
                                </div>
                            </div>
                            {sub.evidenceUrl && (
                              <a href={sub.evidenceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                                <Paperclip size={12}/> VIEW DOC
                              </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* VIEW 2: ALLOCATION */}
        <div className={`absolute inset-0 overflow-y-auto p-6 lg:p-10 bg-slate-50/50 transition-transform duration-500 ease-in-out ${activeView === "allocation" ? "translate-x-0" : "translate-x-full"}`}>
            <div className="w-full space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                    <h2 className="text-xl font-black text-[#1a3a32]">Re-Allocation</h2>
                </div>

                <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-5">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adjustment Deadline</label>
                        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-[#1a3a32] text-xs focus:ring-2 focus:ring-[#1a3a32]/5 outline-none" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assignee Management</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl min-h-[50px] border border-slate-100">
                            {getSelectedStaffObjects().length === 0 && <span className="text-[9px] text-slate-300 italic p-1">No personnel assigned</span>}
                            {getSelectedStaffObjects().map(s => (
                                <span key={s._id} className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[9px] font-black shadow-sm">
                                    {s.name}
                                    <button onClick={() => handleRemoveMember(s._id)} className="text-red-500 hover:scale-110 transition-transform"><UserMinus size={12}/></button>
                                </span>
                            ))}
                        </div>
                        <select 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if (isTeam) {
                                    if (!Array.isArray(assigneeId)) setAssigneeId([val]);
                                    else if (!assigneeId.includes(val)) setAssigneeId([...assigneeId, val]);
                                } else setAssigneeId(val);
                            }}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none cursor-pointer"
                            value=""
                        >
                            <option value="">+ Add Member to Portfolio</option>
                            {allStaff.map(u => <option key={u._id} value={u._id}>{u.name} — {u.role}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Administrative Directives</label>
                        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl min-h-[120px] text-xs font-medium outline-none" placeholder="Provide strategic guidance..." />
                    </div>

                    <button 
                        disabled={isProcessing}
                        onClick={handleUpdateAssignment} 
                        className="w-full bg-[#1a3a32] hover:bg-[#0e2a22] text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                        Apply Allocation Changes
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <InfoBox label="Target Metric" value={`${indicator.target} ${indicator.unit}`} />
                    <InfoBox label="KPI Weight" value={`${indicator.weight}%`} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">{label}</p>
    <p className="text-[11px] font-black text-[#1a3a32] truncate">{value}</p>
  </div>
);

export default IndicatorsPageIdModal;