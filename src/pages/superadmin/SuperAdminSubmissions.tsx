import { useEffect, useState, useMemo } from 'react';
import { User, Users, ArrowRight, Loader2,  Search, RefreshCcw, Files } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSubmissionsQueue, fetchIndicators } from '../../store/slices/indicatorSlice';
import IndicatorsPageIdModal from './IndicatorsPageIdModal';

const SuperAdminSubmissions = () => {
  const dispatch = useAppDispatch();
  
  const { queue = [], indicators = [], loading } = useAppSelector((state) => state.indicators);
  const { users = [] } = useAppSelector((state) => state.users); 
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  }, [dispatch]);

  const processedQueue = useMemo(() => {
    return queue.map((qItem) => {
      const parentIndicator = indicators.find((ind) => ind._id === qItem._id);
      const assigneeData = parentIndicator?.assignee;

      let resolvedNames = "";
      if (assigneeData) {
        const ids = Array.isArray(assigneeData) ? assigneeData : [assigneeData];
        const names = ids
          .map((id) => users.find((u) => String(u._id) === String(id))?.name)
          .filter(Boolean);
        resolvedNames = names.join(", ");
      }

      const finalDisplayName = resolvedNames || 
        (qItem.submittedBy !== "Unknown" ? qItem.submittedBy : "Internal Registry");

      return {
        ...qItem,
        resolvedName: finalDisplayName,
        currentStatus: qItem.status || parentIndicator?.status || 'Pending'
      };
    });
  }, [queue, indicators, users]);

  const filteredQueue = useMemo(() => {
    return processedQueue.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.indicatorTitle?.toLowerCase().includes(searchLower) ||
        item.resolvedName?.toLowerCase().includes(searchLower)
      );
    });
  }, [processedQueue, searchTerm]);

  const activeIndicator = indicators.find((ind) => ind._id === selectedId);

  return (
    <div className="p-4 md:p-8 bg-[#f8f9f6] min-h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-[#1a3a32] tracking-tight">SUPER ADMIN QUEUE</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-60">
            Final Certification Registry
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Filter filings..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { dispatch(fetchSubmissionsQueue()); dispatch(fetchIndicators()); }}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TABLE REGISTRY */}
      <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="animate-spin text-[#1a3a32]" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Dossiers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#1a3a32] text-white">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Indicator</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Submitted By</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Documents</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Submitted On</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50 transition-colors group">
                    {/* Indicator Column */}
                    <td className="px-8 py-6">
                      <div className="max-w-xs">
                        <p className="font-bold text-[#1a3a32] text-sm leading-tight mb-1">
                          {sub.indicatorTitle}
                        </p>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          REF: {sub._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </td>

                    {/* Submitted By Column */}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                          {sub.isTeam ? <Users size={12} /> : <User size={12} />}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{sub.resolvedName}</span>
                      </div>
                    </td>

                    {/* Documents Column */}
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                        <Files size={12} />
                        <span className="text-[11px] font-black">{sub.documentsCount || 0}</span>
                      </div>
                    </td>

                    {/* Submitted On Column */}
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-600">
                          {new Date(sub.submittedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          {new Date(sub.submittedOn).getFullYear()}
                        </span>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-8 py-6 text-center">
                       <StatusBadge status={sub.currentStatus} />
                    </td>

                    {/* Action Column */}
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedId(sub._id)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a3a32] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all active:scale-95"
                      >
                        Examine <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DRAWER */}
      {selectedId && activeIndicator && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1a3a32]/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedId(null)} />
          <div className="relative w-full md:max-w-5xl h-full bg-white animate-in slide-in-from-right duration-500 border-l-8 border-[#1a3a32]">
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

const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    'Pending': { label: 'TO REVIEW', style: 'bg-amber-50 text-amber-700 border-amber-200' },
    'Awaiting Super Admin': { label: 'PENDING CERTIFICATION', style: 'bg-blue-50 text-blue-700 border-blue-200' },
    'Reviewed': { label: 'CERTIFIED', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'Rejected': { label: 'REJECTED', style: 'bg-red-50 text-red-700 border-red-200' },
  };
  
  const { label, style } = config[status] || config['Pending'];
  
  return (
    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black border tracking-tight uppercase shadow-sm ${style}`}>
      {label}
    </span>
  );
};

export default SuperAdminSubmissions;