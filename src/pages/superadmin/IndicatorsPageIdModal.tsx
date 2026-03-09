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
    
    // Validate next quarter deadline for quarterly cycles
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
    <div className="bg-[#f8fafc] w-full h-full flex flex-col shadow-2xl overflow-hidden font-sans relative">
      
      {/* PROCESSING OVERLAY */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-emerald-800" size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Synchronizing...</span>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-[#0e2a22] text-white p-5 flex justify-between items-center shrink-0 z-20">
        <div className="flex items-center gap-4">
          {activeView === "allocation" ? (
            <button 
                onClick={() => setActiveView("review")}
                className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20}/>
            </button>
          ) : (
            <div className="bg-orange-500 p-2 rounded-lg text-[#0e2a22]">
              <BarChart3 size={20}/>
            </div>
          )}
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">
              {activeView === "review" ? "KPI Review Terminal" : "Allocation Settings"}
            </h2>
            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">
              {indicator.reportingCycle} Cycle
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeView === "review" && (
            <button 
              onClick={() => setActiveView("allocation")}
              className="flex items-center gap-2 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all"
            >
              <Settings2 size={14}/> Edit Assignment
            </button>
          )}
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-all">
            <X size={20}/>
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* VIEW 1: REVIEW & HISTORY */}
        <div className={`absolute inset-0 overflow-y-auto p-6 md:p-12 transition-transform duration-500 ease-in-out ${activeView === "review" ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="max-w-3xl mx-auto space-y-10">
                <section>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Strategic Activity</label>
                    <h1 className="text-2xl font-black text-[#0e2a22] leading-tight mt-2 italic">
                        "{activityDetails?.description}"
                    </h1>
                </section>

                {/* PROGRESS METER */}
                <div className="bg-[#0e2a22] p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-[10px] font-black text-emerald-400 uppercase">System Progress</span>
                            <span className="text-4xl font-black text-white">{indicator.progress}%</span>
                        </div>
                        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-300 transition-all duration-1000" style={{ width: `${indicator.progress}%` }} />
                        </div>
                    </div>
                </div>

                {/* DECISION AREA */}
                <div className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-[#0e2a22] flex items-center gap-2">
                            <RefreshCw size={18} className="text-emerald-700"/> Administrative Action
                        </h3>
                        {pendingSubmission && <span className="bg-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-full animate-pulse">PENDING REVIEW</span>}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-black uppercase text-gray-500 px-1">
                            <span>Override Cumulative Progress</span>
                            <span className="text-[#0e2a22]">{progressOverride}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={progressOverride} onChange={(e) => setProgressOverride(Number(e.target.value))} className="w-full accent-[#0e2a22] h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                        
                        <textarea 
                            value={decisionReason} 
                            onChange={(e) => setDecisionReason(e.target.value)}
                            placeholder="Provide feedback or rejection reason..."
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-800/10 min-h-[100px]"
                        />

                        {/* Next Quarter Deadline Input */}
                        {indicator.reportingCycle === "Quarterly" && currentQuarter < 4 && (
                            <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <label className="text-[10px] font-black text-emerald-800 uppercase block mb-2 flex items-center gap-2">
                                    <CalendarDays size={14}/> Set Q{currentQuarter + 1} Reporting Deadline
                                </label>
                                <input 
                                    type="date" 
                                    value={nextQuarterDeadline}
                                    onChange={(e) => setNextQuarterDeadline(e.target.value)}
                                    className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            disabled={isProcessing}
                            onClick={() => handleDecision("Reject")} 
                            className="bg-red-50 text-red-600 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-red-100 active:scale-95 transition-all"
                        >
                            Reject
                        </button>
                        <button 
                            disabled={isProcessing}
                            onClick={() => handleDecision("Approve")} 
                            className="bg-[#0e2a22] text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Send size={14}/> Approve & Lock
                        </button>
                    </div>
                </div>

                {/* HISTORY */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 italic">Submission History</h4>
                    {indicator.submissions.map((sub, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 transition-all hover:border-emerald-100">
                            <div className="flex items-center gap-3">
                                <div className="text-emerald-700 bg-emerald-50 p-2 rounded-lg"><Lock size={16}/></div>
                                <div>
                                    <p className="text-xs font-black text-[#0e2a22]">Quarter {sub.quarter}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{sub.achievedValue} {indicator.unit}</p>
                                </div>
                            </div>
                            {sub.evidenceUrl && <a href={sub.evidenceUrl} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-orange-500 transition-colors"><Paperclip size={18}/></a>}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* VIEW 2: ALLOCATION */}
        <div className={`absolute inset-0 overflow-y-auto p-6 md:p-12 bg-gray-50 transition-transform duration-500 ease-in-out ${activeView === "allocation" ? "translate-x-0" : "translate-x-full"}`}>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                    <h2 className="text-xl font-black text-[#0e2a22]">Resource Allocation</h2>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Deadline</label>
                        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-black text-[#0e2a22] text-sm focus:ring-2 focus:ring-emerald-800/10" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Members</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-2xl min-h-[50px]">
                            {getSelectedStaffObjects().length === 0 && <span className="text-[10px] text-gray-300 italic p-1">No staff assigned</span>}
                            {getSelectedStaffObjects().map(s => (
                                <span key={s._id} className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-black shadow-sm animate-in fade-in zoom-in duration-300">
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
                            className="w-full p-4 bg-gray-100 border-none rounded-2xl text-xs font-bold"
                            value=""
                        >
                            <option value="">+ Add Member</option>
                            {allStaff.map(u => <option key={u._id} value={u._id}>{u.name} — {u.role}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Directives</label>
                        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl min-h-[120px] text-sm" placeholder="Write specific instructions..." />
                    </div>

                    <button 
                        disabled={isProcessing}
                        onClick={handleUpdateAssignment} 
                        className="w-full bg-emerald-800 hover:bg-[#0e2a22] text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95"
                    >
                        Save Allocation Changes
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <InfoBox label="Target" value={`${indicator.target} ${indicator.unit}`} />
                    <InfoBox label="Weight" value={`${indicator.weight}%`} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
    <p className="text-[8px] font-black text-gray-400 uppercase mb-1 tracking-widest">{label}</p>
    <p className="text-sm font-black text-[#0e2a22]">{value}</p>
  </div>
);

export default IndicatorsPageIdModal;