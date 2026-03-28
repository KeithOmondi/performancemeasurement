import { useEffect, useState, useMemo } from 'react';
import { 
  ArrowRight, Loader2, Search, 
  RefreshCcw, Files, Hash,
  Layers, CalendarDays
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSubmissionsQueue, fetchIndicators } from '../../store/slices/indicatorSlice';
import IndicatorsPageIdModal from './IndicatorsPageIdModal';

const SuperAdminSubmissions = () => {
  const dispatch = useAppDispatch();
  
  // 1. Redux State
  const { queue = [], indicators = [], loading } = useAppSelector((state) => state.indicators);
  const { users = [] } = useAppSelector((state) => state.users); 
  
  // 2. Local State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "ALL" | "ARCHIVED">("PENDING");
  const [cycleFilter, setCycleFilter] = useState<"ALL" | "QUARTERLY" | "ANNUAL">("ALL");

  // 3. Initial Load
  useEffect(() => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  }, [dispatch]);

  // 4. Enhanced Data Processing
  const processedQueue = useMemo(() => {
    return queue.map((qItem) => {
      const parentIndicator = indicators.find((ind) => ind._id === qItem._id);
      
      return {
        ...qItem,
        resolvedName: qItem.submittedBy || parentIndicator?.assigneeDisplayName || "System Registry",
        currentStatus: qItem.status || parentIndicator?.status || 'Unknown',
        indicatorTitle: qItem.indicatorTitle || parentIndicator?.activityDescription || "Untitled Indicator",
        reportingCycle: parentIndicator?.reportingCycle || "Quarterly",
        fullData: parentIndicator 
      };
    });
  }, [queue, indicators]);

  // 5. Multi-Layer Filtering
  const filteredQueue = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return processedQueue.filter((item) => {
      // Status Filter Logic
      const isAwaiting = item.currentStatus.toLowerCase() === 'awaiting super admin';
      const isFinalized = ['completed', 'partially approved', 'rejected by super admin'].includes(item.currentStatus.toLowerCase());
      
      if (statusFilter === "PENDING" && !isAwaiting) return false;
      if (statusFilter === "ARCHIVED" && !isFinalized) return false;

      // Cycle Filter Logic
      if (cycleFilter === "QUARTERLY" && item.reportingCycle !== "Quarterly") return false;
      if (cycleFilter === "ANNUAL" && item.reportingCycle !== "Annual") return false;

      // Search Logic
      return (
        item.indicatorTitle?.toLowerCase().includes(searchLower) ||
        item.resolvedName?.toLowerCase().includes(searchLower) ||
        item._id.toLowerCase().includes(searchLower)
      );
    });
  }, [processedQueue, searchTerm, statusFilter, cycleFilter]);

  const activeIndicator = indicators.find((ind) => ind._id === selectedId);

  return (
    <div className="p-6 md:p-12 bg-[#fdfcfc] min-h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-[#c2a336] animate-pulse" />
            </div>
            <h1 className="text-2xl font-serif font-black text-[#1d3331] tracking-tighter uppercase">Submissions Queue</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              Evidence awaiting review and approval
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search approved registry..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-[#1d3331]/5 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => { dispatch(fetchSubmissionsQueue()); dispatch(fetchIndicators()); }}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* DOUBLE FILTER ROW */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
            {[
              { id: "PENDING", label: "Awaiting Certification" },
              { id: "ALL", label: "All Items" },
              { id: "ARCHIVED", label: "Finalized Records" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === tab.id 
                  ? "bg-[#1d3331] text-white shadow-md" 
                  : "text-slate-400 hover:text-[#1d3331]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setCycleFilter("ALL")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${cycleFilter === "ALL" ? "bg-white text-[#1d3331] shadow-sm" : "text-slate-400"}`}
            >
              All Cycles
            </button>
            <button
              onClick={() => setCycleFilter("QUARTERLY")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${cycleFilter === "QUARTERLY" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-blue-600"}`}
            >
              <Layers size={12} /> Quarterly
            </button>
            <button
              onClick={() => setCycleFilter("ANNUAL")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 ${cycleFilter === "ANNUAL" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-amber-600"}`}
            >
              <CalendarDays size={12} /> Annual
            </button>
          </div>
        </div>
      </div>

      {/* TABLE REGISTRY */}
      <div className="max-w-7xl mx-auto bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="animate-spin text-[#1d3331]" size={40} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Audit Records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reporting Cycle</th>
                  <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submitted By</th>
                  <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Indicator Detail</th>
                  <th className="px-8 py-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dossier</th>
                  <th className="px-8 py-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-8 py-7 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Audit Status</th>
                  <th className="px-8 py-7 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredQueue.map((sub) => {
                  const isQuarterly = sub.reportingCycle === "Quarterly";
                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg w-fit ${isQuarterly ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {isQuarterly ? <Layers size={14} /> : <CalendarDays size={14} />}
                          {isQuarterly ? `Quarter ${sub.quarter || '?'}` : 'Annual'}
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1d3331] text-[#c2a336] flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">
                            {sub.resolvedName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#1d3331] uppercase truncate max-w-[140px]">
                              {sub.resolvedName}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Authorized Submitter</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="max-w-xs">
                          <p className="font-bold text-[#1d3331] text-sm leading-tight mb-1 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {sub.indicatorTitle}
                          </p>
                          <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                            <Hash size={10} /> {sub._id.slice(-8).toUpperCase()}
                          </span>
                        </div>
                      </td>

                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1.5 text-[#1d3331]">
                            <Files size={14} className="opacity-40" />
                            <span className="text-sm font-black">{sub.documentsCount || 0}</span>
                          </div>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Files</span>
                        </div>
                      </td>

                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 text-slate-600 font-bold text-xs uppercase">
                            {sub.submittedOn ? new Date(sub.submittedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "---"}
                          </div>
                          <span className="text-[9px] text-slate-300 font-black">
                            {sub.submittedOn ? new Date(sub.submittedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-8 py-6 text-center">
                          <StatusBadge status={sub.currentStatus} />
                      </td>

                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setSelectedId(sub._id)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1d3331] text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-black transition-all shadow-md group-hover:px-6"
                        >
                          Verify Evidence <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DRAWER OVERLAY */}
      {selectedId && activeIndicator && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1d3331]/40 backdrop-blur-sm transition-opacity">
          <div className="absolute inset-0" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-4xl h-full bg-white shadow-2xl border-l-[12px] border-[#c2a336] animate-in slide-in-from-right duration-500">
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
  const s = status?.toLowerCase();
  
  const config: any = {
    'awaiting super admin': { 
      label: 'Admin Verified', 
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500' 
    },
    'completed': { 
      label: 'Finalized', 
      style: 'bg-[#1d3331]/10 text-[#1d3331] border-[#1d3331]/20',
      dot: 'bg-[#1d3331]' 
    },
    'rejected by super admin': { 
      label: 'Returned to Registry', 
      style: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500' 
    },
    'awaiting admin approval': { 
        label: 'Staff Draft', 
        style: 'bg-slate-50 text-slate-500 border-slate-200',
        dot: 'bg-slate-300' 
      }
  };
  
  const item = config[s] || { label: status, style: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black border tracking-widest uppercase shadow-sm ${item.style}`}>
      <span className={`w-1 h-1 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
};

export default SuperAdminSubmissions;