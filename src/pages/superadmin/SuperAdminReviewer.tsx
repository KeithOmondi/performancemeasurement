import { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, Search, RefreshCcw, Hourglass, 
  XCircle, Users,
  ArrowUpRight, CheckCircle2
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
      const parentIndicator = indicators.find(ind => ind._id === qItem._id);
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
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">
      {/* 🔹 HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between items-start mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1d3331] mb-1">Reviewer Dashboard</h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
            Live view of submissions at each stage of your review workflow
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { dispatch(fetchSubmissionsQueue()); dispatch(fetchIndicators()); }}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 🔹 METRIC GRID (MATCHING REFERENCE IMAGE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <MetricCard 
          title="Awaiting My Review" 
          value={derivedData.awaiting} 
          accentColor="border-yellow-500" 
          textColor="text-yellow-700"
        />
        <MetricCard 
          title="Rejected by Reviewer" 
          value={derivedData.rejected} 
          accentColor="border-red-800" 
          textColor="text-red-800"
        />
        <MetricCard 
          title="Forwarded to Registrar" 
          value={derivedData.forwarded} 
          accentColor="border-[#1d3331]" 
          textColor="text-[#1d3331]"
        />
      </div>

      {/* 🔹 TOOLBAR (FILTER & SEARCH) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <FilterChip 
            active={filter === 'ALL'} 
            label="All" 
            onClick={() => setFilter('ALL')} 
          />
          <FilterChip 
            active={filter === 'Pending'} 
            label="Awaiting Review" 
            icon={<Hourglass size={14} className="text-yellow-600" />}
            onClick={() => setFilter('Pending')} 
            color="amber" 
          />
          <FilterChip 
            active={filter === 'Rejected'} 
            label="Rejected" 
            icon={<XCircle size={14} className="text-red-600" />}
            onClick={() => setFilter('Rejected')} 
            color="red" 
          />
          <FilterChip 
            active={filter === 'Forwarded'} 
            label="Forwarded to Registrar" 
            icon={<CheckCircle2 size={14} className="text-blue-600" />}
            onClick={() => setFilter('Forwarded')} 
            color="blue" 
          />
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search indicator or contributor..." 
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-300 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 🔹 DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Contributor</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Indicator Asset</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Progress</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Audit Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="animate-spin text-[#1d3331] mb-4" size={32} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                    </div>
                  </td>
                </tr>
              ) : derivedData.filteredList.length > 0 ? (
                derivedData.filteredList.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1d3331] text-white flex items-center justify-center text-[10px] font-bold">
                          {item.assignmentType === 'Team' ? <Users size={14} /> : item.resolvedName.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1a3a32] uppercase">{item.resolvedName}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{item.assignmentType === 'Team' ? 'Team' : 'Specialist'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-5 max-w-sm">
                      <p className="text-sm font-bold text-[#1d3331] leading-snug line-clamp-1">{item.indicatorTitle}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.cycle} Cycle</p>
                    </td>

                    <td className="px-8 py-5">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#1d3331]">{Math.round(item.progress)}%</span>
                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1d3331]" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-5 text-center">
                      <StatusBadge status={item.normalizedStatus} />
                    </td>

                    <td className="px-8 py-5 text-right">
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#1d3331] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#2c4c48] transition-all shadow-sm active:scale-95 group-hover:shadow-md">
                        Audit <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center py-10">
                      <RefreshCcw size={32} className="text-slate-100 mb-4" />
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                        No records found in this stage
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* --- SHARED COMPONENTS --- */

const MetricCard = ({ title, value, accentColor, textColor }: any) => (
  <div className={`bg-white p-8 rounded-2xl border-l-[6px] ${accentColor} shadow-sm flex flex-col justify-center h-32`}>
    <span className={`text-5xl font-serif font-bold ${textColor}`}>
      {value}
    </span>
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
      {title}
    </span>
  </div>
);

const FilterChip = ({ active, label, icon, onClick, color }: any) => {
  const activeStyles = color === 'amber' 
    ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
    : color === 'red' 
    ? 'bg-red-50 text-red-700 border-red-200' 
    : color === 'blue'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-[#1d3331] text-white border-[#1d3331]';
    
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-bold tracking-widest transition-all ${
        active ? activeStyles : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
      }`}
    >
      {icon} {label}
    </button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    'Pending': { label: 'Awaiting Review', style: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
    'Rejected': { label: 'Rejected', style: 'bg-red-50 text-red-700 border-red-100' },
    'Forwarded': { label: 'Verified', style: 'bg-blue-50 text-blue-700 border-blue-100' },
  };
  const item = config[status] || config['Pending'];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black border ${item.style} uppercase tracking-widest`}>
      {item.label}
    </span>
  );
};

export default SuperAdminReviewer;