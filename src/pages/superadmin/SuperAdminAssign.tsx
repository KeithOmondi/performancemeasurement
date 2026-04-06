import { useState, useMemo, useEffect } from "react";
import {
  X, Loader2, Hash, Percent,
  ChevronRight, ShieldAlert, Activity,
  User, Users, CalendarRange, CalendarDays,
  Info, Crown,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchTeams } from "../../store/slices/teamSlice";
import { createIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

/* ─── SUB-COMPONENTS ─────────────────────────────────────────────────── */

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

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

const SuperAdminAssign = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const { plans }                               = useAppSelector((s) => s.strategicPlan);
  const { users, isLoading: usersLoading }      = useAppSelector((s) => s.users);
  const { teams, loading: teamsLoading }        = useAppSelector((s) => s.teams);
  const { actionLoading: createLoading }        = useAppSelector((s) => s.indicators);

  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState("");
  const [selectedObjectiveId, setSelectedObjectiveId]     = useState("");
  const [selectedActivityId, setSelectedActivityId]       = useState("");
  const [assignmentType, setAssignmentType] = useState<"Individual" | "Team">("Individual");
  const [reportingCycle, setReportingCycle] = useState<"Quarterly" | "Annual">("Quarterly");
  const [weight, setWeight] = useState<number>(5);
  const [unit, setUnit]     = useState<string>("%");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [deadline, setDeadline]             = useState("");
  const [instructions]                      = useState("");

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchTeams());
  }, [dispatch]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPerspectiveId),
    [plans, selectedPerspectiveId]
  );

  const selectedObjective = useMemo(
    () => selectedPlan?.objectives.find((obj) => obj.id === selectedObjectiveId),
    [selectedPlan, selectedObjectiveId]
  );

  // ✅ Teams use _id (from teamSlice ITeam interface)
  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  useEffect(() => {
    if (selectedObjective) {
      setWeight(selectedObjective.weight || 5);
      setUnit(selectedObjective.unit || "%");
    }
  }, [selectedObjective]);

  const handleModeSwitch = (mode: "Individual" | "Team") => {
    setAssignmentType(mode);
    setSelectedUserId("");
    setSelectedTeamId("");
  };

  const isAssigneeSelected =
    assignmentType === "Individual" ? !!selectedUserId : !!selectedTeamId;

  // ✅ In SuperAdminAssign.tsx -> handleAssign function

const handleAssign = async () => {
  if (!isAssigneeSelected) return toast.error("Please select an assignee");
  if (!deadline)           return toast.error("Deadline required");
  if (!selectedActivityId) return toast.error("Please select an activity");

  const payload: Partial<IIndicator> = {
    strategicPlanId: selectedPerspectiveId,
    objectiveId:     selectedObjectiveId,
    activityId:      selectedActivityId,
    
    // ❌ OLD: assigneeId: assignmentType === "Individual" ? selectedUserId : selectedTeamId,
    // ✅ NEW: Use 'assignee' to match your Slice and Backend Controller
    assignee: assignmentType === "Individual" ? selectedUserId : selectedTeamId, 
    
    assignmentType: assignmentType === "Individual" ? "User" : "Team",
    reportingCycle,
    status: "Pending",
    weight,
    unit,
    deadline,
    instructions,
  }; // Removed 'as any' so TypeScript can help you catch these!

  try {
    await dispatch(createIndicator(payload)).unwrap();
    toast.success(`${reportingCycle} KPI assigned successfully`);
    onClose();
  } catch (error: any) {
    toast.error(error || "Failed to create assignment");
  }
};

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d1a17]/60 z-[500] backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#f8fafb] w-full max-w-4xl h-[90vh] rounded-[1rem] shadow-2xl flex overflow-hidden border border-white/20">
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Header */}
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

            {/* 01: Strategic Mapping */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">01</span>
                Strategic Mapping
              </h3>
              <div className="grid gap-4">
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                  value={selectedPerspectiveId}
                  onChange={(e) => {
                    setSelectedPerspectiveId(e.target.value);
                    setSelectedObjectiveId("");
                    setSelectedActivityId("");
                  }}
                >
                  <option value="">Select Perspective...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.perspective}</option>
                  ))}
                </select>

                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none disabled:opacity-50"
                  value={selectedObjectiveId}
                  onChange={(e) => { setSelectedObjectiveId(e.target.value); setSelectedActivityId(""); }}
                  disabled={!selectedPerspectiveId}
                >
                  <option value="">Select Primary Objective...</option>
                  {selectedPlan?.objectives.map((obj) => (
                    <option key={obj.id} value={obj.id}>{obj.title}</option>
                  ))}
                </select>

                <select
                  className="w-full bg-[#1a3a32]/5 border-2 border-dashed border-[#1a3a32]/10 rounded-xl p-4 text-sm font-bold text-[#1a3a32] outline-none disabled:opacity-50"
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  disabled={!selectedObjectiveId}
                >
                  <option value="">Connect Specific Activity...</option>
                  {selectedObjective?.activities.map((act) => (
                    <option key={act.id} value={act.id}>{act.description}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Weighting" icon={<Hash size={12} />} value={weight} onChange={setWeight} disabled={!selectedObjectiveId} />
                <MetricCard label="Unit" icon={<Percent size={12} />} value={unit} onChange={setUnit} disabled={!selectedObjectiveId} isString />
              </div>
            </div>

            {/* 02: Deployment Logistics */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">02</span>
                Deployment Logistics
              </h3>

              <div className={`p-4 rounded-2xl border flex items-start gap-4 transition-colors duration-500 ${reportingCycle === "Annual" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
                <div className={`p-2 rounded-xl ${reportingCycle === "Annual" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}`}>
                  <Info size={16} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${reportingCycle === "Annual" ? "text-amber-700" : "text-blue-700"}`}>
                    {reportingCycle} Logic Enabled
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    {reportingCycle === "Annual"
                      ? "This KPI will be reviewed once at the end of the fiscal year."
                      : "The system will automatically split this KPI into 4 quarterly milestones with recursive review cycles."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Review Cycle */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Review Cycle</label>
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    {[
                      { id: "Quarterly", icon: <CalendarRange size={14} /> },
                      { id: "Annual",    icon: <CalendarDays size={14} /> },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setReportingCycle(opt.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${reportingCycle === opt.id ? "bg-white text-[#1a3a32] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {opt.icon} {opt.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignment Mode */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Command Mode</label>
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    {[
                      { id: "Individual", icon: <User size={14} /> },
                      { id: "Team",       icon: <Users size={14} /> },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleModeSwitch(opt.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all ${assignmentType === opt.id ? "bg-white text-[#1a3a32] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {opt.icon} {opt.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Individual select */}
              {assignmentType === "Individual" && (
                <div className="relative">
                  <div className="absolute right-4 top-9 z-10">
                    {usersLoading && <Loader2 className="animate-spin text-[#1a3a32]" size={18} />}
                  </div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Judicial Personnel
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={usersLoading}
                  >
                    <option value="">{usersLoading ? "Decrypting Directory..." : "Select staff member..."}</option>
                    {/* ✅ u._id is now normalized from PG id by userService */}
                    {users.filter((u) => u.isActive).map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} — {u.title || u.role}
                      </option>
                    ))}
                  </select>

                  {selectedUserId && (() => {
                    const u = users.find((u) => u._id === selectedUserId);
                    return u ? (
                      <div className="mt-3 flex items-center gap-3 p-3 bg-[#1a3a32]/5 rounded-2xl border border-[#1a3a32]/10">
                        <div className="w-8 h-8 rounded-full bg-[#1a3a32] text-white flex items-center justify-center text-[10px] font-bold">
                          {u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1a3a32]">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                        <button onClick={() => setSelectedUserId("")} className="ml-auto">
                          <X size={14} className="text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Team select */}
              {assignmentType === "Team" && (
                <div className="relative">
                  <div className="absolute right-4 top-9 z-10">
                    {teamsLoading && <Loader2 className="animate-spin text-[#1a3a32]" size={18} />}
                  </div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Select Team
                  </label>
                  {teams.filter((t) => t.isActive).length === 0 && !teamsLoading ? (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                      <p className="text-[11px] text-amber-700 font-bold">No active teams found.</p>
                      <p className="text-[10px] text-amber-600 mt-1">Create a team from the Groups & Teams page first.</p>
                    </div>
                  ) : (
                    <select
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      disabled={teamsLoading}
                    >
                      <option value="">{teamsLoading ? "Loading teams..." : "Select a team..."}</option>
                      {/* ✅ Teams use _id from ITeam interface */}
                      {teams.filter((t) => t.isActive).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.members?.length} members)
                        </option>
                      ))}
                    </select>
                  )}

                  {selectedTeam && (
                    <div className="mt-3 p-4 bg-[#1a3a32]/5 rounded-2xl border border-[#1a3a32]/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#1a3a32] text-white flex items-center justify-center">
                            <Users size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#1a3a32]">{selectedTeam.name}</p>
                            <p className="text-[10px] text-slate-400">{selectedTeam.members?.length} members will be notified</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedTeamId("")}>
                          <X size={14} className="text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-[#1a3a32]/10">
                        <Crown size={11} className="text-amber-400" />
                        <span className="text-[10px] text-slate-500 font-bold">Lead: {selectedTeam.teamLead?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedTeam.members.slice(0, 6).map((m) => (
                          <div
                            key={m.id}
                            title={m.name}
                            className="w-6 h-6 rounded-full bg-[#1a3a32]/60 text-white border border-white flex items-center justify-center text-[8px] font-bold"
                          >
                            {m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)}
                          </div>
                        ))}
                        {selectedTeam.members.length > 6 && (
                          <span className="text-[10px] text-slate-400 font-bold ml-1">
                            +{selectedTeam.members.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 03: Authorization */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">03</span>
                Authorization
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={14} className="text-[#d9b929]" />
                  {reportingCycle === "Annual" ? "Final Fiscal Deadline" : "Q1 Submission Deadline"}
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
            >
              Discard
            </button>
            <button
              disabled={!selectedActivityId || !isAssigneeSelected || !deadline || createLoading}
              onClick={handleAssign}
              className="bg-[#1a3a32] text-[#d9b929] px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 shadow-xl"
            >
              {createLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <><Activity size={18} /> Authorize {reportingCycle} Deployment</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAssign;