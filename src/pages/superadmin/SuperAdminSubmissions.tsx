import { useEffect, useState, useMemo } from 'react';
import { 
  User, Users, ArrowRight, Loader2, Search, 
  RefreshCcw, Files, Calendar, Hash 
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSubmissionsQueue, fetchIndicators } from '../../store/slices/indicatorSlice';
import IndicatorsPageIdModal from './IndicatorsPageIdModal';

const SuperAdminSubmissions = () => {
  const dispatch = useAppDispatch();
  
  // Selectors from Redux
  const { queue = [], indicators = [], loading } = useAppSelector((state) => state.indicators);
  const { users = [] } = useAppSelector((state) => state.users); 
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  }, [dispatch]);

  const processedQueue = useMemo(() => {
    // 1. Filter raw queue for ONLY submitted items
    // We target 'Submitted' or 'Awaiting Super Admin' statuses
    return queue
      .filter((qItem) => {
        const status = qItem.status?.toLowerCase();
        return status === 'submitted' || status === 'awaiting super admin';
      })
      .map((qItem) => {
        const parentIndicator = indicators.find((ind) => ind._id === qItem._id);
        
        // 2. Resolve Submitter Name
        const submitterObj = users.find((u) => String(u._id) === String(qItem.submittedBy));
        const resolvedSubmitterName = submitterObj ? submitterObj.name : null;

        // 3. Resolve Assignee Names for fallback
        let resolvedAssigneeNames = "";
        const assigneeData = qItem.assignee || parentIndicator?.assignee;
        if (assigneeData) {
          const ids = Array.isArray(assigneeData) ? assigneeData : [assigneeData];
          const names = ids
            .map((id) => users.find((u) => String(u._id) === String(id))?.name)
            .filter(Boolean);
          resolvedAssigneeNames = names.join(", ");
        }

        return {
          ...qItem,
          resolvedName: resolvedSubmitterName || resolvedAssigneeNames || "System Registry",
          currentStatus: qItem.status || parentIndicator?.status || 'Submitted',
          fullData: parentIndicator 
        };
      });
  }, [queue, indicators, users]);

  const filteredQueue = useMemo(() => {
    return processedQueue.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.indicatorTitle?.toLowerCase().includes(searchLower) ||
        item.resolvedName?.toLowerCase().includes(searchLower) ||
        item._id.toLowerCase().includes(searchLower)
      );
    });
  }, [processedQueue, searchTerm]);

  const activeIndicator = indicators.find((ind) => ind._id === selectedId);

  return (
    <div className="p-6 md:p-12 bg-[#fdfcfc] min-h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
             <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live Submissions</span>
          </div>
          <h1 className="text-2xl font-black text-[#1a3a32] tracking-tighter uppercase font-roboto">Submissions Queue</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
            Evidence awaiting review and approval
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search by ID, Title, or Submitter..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-[#1a3a32]/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { dispatch(fetchSubmissionsQueue()); dispatch(fetchIndicators()); }}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TABLE REGISTRY */}
      <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submitted By</th>
                  <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Indicator Detail</th>
                  <th className="px-8 py-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Evidence</th>
                  <th className="px-8 py-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</th>
                  <th className="px-8 py-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-7 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Final Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredQueue.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a3a32]/5 flex items-center justify-center text-[#1a3a32] border border-[#1a3a32]/10">
                          {sub.isTeam ? <Users size={16} /> : <User size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1a3a32] uppercase truncate max-w-[150px]">
                            {sub.resolvedName}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            Verified Personnel
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="max-w-xs">
                        <p className="font-bold text-[#1a3a32] text-sm leading-tight mb-1 line-clamp-1 group-hover:text-emerald-800 transition-colors">
                          {sub.indicatorTitle}
                        </p>
                        <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                          <Hash size={8} /> {sub._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-1.5 text-[#1a3a32]">
                          <Files size={14} />
                          <span className="text-sm font-black">{sub.documentsCount || 0}</span>
                        </div>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Files Attached</span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-slate-600 font-bold text-xs">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(sub.submittedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                        <span className="text-[9px] text-slate-400 font-black tracking-widest italic">
                          {new Date(sub.submittedOn).getFullYear()}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                       <StatusBadge status={sub.currentStatus} />
                    </td>

                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedId(sub._id)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a3a32] text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-emerald-900 transition-all shadow-lg shadow-[#1a3a32]/10 group-hover:translate-x-1"
                      >
                        Examine Dossier <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filteredQueue.length === 0 && !loading && (
          <div className="py-24 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-slate-200">
               <Files className="text-slate-200" size={32} />
            </div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Queue Fully Cleared</h3>
            <p className="text-[10px] text-slate-300 font-bold uppercase">No pending submissions require certification.</p>
          </div>
        )}
      </div>

      {/* MODAL DRAWER OVERLAY */}
      {selectedId && activeIndicator && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1a3a32]/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedId(null)} />
          <div className="relative w-100 md:max-w-5xl h-full bg-white animate-in slide-in-from-right duration-500 shadow-2xl border-l-8 border-[#1a3a32]">
             <IndicatorsPageIdModal 
               indicator={activeIndicator} 
               allStaff={users || []} 
               onClose={() => setSelectedId(null)} 
             />
          </div>
        </div>
      )}
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    'Submitted': { 
      label: 'To Review', 
      style: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500' 
    },
    'Awaiting Super Admin': { 
      label: 'Cert. Pending', 
      style: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500' 
    }
  };
  
  // Default to a basic style if status is unexpected
  const item = config[status] || config['Submitted'];
  
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black border tracking-widest uppercase shadow-sm ${item.style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot} animate-pulse`} />
      {item.label}
    </span>
  );
};

export default SuperAdminSubmissions;