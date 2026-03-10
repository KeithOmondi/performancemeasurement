import { useState, useEffect, useMemo } from 'react';
import { 
  FileDown,
  Loader2, Search, CheckCircle2, XCircle, RefreshCcw, 
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
    const completed = indicators.filter(i => 
      ["Awaiting Super Admin", "Accepted"].includes(i.status as any)
    ).length;

    const overdueCount = indicators.filter(i => 
      i.deadline && 
      new Date(i.deadline) < new Date() && 
      !["Awaiting Super Admin", "Accepted"].includes(i.status as any)
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const allReviews = indicators.flatMap(ind => 
      (ind.reviewHistory || []).map(history => {
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
            role: indicator.assignee?.title || "Staff",
            assigned: 0,
            approved: 0,
            overdue: 0,
            rejections: 0
          };
        }
        const isComp = ["Awaiting Super Admin", "Accepted"].includes(indicator.status as any);
        const isOv = indicator.deadline && new Date(indicator.deadline) < new Date() && !isComp;
        const rejs = indicator.reviewHistory?.filter((h: any) => h.action.toLowerCase().includes('rejected')).length || 0;

        acc[staffId].assigned += 1;
        if (isComp) acc[staffId].approved += 1;
        if (isOv) acc[staffId].overdue += 1;
        acc[staffId].rejections += rejs;
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
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">
      {/* 🔹 HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between items-start mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1d3331] mb-1">Performance Reports</h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Summary, review log and individual staff performance</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handleRefresh} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            <RefreshCcw size={18} className={indicatorsLoading ? 'animate-spin' : ''} />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#eab308] text-[#1d3331] px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-[#d9a606] transition-all">
            <FileDown size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* 🔹 TABS */}
      <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-slate-200 mb-8">
        <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon="📊" label="Summary" />
        <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon="📋" label="Review Log" />
        <TabButton active={activeTab === 'individual'} onClick={() => setActiveTab('individual')} icon="👤" label="Individual Performance" />
      </div>

      {isCurrentTabLoading ? <LoadingState /> : (
        <div className="animate-in fade-in duration-500">
          
          {/* 🔹 SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Institutional Completion" value={`${derivedData.completionRate}%`} progress={derivedData.completionRate} accentColor="border-[#1d3331]" />
                <MetricCard title="Registry KPIs" value={indicators.length} subtext="Total Active Indicators" accentColor="border-slate-300" />
                <MetricCard title="Overdue Tasks" value={derivedData.overdueCount} subtext={derivedData.overdueCount > 0 ? "Urgent Attention" : "All on schedule"} accentColor="border-red-800" isCritical={derivedData.overdueCount > 0} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1d3331]">Perspective Performance Matrix</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white text-[10px] font-bold uppercase text-slate-400 border-b">
                      <tr>
                        <th className="px-8 py-5">Perspective</th>
                        <th className="px-8 py-5 text-center">Weight</th>
                        <th className="px-8 py-5 text-center">Progress</th>
                        <th className="px-8 py-5 text-center">Contribution</th>
                        <th className="px-8 py-5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {derivedData.perspectiveData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 text-sm font-bold text-[#1d3331]">{row.name}</td>
                          <td className="px-8 py-6 text-center text-xs font-semibold text-slate-500">{row.weight}%</td>
                          <td className="px-8 py-6 text-center">
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">{row.achieved}%</span>
                          </td>
                          <td className="px-8 py-6 text-center text-sm font-bold text-[#1d3331]">{row.score}</td>
                          <td className="px-8 py-6 text-right"><StatusBadge status={row.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 🔹 REVIEW LOG TAB (MATCHES SCREENSHOT) */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border-l-[6px] border-[#1d3331] shadow-sm flex flex-col justify-center h-32">
                  <span className="text-5xl font-serif font-bold text-[#1d3331]">{derivedData.totalApproved}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Reviewed & Approved</span>
                </div>
                <div className="bg-white p-8 rounded-2xl border-l-[6px] border-red-800 shadow-sm flex flex-col justify-center h-32">
                  <span className="text-5xl font-serif font-bold text-red-800">{derivedData.totalRejected}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Reviewed & Rejected</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <FilterChip active={reviewFilter === 'ALL'} label="ALL" onClick={() => setReviewFilter('ALL')} />
                <FilterChip active={reviewFilter === 'Approved'} label="APPROVED ONLY" icon={<CheckCircle2 size={14} />} onClick={() => setReviewFilter('Approved')} color="emerald" />
                <FilterChip active={reviewFilter === 'Rejected'} label="REJECTED ONLY" icon={<XCircle size={14} />} onClick={() => setReviewFilter('Rejected')} color="red" />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Indicator / Asset</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Decision</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Review Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {derivedData.filteredReviews.length > 0 ? (
                        derivedData.filteredReviews.map((rev: any, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-8 py-5">
                              <p className="text-xs font-bold text-[#1a3a32]">{new Date(rev.at).toLocaleDateString('en-GB')}</p>
                              <p className="text-[9px] text-slate-400 uppercase">{rev.reviewedBy}</p>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-sm font-bold text-[#1a3a32] leading-tight">{rev.indicatorTitle}</p>
                              <p className="text-[10px] text-slate-400 italic">For: {rev.assigneeName}</p>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${rev.action.toLowerCase().includes('rejected') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                {rev.action.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-slate-500 italic text-xs max-w-xs truncate group-hover:whitespace-normal transition-all">
                              "{rev.reason || 'No comments recorded.'}"
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-16 text-center text-slate-400 text-sm font-medium">No review actions recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 🔹 INDIVIDUAL PERFORMANCE TAB */}
          {activeTab === 'individual' && (
            <div className="space-y-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Search staff profile..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm focus:border-slate-300 transition-all"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b">
                    <tr>
                      <th className="px-8 py-5">Staff Member</th>
                      <th className="px-8 py-5 text-center">Assigned</th>
                      <th className="px-8 py-5 text-center text-emerald-700">Approved</th>
                      <th className="px-8 py-5 text-center text-red-700">Overdue</th>
                      <th className="px-8 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {derivedData.staffStats.map((staff: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1d3331] text-white flex items-center justify-center text-[10px] font-bold">
                              {staff.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1d3331]">{staff.name}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{staff.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center font-bold text-sm">{staff.assigned}</td>
                        <td className="px-8 py-5 text-center font-bold text-sm text-emerald-700">{staff.approved}</td>
                        <td className="px-8 py-5 text-center font-bold text-sm text-red-700">{staff.overdue}</td>
                        <td className="px-8 py-5 text-right">
                          <button className="text-[10px] font-black text-[#1d3331] uppercase tracking-widest hover:underline">View Profile →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* --- SHARED COMPONENTS --- */

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 pb-4 text-[11px] font-bold uppercase tracking-[0.15em] relative transition-all ${active ? 'text-[#1d3331]' : 'text-slate-300 hover:text-slate-400'}`}>
    <span>{icon}</span> {label}
    {active && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#1d3331] rounded-full" />}
  </button>
);

const MetricCard = ({ title, value, subtext, progress, accentColor, isCritical }: any) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border-t-4 ${accentColor}`}>
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
    <span className="text-4xl font-serif font-bold text-[#1d3331]">{value}</span>
    {progress !== undefined && (
      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-5 overflow-hidden">
        <div className="bg-[#1d3331] h-full" style={{ width: `${progress}%` }} />
      </div>
    )}
    {subtext && <p className={`text-[10px] mt-4 font-bold uppercase tracking-tight ${isCritical ? 'text-red-700' : 'text-slate-400'}`}>{subtext}</p>}
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-100">
    <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Generating Audit View...</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = { 
    "IN PROGRESS": "bg-yellow-50 text-yellow-700 border-yellow-200", 
    "ON TRACK": "bg-emerald-50 text-emerald-700 border-emerald-200", 
    "AT RISK": "bg-red-50 text-red-700 border-red-200" 
  };
  return <span className={`px-3 py-1 rounded-md text-[9px] font-black border ${styles[status] || styles["IN PROGRESS"]}`}>{status}</span>;
};

const FilterChip = ({ active, label, icon, onClick, color }: any) => {
  const activeStyles = color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : color === 'red' ? 'bg-red-50 text-red-700 border-red-800' : 'bg-[#1d3331] text-white border-[#1d3331]';
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-bold tracking-widest transition-all ${active ? activeStyles : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>
      {icon} {label}
    </button>
  );
};

export default SuperAdminReports;