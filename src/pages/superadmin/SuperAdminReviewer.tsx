import { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, Search, RefreshCcw, Hourglass, 
  XCircle, Send, ChevronRight, User, Users, CheckCircle2
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSubmissionsQueue, fetchIndicators } from '../../store/slices/indicatorSlice';

const SuperAdminReviewer = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'Pending' | 'Rejected' | 'Forwarded'>('ALL');

  const { queue = [], indicators = [], loading } = useAppSelector((state) => state.indicators);
  const { users = [] } = useAppSelector((state) => state.users);

  useEffect(() => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  }, [dispatch]);

  const derivedData = useMemo(() => {
    const enrichedQueue = queue.map(qItem => {
      // Find the corresponding parent indicator from the list
      const parentIndicator = indicators.find(ind => ind._id === qItem._id);
      
      // Resolve name from assignee or submittedBy
      const assigneeData = qItem.assignee || parentIndicator?.assignee;
      let resolvedName = "Registry User";
      
      if (assigneeData) {
        const ids = Array.isArray(assigneeData) ? assigneeData : [assigneeData];
        const names = ids
          .map(id => users.find(u => String(u._id) === String(id))?.name)
          .filter(Boolean);
        
        if (names.length > 0) resolvedName = names.join(", ");
      }

      const normalizedStatus = (qItem.status === 'Accepted' || qItem.status === 'Forwarded') 
        ? 'Forwarded' 
        : qItem.status;

      return {
        ...qItem,
        resolvedName,
        normalizedStatus,
        // Map backend 'progress' and 'reportingCycle' to UI fields
        progress: parentIndicator?.progress || 0,
        cycle: parentIndicator?.reportingCycle || 'Quarterly',
        assignmentType: parentIndicator?.assignmentType || 'User'
      };
    });

    const metrics = {
      awaiting: enrichedQueue.filter(item => item.normalizedStatus === 'Pending').length,
      rejected: enrichedQueue.filter(item => item.normalizedStatus === 'Rejected').length,
      forwarded: enrichedQueue.filter(item => item.normalizedStatus === 'Forwarded').length,
    };

    const filteredList = enrichedQueue.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (item.indicatorTitle?.toLowerCase().includes(searchLower)) || 
        (item.resolvedName?.toLowerCase().includes(searchLower));
      
      const matchesFilter = filter === 'ALL' || item.normalizedStatus === filter;
      return matchesSearch && matchesFilter;
    });

    return { ...metrics, filteredList };
  }, [queue, indicators, users, searchTerm, filter]);

  return (
    <div className="p-4 md:p-8 bg-[#f8f9f6] min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-black text-[#1a3a32] mb-1">Reviewer Dashboard</h1>
        <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60">
          Strategic Performance Verification Registry
        </p>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        <MetricCard title="Awaiting My Review" value={derivedData.awaiting} accentColor="border-yellow-500" />
        <MetricCard title="Rejected by Reviewer" value={derivedData.rejected} accentColor="border-red-600" />
        <MetricCard title="Forwarded to Registrar" value={derivedData.forwarded} accentColor="border-blue-600" />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto no-scrollbar">
          <FilterChip active={filter === 'ALL'} label="All" onClick={() => setFilter('ALL')} />
          <FilterChip active={filter === 'Pending'} label="Awaiting" icon={<Hourglass size={12} />} onClick={() => setFilter('Pending')} color="yellow" />
          <FilterChip active={filter === 'Rejected'} label="Rejected" icon={<XCircle size={12} />} onClick={() => setFilter('Rejected')} color="red" />
          <FilterChip active={filter === 'Forwarded'} label="Forwarded" icon={<Send size={12} />} onClick={() => setFilter('Forwarded')} color="blue" />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search registry..." 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { dispatch(fetchSubmissionsQueue()); dispatch(fetchIndicators()); }} 
            className="p-2.5 border border-slate-200 rounded-xl bg-white shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Indicators List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-4 text-emerald-600" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Records...</p>
          </div>
        ) : derivedData.filteredList.length > 0 ? (
          derivedData.filteredList.map((item) => (
            <div key={item._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded tracking-widest uppercase">{item.cycle}</span>
                     <span className="text-[10px] font-mono text-slate-400">ID: {item._id.slice(-6).toUpperCase()}</span>
                  </div>
                  <h3 className="text-base font-black text-[#1a3a32] leading-tight mb-2">{item.indicatorTitle}</h3>
                  <div className="flex items-center gap-2 text-slate-500">
                     {item.assignmentType === 'Team' ? <Users size={14} /> : <User size={14} />}
                     <span className="text-xs font-bold">{item.resolvedName}</span>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-3">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Progress</p>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${item.progress}%` }} 
                        />
                      </div>
                      <span className="text-sm font-black text-[#1a3a32] tabular-nums">{Math.round(item.progress)}%</span>
                    </div>
                  </div>
                  <StatusBadge status={item.normalizedStatus} />
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1a3a32] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[#1a3a32]/10 hover:bg-emerald-900 active:scale-95 transition-all">
                    Verify Submission <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-20 text-center">
            <p className="text-slate-400 text-sm font-medium">No submissions matching your criteria were found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- SUPPORTING UI COMPONENTS --- */

const MetricCard = ({ title, value, accentColor }: any) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border-t-4 ${accentColor} transition-transform hover:-translate-y-1`}>
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
    <span className="text-4xl font-black text-[#1a3a32] tabular-nums">{value}</span>
  </div>
);

const FilterChip = ({ active, label, icon, onClick, color }: any) => {
  const styles: any = {
    yellow: active ? 'bg-yellow-50 text-yellow-700 border-yellow-500 shadow-yellow-100' : 'bg-white text-slate-400 border-slate-200',
    red: active ? 'bg-red-50 text-red-700 border-red-500 shadow-red-100' : 'bg-white text-slate-400 border-slate-200',
    blue: active ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-blue-100' : 'bg-white text-slate-400 border-slate-200',
  };
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest transition-all shadow-sm ${active && !color ? 'bg-[#1a3a32] text-white border-[#1a3a32]' : styles[color] || styles['default']}`}
    >
      {icon} {label}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    'Pending': { label: 'IN PROGRESS', style: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Hourglass size={10}/> },
    'Rejected': { label: 'REJECTED', style: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle size={10}/> },
    'Forwarded': { label: 'SUBMITTED', style: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Send size={10}/> },
    'Accepted': { label: 'VERIFIED', style: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10}/> }
  };
  const item = config[status] || config['Pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black border ${item.style} uppercase tracking-tighter`}>
      {item.icon} {item.label}
    </span>
  );
};

export default SuperAdminReviewer;