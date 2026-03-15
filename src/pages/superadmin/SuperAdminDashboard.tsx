import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronRight, Loader2, Users, Target, AlertCircle, CheckCircle, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

// Thunks
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchDashboardStats } from "../../store/slices/dashboardSlice"; 
import { fetchIndicators, fetchSubmissionsQueue } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";

// Types
import type { AppDispatch, RootState } from "../../store/store";

const SuperAdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { users = [], isLoading: uLoad } = useSelector((state: RootState) => state.users);
  const { indicators = [], queue = [], loading: iLoad } = useSelector((state: RootState) => state.indicators); 
  const { stats, loading: sLoad } = useSelector((state: RootState) => state.dashboard);
  const { plans = [], loading: pLoad } = useSelector((state: RootState) => state.strategicPlan);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchDashboardStats());
    dispatch(fetchIndicators());
    dispatch(fetchSubmissionsQueue());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  // KPI Calculations
  const totalActivities = useMemo(() => 
    plans.reduce((acc, p) => 
      acc + (p.objectives?.reduce((oAcc, obj) => oAcc + (obj.activities?.length || 0), 0) || 0), 0
    ), [plans]
  );

  const assignedCount = indicators.length;

  const unassignedCount = useMemo(() => {
    const assignedActivityIds = new Set(indicators.map(ind => ind.activityId));
    let totalPossible = 0;
    plans.forEach(plan => {
      plan.objectives?.forEach(obj => {
        totalPossible += (obj.activities?.length || 0);
      });
    });
    return Math.max(0, totalPossible - assignedActivityIds.size);
  }, [plans, indicators]);

  const awaitingReviewCount = queue.length;

  const certifiedCount = useMemo(() => 
    indicators.filter(ind => ind.status === "Completed" || ind.status === "Partially Approved").length, 
  [indicators]);

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "??";
  };

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("admin") || s?.includes("awaiting")) 
      return { dot: "bg-amber-500", action: "Certify", actionColor: "text-amber-600", bg: "bg-amber-50/30" };
    if (s?.includes("rejected") || s?.includes("overdue")) 
      return { dot: "bg-red-600", action: "View Audit", actionColor: "text-red-700", bg: "bg-red-50/30" };
    if (s?.includes("completed") || s?.includes("approved")) 
      return { dot: "bg-emerald-600", action: "View", actionColor: "text-emerald-700", bg: "bg-emerald-50/30" };
    return { dot: "bg-slate-400", action: "Manage", actionColor: "text-slate-600", bg: "bg-slate-50" };
  };

  const displayedUsers = users?.slice(0, 5) || [];
  const remainingCount = users?.length > 5 ? users.length - 5 : 0;

  const isSyncing = uLoad || sLoad || iLoad || pLoad || !stats;

  if (isSyncing && plans.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center italic">
          Synchronizing Registry Intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">
      
      {/* 🔹 PRIMARY KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {[
          { label: "SUB-INDICATORS", value: totalActivities, border: "border-[#1d3331]", path: "/superadmin/indicators?filter=ALL" },
          { label: "ACTIVE ASSIGNMENTS", value: assignedCount, border: "border-slate-300", path: "/superadmin/indicators?filter=ASSIGNED" },
          { label: "UNASSIGNED", value: unassignedCount, border: "border-red-800", text: "text-red-800", path: "/superadmin/indicators?filter=UNASSIGNED" },
          { label: "PENDING CERTIFICATION", value: awaitingReviewCount, border: "border-amber-500", text: "text-amber-600", path: "/superadmin/submissions" },
          { label: "APPROVED RECORDS", value: certifiedCount || stats?.general?.approved || 0, border: "border-emerald-600", path: "/superadmin/indicators?filter=REVIEWED" },
        ].map((stat, i) => (
          <Link 
            key={i} 
            to={stat.path}
            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className={`text-3xl md:text-4xl font-serif font-bold ${stat.text || "text-[#1d3331]"}`}>{stat.value}</div>
            <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase">{stat.label}</div>
            <div className={`absolute bottom-4 left-4 right-4 h-1 border-b-[3px] ${stat.border} opacity-40 group-hover:opacity-100 transition-opacity`} />
          </Link>
        ))}
      </div>

      {/* 🔹 EXCEPTION LOGS */}
      <div className="flex flex-col gap-4 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
           <Link 
            to="/superadmin/indicators?filter=OVERDUE"
            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative h-32 flex flex-col justify-between hover:border-red-200 transition-all group"
          >
            <div className="text-4xl font-serif font-bold text-red-800">{stats?.general?.overdue || 0}</div>
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-2">
              <Clock size={12} className="text-red-800" /> Overdue Tasks
            </div>
            <div className="absolute bottom-4 left-4 right-4 h-1 border-b-[3px] border-red-800/20 group-hover:border-red-800 transition-colors" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/superadmin/indicators?filter=REVIEWED"
            className="lg:col-span-2 bg-white p-5 rounded-xl border-l-[6px] border-emerald-600 shadow-sm flex items-center h-32 hover:bg-slate-50 transition-colors"
          >
            <CheckCircle className="text-emerald-600 mr-6 opacity-20" size={48} />
            <div>
              <span className="text-4xl md:text-5xl font-serif font-bold text-emerald-900 leading-none">{certifiedCount}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Total Verified Registry Records</p>
            </div>
          </Link>

          <Link 
            to="/superadmin/indicators?filter=REJECTED"
            className="lg:col-span-2 bg-white p-5 rounded-xl border-l-[6px] border-red-800 shadow-sm flex items-center h-32 hover:bg-slate-50 transition-colors"
          >
            <AlertCircle className="text-red-800 mr-6 opacity-20" size={48} />
            <div>
              <span className="text-4xl md:text-5xl font-serif font-bold text-red-800 leading-none">{stats?.general?.rejected || 0}</span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Returned for Evidence Correction</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* 🔹 REGISTRY QUEUE */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-[#1d3331]">Certification Pipeline</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold italic">Latest Pending submissions</p>
            </div>
            <Link to="/superadmin/submissions" className="text-[9px] font-black bg-[#1d3331] text-white px-4 py-2 rounded-lg uppercase tracking-[0.1em] hover:bg-[#c2a336] hover:text-[#1d3331] transition-all shadow-sm flex items-center gap-2">
              Full Queue <ArrowUpRight size={12} />
            </Link>
          </div>
          
          <div className="space-y-3">
            {queue.slice(0, 5).map((item, idx) => {
              const config = getStatusConfig(item.status);
              // Compare against string "0" since the type is string
const cycleLabel = item.quarter === "0" ? "Annual" : `Q${item.quarter}`;

              return (
                <div key={item._id || idx} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4 group hover:border-[#1d3331] transition-all">
                  <div className="flex items-start space-x-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot} mt-2 flex-shrink-0 animate-pulse`} />
                    <div className="text-[14px]">
                      <p className="text-slate-600 font-medium leading-relaxed">
                        <span className="font-bold text-[#1a2c2c]">{item.submittedBy || "Personnel"}</span> 
                        {item.status === 'Overdue' ? ' deadline lapsed for ' : ' submitted data for '}
                        <span className="font-bold text-[#1a2c2c]">
  {item.indicatorTitle || "Untitled Indicator"}
</span>
                      </p>
                      
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[11px] text-slate-400 font-medium">
                          {item.submittedOn || "Recent"} · {item.documentsCount || 0} Artifacts
                        </p>
                        <span className="text-[9px] bg-[#1d3331]/5 text-[#1d3331] px-2 py-0.5 rounded font-black uppercase tracking-tighter border border-[#1d3331]/10">
                          {cycleLabel} Cycle
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    to={`/superadmin/submissions?id=${item._id}`} 
                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${config.actionColor} ${config.bg} border-slate-100 hover:border-current`}
                  >
                    {config.action}
                  </Link>
                </div>
              );
            })}
            
            {queue.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <Target className="mx-auto text-slate-200 mb-2" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Certification Pipeline Clear</p>
              </div>
            )}
          </div>
        </div>

        {/* 🔹 PERFORMANCE BY PERSPECTIVE */}
        <div className="lg:col-span-4">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-serif font-bold text-[#1d3331]">Strategic Yield</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold italic">By Strategic Perspective</p>
          </div>
          <div className="space-y-4">
            {stats?.perspectiveStats?.map((p, idx) => (
              <div 
                key={idx} 
                className="block bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all group"
              >
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[11px] font-black uppercase tracking-tight text-[#1d3331]">{p.name}</h4>
                  <span className="text-[11px] font-black bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-emerald-900">{p.val}%</span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mb-3 uppercase tracking-tighter">{p.count} Managed Indicators</p>
                <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#1d3331] h-full transition-all duration-1000 group-hover:bg-emerald-600" 
                    style={{ width: `${p.val}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🔹 TEAM SECTION */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-2xl font-serif font-bold text-[#1d3331]">Registry Custodians</h3>
            <span className="text-[10px] bg-[#1d3331] text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">
              {users.length} Total
            </span>
          </div>
          <Link to="/superadmin/team" className="text-[10px] font-black border-2 border-[#1d3331] text-[#1d3331] px-5 py-2 rounded-xl uppercase tracking-[0.2em] flex items-center hover:bg-[#1d3331] hover:text-white transition-all shadow-sm">
            MANAGE DIRECTORY <ChevronRight size={14} className="ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayedUsers.map((member) => (
            <div key={member._id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-[#1d3331] flex items-center justify-center font-black mb-4 text-sm border-4 border-white group-hover:bg-[#1d3331] group-hover:text-white transition-colors">
                  {getInitials(member.name)}
                </div>
                <h4 className="text-[14px] font-serif font-bold leading-tight mb-1 text-[#1d3331]">
                  {member.name}
                </h4>
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-4">
                  {member.role === 'superadmin' ? 'REGISTRY ADMIN' : (member.title || "OFFICER")}
                </p>
                <div className="w-full border-t border-slate-50 pt-4 flex justify-between items-center text-[10px] font-bold text-slate-400">
                  <span>PJ: {member.pjNumber || "---"}</span>
                  <Users size={12} className="opacity-30" />
                </div>
              </div>
            </div>
          ))}

          <Link to="/superadmin/team" className="bg-[#f0f0e8]/30 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white hover:border-[#1d3331]/20 transition-all min-h-[200px]">
            <div className="text-center px-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {remainingCount > 0 ? `+${remainingCount} Others` : "Directory"}
              </p>
              <span className="text-[9px] font-bold text-emerald-800 uppercase underline mt-2 block">Access Full Records</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;