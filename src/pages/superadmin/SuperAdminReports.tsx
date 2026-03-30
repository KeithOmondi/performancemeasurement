import { useState, useEffect, useMemo, Fragment } from 'react'; 
import { 
  FileDown, Loader2, Search, CheckCircle2, RefreshCcw, ChevronDown, ChevronUp, History
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchIndicators } from '../../store/slices/indicatorSlice';
import { getAllStrategicPlans } from '../../store/slices/strategicPlan/strategicPlanSlice';
import { fetchAllUsers } from '../../store/slices/user/userSlice';

const SuperAdminReports = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'summary' | 'review' | 'individual'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'Approved' | 'Rejected'>('ALL');
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  const { indicators = [], loading: indicatorsLoading } = useAppSelector((state) => state.indicators);
  const { plans = [], loading: plansLoading } = useAppSelector((state) => state.strategicPlan);
  const { users = [] } = useAppSelector((state) => state.users);

  useEffect(() => {
    dispatch(fetchIndicators());
    dispatch(getAllStrategicPlans());
    if (users.length === 0) dispatch(fetchAllUsers());
  }, [dispatch, users.length]);

  const handleRefresh = () => {
    dispatch(fetchIndicators());
    dispatch(getAllStrategicPlans());
    dispatch(fetchAllUsers());
  };

  const derivedData = useMemo(() => {
    // 1. INSTITUTIONAL METRICS
    const totalWeightSum = indicators.reduce((acc, curr) => acc + (curr.weight || 0), 0);
    const weightedProgressSum = indicators.reduce((acc, curr) => 
      acc + (Number(curr.progress || 0) * (curr.weight || 0)), 0);
    
    const institutionalCompletion = totalWeightSum > 0 
      ? Math.round(weightedProgressSum / totalWeightSum) 
      : 0;

    const overdueCount = indicators.filter(i => 
      i.deadline && new Date(i.deadline) < new Date() && i.status !== "Completed"
    ).length;

    // 2. REGISTRY FILTERS
    const filteredByReview = indicators.filter(i => {
        const matchesSearch = i.activityDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              i.assignee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
        if (reviewFilter === 'ALL') return true;
        if (reviewFilter === 'Approved') return i.status === "Completed";
        if (reviewFilter === 'Rejected') return (i.reviewHistory || []).some((h: any) => h.action === "Rejected");
        return true;
    });

    // 3. PERSPECTIVE PERFORMANCE MATRIX
    const perspectiveData = (plans || []).map(plan => {
      const relatedIndicators = indicators.filter(i => 
        i.perspective?.trim().toLowerCase() === plan.perspective?.trim().toLowerCase()
      );

      const pTotalWeight = relatedIndicators.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
      const pWeightedProgress = relatedIndicators.reduce((acc, curr) => 
        acc + (Number(curr.progress || 0) * (Number(curr.weight) || 0)), 0);

      const avgProgress = pTotalWeight > 0 ? pWeightedProgress / pTotalWeight : 0;
      
      let status: "ON TRACK" | "IN PROGRESS" | "AT RISK" = "AT RISK";
      if (avgProgress >= 75) status = "ON TRACK";
      else if (avgProgress >= 40) status = "IN PROGRESS";

      return {
        name: plan.perspective,
        weight: pTotalWeight,
        target: "100%",
        achieved: `${Math.round(avgProgress)}%`,
        score: (pWeightedProgress / 100).toFixed(2),
        status
      };
    });

    // 4. STAFF PERFORMANCE DATA
    const staffStats = Object.values(
      indicators.reduce((acc: any, indicator) => {
        const staffId = indicator.assignee?._id || "unassigned";
        if (!acc[staffId]) {
          acc[staffId] = {
            id: staffId,
            name: indicator.assignee?.name || "Unassigned",
            pf: indicator.assignee?.pjNumber || "N/A", // Updated to use .pjNumber
            assigned: 0,
            approved: 0,
            overdue: 0,
            rejections: 0,
            rejectionHistory: [],
            subIndicators: [],
            totalProgress: 0,
            totalWeight: 0
          };
        }
        
        const isComp = ["Completed", "Partially Approved"].includes(indicator.status);
        const isOv = indicator.deadline && new Date(indicator.deadline) < new Date() && indicator.status !== "Completed";
        const indicatorRejections = (indicator.reviewHistory || []).filter((h: any) => h.action === "Rejected");
        
        acc[staffId].assigned += 1;
        if (isComp) acc[staffId].approved += 1;
        if (isOv) acc[staffId].overdue += 1;
        acc[staffId].rejections += indicatorRejections.length;

        indicatorRejections.forEach((rej: any) => {
          acc[staffId].rejectionHistory.push({
            indicator: indicator.activityDescription,
            reason: rej.reason,
            date: rej.at
          });
        });

        acc[staffId].subIndicators.push({
          title: indicator.activityDescription,
          progress: indicator.progress,
          status: indicator.status
        });
        
        acc[staffId].totalProgress += (Number(indicator.progress || 0) * Number(indicator.weight || 0));
        acc[staffId].totalWeight += Number(indicator.weight || 0);

        return acc;
      }, {})
    ).filter((staff: any) => 
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        staff.pf.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return { 
      institutionalCompletion, 
      overdueCount, 
      perspectiveData, 
      staffStats,
      filteredByReview,
      totalApproved: indicators.filter(i => i.status === "Completed").length,
      totalRejected: indicators.reduce((acc, curr) => acc + (curr.reviewHistory?.filter((h:any) => h.action === "Rejected").length || 0), 0)
    };
  }, [indicators, plans, searchTerm, reviewFilter]);

  return (
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between items-start mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1d3331] mb-1">Performance Reports</h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Summary, review log and individual staff performance</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handleRefresh} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:shadow-md transition-all">
            <RefreshCcw size={18} className={indicatorsLoading ? 'animate-spin' : ''} />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#eab308] hover:bg-[#ca8a04] text-[#1d3331] px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
            <FileDown size={16} /> Export Audit Report
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-8 overflow-x-auto no-scrollbar border-b border-slate-200 mb-8">
        <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon="📊" label="Summary" />
        <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon="⚖️" label="Review Log" />
        <TabButton active={activeTab === 'individual'} onClick={() => setActiveTab('individual')} icon="👤" label="Individual Performance" />
      </div>

      {indicatorsLoading || plansLoading ? <LoadingState /> : (
        <div className="animate-in slide-in-from-bottom-2 duration-500">
          
          {/* 1. SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Overall Completion" value={`${derivedData.institutionalCompletion}%`} progress={derivedData.institutionalCompletion} accentColor="border-[#1d3331]" />
                <MetricCard title="Current Indicators" value={indicators.length} subtext="Active Indicators" accentColor="border-slate-300" />
                <MetricCard title="Overdue Indicators" value={derivedData.overdueCount} subtext="Requires immediate attention" accentColor="border-red-800" isCritical={derivedData.overdueCount > 0} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1d3331]">Strategic Perspective Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white text-[10px] font-black uppercase text-slate-400 border-b">
                      <tr>
                        <th className="px-8 py-5">Perspective</th>
                        <th className="px-6 py-5 text-center">Weight</th>
                        <th className="px-6 py-5 text-center">Target</th>
                        <th className="px-6 py-5 text-center">Achieved</th>
                        <th className="px-6 py-5 text-center">Score</th>
                        <th className="px-8 py-5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {derivedData.perspectiveData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6 text-sm font-bold text-[#1d3331]">{row.name}</td>
                          <td className="px-6 py-6 text-center text-xs font-semibold text-slate-500">{row.weight}</td>
                          <td className="px-6 py-6 text-center text-xs font-bold text-slate-400">{row.target}</td>
                          <td className="px-6 py-6 text-center text-xs font-black text-emerald-700">{row.achieved}</td>
                          <td className="px-6 py-6 text-center text-sm font-black text-[#1d3331]">{row.score}</td>
                          <td className="px-8 py-6 text-right"><StatusBadge status={row.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. REVIEW LOG TAB */}
          {activeTab === 'review' && (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" placeholder="Search by activity or staff..." 
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#1d3331]/10 transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full md:w-auto">
                        {(['ALL', 'Approved', 'Rejected'] as const).map((f) => (
                            <button 
                                key={f} onClick={() => setReviewFilter(f)}
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${reviewFilter === f ? 'bg-[#1d3331] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                            <tr>
                                <th className="px-8 py-5">Indicator Activity</th>
                                <th className="px-6 py-5">Assigned To</th>
                                <th className="px-6 py-5 text-center">Progress</th>
                                <th className="px-8 py-5 text-right">Registry Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {derivedData.filteredByReview.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50/30">
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-[#1d3331] line-clamp-1">{item.activityDescription}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{item.perspective}</p>
                                    </td>
                                    <td className="px-6 py-5 text-xs font-semibold text-slate-600">{item.assignee?.name}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 justify-center">
                                            <span className="text-[10px] font-black text-[#1d3331]">{item.progress}%</span>
                                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${item.progress}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase border ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* 3. INDIVIDUAL PERFORMANCE TAB */}
          {activeTab === 'individual' && (
            <div className="space-y-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" placeholder="Filter by Name, Role or PF Number..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#1d3331]/10 transition-all"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                    <tr>
                      <th className="px-8 py-5">Team Member / PF</th>
                      <th className="px-4 py-5 text-center">Details</th>
                      <th className="px-4 py-5 text-center">Assigned</th>
                      <th className="px-4 py-5 text-center text-emerald-700">Approved</th>
                      <th className="px-4 py-5 text-center text-red-700">Overdue</th>
                      <th className="px-4 py-5 text-center text-orange-700">Rejections</th>
                      <th className="px-8 py-5 text-right">Aggregated Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {derivedData.staffStats.map((staff: any) => {
                       const performance = staff.totalWeight > 0 ? Math.round(staff.totalProgress / staff.totalWeight) : 0;
                       const isExpanded = expandedStaff === staff.id;
                       
                       return (
                        <Fragment key={staff.id}>
                          <tr className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`} onClick={() => setExpandedStaff(isExpanded ? null : staff.id)}>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#1d3331] text-white flex items-center justify-center text-[10px] font-black uppercase">
                                  {staff.name.substring(0,2)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-[#1d3331]">{staff.name}</p>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-tighter font-black">{staff.role} • {staff.pf}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-5 text-center">
                               <button className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                                 {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                               </button>
                            </td>
                            <td className="px-4 py-5 text-center font-bold text-sm text-slate-600">{staff.assigned}</td>
                            <td className="px-4 py-5 text-center font-bold text-sm text-emerald-700">{staff.approved}</td>
                            <td className="px-4 py-5 text-center font-bold text-sm text-red-700">{staff.overdue}</td>
                            <td className="px-4 py-5 text-center font-bold text-sm text-orange-700">{staff.rejections}</td>
                            <td className="px-8 py-5 text-right font-black text-[#1d3331]">{performance}%</td>
                          </tr>
                          
                          {isExpanded && (
                            <tr className="bg-[#fcfcfc]">
                              <td colSpan={7} className="px-12 py-6 border-b border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                      <CheckCircle2 size={12}/> Current Indicator Load
                                    </h4>
                                    <div className="space-y-3">
                                      {staff.subIndicators.map((si: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                          <span className="text-xs font-bold text-[#1a3a32] truncate max-w-[200px]">{si.title}</span>
                                          <div className="flex items-center gap-3">
                                            <div className="w-12 bg-slate-100 h-1 rounded-full overflow-hidden">
                                              <div className="bg-emerald-500 h-full" style={{width: `${si.progress}%`}} />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400">{si.progress}%</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
                                      <History size={12}/> Audit Rejection History
                                    </h4>
                                    {staff.rejectionHistory.length > 0 ? (
                                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {staff.rejectionHistory.map((rej: any, i: number) => (
                                          <div key={i} className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                                            <div className="flex justify-between mb-1 text-[8px] font-black uppercase italic">
                                              <span className="text-red-800">Indicator Rejection</span>
                                              <span className="text-slate-400">{new Date(rej.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-[#1d3331] leading-tight mb-1">{rej.indicator}</p>
                                            <p className="text-[10px] text-red-600 italic">" {rej.reason} "</p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">No Rejection Data Logged</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                       )
                    })}
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

/* --- SUBCOMPONENTS --- */

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 pb-4 text-[11px] font-bold uppercase tracking-widest relative transition-all whitespace-nowrap ${active ? 'text-[#1d3331]' : 'text-slate-300 hover:text-slate-400'}`}>
    <span>{icon}</span> {label}
    {active && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#1d3331] rounded-full" />}
  </button>
);

const MetricCard = ({ title, value, subtext, progress, accentColor, isCritical }: any) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border-t-4 transition-transform hover:scale-[1.02] ${accentColor}`}>
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
    <span className="text-4xl font-serif font-bold text-[#1d3331]">{value}</span>
    {progress !== undefined && (
      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-5 overflow-hidden">
        <div className="bg-[#1d3331] h-full transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
    )}
    {subtext && <p className={`text-[10px] mt-4 font-bold uppercase tracking-tight ${isCritical ? 'text-red-700 animate-pulse' : 'text-slate-400'}`}>{subtext}</p>}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = { 
    "IN PROGRESS": "bg-yellow-50 text-yellow-700 border-yellow-200", 
    "ON TRACK": "bg-emerald-50 text-emerald-700 border-emerald-200", 
    "AT RISK": "bg-red-50 text-red-700 border-red-200" 
  };
  return <span className={`px-3 py-1 rounded-md text-[9px] font-black border ${styles[status]}`}>{status}</span>;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-100">
    <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Generating Judicial Audit Logs...</p>
  </div>
);

export default SuperAdminReports;