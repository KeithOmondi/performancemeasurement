import React, { useEffect, useMemo } from "react";
import { 
  fetchMyAssignments, 
  setSelectedIndicator 
} from "../../store/slices/userIndicatorSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  ClipboardList, AlertCircle, CheckCircle2, 
  Clock, Loader2, Target, 
  AlertTriangle, ArrowUpRight,
  Calendar
} from "lucide-react";

const UserDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myIndicators, loading, error } = useAppSelector((state) => state.userIndicators);

  useEffect(() => {
    dispatch(fetchMyAssignments());
  }, [dispatch]);

  // --- 1. Derived Stats Calculation ---
  const stats = useMemo(() => {
    const total = myIndicators.length;
    const approved = myIndicators.filter(i => i.status === "Completed" || i.status === "Accepted").length;
    const pending = myIndicators.filter(i => i.status === "Pending" || i.status === "Under Review").length;
    
    // Check for overdue (comparing deadline to current date)
    const overdue = myIndicators.filter(i => {
      if (!i.deadline || i.status === "Completed") return false;
      return new Date(i.deadline) < new Date();
    }).length;

    return { total, approved, pending, overdue };
  }, [myIndicators]);

  if (loading && myIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-[#1a3a32] mb-4" size={40} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initialising Dashboard</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfc] p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* --- Header & Welcome --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-[#1a3a32] tracking-tighter uppercase italic">
              Performance Console
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-time monitoring for FY 2026
            </p>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
             <Calendar size={16} className="text-slate-400" />
             <span className="text-xs font-black text-[#1a3a32] uppercase tracking-tighter">March 2026</span>
          </div>
        </div>

        {/* --- 2. Statistical Ribbon --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "Assigned", val: stats.total, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Pending", val: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Overdue", val: stats.overdue, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
            { label: "Approved", val: stats.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-3">
              <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-[#1a3a32] tracking-tighter">{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* --- 3. Indicator List Section --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-6">
            <h3 className="text-sm font-black text-[#1a3a32] uppercase tracking-widest flex items-center gap-3">
              Your Deliverables <span className="px-2 py-0.5 bg-[#1a3a32] text-white text-[10px] rounded-md">{myIndicators.length}</span>
            </h3>
            <div className="flex gap-2">
              {/* Filter pills could go here */}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 font-bold uppercase text-[10px]">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {myIndicators.map((indicator) => (
              <div 
                key={indicator._id}
                onClick={() => dispatch(setSelectedIndicator(indicator._id))}
                className="group flex flex-col md:flex-row items-center justify-between p-6 bg-white border border-slate-200 rounded-[2.5rem] hover:border-[#1a3a32] transition-all cursor-pointer shadow-sm hover:shadow-xl"
              >
                <div className="flex items-center gap-6 w-full md:w-1/2">
                  <div className="hidden md:flex shrink-0 w-14 h-14 bg-slate-50 rounded-2xl items-center justify-center text-slate-400 group-hover:bg-[#1a3a32] group-hover:text-white transition-colors">
                    <Target size={24} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{indicator.perspective}</span>
                    <h4 className="text-sm font-black text-[#1a3a32] uppercase leading-tight group-hover:underline underline-offset-4 decoration-2">
                      {indicator.objectiveTitle}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-1/2 mt-6 md:mt-0 gap-8">
                  {/* Small Progress Chart */}
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-[#1a3a32]">{indicator.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#1a3a32] transition-all duration-700 ease-out" 
                        style={{ width: `${indicator.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-slate-300 uppercase">Deadline</p>
                      <p className={`text-[11px] font-bold ${new Date(indicator.deadline) < new Date() ? 'text-red-500' : 'text-slate-600'}`}>
                        {new Date(indicator.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <ArrowUpRight size={20} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;