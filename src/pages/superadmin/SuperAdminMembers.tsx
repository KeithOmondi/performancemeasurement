import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
  Loader2, 
  MoreVertical, 
  ClipboardList, 
  X, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Target, 
  Search, 
  Plus,
  UserPlus,
  Mail,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import { fetchAllUsers, registerUser, clearUserMessages } from "../../store/slices/user/userSlice";
import { fetchIndicators } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import type { AppDispatch, RootState } from "../../store/store";

const SuperAdminMembers = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 🔹 State
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // 🔹 Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pjNumber: "",
    title: "",
    role: "user",
    password: "Password123!" // Initial default password
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
      u.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // 🔹 Handlers
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(registerUser(formData));
    if (registerUser.fulfilled.match(result)) {
      setIsAddModalOpen(false);
      setFormData({ name: "", email: "", pjNumber: "", title: "", role: "user", password: "Password123!" });
      // Optional: Add a success toast here
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

  const isLoading = usersLoading || indicatorsLoading;

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-6 md:p-10 text-[#1a2c2c] font-sans">
      
      {/* 🔹 Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1d3331]">Team Members</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[11px] text-slate-500 font-medium">
              {users.length} staff · 
            </span>
            <span className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-sm font-medium">
              Click a member to view their indicators, upload evidence or send a message
            </span>
          </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center bg-[#1d3331] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#2a4542] transition-all shadow-lg shadow-[#1d3331]/10 active:scale-95"
        >
          <Plus size={18} className="mr-1" /> Add Member
        </button>
      </div>

      {/* 🔹 Search Bar Area */}
      <div className="mb-10 max-w-sm">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 group-focus-within:text-[#1d3331] transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search by name, role or PF number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1d3331]/5 focus:border-[#1d3331] placeholder:text-slate-400 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* 🔹 Grid Area */}
      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-[#1d3331] mb-4" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map((member) => {
            const memberIndicators = getMemberIndicators(member._id);
            return (
              <div 
                key={member._id} 
                onClick={() => setSelectedMember(member)}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-5">
                   <div className="w-12 h-12 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-sm shadow-md">
                     {getInitials(member.name)}
                   </div>
                   <MoreVertical size={18} className="text-slate-300 hover:text-slate-600 transition-colors" />
                </div>

                <h4 className="text-[15px] font-bold text-[#1d3331] leading-tight mb-1">{member.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {member.title || "STAFF"}
                </p>

                <div className="text-[11px] text-slate-500 space-y-0.5 mb-5">
                  <p><span className="font-bold">PF:</span> {member.pjNumber || "N/A"} · <span className="lowercase">{member.email}</span></p>
                </div>

                <div className="w-full border-t border-slate-50 pt-4">
                    <div className={`flex items-center text-[11px] font-bold ${memberIndicators.length > 0 ? "text-emerald-700" : "text-orange-600"}`}>
                      <ClipboardList size={14} className="mr-2" />
                      {memberIndicators.length} assigned
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔹 Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1d3331]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#1d3331] p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-serif font-bold text-xl">New Member</h3>
                <p className="text-[10px] text-emerald-200 uppercase tracking-widest font-bold">Registration Portal</p>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); dispatch(clearUserMessages()); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-8 space-y-5">
              {isError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg font-medium">
                  {message}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1d3331]/5 focus:border-[#1d3331] outline-none transition-all"
                    placeholder="e.g. Hon. John Kamau"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PF Number</label>
                  <input 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#1d3331] outline-none transition-all"
                    placeholder="43244"
                    value={formData.pjNumber}
                    onChange={(e) => setFormData({...formData, pjNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#1d3331] outline-none transition-all"
                      placeholder="Registrar"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input 
                    required
                    type="email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#1d3331] outline-none transition-all"
                    placeholder="staff@judiciary.go.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Role</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <select 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#1d3331] outline-none transition-all appearance-none cursor-pointer"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="user">Standard User</option>
                    <option value="examiner">Examiner</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={usersLoading}
                  className="w-full bg-[#1d3331] text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-[#2a4542] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-[#1d3331]/20"
                >
                  {usersLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : "Initialize Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔹 Profile Modal (Existing) */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
            
            <div className="bg-[#1d3331] p-4 flex justify-between items-center text-white">
              <h3 className="font-serif font-bold text-base px-2">Member Profile</h3>
              <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-xl shrink-0">
                    {getInitials(selectedMember.name)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#1d3331]">{selectedMember.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {selectedMember.title || "STAFF"} • PF: {selectedMember.pjNumber || "N/A"}
                    </p>
                  </div>
                </div>
                <button className="flex items-center justify-center px-5 py-2.5 bg-[#1d3331] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#2a4542]">
                  <MessageSquare size={14} className="mr-2" /> Send Message
                </button>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 mb-4">Assigned Indicators</h5>
                <div className="space-y-3">
                  {getMemberIndicators(selectedMember._id).length > 0 ? (
                    getMemberIndicators(selectedMember._id).map((ind) => {
                      const { description, objectiveTitle } = getActivityDetails(ind.activityId);
                      return (
                        <div key={ind._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center text-[8px] font-black text-emerald-600 uppercase tracking-wider mb-1">
                                <Target size={10} className="mr-1" /> {objectiveTitle}
                              </div>
                              <p className="text-sm font-bold text-[#1d3331] leading-tight mb-2">{description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[11px] font-black text-[#1d3331]">{ind.progress}%</div>
                              <div className="w-10 bg-slate-200 h-1 rounded-full mt-1">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${ind.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400 italic">No indicators assigned yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex flex-col md:flex-row gap-3 md:justify-between border-t">
              <div className="flex gap-2">
                <button className="flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50">
                  <Trash2 size={14} className="mr-2" /> Remove
                </button>
                <button className="flex items-center justify-center px-4 py-2 border border-slate-200 text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white">
                  <Edit3 size={14} className="mr-2" /> Edit Details
                </button>
              </div>
              <button 
                onClick={() => setSelectedMember(null)} 
                className="px-8 py-2 border border-[#1d3331] text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1d3331] hover:text-white transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminMembers;