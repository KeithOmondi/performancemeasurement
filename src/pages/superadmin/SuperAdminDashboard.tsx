import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, FileText, Mail, ArrowUpRight } from "lucide-react";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchDashboardStats } from "../../store/slices/dashboardSlice";
import { fetchIndicators, fetchSubmissionsQueue } from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import type { AppDispatch, RootState } from "../../store/store";

const SuperAdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { users = [],     isLoading: uLoad } = useSelector((s: RootState) => s.users);
  const { indicators = [], queue = [], loading: iLoad } = useSelector((s: RootState) => s.indicators);
  const { stats,          loading: sLoad }   = useSelector((s: RootState) => s.dashboard);
  const { plans = [],     loading: pLoad }   = useSelector((s: RootState) => s.strategicPlan);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchDashboardStats());
    dispatch(fetchIndicators());
    dispatch(fetchSubmissionsQueue());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  const analytics = useMemo(() => {
    const totalPossible = plans.reduce(
      (acc, p) => acc + (p.objectives?.reduce((oAcc, obj) => oAcc + (obj.activities?.length || 0), 0) || 0),
      0
    );

    const assigned  = indicators.length;
    const pending   = indicators.filter((i) => i.status?.toLowerCase().includes("awaiting") || i.status?.toLowerCase().includes("pending")).length;
    const approved  = indicators.filter((i) => i.status === "Completed" || i.status?.toLowerCase().includes("approved")).length;
    const rejected  = stats?.general?.rejected || 0;
    const overdue   = stats?.general?.overdue || 0;

    // Perspective breakdown
    const categories = [
      "Core Business / Mandate",
      "Customer Perspective",
      "Finance Perspective",
      "Innovation & Learning",
      "Internal Process",
    ];

    const perspectives = categories.map((name) => {
      let totalActs = 0;
      let assignedActs = 0;
      plans.forEach((plan) => {
        if (plan.perspective?.trim().toLowerCase() === name.toLowerCase()) {
          plan.objectives?.forEach((obj) => {
            totalActs += obj.activities?.length || 0;
            obj.activities?.forEach((act) => {
              // ✅ Use flat activityId field
              if (indicators.some((ind) => ind.activityId === act.id)) assignedActs++;
            });
          });
        }
      });
      return {
        name,
        total: totalActs,
        assigned: assignedActs,
        val: totalActs > 0 ? Math.round((assignedActs / totalActs) * 100) : 0,
      };
    });

    // ✅ Use flat assigneeId field — no more nested assignee object
    const userAssignments: Record<string, number> = {};
    indicators.forEach((ind) => {
      if (ind.assignee) {
        userAssignments[ind.assignee] = (userAssignments[ind.assignee] || 0) + 1;
      }
    });

    return {
      perspectives,
      userAssignments,
      kpis: { totalPossible, assigned, pending, approved, overdue, rejected },
    };
  }, [plans, indicators, stats]);

  if (uLoad || sLoad || iLoad || pLoad || !stats) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center flex-col">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
          Syncing Registry intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">

      {/* Alert Banner */}
      <div className="bg-[#fff9e6] border border-[#f5e6b3] rounded-lg p-3 mb-8 flex items-center gap-3">
        <AlertCircle size={16} className="text-amber-600" />
        <p className="text-[12px] font-medium text-amber-900">
          <span className="font-bold">{analytics.kpis.pending} indicators</span> have evidence pending review ·{" "}
          <span className="font-bold ml-1">{analytics.kpis.overdue} indicators</span> are due within 7 days
        </p>
      </div>

      {/* Stats */}
      <div className="space-y-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "TOTAL SUB-INDICATORS", val: analytics.kpis.totalPossible,                                color: "bg-[#1d3331]", sub: "" },
            { label: "ASSIGNED",             val: analytics.kpis.assigned,                                    color: "bg-[#1d3331]", sub: `(OF ${analytics.kpis.totalPossible})` },
            { label: "UNASSIGNED",           val: analytics.kpis.totalPossible - analytics.kpis.assigned,    color: "bg-[#1d3331]", sub: `(OF ${analytics.kpis.totalPossible})`, valColor: "text-red-800" },
            { label: "AWAITING REVIEW",      val: analytics.kpis.pending,                                     color: "bg-amber-500",  sub: "", valColor: "text-amber-600" },
            { label: "APPROVED",             val: analytics.kpis.approved,                                    color: "bg-[#1d3331]", sub: "" },
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px]">
              <div>
                <h2 className={`text-4xl font-serif font-bold ${item.valColor || "text-[#1d3331]"}`}>{item.val}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  {item.label} <span className="text-[8px] opacity-60 lowercase">{item.sub}</span>
                </p>
              </div>
              <div className="w-full bg-slate-100 h-[3px] rounded-full overflow-hidden mt-4">
                <div className={`${item.color} h-full`} style={{ width: `${(item.val / (analytics.kpis.totalPossible || 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[140px]">
            <div>
              <h2 className="text-4xl font-serif font-bold text-red-800">{analytics.kpis.overdue}</h2>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">OVERDUE</p>
            </div>
            <div className="w-full bg-slate-100 h-[3px] rounded-full overflow-hidden mt-4">
              <div className="bg-red-800 h-full w-1/4" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border-l-[5px] border-[#1d3331] border-slate-100 shadow-sm flex flex-col justify-center min-h-[100px]">
            <h2 className="text-4xl font-serif font-bold text-[#1d3331]">{analytics.kpis.approved}</h2>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">REVIEWED & APPROVED</p>
            <div className="w-full bg-slate-100 h-[2px] rounded-full mt-4" />
          </div>
          <div className="bg-white p-6 rounded-2xl border-l-[5px] border-red-700 border-slate-100 shadow-sm flex flex-col justify-center min-h-[100px]">
            <h2 className="text-4xl font-serif font-bold text-red-700">{analytics.kpis.rejected}</h2>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">REVIEWED & REJECTED</p>
            <div className="w-full bg-slate-100 h-[2px] rounded-full mt-4" />
          </div>
        </div>
      </div>

      {/* Lower Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-bold text-[#1d3331]">Recent Activity</h3>
            <Link
              to="/superadmin/submissions"
              className="text-[10px] font-black bg-[#1d3331] text-white px-4 py-2 rounded uppercase tracking-widest flex items-center gap-2"
            >
              View All <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {queue.slice(0, 5).map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-[#1d3331] transition-all">
                <div className="flex gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${item.status === "Overdue" ? "bg-red-600" : "bg-amber-500"}`} />
                  <div>
                    <p className="text-[14px] text-slate-600 font-medium leading-snug">
                      <span className="font-bold text-[#1a2c2c]">{item.submittedBy}</span>
                      {item.status === "Overdue" ? " deadline passed for " : " submitted evidence for "}
                      <span className="font-bold text-[#1a2c2c]">{item.indicatorTitle}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter italic">
                      {item.submittedOn} · {item.documentsCount || 0} documents uploaded
                    </p>
                  </div>
                </div>
                {/* ✅ Use .id */}
                <Link
                  to={`/superadmin/submissions?id=${item.id}`}
                  className="text-emerald-700 text-[11px] font-bold uppercase border-b border-transparent hover:border-emerald-700 pb-0.5 transition-all"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xl font-serif font-bold text-[#1d3331] mb-6">By Perspective</h3>
          {analytics.perspectives.map((p, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[11px] font-black uppercase text-[#1d3331]">{p.name}</h4>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">{p.val}%</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-tighter">{p.total} activities</p>
              <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                <div className="bg-[#1d3331] h-full group-hover:bg-emerald-700 transition-all" style={{ width: `${p.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Overview */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-serif font-bold text-[#1d3331]">Team Overview</h3>
          <Link to="/superadmin/team" className="text-[10px] font-black border border-slate-300 px-5 py-2 rounded-xl uppercase hover:bg-[#1d3331] hover:text-white transition-all">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {users.slice(0, 4).map((member) => {
            // ✅ Use _id (normalized by userService) for key and assignment lookup
            const key = member._id ?? (member as any).id;
            return (
              <div key={key} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md transition-all relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center font-bold text-sm">
                    {member.name?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-[15px] font-serif font-bold leading-tight text-[#1a2c2c] group-hover:text-emerald-700">{member.name}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{member.title || "Officer"}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase">
                    PF: {member.pjNumber || "---"}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                    {/* ✅ Look up by _id (normalized UUID) */}
                    <FileText size={14} /> {analytics.userAssignments[key] || 0} assigned
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-slate-50 text-[10px] font-black uppercase py-2.5 rounded-xl hover:bg-slate-100">Profile</button>
                  <button className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100">
                    <Mail size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;