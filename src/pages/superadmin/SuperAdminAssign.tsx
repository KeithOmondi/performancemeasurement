import { useState, useMemo, useEffect } from "react";
import { 
  X, Loader2, Hash, Percent, 
  ChevronRight, ShieldAlert, FileText, Activity,
  User, Users, CalendarRange, CalendarDays,
  Info
} from "lucide-react"; 
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { createIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

/* --- SUB-COMPONENTS --- */
const MetricCard = ({ label, icon, value, onChange, disabled, isString }: any) => (
  <div className="group bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm hover:shadow-md hover:border-[#1a3a32]/20 transition-all duration-300">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
      {icon} {label}
    </label>
    <input 
      type={isString ? "text" : "number"}
      className="w-full bg-transparent text-xl font-bold text-[#1a3a32] outline-none placeholder:text-slate-200 disabled:opacity-30"
      value={value}
      onChange={(e) => onChange(isString ? e.target.value : Number(e.target.value))}
      disabled={disabled}
    />
  </div>
);

const SuperAdminAssign = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const { plans } = useAppSelector((state) => state.strategicPlan);
  const { users, isLoading: usersLoading } = useAppSelector((state) => state.users);
  const { actionLoading: createLoading } = useAppSelector((state) => state.indicators);
  const { user } = useAppSelector((state) => state.auth); 

  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState("");
  const [selectedObjectiveId, setSelectedObjectiveId] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"Individual" | "Team">("Individual");
  const [reportingCycle, setReportingCycle] = useState<"Quarterly" | "Annual">("Quarterly");
  const [weight, setWeight] = useState<number>(5);
  const [unit, setUnit] = useState<string>("%");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => { dispatch(fetchAllUsers()); }, [dispatch]);

  const selectedPlan = useMemo(() => plans.find((p) => p._id === selectedPerspectiveId), [plans, selectedPerspectiveId]);
  const selectedObjective = useMemo(() => selectedPlan?.objectives.find((obj) => obj._id === selectedObjectiveId), [selectedPlan, selectedObjectiveId]);

  useEffect(() => {
    if (selectedObjective) {
      setWeight(selectedObjective.weight || 5);
      setUnit(selectedObjective.unit || "%");
    }
  }, [selectedObjective]);

  const handleAddUser = (id: string) => {
    if (!id) return;
    if (assignmentType === "Individual") { 
      setSelectedUserIds([id]); 
    } else if (!selectedUserIds.includes(id)) {
      setSelectedUserIds(prev => [...prev, id]); 
    }
  };

  const handleAssign = async () => {
    if (selectedUserIds.length === 0) return toast.error("Assignee required");
    if (!deadline) return toast.error("Deadline required");

    const payload: Partial<IIndicator> = {
      strategicPlanId: selectedPerspectiveId,
      objectiveId: selectedObjectiveId,
      activityId: selectedActivityId,
      assignee: assignmentType === "Individual" ? selectedUserIds[0] : (selectedUserIds as any), 
      assignmentType: assignmentType === "Individual" ? "User" : "Team",
      reportingCycle,
      // Status is Pending until the first submission/review
      status: "Pending",
      weight, unit, deadline, instructions,
      assignedBy: user?.id,
    };

    try {
      await dispatch(createIndicator(payload)).unwrap();
      toast.success(`${reportingCycle} assigned Successfully`);
      onClose();
    } catch (error: any) { 
      toast.error(error || "Failed to update the assignment"); 
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d1a17]/60 z-[500] backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#f8fafb] w-full max-w-4xl h-[90vh] rounded-[1rem] shadow-2xl flex overflow-hidden border border-white/20">
        
        {/* RIGHT SIDEBAR: The Form */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <span>Strategic Registry</span>
              <ChevronRight size={12} />
              <span className="text-[#d9b929]">{reportingCycle} deployment</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
            
            {/* 01: Strategic Hierarchy */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">01</span>
                Strategic Mapping
              </h3>
              
              <div className="grid gap-4">
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                  value={selectedPerspectiveId}
                  onChange={(e) => { setSelectedPerspectiveId(e.target.value); setSelectedObjectiveId(""); setSelectedActivityId(""); }}
                >
                  <option value="">Select Perspective...</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.perspective}</option>)}
                </select>

                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none disabled:opacity-50"
                  value={selectedObjectiveId}
                  onChange={(e) => { setSelectedObjectiveId(e.target.value); setSelectedActivityId(""); }}
                  disabled={!selectedPerspectiveId}
                >
                  <option value="">Select Primary Objective...</option>
                  {selectedPlan?.objectives.map(obj => <option key={obj._id} value={obj._id}>{obj.title}</option>)}
                </select>

                <select 
                  className="w-full bg-[#1a3a32]/5 border-2 border-dashed border-[#1a3a32]/10 rounded-xl p-4 text-sm font-bold text-[#1a3a32] outline-none disabled:opacity-50"
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  disabled={!selectedObjectiveId}
                >
                  <option value="">Connect Specific Activity...</option>
                  {selectedObjective?.activities.map(act => <option key={act._id} value={act._id}>{act.description}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Weighting" icon={<Hash size={12}/>} value={weight} onChange={setWeight} disabled={!selectedObjectiveId} />
                <MetricCard label="Unit" icon={<Percent size={12}/>} value={unit} onChange={setUnit} disabled={!selectedObjectiveId} isString />
              </div>
            </div>

            {/* 02: Logistical Setup */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">02</span>
                Deployment Logistics
              </h3>

              {/* Cycle Differentiation Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-4 transition-colors duration-500 ${reportingCycle === 'Annual' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                <div className={`p-2 rounded-xl ${reportingCycle === 'Annual' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                  <Info size={16} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${reportingCycle === 'Annual' ? 'text-amber-700' : 'text-blue-700'}`}>
                    {reportingCycle} Logic Enabled
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    {reportingCycle === 'Annual' 
                      ? "" 
                      : "The system will automatically split this KPI into 4 quarterly milestones with recursive review cycles."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Reporting Cycle Toggles */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Review Cycle</label>
                   <div className="flex p-1 bg-slate-100 rounded-2xl">
                     {[
                       { id: "Quarterly", icon: <CalendarRange size={14}/> },
                       { id: "Annual", icon: <CalendarDays size={14}/> }
                     ].map(opt => (
                       <button 
                         key={opt.id}
                         onClick={() => setReportingCycle(opt.id as any)}
                         className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${reportingCycle === opt.id ? 'bg-white text-[#1a3a32] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         {opt.icon} {opt.id}
                       </button>
                     ))}
                   </div>
                </div>

                {/* Assignment Type Toggle */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Command Mode</label>
                   <div className="flex p-1 bg-slate-100 rounded-2xl">
                     {[
                       { id: "Individual", icon: <User size={14}/> },
                       { id: "Team", icon: <Users size={14}/> }
                     ].map(opt => (
                       <button 
                         key={opt.id}
                         onClick={() => { setAssignmentType(opt.id as any); setSelectedUserIds([]); }}
                         className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${assignmentType === opt.id ? 'bg-white text-[#1a3a32] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         {opt.icon} {opt.id}
                       </button>
                     ))}
                   </div>
                </div>
              </div>

              <div className="relative pt-2">
                <div className="absolute right-4 top-10 z-10">
                  {usersLoading && <Loader2 className="animate-spin text-[#1a3a32]" size={18} />}
                </div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Judicial Personnel</label>
                <select 
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                  onChange={(e) => handleAddUser(e.target.value)}
                  value=""
                  disabled={usersLoading}
                >
                  <option value="">{usersLoading ? "Decrypting Directory..." : "Search staff member..."}</option>
                  {users.filter(u => u.isActive).map(u => (
                    <option key={u._id} value={u._id}>{u.name} — {u.role}</option>
                  ))}
                </select>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedUserIds.map(uid => (
                    <div key={uid} className="flex items-center gap-2 bg-[#1a3a32] text-white px-4 py-2 rounded-full text-[10px] font-bold">
                      {users.find(u => u._id === uid)?.name}
                      <button onClick={() => setSelectedUserIds(prev => prev.filter(i => i !== uid))}>
                        <X size={14} className="hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 03: Finalization */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">03</span>
                Authorization
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert size={14} className="text-[#d9b929]" /> 
                    {reportingCycle === 'Annual' ? 'Final Fiscal Deadline' : 'Q1 Submission Deadline'}
                  </label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-[#d9b929]" /> Directives & Evidence Requirements
                  </label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none h-24 resize-none"
                    placeholder={`Provide instructions for this ${reportingCycle.toLowerCase()} task...`}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button onClick={onClose} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Discard</button>
            <button 
              disabled={!selectedActivityId || selectedUserIds.length === 0 || !deadline || createLoading}
              onClick={handleAssign}
              className="bg-[#1a3a32] text-[#d9b929] px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 shadow-xl"
            >
              {createLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <><Activity size={18}/> Authorize {reportingCycle} Deployment</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAssign;