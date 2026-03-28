import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, MoreVertical, ClipboardList, X, MessageSquare, Trash2, Edit3, Target } from "lucide-react";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchIndicators } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import type { AppDispatch, RootState } from "../../store/store";

const SuperAdminMembers = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { users, isLoading: usersLoading } = useSelector((state: RootState) => state.users);
  const { indicators, loading: indicatorsLoading } = useSelector((state: RootState) => state.indicators);
  const { plans } = useSelector((state: RootState) => state.strategicPlan);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchIndicators());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  const stats = useMemo(() => {
    const total = indicators.length;
    const assignedCount = indicators.filter(ind => !!ind.assignee).length;
    return { 
      total, 
      assignedCount, 
      percentage: total > 0 ? Math.round((assignedCount / total) * 100) : 0 
    };
  }, [indicators]);

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const getActivityDetails = (activityId: string) => {
    for (const plan of plans) {
      for (const objective of plan.objectives) {
        const activity = objective.activities.find(a => a._id === activityId);
        if (activity) return { 
            description: activity.description, 
            objectiveTitle: objective.title 
        };
      }
    }
    return { description: "Unknown Activity", objectiveTitle: "Unknown Objective" };
  };

  const getMemberIndicators = (userId: string) => {
    return indicators.filter((ind) => {
      const assigneeId = typeof ind.assignee === 'object' ? (ind.assignee as any)?._id : ind.assignee;
      return String(assigneeId) === String(userId);
    });
  };

  const isLoading = usersLoading || indicatorsLoading;

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans relative">
      
      {/* 🔹 Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl md:text-2xl font-serif font-bold text-[#1d3331]">Team Members</h3>
          <span className="text-[10px] bg-slate-200 px-2.5 py-1 rounded-full font-bold text-slate-600">
            {users.length} staff
            <p>Click a member to view their indicators, upload evidence or send a message</p>
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-0">
            <span>{stats.total} Indicators</span>
            <span className="hidden md:inline text-slate-300 mx-2">|</span>
            <span className="text-[#1d3331] font-extrabold">{stats.assignedCount} Assigned</span>
          </div>
          
          <div className="flex items-center w-full md:w-auto">
            <span className="mr-3 whitespace-nowrap">{stats.percentage}% Progress</span>
            <div className="flex-1 md:w-48 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full transition-all duration-700" 
                style={{ width: `${stats.percentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 Grid Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="animate-spin text-[#1d3331] mb-4" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {users.map((member) => {
            const count = getMemberIndicators(member._id).length;
            return (
              <div 
                key={member._id} 
                onClick={() => setSelectedMember(member)}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group hover:border-emerald-300 transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-4">
                   <div className="w-11 h-11 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-sm shadow-md">{getInitials(member.name)}</div>
                   <MoreVertical size={18} className="text-slate-300" />
                </div>
                <h4 className="text-[15px] font-serif font-bold text-[#1d3331] truncate">{member.name}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {member.role === 'superadmin' ? 'Super Admin' : (member.title || "STAFF")}
                </p>
                <div className="w-full border-t border-slate-50 pt-4">
                    <div className={`flex items-center text-[10px] font-bold ${count > 0 ? "text-emerald-700" : "text-orange-600"}`}>
                      <ClipboardList size={13} className="mr-2" />
                      {count} Indicators Assigned
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔹 POPUP MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full md:max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-300">
            
            <div className="bg-[#1d3331] p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-serif font-bold text-base px-2">Member Profile</h3>
              <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-lg md:text-xl shrink-0">
                    {getInitials(selectedMember.name)}
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-bold text-[#1d3331]">{selectedMember.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {selectedMember.title || "STAFF"} • PF: {selectedMember.pjNumber || "N/A"}
                    </p>
                  </div>
                </div>
                <button className="w-full md:w-auto flex items-center justify-center px-4 py-2.5 bg-[#1d3331] text-white text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <MessageSquare size={14} className="mr-2" /> Send Message
                </button>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Assigned Indicators</h5>
                
                <div className="space-y-3">
                  {getMemberIndicators(selectedMember._id).length > 0 ? (
                    getMemberIndicators(selectedMember._id).map((ind) => {
                      const { description, objectiveTitle } = getActivityDetails(ind.activityId);
                      return (
                        <div key={ind._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center text-[8px] font-black text-emerald-600 uppercase tracking-wider mb-1">
                                <Target size={10} className="mr-1" /> {objectiveTitle}
                              </div>
                              <p className="text-sm font-bold text-[#1d3331] leading-tight mb-2">{description}</p>
                              {ind.instructions && (
                                <p className="text-[10px] text-slate-500 italic bg-white/50 p-2 rounded-lg border border-slate-100">"{ind.instructions}"</p>
                              )}
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
                    <div className="text-center py-10">
                        <p className="text-sm text-slate-400 italic">No indicators assigned yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 bg-slate-50 flex flex-col md:flex-row gap-3 md:justify-between md:items-center border-t shrink-0">
              <div className="flex flex-col md:flex-row gap-2">
                <button className="flex items-center justify-center px-4 py-3 md:py-2 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50">
                  <Trash2 size={14} className="mr-2" /> Remove
                </button>
                <button className="flex items-center justify-center px-4 py-3 md:py-2 border border-slate-200 text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-xl">
                  <Edit3 size={14} className="mr-2" /> Edit Details
                </button>
              </div>
              <button 
                onClick={() => setSelectedMember(null)} 
                className="w-full md:w-auto px-8 py-3 md:py-2 bg-white md:bg-transparent border border-[#1d3331] text-[#1d3331] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1d3331] hover:text-white transition-all shadow-sm md:shadow-none"
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