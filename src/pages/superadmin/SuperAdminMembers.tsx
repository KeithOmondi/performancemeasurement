import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Loader2, ClipboardList, X, MessageSquare,
  Trash2, Edit3, Target, Search, Plus, UserPlus,
  Mail, ShieldCheck, AlertTriangle, Hash, CheckCircle2,
  Clock, XCircle, RefreshCw, Users, Calendar,
} from "lucide-react";
import {
  fetchAllUsers, registerUser, editUser, removeUser, clearUserMessages, type User
} from "../../store/slices/user/userSlice";
import { fetchIndicators } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import { fetchTeams, type ITeam, type ITeamMember } from "../../store/slices/teamSlice";
import type { AppDispatch, RootState } from "../../store/store";

/* ─── DOMAIN TYPES ───────────────────────────────────────────────────── */

interface FormState {
  name: string;
  email: string;
  pjNumber: string;
  title: string;
  role: User["role"];
  password?: string;
}

interface IActivity {
  id?: string;
  _id?: string;
  description: string;
}

interface IObjective {
  id?: string;
  _id?: string;
  title: string;
  activities?: IActivity[];
}

interface IPlan {
  id?: string;
  _id?: string;
  perspective: string;
  objectives: IObjective[];
}

interface ISubmission {
  id: string;
  quarter: number;
  reviewStatus?: string;
  review_status?: string;
}

/** Shape coming back from indicatorSlice — extend to match your slice type */
interface IIndicator {
  id?: string;
  _id?: string;
  assignee?: string;
  assigneeId?: string;
  assignmentType?: string;
  activityId?: string;
  activity_id?: string;
  activity?: { id?: string; description?: string };
  objective?: { title?: string };
  status: string;
  reportingCycle?: string;
  reporting_cycle?: string;
  deadline?: string;
  weight?: number;
  unit?: string;
  submissions?: ISubmission[];
}

/** Indicator annotated with team context after getMemberIndicators runs */
interface IAnnotatedIndicator extends IIndicator {
  isTeamAssigned: boolean;
  teamName: string | undefined;
}

interface IActivityDetails {
  description: string;
  objectiveTitle: string;
  perspective: string;
}

interface IStatusMeta {
  icon: React.ReactElement;
  color: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────── */

const getInitials = (name: string): string =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "??";

const getRoleColor = (role: string): string => {
  switch (role) {
    case "superadmin": return "bg-purple-100 text-purple-700 border-purple-200";
    case "admin":      return "bg-blue-100 text-blue-700 border-blue-200";
    case "examiner":   return "bg-amber-100 text-amber-700 border-amber-200";
    default:           return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const getStatusMeta = (status: string): IStatusMeta => {
  switch (status) {
    case "Completed":               return { icon: <CheckCircle2 size={12} />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    case "Awaiting Admin Approval": return { icon: <Clock size={12} />,        color: "text-amber-600 bg-amber-50 border-amber-200" };
    case "Rejected":                return { icon: <XCircle size={12} />,      color: "text-red-600 bg-red-50 border-red-200" };
    case "In Progress":             return { icon: <RefreshCw size={12} />,    color: "text-blue-600 bg-blue-50 border-blue-200" };
    default:                        return { icon: <Clock size={12} />,        color: "text-slate-500 bg-slate-50 border-slate-200" };
  }
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

const SuperAdminMembers = () => {
  const dispatch = useDispatch<AppDispatch>();

  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    name: "", email: "", pjNumber: "", title: "", role: "user", password: "Password123!",
  });

  const { users, isLoading: usersLoading, isError, message } = useSelector((s: RootState) => s.users);
  const { indicators, loading: indicatorsLoading } = useSelector(
    (s: RootState) => s.indicators as { indicators: IIndicator[]; loading: boolean }
  );
  const { plans } = useSelector(
    (s: RootState) => s.strategicPlan as { plans: IPlan[] }
  );
  const { teams } = useSelector((s: RootState) => s.teams);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchIndicators());
    dispatch(getAllStrategicPlans());
    dispatch(fetchTeams());
  }, [dispatch]);

  const filteredUsers = useMemo(() =>
    users.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.pjNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.title?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]
  );

  /* ─── Indicator resolution ──────────────────────────────────────── */

  const getUserTeamIds = (userId: string): string[] =>
    teams
      .filter((team: ITeam) =>
        Array.isArray(team.members) &&
        team.members.some((m: ITeamMember) => m.id === userId)
      )
      .map((t: ITeam) => t.id);

  const getMemberIndicators = (userId: string): IAnnotatedIndicator[] => {
    const teamIds = getUserTeamIds(userId);

    return indicators
      .filter((ind: IIndicator) => {
        const assigneeId = ind.assignee ?? ind.assigneeId ?? "";

        const isDirectUser =
          (ind.assignmentType === "User" ||
           ind.assignmentType === "Individual" ||
           !ind.assignmentType) &&
          assigneeId === userId;

        const isTeam =
          ind.assignmentType === "Team" &&
          teamIds.includes(assigneeId);

        return isDirectUser || isTeam;
      })
      .map((ind: IIndicator): IAnnotatedIndicator => {
        const assigneeId = ind.assignee ?? ind.assigneeId ?? "";
        const isTeamAssigned =
          ind.assignmentType === "Team" && teamIds.includes(assigneeId);

        const teamName = isTeamAssigned
          ? teams.find((t: ITeam) => t.id === assigneeId)?.name
          : undefined;

        return { ...ind, isTeamAssigned, teamName };
      });
  };

  const getActivityDetails = (activityId: string | undefined): IActivityDetails => {
    if (!activityId) return { description: "Unknown Activity", objectiveTitle: "Unknown Objective", perspective: "" };

    for (const plan of plans) {
      for (const objective of plan.objectives) {
        const activity = objective.activities?.find(
          (a: IActivity) => a.id === activityId || a._id === activityId
        );
        if (activity) return {
          description: activity.description,
          objectiveTitle: objective.title,
          perspective: plan.perspective,
        };
      }
    }
    return { description: activityId, objectiveTitle: "Unknown Objective", perspective: "" };
  };

  /* ─── Handlers ──────────────────────────────────────────────────── */

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormData({ name: "", email: "", pjNumber: "", title: "", role: "user", password: "Password123!" });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!selectedMember) return;
    setIsEditing(true);
    setFormData({
      name: selectedMember.name,
      email: selectedMember.email,
      pjNumber: selectedMember.pjNumber || "",
      title: selectedMember.title || "",
      role: selectedMember.role,
      password: "",
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (isEditing && selectedMember) {
      result = await dispatch(editUser({ id: selectedMember._id, data: formData as Partial<User> }));
    } else {
      result = await dispatch(registerUser(formData as Partial<User>));
    }
    if (registerUser.fulfilled.match(result) || editUser.fulfilled.match(result)) {
      setIsFormModalOpen(false);
      setSelectedMember(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    const result = await dispatch(removeUser(selectedMember._id));
    if (removeUser.fulfilled.match(result)) {
      setIsDeleteConfirmOpen(false);
      setSelectedMember(null);
    }
  };

  const isLoading = usersLoading || indicatorsLoading;

  /* ─── RENDER ─────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-6 md:p-10 text-[#1a2c2c] font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1d3331]">Team Members</h2>
          <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wider">
            {users.length} staff — Click a member to view their indicators
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center bg-[#1d3331] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2a4542] transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Add New Member
        </button>
      </div>

      {/* Search */}
      <div className="mb-10 max-w-md">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1d3331]" size={18} />
          <input
            type="text"
            placeholder="Search name, email, role or PJ number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-[0.5rem] text-sm focus:outline-none focus:ring-4 focus:ring-[#1d3331]/5 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-[#1d3331] mb-4" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Registry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((member) => {
            const memberIndicators = getMemberIndicators(member._id);
            const teamIds          = getUserTeamIds(member._id);
            const memberTeams      = teams.filter((t: ITeam) => teamIds.includes(t.id));
            const teamIndCount     = memberIndicators.filter((i) => i.isTeamAssigned).length;

            return (
              <div
                key={member._id}
                onClick={() => setSelectedMember(member)}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:border-[#1d3331]/30 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98] flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-lg shadow-inner">
                    {getInitials(member.name)}
                  </div>
                  <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter ${getRoleColor(member.role)}`}>
                    {member.role}
                  </div>
                </div>

                <div className="flex-1">
                  <h4 className="text-[16px] font-bold text-[#1d3331] leading-tight mb-1">{member.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{member.title || "OFFICER"}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-[11px] text-slate-500">
                      <Mail size={12} className="mr-2 text-slate-300 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center text-[11px] text-slate-500">
                      <Hash size={12} className="mr-2 text-slate-300 flex-shrink-0" />
                      <span>PJ: {member.pjNumber || "N/A"}</span>
                    </div>
                    {memberTeams.length > 0 && (
                      <div className="flex items-center text-[11px] text-slate-500">
                        <Users size={12} className="mr-2 text-slate-300 flex-shrink-0" />
                        <span className="truncate">{memberTeams.map((t: ITeam) => t.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full border-t border-slate-50 pt-4 mt-auto">
                  <div className="flex items-center gap-3 text-[11px] font-bold text-emerald-700">
                    <span className="flex items-center">
                      <ClipboardList size={14} className="mr-1.5" />
                      {memberIndicators.length} Indicators
                    </span>
                    {teamIndCount > 0 && (
                      <span className="flex items-center text-blue-600 text-[10px]">
                        <Users size={11} className="mr-1" />
                        {teamIndCount} via team
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1d3331]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#1d3331] p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-xl">{isEditing ? "Modify Member" : "Add Member"}</h3>
                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300 font-bold">User Access Management</p>
              </div>
              <button
                onClick={() => { setIsFormModalOpen(false); dispatch(clearUserMessages()); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              {isError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-bold">{message}</div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#1d3331] transition-all"
                    placeholder="Full Official Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PJ Number</label>
                  <input
                    required
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-[#1d3331] outline-none"
                    placeholder="PF-XXXX"
                    value={formData.pjNumber}
                    onChange={(e) => setFormData({ ...formData, pjNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                  <input
                    required
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-[#1d3331] outline-none"
                    placeholder="Position"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="email"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-[#1d3331] outline-none"
                    placeholder="email@judiciary.go.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Privilege</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none appearance-none cursor-pointer focus:border-[#1d3331]"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })}
                  >
                    <option value="user">Standard User</option>
                    <option value="examiner">Examiner</option>
                    <option value="admin">Administrator</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={usersLoading}
                className="w-full bg-[#1d3331] text-white py-4 mt-4 rounded-2xl font-bold uppercase tracking-[0.25em] text-[10px] shadow-xl hover:bg-[#2a4542] transition-all disabled:opacity-50"
              >
                {usersLoading
                  ? <Loader2 className="animate-spin mx-auto" size={18} />
                  : isEditing ? "Update Credentials" : "Initialize Account"
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#1d3331]/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-bold text-[#1d3331] mb-3">Confirm Deletion</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to remove <b>{selectedMember?.name}</b>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Side Panel */}
      {selectedMember && !isFormModalOpen && !isDeleteConfirmOpen && (() => {
        const memberIndicators = getMemberIndicators(selectedMember._id);
        const teamIds          = getUserTeamIds(selectedMember._id);
        const memberTeams      = teams.filter((t: ITeam) => teamIds.includes(t.id));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-150">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[0.5rem] shadow-2xl overflow-hidden flex flex-col">

              <div className="bg-[#1d3331] p-6 flex justify-between items-center text-white">
                <h3 className="font-serif font-bold text-lg px-2">Staff Profile Card</h3>
                <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10">

                {/* Identity */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-xl shadow-lg">
                      {getInitials(selectedMember.name)}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-[#1d3331]">{selectedMember.name}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedMember.title}</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">PJ: {selectedMember.pjNumber}</span>
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center justify-center px-6 py-3 bg-[#1d3331] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#2a4542] shadow-lg">
                    <MessageSquare size={16} className="mr-2" /> Send Message
                  </button>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-8 mb-8">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Official Email</p>
                    <p className="text-sm font-bold text-[#1d3331]">{selectedMember.email}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Role</p>
                    <p className="text-sm font-bold text-[#1d3331] capitalize">{selectedMember.role}</p>
                  </div>
                </div>

                {/* Teams membership */}
                {memberTeams.length > 0 && (
                  <div className="mb-8">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Member Of</p>
                    <div className="flex flex-wrap gap-2">
                      {memberTeams.map((team: ITeam) => (
                        <div key={team.id} className="flex items-center gap-2 px-3 py-2 bg-[#1d3331]/5 border border-[#1d3331]/10 rounded-xl">
                          <Users size={12} className="text-[#1d3331]" />
                          <span className="text-[11px] font-bold text-[#1d3331]">{team.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Indicators */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Indicators</h5>
                    <span className="text-[10px] font-black text-[#1d3331] bg-slate-100 px-3 py-1 rounded-full">
                      {memberIndicators.length} total
                    </span>
                  </div>

                  <div className="space-y-4">
                    {memberIndicators.length > 0 ? (
                      memberIndicators.map((ind: IAnnotatedIndicator) => {
                        const activityId    = ind.activityId ?? ind.activity_id ?? ind.activity?.id;
                        const { description, objectiveTitle, perspective } = getActivityDetails(activityId);
                        const activityDesc  = ind.activity?.description ?? description;
                        const resolvedTitle = ind.objective?.title ?? objectiveTitle;
                        const statusMeta    = getStatusMeta(ind.status);
                        const cycle         = ind.reportingCycle ?? ind.reporting_cycle;
                        const deadline      = ind.deadline
                          ? new Date(ind.deadline).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                          : null;

                        return (
                          <div key={ind.id ?? ind._id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#1d3331]/20 transition-colors">
                            <div className="flex flex-col gap-3">

                              {/* Objective + status */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                                    <Target size={11} />
                                    <span className="truncate">{resolvedTitle}</span>
                                  </div>
                                  {perspective && (
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">{perspective}</p>
                                  )}
                                  <p className="text-sm font-bold text-[#1d3331] leading-snug">{activityDesc}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wide flex-shrink-0 ${statusMeta.color}`}>
                                  {statusMeta.icon}
                                  {ind.status}
                                </div>
                              </div>

                              {/* Meta chips */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                                {ind.isTeamAssigned ? (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
                                    <Users size={10} /> Team: {ind.teamName}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                                    Direct Assignment
                                  </span>
                                )}
                                {cycle && (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                                    <RefreshCw size={9} /> {cycle}
                                  </span>
                                )}
                                {deadline && (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                                    <Calendar size={9} /> {deadline}
                                  </span>
                                )}
                                {ind.weight != null && (
                                  <span className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
                                    <Hash size={9} /> Weight: {ind.weight}{ind.unit ?? ""}
                                  </span>
                                )}
                              </div>

                              {/* Quarterly submission pills */}
                              {Array.isArray(ind.submissions) && ind.submissions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {ind.submissions.map((sub: ISubmission) => {
                                    const subStatus = getStatusMeta(sub.reviewStatus ?? sub.review_status ?? "Pending");
                                    return (
                                      <span
                                        key={sub.id}
                                        className={`flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full border ${subStatus.color}`}
                                      >
                                        {subStatus.icon} Q{sub.quarter}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <ClipboardList size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-xs text-slate-400 font-bold">No indicators assigned to this member.</p>
                        <p className="text-[10px] text-slate-300 mt-1">Assign via the Strategic Plan section.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-slate-50 flex flex-col md:flex-row gap-4 md:justify-between border-t border-slate-100">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="flex items-center justify-center px-5 py-3 border-2 border-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} className="mr-2" /> Delete Account
                  </button>
                  <button
                    onClick={handleOpenEditModal}
                    className="flex items-center justify-center px-5 py-3 border-2 border-slate-200 text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-colors"
                  >
                    <Edit3 size={16} className="mr-2" /> Edit Details
                  </button>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="px-10 py-3 bg-white border border-[#1d3331] text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[#1d3331] hover:text-white transition-all shadow-sm"
                >
                  Exit Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SuperAdminMembers;