import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  FileText,
  Mail,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

// Store Imports
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchDashboardStats } from "../../store/slices/dashboardSlice";
import {
  fetchIndicators,
  fetchSubmissionsQueue,
  type IIndicator,
  type IQueueItem,
} from "../../store/slices/indicatorSlice";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import type { IStrategicPlan, IObjective, IActivity } from "../../store/slices/strategicPlan/strategicPlanService";
import type { AppDispatch, RootState } from "../../store/store";

/* ─── TYPES & INTERFACES ─────────────────────────────────────────────── */

interface PerspectiveStat {
  name: string;
  totalActivities: number;
  assignedActivities: number;
  completionPercentage: number;
}

interface AnalyticsResult {
  perspectives: PerspectiveStat[];
  userAssignments: Record<string, number>;
  kpis: {
    totalIndicators: number;
    assigned: number;
    unassigned: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    overdue: number;
  };
}

interface IUser {
  id?: string;
  _id?: string;
  name: string;
  title?: string;
  pjNumber?: string;
  email?: string;
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

const SuperAdminDashboardPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Selectors with explicit RootState typing
  const { users = [], isLoading: uLoad } = useSelector((s: RootState) => s.users);
  const { indicators = [], queue = [], loading: iLoad } = useSelector((s: RootState) => s.indicators);
  const { stats, loading: sLoad } = useSelector((s: RootState) => s.dashboard);
  const { plans = [], loading: pLoad } = useSelector((s: RootState) => s.strategicPlan);

  // Sync Data on Mount
  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchDashboardStats());
    dispatch(fetchIndicators());
    dispatch(fetchSubmissionsQueue());
    dispatch(getAllStrategicPlans());
  }, [dispatch]);

  /* ─── ANALYTICS ENGINE ─────────────────────────────────────────────── */
  const analytics: AnalyticsResult = useMemo(() => {
    // 1. Calculate Total Indicators from Plans
    let totalIndicators = 0;
    plans.forEach((plan: IStrategicPlan) => {
      if (plan.objectives) {
        plan.objectives.forEach((obj: IObjective) => {
          if (obj.activities) {
            totalIndicators += obj.activities.length;
          }
        });
      }
    });

    // 2. Status Breakdown using actual API data
    const assigned = indicators.filter((i: IIndicator) => i.assignee && i.assignee !== "").length;
    const unassigned = indicators.filter((i: IIndicator) => !i.assignee || i.assignee === "").length;
    
    const pendingReview = indicators.filter((i: IIndicator) => 
      i.status === "Awaiting Admin Approval" || 
      i.status === "Awaiting Super Admin" ||
      i.needsAction === true
    ).length;

    const approved = indicators.filter((i: IIndicator) => 
      i.status === "Completed" || 
      i.reviewHistory?.some(r => r.action === "Approved")
    ).length;

    // Use stats from API for rejected and overdue
    const rejected = stats?.general?.rejected || 0;
    const overdue = stats?.general?.overdue || 0;

    // 3. Balanced Scorecard Perspectives
    const perspectiveMap = new Map<string, { total: number; assigned: number }>();
    
    // Initialize perspectives
    const perspectiveNames = [
      "Core Business / Mandate",
      "Customer Perspective",
      "Finance Perspective",
      "Innovation & Learning",
      "Internal Process",
    ];
    
    perspectiveNames.forEach(name => {
      perspectiveMap.set(name, { total: 0, assigned: 0 });
    });

    // Calculate perspective statistics
    plans.forEach((plan: IStrategicPlan) => {
      const perspective = plan.perspective || "Uncategorized";
      const perspectiveData = perspectiveMap.get(perspective) || { total: 0, assigned: 0 };
      
      if (plan.objectives) {
        plan.objectives.forEach((obj: IObjective) => {
          if (obj.activities) {
            perspectiveData.total += obj.activities.length;
            
            obj.activities.forEach((activity: IActivity) => {
              // Check if this activity has an assigned indicator
              const isAssigned = indicators.some((ind: IIndicator) => ind.activityId === activity.id);
              if (isAssigned) {
                perspectiveData.assigned++;
              }
            });
          }
        });
      }
      
      perspectiveMap.set(perspective, perspectiveData);
    });

    const perspectives: PerspectiveStat[] = Array.from(perspectiveMap.entries()).map(([name, data]) => ({
      name,
      totalActivities: data.total,
      assignedActivities: data.assigned,
      completionPercentage: data.total > 0 ? Math.round((data.assigned / data.total) * 100) : 0,
    }));

    // 4. User Workload Mapping
    const userAssignments: Record<string, number> = {};
    indicators.forEach((ind: IIndicator) => {
      if (ind.assignee && typeof ind.assignee === 'string') {
        userAssignments[ind.assignee] = (userAssignments[ind.assignee] || 0) + 1;
      }
    });

    return {
      perspectives,
      userAssignments,
      kpis: { 
        totalIndicators,
        assigned,
        unassigned,
        pendingReview,
        approved,
        rejected,
        overdue,
      },
    };
  }, [plans, indicators, stats]);

  /* ─── UI CONFIG ────────────────────────────────────────────────────── */

  const statCards = [
    { 
      label: "TOTAL INDICATORS", 
      value: analytics.kpis.totalIndicators, 
      color: "bg-[#1d3331]", 
      icon: FileText,
      filter: "ALL" 
    },
    { 
      label: "ASSIGNED", 
      value: analytics.kpis.assigned, 
      color: "bg-emerald-600", 
      icon: CheckCircle2,
      filter: "ASSIGNED" 
    },
    { 
      label: "UNASSIGNED", 
      value: analytics.kpis.unassigned, 
      color: "bg-amber-500", 
      icon: AlertCircle,
      filter: "UNASSIGNED" 
    },
    { 
      label: "PENDING REVIEW", 
      value: analytics.kpis.pendingReview, 
      color: "bg-blue-500", 
      icon: Clock,
      filter: "REVIEW" 
    },
    { 
      label: "APPROVED", 
      value: analytics.kpis.approved, 
      color: "bg-emerald-600", 
      icon: CheckCircle2,
      filter: "ALL" 
    },
  ];

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  /* ─── LOADING STATE ────────────────────────────────────────────────── */

  if (uLoad || sLoad || iLoad || pLoad || !stats) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center flex-col">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 text-[#1a2c2c] font-sans">
      {/* Alert Banner */}
      {(analytics.kpis.pendingReview > 0 || analytics.kpis.overdue > 0) && (
        <div className="bg-[#fff9e6] border border-[#f5e6b3] rounded-lg p-3 mb-8 flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600" />
          <p className="text-[12px] font-medium text-amber-900">
            <span className="font-bold">{analytics.kpis.pendingReview} indicators</span> have evidence pending review 
            {analytics.kpis.overdue > 0 && (
              <> · <span className="font-bold">{analytics.kpis.overdue} indicators</span> are overdue</>
            )}
          </p>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="space-y-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, i) => (
            <Link
              key={i}
              to={`/superadmin/indicators?filter=${card.filter}`}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-serif font-bold text-[#1d3331] group-hover:text-emerald-700 transition-colors">
                    {card.value}
                  </p>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-2">
                    {card.label}
                  </p>
                </div>
                <card.icon size={20} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
              <div className="w-full bg-slate-100 h-[3px] rounded-full overflow-hidden mt-4">
                <div 
                  className={`${card.color} h-full transition-all duration-700`} 
                  style={{ 
                    width: `${analytics.kpis.totalIndicators > 0 
                      ? (card.value / analytics.kpis.totalIndicators) * 100 
                      : 0}%` 
                  }} 
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/superadmin/indicators?filter=OVERDUE" 
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-red-800 transition-all group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-serif font-bold text-red-800">{analytics.kpis.overdue}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  OVERDUE INDICATORS
                </p>
              </div>
              <Clock size={20} className="text-red-300" />
            </div>
          </Link>
          
          <div className="bg-white p-6 rounded-2xl border-l-[5px] border-emerald-600 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-serif font-bold text-emerald-700">{analytics.kpis.approved}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  REVIEWED & APPROVED
                </p>
              </div>
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border-l-[5px] border-red-700 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-4xl font-serif font-bold text-red-700">{analytics.kpis.rejected}</h2>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mt-1">
                  RETURNED FOR CORRECTION
                </p>
              </div>
              <XCircle size={20} className="text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Perspectives */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Recent Activity */}
        <div className="lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-bold text-[#1d3331]">Recent Submissions</h3>
            <Link 
              to="/superadmin/submissions" 
              className="text-[10px] font-black bg-[#1d3331] text-white px-4 py-2 rounded uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-800 transition-colors"
            >
              View All <ArrowUpRight size={12} />
            </Link>
          </div>
          
          {queue.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No pending submissions to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.slice(0, 5).map((item: IQueueItem) => (
                <div 
                  key={item.id} 
                  className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all"
                >
                  <div className="flex gap-4 flex-1">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      item.reviewStatus === "Pending" ? "bg-amber-500" : "bg-emerald-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-[14px] text-slate-600 font-medium leading-snug">
                        <span className="font-bold text-[#1a2c2c]">{item.submittedBy}</span>
                        {" submitted evidence for "}
                        <span className="font-bold text-[#1a2c2c]">{item.indicatorTitle}</span>
                      </p>
                      <div className="flex gap-4 mt-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                          {formatDate(item.submittedOn)} · Q{item.quarter}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-bold">
                          Achieved: {item.achievedValue}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.documentsCount} document{item.documentsCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link 
                    to={`/superadmin/submissions?id=${item.submissionId}`} 
                    className="text-emerald-700 text-[11px] font-bold uppercase hover:border-b hover:border-emerald-700 transition-all ml-4"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perspectives Breakdown */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xl font-serif font-bold text-[#1d3331] mb-6">By Perspective</h3>
          {analytics.perspectives.map((perspective, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm group hover:shadow-md transition-all">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[11px] font-black uppercase text-[#1d3331]">{perspective.name}</h4>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                  {perspective.completionPercentage}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-tighter">
                {perspective.assignedActivities} / {perspective.totalActivities} activities assigned
              </p>
              <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1d3331] h-full group-hover:bg-emerald-700 transition-all duration-500" 
                  style={{ width: `${perspective.completionPercentage}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Overview */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-serif font-bold text-[#1d3331]">Team Overview</h3>
          <Link 
            to="/superadmin/team" 
            className="text-[10px] font-black border border-slate-300 px-5 py-2 rounded-xl uppercase hover:bg-[#1d3331] hover:text-white transition-all"
          >
            View All Team →
          </Link>
        </div>
        
        {users.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
            <p className="text-sm text-slate-500">No team members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(users as IUser[]).slice(0, 4).map((member) => {
              const userId = member.id || member._id || "";
              const assignmentCount = analytics.userAssignments[userId] || 0;
              
              return (
                <div key={userId} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center font-bold text-sm uppercase">
                      {member.name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "U"}
                    </div>
                    <div>
                      <h4 className="text-[15px] font-serif font-bold leading-tight text-[#1a2c2c] group-hover:text-emerald-700 transition-colors">
                        {member.name}
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {member.title || "Team Member"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      PF: {member.pjNumber || "Not assigned"}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-700">
                      <FileText size={14} /> 
                      {assignmentCount} indicator{assignmentCount !== 1 ? 's' : ''} assigned
                    </div>
                    {assignmentCount > 0 && (
                      <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full" 
                          style={{ 
                            width: `${(assignmentCount / Math.max(...Object.values(analytics.userAssignments), 1)) * 100}%` 
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link 
                      to={`/superadmin/team/${userId}`}
                      className="flex-1 bg-slate-50 text-[10px] font-black uppercase py-2.5 rounded-xl text-center hover:bg-slate-100 transition-colors"
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={() => window.location.href = `mailto:${member.email}`}
                      className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <Mail size={14} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;