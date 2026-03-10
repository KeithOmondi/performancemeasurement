import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2,  } from "lucide-react";
import { Link } from "react-router-dom";

// Thunks
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchDashboardStats } from "../../store/slices/dashboardSlice"; 
import { fetchIndicators } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

// Types
import type { AppDispatch, RootState } from "../../store/store";

const AdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  // 1. Selectors
  const { isLoading: uLoad } = useSelector((state: RootState) => state.users);
  const { indicators, loading: iLoad } = useSelector((state: RootState) => state.indicators); 
  const { stats, loading: sLoad } = useSelector((state: RootState) => state.dashboard);
  const { plans, loading: pLoad } = useSelector((state: RootState) => state.strategicPlan);

  // 2. Data Lifecycle
  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchDashboardStats());
    dispatch(fetchIndicators());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  // 3. Derived Logic - Matching SuperAdminIndicators calculation
  const totalActivities = useMemo(() => 
    plans.reduce((acc, p) => acc + p.objectives.reduce((oAcc, obj) => oAcc + obj.activities.length, 0), 0),
    [plans]
  );

  const assignedCount = indicators.length;
  const unassignedCount = totalActivities - assignedCount;

 



  // 4. Loading Guard
  if ((uLoad || sLoad || iLoad || pLoad) && plans.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center">Syncing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">
      
      {/* 🔹 TOP STATS - Derived from actual Plans and Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "TOTAL SUB-INDICATORS", value: totalActivities, border: "border-[#1d3331]" },
          { label: `ASSIGNED (OF ${totalActivities})`, value: assignedCount, border: "border-slate-300" },
          { label: "UNASSIGNED", value: unassignedCount < 0 ? 0 : unassignedCount, border: "border-red-800", text: "text-red-800" },
          { label: "AWAITING REVIEW", value: stats?.general.awaitingReview || 0, border: "border-yellow-500" },
          { label: "APPROVED", value: stats?.general.approved || 0, border: "border-[#1d3331]" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between">
            <div className={`text-3xl md:text-4xl font-serif font-bold ${stat.text || "text-[#1d3331]"}`}>{stat.value}</div>
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{stat.label}</div>
            <div className={`absolute bottom-4 left-4 right-4 h-1 border-b-[3px] ${stat.border}`} />
          </div>
        ))}
      </div>

      {/* 🔹 SECONDARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between">
          <div className="text-4xl font-serif font-bold text-red-800">{stats?.general.overdue || 0}</div>
          <div className="text-[10px] font-bold text-slate-500 tracking-widest">OVERDUE</div>
          <div className="absolute bottom-4 left-4 right-4 h-1 border-b-[3px] border-red-800" />
        </div>
        <div className="sm:col-span-1 lg:col-span-2 bg-white p-5 rounded-xl border-l-[5px] border-[#1d3331] shadow-sm flex items-center h-32">
          <span className="text-4xl md:text-5xl font-serif font-bold mr-4 text-[#1d3331]">{stats?.general.approved || 0}</span>
          <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-tight">REVIEWED & <br className="hidden md:block"/>APPROVED</span>
        </div>
        <div className="sm:col-span-1 lg:col-span-2 bg-white p-5 rounded-xl border-l-[5px] border-red-800 shadow-sm flex items-center h-32">
          <span className="text-4xl md:text-5xl font-serif font-bold mr-4 text-red-800">{stats?.general.rejected || 0}</span>
          <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-tight">REVIEWED & <br className="hidden md:block"/>REJECTED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 🔹 ACTIVE ASSIGNMENTS */}
        <div className="lg:col-span-8">
          <h3 className="text-xl font-serif font-bold mb-0.5">Active Assignments</h3>
          <p className="text-xs text-slate-400 mb-6">High-priority indicators currently in progress</p>
          
          <div className="space-y-3">
            {indicators.filter(ind => ind.status === "Submitted").slice(0, 4).map((item: any, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 flex-shrink-0" />
                  <div className="text-[12px]">
                    <span className="font-bold">New Submission</span> for <span className="font-bold">{item.activityDescription || item.instructions || "Strategic Task"}</span>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Progress: {item.progress}%</p>
                  </div>
                </div>
                <Link to={`/superadmin/indicators`} className="text-red-800 font-bold hover:underline uppercase text-[10px] tracking-tighter self-end sm:self-center">Review Now →</Link>
              </div>
            ))}
            {indicators.filter(ind => ind.status === "Submitted").length === 0 && (
                <p className="text-xs italic text-slate-400">No pending reviews at the moment.</p>
            )}
          </div>
        </div>

        {/* 🔹 PERSPECTIVE PROGRESS */}
        <div className="lg:col-span-4">
          <h3 className="text-xl font-serif font-bold mb-6">Real-time Progress</h3>
          <div className="space-y-4">
            {stats && stats.perspectiveStats.length > 0 ? stats.perspectiveStats.map((p, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-tight">{p.name}</h4>
                  <span className="text-[11px] font-bold bg-[#fff9e6] border border-[#ffeeba] px-2 py-0.5 rounded text-amber-900">{p.val}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">{p.count} activities</p>
                <div className="w-full bg-[#f1f1e8] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1d3331] h-full transition-all duration-1000" style={{ width: `${p.val}%` }} />
                </div>
              </div>
            )) : (
              <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Perspective Data Linked</p>
              </div>
            )}
          </div>
        </div>
      </div>

    
    </div>
  );
};

export default AdminDashboardPage;