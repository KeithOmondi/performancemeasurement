import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  Loader2, MoreVertical, ClipboardList, X, MessageSquare, 
  Trash2, Edit3, Target, Search, Plus, UserPlus, 
  Mail, ShieldCheck, AlertTriangle, Hash
} from "lucide-react";
import { 
  fetchAllUsers, registerUser, editUser, removeUser, clearUserMessages 
} from "../../store/slices/user/userSlice";
import { fetchIndicators } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import type { AppDispatch, RootState } from "../../store/store";

const SuperAdminMembers = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 🔹 UI State
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // 🔹 Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pjNumber: "",
    title: "",
    role: "user",
    password: "Password123!"
  });

  const { users, isLoading: usersLoading, isError, message } = useSelector((state: RootState) => state.users);
  const { indicators, loading: indicatorsLoading } = useSelector((state: RootState) => state.indicators);
  const { plans } = useSelector((state: RootState) => state.strategicPlan);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchIndicators());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  // 🔹 Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.pjNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // 🔹 Handlers
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
      password: "" 
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (isEditing) {
      result = await dispatch(editUser({ id: selectedMember._id, data: formData }));
    } else {
      result = await dispatch(registerUser(formData));
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

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const getMemberIndicators = (userId: string) => {
    return indicators.filter((ind) => {
      const assigneeId = typeof ind.assignee === 'object' ? (ind.assignee as any)?._id : ind.assignee;
      return String(assigneeId) === String(userId);
    });
  };

  const getActivityDetails = (activityId: string) => {
    for (const plan of plans) {
      for (const objective of plan.objectives) {
        const activity = objective.activities.find(a => a._id === activityId);
        if (activity) return { description: activity.description, objectiveTitle: objective.title };
      }
    }
    return { description: "Unknown Activity", objectiveTitle: "Unknown Objective" };
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'superadmin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'examiner': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const isLoading = usersLoading || indicatorsLoading;

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-6 md:p-10 text-[#1a2c2c] font-sans">
      
      {/* 🔹 Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1d3331]">Team Members</h2>
          <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wider">
            {users.length} staff - Click a member to view their indicators, upload evidence or send a message
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="flex items-center bg-[#1d3331] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2a4542] transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Add New Member
        </button>
      </div>

      {/* 🔹 Search Bar */}
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

      {/* 🔹 Grid Area */}
      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-[#1d3331] mb-4" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Registry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((member) => {
            const memberIndicators = getMemberIndicators(member._id);
            return (
              <div 
                key={member._id} 
                onClick={() => setSelectedMember(member)}
                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:border-[#1d3331]/30 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98] flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center font-bold text-lg shadow-inner">
                     {getInitials(member.name)}
                   </div>
                   <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter ${getRoleColor(member.role)}`}>
                     {member.role}
                   </div>
                </div>

                <div className="flex-1">
                  <h4 className="text-[16px] font-bold text-[#1d3331] leading-tight mb-1">{member.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{member.title || "OFFICER"}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-[11px] text-slate-500">
                      <Mail size={12} className="mr-2 text-slate-300" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center text-[11px] text-slate-500">
                      <Hash size={12} className="mr-2 text-slate-300" />
                      <span>PJ: {member.pjNumber || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-slate-50 pt-4 mt-auto">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                      <div className="flex items-center">
                        <ClipboardList size={14} className="mr-2" />
                        {memberIndicators.length} Indicators
                      </div>
                      <MoreVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔹 Add/Edit Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1d3331]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#1d3331] p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-xl">{isEditing ? "Modify Member" : "Add Member"}</h3>
                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-300 font-bold">User Access Management</p>
              </div>
              <button onClick={() => { setIsFormModalOpen(false); dispatch(clearUserMessages()); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              {isError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-bold">{message}</div>}
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#1d3331] transition-all"
                    placeholder="Full Official Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, pjNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                  <input 
                    required
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:border-[#1d3331] outline-none"
                    placeholder="Position"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
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
                {usersLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : isEditing ? "Update Credentials" : "Initialize Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔹 Delete Confirmation */}
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

      {/* 🔹 Profile Side Panel / Modal */}
      {selectedMember && !isFormModalOpen && !isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-150">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[0.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#1d3331] p-6 flex justify-between items-center text-white">
              <h3 className="font-serif font-bold text-lg px-2">Staff Profile Card</h3>
              <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                <div className="flex items-center space-x-6">
                  <div className="w-15 h-15 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-1xl shadow-lg">
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

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-8 border-b border-slate-50 pb-8 mb-8">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Official Email</p>
                        <p className="text-sm font-bold text-[#1d3331]">{selectedMember.email}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Role</p>
                        <p className="text-sm font-bold text-[#1d3331] capitalize">{selectedMember.role}</p>
                    </div>
                </div>

                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Indicators</h5>
                <div className="space-y-4">
                  {getMemberIndicators(selectedMember._id).length > 0 ? (
                    getMemberIndicators(selectedMember._id).map((ind) => {
                      const { description, objectiveTitle } = getActivityDetails(ind.activityId);
                      return (
                        <div key={ind._id} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:border-emerald-200 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                                <Target size={12} className="mr-2" /> {objectiveTitle}
                              </div>
                              <p className="text-sm font-bold text-[#1d3331] leading-relaxed">{description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black text-[#1d3331]">{ind.progress}%</div>
                              <div className="w-12 bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: `${ind.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-medium">No strategic indicators assigned to this member.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
      )}
    </div>
  );
};

export default SuperAdminMembers;