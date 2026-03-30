import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Loader2, X, Plus, Search, Users, Crown,
  Trash2, Edit3, AlertTriangle, UserPlus,
  UserMinus, Mail, Hash,
  ToggleLeft, ToggleRight, ChevronDown, Check,
} from "lucide-react";
import {
  fetchTeams, createTeam, updateTeam, deleteTeam,
  addTeamMembers, removeTeamMembers, setTeamActiveStatus,
  clearTeamError, type ITeam,
} from "../../store/slices/teamSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import type { AppDispatch, RootState } from "../../store/store";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const getInitials = (name: string) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "??";

/* ------------------------------------------------------------------ */
/*  Sub-component: Multi-select user picker                            */
/* ------------------------------------------------------------------ */
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

  const available = allUsers.filter(
    (u) =>
      u.isActive &&
      !excludeIds.includes(u._id) &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id],
    );
  };

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
        <span className={selectedIds.length ? "font-bold text-[#1d3331]" : "text-slate-400"}>
          {selectedIds.length ? `${selectedIds.length} member(s) selected` : "Select members..."}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
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
          <div className="max-h-48 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No staff found</p>
            ) : (
              available.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggle(u._id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1d3331] text-white flex items-center justify-center text-[10px] font-bold">
                      {getInitials(u.name)}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-[#1d3331]">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.title || u.role}</p>
                    </div>
                  </div>
                  {selectedIds.includes(u._id) && (
                    <Check size={14} className="text-emerald-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedIds.map((id) => {
            const u = allUsers.find((u) => u._id === id);
            return u ? (
              <div
                key={id}
                className="flex items-center gap-1.5 bg-[#1d3331] text-white text-[10px] font-bold px-3 py-1.5 rounded-full"
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

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

const SuperAdminTeams = () => {
  const dispatch = useDispatch<AppDispatch>();

  /* Redux state */
  const { teams, loading, actionLoading } = useSelector((s: RootState) => s.teams);
  const { users } = useSelector((s: RootState) => s.users);

  /* UI state */
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<ITeam | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);

  /* Form state */
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    teamLead: "",
    memberIds: [] as string[],
  });

  useEffect(() => {
    dispatch(fetchTeams());
    dispatch(fetchAllUsers());
  }, [dispatch]);

  const filteredTeams = useMemo(
    () =>
      teams.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.teamLead?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [teams, searchTerm],
  );

  /* ── Handlers ─────────────────────────────────────────────────── */

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({ name: "", description: "", teamLead: "", memberIds: [] });
    setIsFormOpen(true);
  };

  const openEditModal = () => {
    if (!selectedTeam) return;
    setIsEditing(true);
    setFormData({
      name: selectedTeam.name,
      description: selectedTeam.description || "",
      teamLead: selectedTeam.teamLead._id,
      memberIds: selectedTeam.members.map((m) => m._id),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teamLead) return toast.error("Team lead is required");

    try {
      if (isEditing && selectedTeam) {
        await dispatch(
          updateTeam({
            id: selectedTeam._id,
            data: {
              name: formData.name,
              description: formData.description,
              teamLead: formData.teamLead,
            },
          }),
        ).unwrap();
        toast.success("Team updated");
      } else {
        await dispatch(
          createTeam({
            name: formData.name,
            description: formData.description,
            teamLead: formData.teamLead,
            members: formData.memberIds,
          }),
        ).unwrap();
        toast.success("Team created");
      }
      setIsFormOpen(false);
      setSelectedTeam(null);
      dispatch(clearTeamError());
    } catch (err: any) {
      toast.error(err || "Operation failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedTeam) return;
    try {
      await dispatch(deleteTeam(selectedTeam._id)).unwrap();
      toast.success("Team deleted");
      setIsDeleteOpen(false);
      setSelectedTeam(null);
    } catch (err: any) {
      toast.error(err || "Delete failed");
    }
  };

  const handleToggleStatus = async (team: ITeam) => {
    try {
      await dispatch(setTeamActiveStatus({ id: team._id, isActive: !team.isActive })).unwrap();
      toast.success(`Team ${team.isActive ? "deactivated" : "activated"}`);
      // Update selectedTeam if it's the one being toggled
      if (selectedTeam?._id === team._id) {
        setSelectedTeam((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch (err: any) {
      toast.error(err || "Status update failed");
    }
  };

  const handleAddMembers = async () => {
    if (!selectedTeam || membersToAdd.length === 0) return;
    try {
      const updated = await dispatch(
        addTeamMembers({ id: selectedTeam._id, memberIds: membersToAdd }),
      ).unwrap();
      setSelectedTeam(updated);
      setMembersToAdd([]);
      setAddMembersOpen(false);
      toast.success("Members added");
    } catch (err: any) {
      toast.error(err || "Failed to add members");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;
    if (memberId === selectedTeam.teamLead._id) {
      return toast.error("Cannot remove the team lead");
    }
    try {
      const updated = await dispatch(
        removeTeamMembers({ id: selectedTeam._id, memberIds: [memberId] }),
      ).unwrap();
      setSelectedTeam(updated);
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err || "Failed to remove member");
    }
  };

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-6 md:p-10 text-[#1a2c2c] font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1d3331]">Groups & Teams</h2>
          <p className="text-[11px] font-serif text-slate-500 font-medium mt-1 uppercase tracking-wider">
            {teams.length} team(s) — Manage groups for collective assignments
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center bg-[#1d3331] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2a4542] transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Create Team
        </button>
      </div>

      {/* Search */}
      <div className="mb-10 max-w-md">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1d3331]" size={18} />
          <input
            type="text"
            placeholder="Search teams or team leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-[0.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-[#1d3331]/5 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {loading && teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-[#1d3331] mb-4" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Teams...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Users size={40} className="text-slate-200 mb-4" />
          <p className="text-sm font-bold text-slate-400">No teams found</p>
          <p className="text-xs text-slate-300 mt-1">Create your first team to enable group KPI assignments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team._id}
              onClick={() => setSelectedTeam(team)}
              className={`bg-white p-6 rounded-3xl border shadow-sm relative group hover:shadow-xl transition-all cursor-pointer active:scale-[0.98] flex flex-col ${
                team.isActive ? "border-slate-100 hover:border-[#1d3331]/30" : "border-slate-100 opacity-60"
              }`}
            >
              {/* Status dot */}
              <div className={`absolute top-5 right-5 w-2 h-2 rounded-full ${team.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />

              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                  <Users size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-bold text-[#1d3331] leading-tight truncate">{team.name}</h4>
                  {team.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{team.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-5 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Crown size={12} className="text-amber-400" />
                  <span className="font-bold truncate">{team.teamLead?.name || "No lead"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Users size={12} className="text-slate-300" />
                  <span>{team.members?.length || 0} member{team.members?.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Avatar stack */}
              <div className="w-full border-t border-slate-50 pt-4 mt-auto flex items-center justify-between">
                <div className="flex -space-x-2">
                  {team.members.slice(0, 4).map((m) => (
                    <div
                      key={m._id}
                      title={m.name}
                      className="w-6 h-6 rounded-full bg-[#1d3331] text-white border-2 border-white flex items-center justify-center text-[8px] font-bold"
                    >
                      {getInitials(m.name)}
                    </div>
                  ))}
                  {team.members.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border-2 border-white flex items-center justify-center text-[8px] font-bold">
                      +{team.members.length - 4}
                    </div>
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg ${team.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {team.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1d3331]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1d3331] p-8 text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="font-serif font-bold text-xl">{isEditing ? "Edit Team" : "Create Team"}</h3>
                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300 font-bold">Group Management</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto">
              {/* Team Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Team Name</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#1d3331] transition-all"
                    placeholder="e.g. Finance Division"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Description <span className="normal-case text-slate-300">(optional)</span></label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#1d3331] resize-none transition-all"
                  placeholder="Brief description of this team's mandate..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Team Lead */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Team Lead</label>
                <div className="relative">
                  <Crown className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={18} />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none appearance-none cursor-pointer focus:border-[#1d3331]"
                    value={formData.teamLead}
                    onChange={(e) => setFormData({ ...formData, teamLead: e.target.value })}
                  >
                    <option value="">Select team lead...</option>
                    {users.filter((u) => u.isActive).map((u) => (
                      <option key={u._id} value={u._id}>{u.name} — {u.title || u.role}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Members — only shown on create */}
              {!isEditing && (
                <UserMultiSelect
                  label="Initial Members"
                  allUsers={users}
                  selectedIds={formData.memberIds}
                  excludeIds={formData.teamLead ? [formData.teamLead] : []}
                  onChange={(ids) => setFormData({ ...formData, memberIds: ids })}
                />
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-[#1d3331] text-white py-4 mt-2 rounded-2xl font-bold uppercase tracking-[0.25em] text-[10px] shadow-xl hover:bg-[#2a4542] transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="animate-spin mx-auto" size={18} />
                ) : isEditing ? "Update Team" : "Create Team"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────── */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#1d3331]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-bold text-[#1d3331] mb-3">Delete Team?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              This will permanently remove <b>{selectedTeam?.name}</b> and unlink all its members. Indicators assigned to this team will need to be reassigned.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Team Detail Panel ─────────────────────────────────────────── */}
      {selectedTeam && !isFormOpen && !isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[0.5rem] shadow-2xl overflow-hidden flex flex-col">

            <div className="bg-[#1d3331] p-6 flex justify-between items-center text-white flex-shrink-0">
              <h3 className="font-serif font-bold text-lg px-2">Team Profile</h3>
              <button onClick={() => setSelectedTeam(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              {/* Header info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center shadow-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-[#1d3331]">{selectedTeam.name}</h4>
                    {selectedTeam.description && (
                      <p className="text-sm text-slate-400 mt-0.5">{selectedTeam.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {selectedTeam.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(selectedTeam)}
                    disabled={actionLoading}
                    className="text-slate-500 hover:text-[#1d3331] transition-colors disabled:opacity-40"
                    title={selectedTeam.isActive ? "Deactivate team" : "Activate team"}
                  >
                    {selectedTeam.isActive
                      ? <ToggleRight size={28} className="text-emerald-500" />
                      : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>

              {/* Team lead */}
              <div className="grid grid-cols-2 gap-8 border-b border-slate-50 pb-8 mb-8">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Team Lead</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold">
                      {getInitials(selectedTeam.teamLead?.name || "")}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1d3331]">{selectedTeam.teamLead?.name}</p>
                      <p className="text-[10px] text-slate-400">{selectedTeam.teamLead?.title || selectedTeam.teamLead?.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
                  <p className="text-2xl font-bold text-[#1d3331] mt-2">{selectedTeam.members?.length}</p>
                </div>
              </div>

              {/* Members list */}
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Members</h5>
                <button
                  onClick={() => setAddMembersOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-[10px] font-black text-[#1d3331] uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  <UserPlus size={14} /> Add Members
                </button>
              </div>

              {/* Add members inline panel */}
              {addMembersOpen && (
                <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <UserMultiSelect
                    label="Select staff to add"
                    allUsers={users}
                    selectedIds={membersToAdd}
                    excludeIds={selectedTeam.members.map((m) => m._id)}
                    onChange={setMembersToAdd}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAddMembersOpen(false); setMembersToAdd([]); }}
                      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMembers}
                      disabled={membersToAdd.length === 0 || actionLoading}
                      className="flex-1 py-2.5 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-[#2a4542] transition-colors"
                    >
                      {actionLoading ? <Loader2 className="animate-spin mx-auto" size={14} /> : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {selectedTeam.members?.map((member) => {
                  const isLead = member._id === selectedTeam.teamLead._id;
                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isLead ? "bg-amber-400" : "bg-[#1d3331]"}`}>
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#1d3331]">{member.name}</p>
                            {isLead && (
                              <span className="flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase">
                                <Crown size={8} /> Lead
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {member.email && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Mail size={9} /> {member.email}
                              </span>
                            )}
                            {member.pjNumber && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Hash size={9} /> {member.pjNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!isLead && (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          disabled={actionLoading}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-40"
                          title="Remove from team"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-8 bg-slate-50 flex flex-col md:flex-row gap-4 md:justify-between border-t border-slate-100 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteOpen(true)}
                  className="flex items-center justify-center px-5 py-3 border-2 border-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} className="mr-2" /> Delete Team
                </button>
                <button
                  onClick={openEditModal}
                  className="flex items-center justify-center px-5 py-3 border-2 border-slate-200 text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-colors"
                >
                  <Edit3 size={16} className="mr-2" /> Edit Details
                </button>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-10 py-3 bg-white border border-[#1d3331] text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#1d3331] hover:text-white transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTeams;