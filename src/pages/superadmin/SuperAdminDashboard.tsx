import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Thunks
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchDashboardStats } from "../../store/slices/dashboardSlice"; 
import { fetchIndicators } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

// Types
import type { AppDispatch, RootState } from "../../store/store";

const SuperAdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  // 1. Selectors
  const { users, isLoading: uLoad } = useSelector((state: RootState) => state.users);
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

  // 3. Derived Logic
  const totalActivities = useMemo(() => 
    plans.reduce((acc, p) => acc + p.objectives.reduce((oAcc, obj) => oAcc + obj.activities.length, 0), 0),
    [plans]
  );

  const assignedCount = indicators.length;
  const unassignedCount = totalActivities - assignedCount;

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "??";
  };

  const displayedUsers = users?.slice(0, 5) || [];
  const remainingCount = users?.length > 5 ? users.length - 5 : 0;

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
      
      {/* 🔹 TOP STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "TOTAL SUB-INDICATORS", value: totalActivities, border: "border-[#1d3331]", path: "/superadmin/indicators?filter=ALL" },
          { label: `ASSIGNED (OF ${totalActivities})`, value: assignedCount, border: "border-slate-300", path: "/superadmin/indicators?filter=ASSIGNED" },
          { label: "UNASSIGNED", value: unassignedCount < 0 ? 0 : unassignedCount, border: "border-red-800", text: "text-red-800", path: "/superadmin/indicators?filter=UNASSIGNED" },
          { label: "AWAITING REVIEW", value: stats?.general.awaitingReview || 0, border: "border-yellow-500", path: "/superadmin/submissions" },
          { label: "APPROVED", value: stats?.general.approved || 0, border: "border-[#1d3331]", path: "/superadmin/reports" },
        ].map((stat, i) => (
          <Link 
            key={i} 
            to={stat.path}
            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between hover:border-slate-300 transition-all group"
          >
            <div className={`text-3xl md:text-4xl font-serif font-bold ${stat.text || "text-[#1d3331]"}`}>{stat.value}</div>
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{stat.label}</div>
            <div className={`absolute bottom-4 left-4 right-4 h-1 border-b-[3px] ${stat.border} group-hover:opacity-70`} />
          </Link>
        ))}
      </div>

      {/* 🔹 SECONDARY STATS (REVIEWED LOGS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <Link 
          to="/superadmin/indicators?filter=OVERDUE"
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between hover:border-slate-300 transition-all group"
        >
          <div className="text-4xl font-serif font-bold text-red-800">{stats?.general.overdue || 0}</div>
          <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">OVERDUE</div>
          <div className="absolute bottom-4 left-4 right-4 h-1 border-b-[3px] border-red-800 group-hover:opacity-70" />
        </Link>

        <Link 
          to="/superadmin/reports"
          className="sm:col-span-1 lg:col-span-2 bg-white p-5 rounded-xl border-l-[5px] border-[#1d3331] shadow-sm flex items-center h-32 hover:bg-slate-50 transition-colors"
        >
          <span className="text-4xl md:text-5xl font-serif font-bold mr-4 text-[#1d3331]">{stats?.general.approved || 0}</span>
          <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-tight">REVIEWED & <br className="hidden md:block"/>APPROVED</span>
        </Link>

        <Link 
          to="/superadmin/reports"
          className="sm:col-span-1 lg:col-span-2 bg-white p-5 rounded-xl border-l-[5px] border-red-800 shadow-sm flex items-center h-32 hover:bg-slate-50 transition-colors"
        >
          <span className="text-4xl md:text-5xl font-serif font-bold mr-4 text-red-800">{stats?.general.rejected || 0}</span>
          <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-tight">REVIEWED & <br className="hidden md:block"/>REJECTED</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 🔹 SUBMISSIONS FEED */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-serif font-bold mb-0.5">Submissions Feed</h3>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Pending Super Admin Certification</p>
            </div>
            <Link to="/superadmin/submissions" className="text-[10px] font-black bg-[#1d3331] text-white px-3 py-1 rounded uppercase">View Queue</Link>
          </div>
          
          <div className="space-y-3">
            {indicators.filter(ind => (ind.status as any) === "Awaiting Super Admin" || ind.status === "Submitted").slice(0, 4).map((item: any, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4 group">
                <div className="flex items-center space-x-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                  <div className="text-[12px]">
                    <span className="font-bold">Action Required</span> for <span className="font-bold">{item.activityDescription || item.instructions || "Strategic Task"}</span>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Status: {item.status}</p>
                  </div>
                </div>
                <Link to="/superadmin/submissions" className="text-emerald-800 font-black hover:underline uppercase text-[9px] tracking-widest self-end sm:self-center bg-emerald-50 px-3 py-2 rounded-lg group-hover:bg-emerald-100 transition-colors">Review Now →</Link>
              </div>
            ))}
            {indicators.filter(ind => (ind.status as any) === "Awaiting Super Admin" || ind.status === "Submitted").length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 italic">Queue is clear.</p>
                </div>
            )}
          </div>
        </div>

        {/* 🔹 PERSPECTIVE PROGRESS */}
        <div className="lg:col-span-4">
          <h3 className="text-xl font-serif font-bold mb-6">Strategic Yield</h3>
          <div className="space-y-4">
            {stats && stats.perspectiveStats.length > 0 ? stats.perspectiveStats.map((p, idx) => (
              <Link 
                key={idx} 
                to="/superadmin/reports"
                className="block bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-tight">{p.name}</h4>
                  <span className="text-[11px] font-bold bg-[#fff9e6] border border-[#ffeeba] px-2 py-0.5 rounded text-amber-900">{p.val}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3">{p.count} indicators</p>
                <div className="w-full bg-[#f1f1e8] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1d3331] h-full transition-all duration-1000" style={{ width: `${p.val}%` }} />
                </div>
              </Link>
            )) : (
              <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Perspective Data Linked</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔹 TEAM OVERVIEW */}
      <div className="mt-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-serif font-bold">Personnel Directory</h3>
            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">
              {users.length} Registered
            </span>
          </div>
          <Link to="/superadmin/team" className="text-[11px] font-bold border border-slate-300 bg-white px-4 py-1.5 rounded uppercase tracking-wider flex items-center shadow-sm hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
            MANAGE ROLES <ChevronRight size={14} className="ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedUsers.map((member) => (
            <div key={member._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-hover hover:border-slate-300">
              <div className="flex flex-col">
                <div className="w-12 h-12 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold mb-4 text-sm shadow-md shadow-[#1d3331]/20">
                  {getInitials(member.name)}
                </div>
                <h4 className="text-[15px] font-serif font-bold leading-tight mb-1 text-[#1d3331] truncate">
                  {member.name}
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  {member.role === 'superadmin' ? 'SUPER ADMIN' : (member.title || "STAFF")}
                </p>
                <div className="w-full border-t border-slate-50 pt-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter flex flex-wrap items-center">
                    PJ: <span className="font-normal ml-1">{member.pjNumber || "N/A"}</span> 
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="lowercase font-normal text-slate-400 truncate max-w-[100px]">
                      {member.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Link 
            to="/superadmin/team" 
            className="bg-[#efefe5]/50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-[#efefe5] transition-all min-h-[180px]"
          >
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center px-4">
              {remainingCount > 0 ? `+${remainingCount} more personnel →` : "View Full Directory →"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;