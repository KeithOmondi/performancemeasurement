import { useState, useEffect, useMemo } from 'react';
import { 
  FileDown, LayoutDashboard, ListChecks, UserCircle, 
  Loader2, Search, CheckCircle2, XCircle, RefreshCcw
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchIndicators } from '../../store/slices/indicatorSlice';
import { getAllStrategicPlans } from '../../store/slices/strategicPlan/strategicPlanSlice';

const SuperAdminReports = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'summary' | 'review' | 'individual'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'Approved' | 'Rejected'>('ALL');

  const { indicators = [], loading: indicatorsLoading } = useAppSelector((state) => state.indicators);
  const { plans = [], loading: plansLoading } = useAppSelector((state) => state.strategicPlan);
  const { users = [] } = useAppSelector((state) => state.users);

  const isCurrentTabLoading = useMemo(() => {
    if (activeTab === 'summary') return indicatorsLoading || plansLoading;
    return indicatorsLoading;
  }, [activeTab, indicatorsLoading, plansLoading]);

  useEffect(() => {
    dispatch(fetchIndicators());
    if (activeTab === 'summary') {
      dispatch(getAllStrategicPlans());
    }
  }, [activeTab, dispatch]);

  const handleRefresh = () => {
    dispatch(fetchIndicators());
    if (activeTab === 'summary') dispatch(getAllStrategicPlans());
  };

  const derivedData = useMemo(() => {
    const total = indicators.length;
    
    // FIX: Updated to match your actual IIndicator.status union
    // We treat "Awaiting Super Admin" as a completed submission for reporting purposes
    const completed = indicators.filter(i => 
      (i.status as any) === "Awaiting Super Admin" || (i.status as any) === "Accepted"
    ).length;

    const overdueCount = indicators.filter(i => 
      i.deadline && 
      new Date(i.deadline) < new Date() && 
      !["Awaiting Super Admin", "Accepted"].includes(i.status as any)
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const allReviews = indicators.flatMap(ind => 
      (ind.reviewHistory || []).map(history => {
        // FIX: Using 'as any' to bypass the missing 'by' property error
        const historyData = history as any;
        const actorId = historyData.by || historyData.reviewerId || historyData.reviewer;
        const actor = users.find(u => String(u._id) === String(actorId))?.name;
        
        const targetStaff = ind.assignee?.name || ind.assignee?.groupName || "Staff";
        
        return {
          ...history,
          indicatorTitle: ind.activityDescription || ind.instructions || "Unnamed KPI",
          assigneeName: targetStaff,
          reviewedBy: actor || "System Reviewer"
        };
      })
    ).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const filteredReviews = allReviews.filter(rev => {
      const action = (rev.action || "").toLowerCase();
      if (reviewFilter === 'Approved') return action.includes('approved') || action.includes('accepted') || action.includes('awaiting');
      if (reviewFilter === 'Rejected') return action.includes('rejected');
      return true;
    });

    const perspectiveData = (plans || []).map(plan => {
      const relatedIndicators = indicators.filter(i => i.perspective === plan.perspective);
      const avgProgress = relatedIndicators.length > 0 
        ? relatedIndicators.reduce((acc, curr) => acc + Number(curr.progress || 0), 0) / relatedIndicators.length 
        : 0;
      const weight = plan.objectives?.reduce((acc, obj) => acc + (Number(obj.weight) || 0), 0) || 0;
      
      return {
        name: plan.perspective,
        weight,
        achieved: Math.round(avgProgress),
        score: ((avgProgress / 100) * weight).toFixed(2),
        status: avgProgress > 80 ? "ON TRACK" : avgProgress > 40 ? "IN PROGRESS" : "AT RISK"
      };
    });

    const staffStats = Object.values(
      indicators.reduce((acc: any, indicator) => {
        const staffId = indicator.assignee?._id || "unassigned";
        if (!acc[staffId]) {
          acc[staffId] = {
            name: indicator.assignee?.name || indicator.assignee?.groupName || "Unassigned",
            role: indicator.assignee?.title || (indicator.assignmentType === 'Team' ? "Department" : "Specialist"),
            assigned: 0,
            approved: 0,
            overdue: 0,
            rejections: 0
          };
        }
        
        const isCompleted = ["Awaiting Super Admin", "Accepted"].includes(indicator.status as any);
        const isOverdue = indicator.deadline && new Date(indicator.deadline) < new Date() && !isCompleted;
        const indicatorRejections = indicator.reviewHistory?.filter((h: any) => h.action.toLowerCase().includes('rejected')).length || 0;

        acc[staffId].assigned += 1;
        if (isCompleted) acc[staffId].approved += 1;
        if (isOverdue) acc[staffId].overdue += 1;
        acc[staffId].rejections += indicatorRejections;
        
        return acc;
      }, {})
    ).filter((staff: any) => staff.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return { 
      completionRate, overdueCount, perspectiveData, staffStats, filteredReviews, 
      totalApproved: allReviews.filter(r => (r.action || "").toLowerCase().includes('approved') || (r.action || "").toLowerCase().includes('accepted')).length, 
      totalRejected: allReviews.filter(r => (r.action || "").toLowerCase().includes('rejected')).length 
    };
  }, [indicators, plans, searchTerm, reviewFilter, users]);

  return (
    <div className="p-4 md:p-8 bg-[#f8f9f6] min-h-screen font-sans">
      {/* Header section remains the same as previous version */}
      <div className="flex flex-col md:flex-row md:justify-between items-start mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1a3a32] mb-1">Audit & Performance Reports</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-70">Regulatory activity monitoring portal</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handleRefresh} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <RefreshCcw size={18} className={indicatorsLoading ? 'animate-spin' : ''} />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#1a3a32] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border-b-4 border-yellow-600 active:scale-95 transition-all">
            <FileDown size={16} /> Export Audit PDF
          </button>
        </div>
      </div>

      <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-slate-200 mb-8">
        <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<LayoutDashboard size={14} />} label="Summary" />
        <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={<ListChecks size={14} />} label="Review Log" />
        <TabButton active={activeTab === 'individual'} onClick={() => setActiveTab('individual')} icon={<UserCircle size={14} />} label="Staff Performance" />
      </div>

      {isCurrentTabLoading ? <LoadingState /> : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'summary' && (
             <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <MetricCard title="Institutional Completion" value={`${derivedData.completionRate}%`} progress={derivedData.completionRate} accentColor="border-emerald-600" />
               <MetricCard title="Registry KPIs" value={indicators.length} subtext="Active Indicators" accentColor="border-blue-600" />
               <MetricCard title="Risk Alert (Overdue)" value={derivedData.overdueCount} subtext={derivedData.overdueCount > 0 ? "Urgent Action Required" : "No Delays Detected"} accentColor="border-red-600" isCritical={derivedData.overdueCount > 0} />
             </div>

             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1a3a32]">Perspective Breakdown</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-white text-[10px] font-black uppercase text-slate-400 border-b">
                     <tr>
                       <th className="px-8 py-5">Perspective Name</th>
                       <th className="px-8 py-5 text-center">Relative Weight</th>
                       <th className="px-8 py-5 text-center">Achieved</th>
                       <th className="px-8 py-5 text-center">Score Contribution</th>
                       <th className="px-8 py-5 text-right">Operational Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {derivedData.perspectiveData.map((row, idx) => (
                       <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-8 py-6 text-sm font-black text-[#1a3a32]">{row.name}</td>
                         <td className="px-8 py-6 text-center font-bold text-xs text-slate-500">{row.weight}%</td>
                         <td className="px-8 py-6 text-center">
                           <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">{row.achieved}%</span>
                         </td>
                         <td className="px-8 py-6 text-center text-sm font-black text-[#1a3a32]">{row.score}</td>
                         <td className="px-8 py-6 text-right"><StatusBadge status={row.status} /></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-6">
                <MetricCard title="Total Approvals" value={derivedData.totalApproved} accentColor="border-emerald-600" />
                <MetricCard title="Total Rejections" value={derivedData.totalRejected} accentColor="border-red-600" />
              </div>
              
              <div className="flex justify-between items-center gap-4">
                <div className="flex gap-2">
                  <FilterChip active={reviewFilter === 'ALL'} label="ALL HISTORY" onClick={() => setReviewFilter('ALL')} />
                  <FilterChip active={reviewFilter === 'Approved'} label="APPROVED" icon={<CheckCircle2 size={12} />} onClick={() => setReviewFilter('Approved')} color="emerald" />
                  <FilterChip active={reviewFilter === 'Rejected'} label="REJECTED" icon={<XCircle size={12} />} onClick={() => setReviewFilter('Rejected')} color="red" />
                </div>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-8 py-4">Timestamp</th>
                      <th className="px-8 py-4">Indicator Asset</th>
                      <th className="px-8 py-4 text-center">Decision</th>
                      <th className="px-8 py-4 text-right">Audit Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {derivedData.filteredReviews.map((rev: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-bold text-slate-400">{new Date(rev.at).toLocaleDateString()}</p>
                          <p className="text-[9px] font-black text-emerald-600 uppercase mt-0.5">{rev.reviewedBy}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-black text-[#1a3a32] leading-tight">{rev.indicatorTitle}</p>
                          <p className="text-[10px] text-slate-400 font-bold italic">Assignee: {rev.assigneeName}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border ${rev.action.includes('Rejected') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            {rev.action}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-slate-500 italic text-[11px] text-right max-w-xs truncate">
                          "{rev.reason || 'No comments provided'}"
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'individual' && (
            <div className="space-y-6">
               <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Search staff profile..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {derivedData.staffStats.map((staff: any, idx) => (
                  <StaffCard key={idx} staff={staff} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* --- SHARED COMPONENTS --- */

const StaffCard = ({ staff }: any) => (
  <div className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center"><UserCircle size={20} /></div>
      <div className="text-right">
        <p className="text-[9px] font-black text-slate-400 uppercase">{staff.role}</p>
        <p className="text-sm font-black text-[#1a3a32]">{staff.name}</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-50 text-center">
      <div><p className="text-[8px] font-black text-slate-400">TASKED</p><p className="font-black">{staff.assigned}</p></div>
      <div><p className="text-[8px] font-black text-emerald-600">PASS</p><p className="font-black text-emerald-700">{staff.approved}</p></div>
      <div><p className="text-[8px] font-black text-red-600">FAIL</p><p className="font-black text-red-700">{staff.overdue}</p></div>
    </div>
  </div>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 pb-4 text-[11px] font-black uppercase tracking-widest relative ${active ? 'text-[#1a3a32]' : 'text-slate-300'}`}>
    {icon} {label}
    {active && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500 rounded-full" />}
  </button>
);

const MetricCard = ({ title, value, subtext, progress, accentColor, isCritical }: any) => (
  <div className={`bg-white rounded-[1.5rem] p-6 shadow-sm border-t-4 ${accentColor}`}>
    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3">{title}</h3>
    <span className="text-4xl font-black text-[#1a3a32]">{value}</span>
    {progress !== undefined && (
      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
        <div className="bg-[#1a3a32] h-full" style={{ width: `${progress}%` }} />
      </div>
    )}
    {subtext && <p className={`text-[10px] mt-3 font-bold uppercase ${isCritical ? 'text-red-600' : 'text-slate-400'}`}>{subtext}</p>}
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
    <Loader2 className="animate-spin text-emerald-800 mb-4" size={40} />
    <p className="text-[10px] font-black text-slate-400 uppercase">Generating Audit View...</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = { "IN PROGRESS": "bg-yellow-50 text-yellow-700 border-yellow-200", "ON TRACK": "bg-emerald-50 text-emerald-700 border-emerald-200", "AT RISK": "bg-red-50 text-red-700 border-red-200" };
  return <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${styles[status] || styles["IN PROGRESS"]}`}>{status}</span>;
};

const FilterChip = ({ active, label, icon, onClick, color }: any) => {
  const activeStyles = color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : color === 'red' ? 'bg-red-50 text-red-700 border-red-600' : 'bg-[#1a3a32] text-white border-[#1a3a32]';
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest ${active ? activeStyles : 'bg-white text-slate-400 border-slate-200'}`}>
      {icon} {label}
    </button>
  );
};

export default SuperAdminReports;