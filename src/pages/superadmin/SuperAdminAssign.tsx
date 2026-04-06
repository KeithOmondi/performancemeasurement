import { useState, useMemo, useEffect } from "react";
import {
  X, Loader2, Hash, Percent,
  ChevronRight, ShieldAlert, Activity,
  User, Users, CalendarRange, CalendarDays,
  Info, Crown, Plus, Check, ChevronDown,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchTeams, createTeam } from "../../store/slices/teamSlice";
import { createIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

/* ─── TYPES ──────────────────────────────────────────────────────────── */

export interface AssignPrefill {
  strategicPlanId?: string;
  objectiveId?: string;
  activityId?: string;
  assigneeId?: string;
  assignmentType?: "Individual" | "Team";
}

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

/* ─── INLINE MULTI-SELECT ────────────────────────────────────────────── */

const UserMultiSelect = ({
  label,
  allUsers,
  selectedIds,
  excludeIds = [],
  onChange,
}: {
  label: string;
  allUsers: any[];
  selectedIds: string[];
  excludeIds?: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const available = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.isActive &&
          !excludeIds.includes(u._id ?? u.id) &&
          (u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()))
      ),
    [allUsers, excludeIds, search]
  );

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );

  return (
    <div className="space-y-1 relative">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm outline-none"
      >
        <span className={selectedIds.length ? "font-bold text-[#1a3a32]" : "text-slate-400"}>
          {selectedIds.length ? `${selectedIds.length} member(s) selected` : "Select members..."}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-3 border-b border-slate-50">
            <input
              autoFocus
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-100 rounded-xl outline-none"
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No staff found</p>
            ) : (
              available.map((u) => {
                const id = u._id ?? u.id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1a3a32] text-white flex items-center justify-center text-[10px] font-bold">
                        {u.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .substring(0, 2)}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#1a3a32]">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.title || u.role}</p>
                      </div>
                    </div>
                    {selectedIds.includes(id) && (
                      <Check size={14} className="text-emerald-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedIds.map((id) => {
            const u = allUsers.find((user) => (user._id ?? user.id) === id);
            return u ? (
              <div
                key={id}
                className="flex items-center gap-1.5 bg-[#1a3a32] text-white text-[10px] font-bold px-3 py-1.5 rounded-full"
              >
                {u.name}
                <button type="button" onClick={() => toggle(id)}>
                  <X size={11} className="hover:text-red-300" />
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

/* ─── INLINE CREATE-TEAM FORM ────────────────────────────────────────── */

const InlineCreateTeam = ({
  users,
  onCreated,
  onCancel,
}: {
  users: any[];
  onCreated: (teamId: string) => void;
  onCancel: () => void;
}) => {
  const dispatch = useAppDispatch();
  const { actionLoading } = useAppSelector((s) => s.teams);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamLead, setTeamLead] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Team name is required");
    if (!teamLead) return toast.error("Please select a team lead");

    try {
      const result = await dispatch(
        createTeam({ name: name.trim(), description, teamLead, members: memberIds })
      ).unwrap();
      toast.success(`Team "${result.name}" created`);
      onCreated(result.id);
    } catch (err: any) {
      toast.error(err || "Failed to create team");
    }
  };

  return (
    <div className="mt-4 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-4">
      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
        <Users size={12} /> New Team
      </p>

      {/* Team name */}
      <input
        placeholder="Team name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#1a3a32] outline-none"
      />

      {/* Description */}
      <input
        placeholder="Description (optional)..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-[#1a3a32] outline-none"
      />

      {/* Team lead */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
          <Crown size={10} className="text-amber-400" /> Team Lead
        </label>
        <select
          value={teamLead}
          onChange={(e) => setTeamLead(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-[#1a3a32] outline-none"
        >
          <option value="">Select lead...</option>
          {users.filter((u) => u.isActive).map((u) => {
            const id = u._id ?? u.id;
            return (
              <option key={id} value={id}>
                {u.name} — {u.title || u.role}
              </option>
            );
          })}
        </select>
      </div>

      {/* Members multi-select */}
      <UserMultiSelect
        label="Members"
        allUsers={users}
        selectedIds={memberIds}
        excludeIds={teamLead ? [teamLead] : []}
        onChange={setMemberIds}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={actionLoading}
          className="flex-1 py-2.5 bg-[#1a3a32] text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {actionLoading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <><Plus size={12} /> Create & Select</>
          )}
        </button>
      </div>
    </div>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

interface SuperAdminAssignProps {
  onClose: () => void;
  prefill?: AssignPrefill;
}

const SuperAdminAssign = ({ onClose, prefill }: SuperAdminAssignProps) => {
  const dispatch = useAppDispatch();
  const { plans }                               = useAppSelector((s) => s.strategicPlan);
  const { users, isLoading: usersLoading }      = useAppSelector((s) => s.users);
  const { teams, loading: teamsLoading }        = useAppSelector((s) => s.teams);
  const { actionLoading: createLoading }        = useAppSelector((s) => s.indicators);

  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState(prefill?.strategicPlanId ?? "");
  const [selectedObjectiveId, setSelectedObjectiveId]     = useState(prefill?.objectiveId ?? "");
  const [selectedActivityId, setSelectedActivityId]       = useState(prefill?.activityId ?? "");
  const [assignmentType, setAssignmentType] = useState<"Individual" | "Team">(prefill?.assignmentType ?? "Individual");
  const [reportingCycle, setReportingCycle] = useState<"Quarterly" | "Annual">("Quarterly");
  const [weight, setWeight] = useState<number>(5);
  const [unit, setUnit]     = useState<string>("%");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    prefill?.assignmentType === "Individual" ? (prefill?.assigneeId ?? "") : ""
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    prefill?.assignmentType === "Team" ? (prefill?.assigneeId ?? "") : ""
  );
  const [deadline, setDeadline]           = useState("");
  const [instructions]                    = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false); // ← new

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

  useEffect(() => {
    if (prefill?.strategicPlanId && !selectedPerspectiveId)
      setSelectedPerspectiveId(prefill.strategicPlanId);
  }, [plans, prefill]);

  useEffect(() => {
    if (prefill?.objectiveId && selectedPerspectiveId && !selectedObjectiveId)
      setSelectedObjectiveId(prefill.objectiveId);
  }, [selectedPerspectiveId, prefill]);

  useEffect(() => {
    if (prefill?.activityId && selectedObjectiveId && !selectedActivityId)
      setSelectedActivityId(prefill.activityId);
  }, [selectedObjectiveId, prefill]);

  const handleModeSwitch = (mode: "Individual" | "Team") => {
    setAssignmentType(mode);
    setSelectedUserId("");
    setSelectedTeamId("");
    setShowCreateTeam(false);
  };

  const isAssigneeSelected =
    assignmentType === "Individual" ? !!selectedUserId : !!selectedTeamId;

  const handleAssign = async () => {
    if (!isAssigneeSelected) return toast.error("Please select an assignee");
    if (!deadline)           return toast.error("Deadline required");
    if (!selectedActivityId) return toast.error("Please select an activity");

    const payload: Partial<IIndicator> = {
      strategicPlanId: selectedPerspectiveId,
      objectiveId:     selectedObjectiveId,
      activityId:      selectedActivityId,
      assignee:        assignmentType === "Individual" ? selectedUserId : selectedTeamId,
      assignmentType:  assignmentType === "Individual" ? "User" : "Team",
      reportingCycle,
      status: "Pending",
      weight,
      unit,
      deadline,
      instructions,
    };

    try {
      await dispatch(createIndicator(payload)).unwrap();
      toast.success(`${reportingCycle} KPI assigned successfully`);
      onClose();
    } catch (error: any) {
      toast.error(error || "Failed to create assignment");
    }
  };

  const hasPrefill = !!(prefill?.strategicPlanId || prefill?.objectiveId || prefill?.activityId);
  const activeTeams = teams.filter((t) => t.isActive);

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
              {hasPrefill && (
                <>
                  <ChevronRight size={12} />
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Auto-filled
                  </span>
                </>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {hasPrefill && (
            <div className="mx-10 mt-6 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <p className="text-[11px] text-emerald-800 font-bold">
                Activity context was pre-loaded from your selection. Review and complete the remaining fields below.
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">

            {/* 01: Strategic Mapping */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">01</span>
                Strategic Mapping
              </h3>
              <div className="grid gap-4">
                <div className="relative">
                  {prefill?.strategicPlanId && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                      Pre-filled
                    </span>
                  )}
                  <select
                    className={`w-full border rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none transition-colors ${
                      prefill?.strategicPlanId ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"
                    }`}
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
                </div>

                <div className="relative">
                  {prefill?.objectiveId && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                      Pre-filled
                    </span>
                  )}
                  <select
                    className={`w-full border rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none disabled:opacity-50 transition-colors ${
                      prefill?.objectiveId ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"
                    }`}
                    value={selectedObjectiveId}
                    onChange={(e) => { setSelectedObjectiveId(e.target.value); setSelectedActivityId(""); }}
                    disabled={!selectedPerspectiveId}
                  >
                    <option value="">Select Primary Objective...</option>
                    {selectedPlan?.objectives.map((obj) => (
                      <option key={obj.id} value={obj.id}>{obj.title}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  {prefill?.activityId && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                      Pre-filled
                    </span>
                  )}
                  <select
                    className={`w-full border-2 border-dashed rounded-xl p-4 text-sm font-bold text-[#1a3a32] outline-none disabled:opacity-50 transition-colors ${
                      prefill?.activityId ? "bg-emerald-50 border-emerald-300" : "bg-[#1a3a32]/5 border-[#1a3a32]/10"
                    }`}
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

              {/* ── Individual assignee ── */}
              {assignmentType === "Individual" && (
                <div className="relative">
                  <div className="absolute right-4 top-9 z-10">
                    {usersLoading && <Loader2 className="animate-spin text-[#1a3a32]" size={18} />}
                  </div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                    Judicial Personnel
                  </label>
                  <select
                    className={`w-full border rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none ${
                      prefill?.assignmentType === "Individual" && prefill?.assigneeId
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white border-slate-200"
                    }`}
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={usersLoading}
                  >
                    <option value="">{usersLoading ? "Decrypting Directory..." : "Select staff member..."}</option>
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

              {/* ── Team assignee ── */}
              {assignmentType === "Team" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Select Team
                    </label>
                    {/* Toggle inline create form */}
                    {!showCreateTeam && (
                      <button
                        type="button"
                        onClick={() => setShowCreateTeam(true)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-[#1a3a32] uppercase tracking-widest hover:text-emerald-600 transition-colors"
                      >
                        <Plus size={12} /> New Team
                      </button>
                    )}
                  </div>

                  {teamsLoading ? (
                    <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl">
                      <Loader2 className="animate-spin text-[#1a3a32]" size={16} />
                      <span className="text-[11px] text-slate-400 font-bold">Loading teams...</span>
                    </div>
                  ) : activeTeams.length === 0 && !showCreateTeam ? (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center space-y-2">
                      <p className="text-[11px] text-amber-700 font-bold">No active teams found.</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateTeam(true)}
                        className="text-[10px] font-black text-[#1a3a32] underline underline-offset-2"
                      >
                        Create one right here →
                      </button>
                    </div>
                  ) : !showCreateTeam ? (
                    <select
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      <option value="">Select a team...</option>
                      {activeTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.members?.length ?? t.memberCount ?? 0} members)
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {/* Inline team creation form */}
                  {showCreateTeam && (
                    <InlineCreateTeam
                      users={users}
                      onCreated={(teamId) => {
                        setSelectedTeamId(teamId);
                        setShowCreateTeam(false);
                      }}
                      onCancel={() => setShowCreateTeam(false)}
                    />
                  )}

                  {/* Selected team preview */}
                  {selectedTeam && !showCreateTeam && (
                    <div className="p-4 bg-[#1a3a32]/5 rounded-2xl border border-[#1a3a32]/10 space-y-3">
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
                        <span className="text-[10px] text-slate-500 font-bold">
                          Lead: {selectedTeam.teamLead?.name ?? selectedTeam.leadName}
                        </span>
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