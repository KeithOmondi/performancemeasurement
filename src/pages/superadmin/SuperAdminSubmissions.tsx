import { useEffect, useState, useMemo } from 'react';
import { 
  Loader2, Search, 
  RefreshCcw, Files, Hash,
  Layers, CalendarDays, Trash2, AlertTriangle,
  ChevronLeft, ChevronRight, Clock, AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSubmissionsQueue, 
  fetchIndicators,
  deleteSubmission
} from '../../store/slices/indicatorSlice';

/* --- TYPES --- */

type CycleFilter = "ALL" | "QUARTERLY" | "ANNUAL";

interface DeleteTarget {
  submissionId: string;
  indicatorId: string;
  title: string;
}

const PAGE_SIZE = 10;

/* ─────────────────────────────────────────────────────────── */

const SuperAdminSubmissions = () => {
  const dispatch = useAppDispatch();

  const { queue = [], indicators = [], loading, actionLoading } = useAppSelector((state) => state.indicators);

  const [searchTerm, setSearchTerm] = useState("");
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>("ALL");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filterKey = `${searchTerm}|${cycleFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCurrentPage(1);
  }

  useEffect(() => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  }, [dispatch]);

  /* ── Data Processing ── */
  const pendingAdminSubmissions = useMemo(() => {
    return queue
      .map((qItem) => {
        const parentIndicator = indicators.find((ind) => ind.id === qItem.indicatorId);
        const reportingCycle = parentIndicator?.reportingCycle || "Quarterly";
        const isAnnualCycle = reportingCycle === "Annual";
        
        return {
          ...qItem,
          resolvedName: qItem.submittedBy || parentIndicator?.assigneeDisplayName || "System Registry",
          currentStatus: qItem.status || parentIndicator?.status || 'Unknown',
          indicatorTitle: qItem.indicatorTitle || parentIndicator?.activityDescription || "Untitled Indicator",
          reportingCycle: reportingCycle,
          indicatorId: qItem.indicatorId || parentIndicator?.id,
          submittedValue: qItem.achievedValue,
          year: qItem.year || new Date().getFullYear(),
          quarter: qItem.quarter || (isAnnualCycle ? 1 : parentIndicator?.activeQuarter || 1),
          isAnnual: isAnnualCycle,
        };
      })
      .filter((item) => {
        const status = item.currentStatus.toLowerCase();
        return status === 'awaiting admin approval';
      });
  }, [queue, indicators]);

  const filteredQueue = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return pendingAdminSubmissions.filter((item) => {
      if (cycleFilter === "QUARTERLY" && item.reportingCycle !== "Quarterly") return false;
      if (cycleFilter === "ANNUAL" && item.reportingCycle !== "Annual") return false;
      
      if (!searchTerm) return true;
      
      return (
        item.indicatorTitle?.toLowerCase().includes(searchLower) ||
        item.resolvedName?.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower)
      );
    });
  }, [pendingAdminSubmissions, searchTerm, cycleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedQueue = filteredQueue.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleRefresh = () => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteSubmission({
      submissionId: deleteTarget.submissionId,
      indicatorId: deleteTarget.indicatorId,
    }));
    setDeleteTarget(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  if (loading && pendingAdminSubmissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-amber-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
          Loading Pending Admin Reviews...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 bg-[#fdfcfc] min-h-screen font-sans">
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">MONITORING QUEUE</span>
            </div>
            <h1 className="text-2xl font-serif font-black text-[#1d3331] tracking-tighter uppercase">
              Pending Admin Review
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              Submissions awaiting admin action - for oversight and accountability
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search pending submissions..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-amber-600/5 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleRefresh}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
            {(["ALL", "QUARTERLY", "ANNUAL"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setCycleFilter(id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5 ${
                  cycleFilter === id
                    ? id === "QUARTERLY" ? "bg-blue-600 text-white shadow-sm"
                      : id === "ANNUAL"  ? "bg-amber-600 text-white shadow-sm"
                      : "bg-[#1d3331] text-white shadow-sm"
                    : id === "QUARTERLY" ? "text-slate-400 hover:text-blue-600"
                      : id === "ANNUAL"  ? "text-slate-400 hover:text-amber-600"
                      : "text-slate-400 hover:text-[#1d3331]"
                }`}
              >
                {id === "QUARTERLY" && <Layers size={11} />}
                {id === "ANNUAL" && <CalendarDays size={11} />}
                {id === "ALL" ? "All Cycles" : id === "QUARTERLY" ? "Quarterly" : "Annual"}
              </button>
            ))}
          </div>

          {!loading && (
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} />
                {filteredQueue.length} Pending Admin Review
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-blue-500 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Accountability Notice</p>
            <p className="text-[10px] text-blue-600">
              This page shows submissions waiting for admin review. As Super Admin, you can monitor these submissions 
              and delete any that are inappropriate, but you cannot approve them directly. Approval is the admin's responsibility.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-100">
        {filteredQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <CheckCircle size={48} strokeWidth={1.5} className="text-emerald-200" />
            <div className="text-center">
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Pending Admin Reviews</p>
              <p className="text-[10px] text-slate-300 mt-1">
                All submissions have been reviewed by admin or are being processed
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cycle</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submitted By</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Details</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Value</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Docs</th>
                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submitted</th>
                    <th className="px-6 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[120px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedQueue.map((sub) => {
                    const isAnnual = sub.reportingCycle === "Annual";
                    const submittedDate = formatDate(sub.submittedOn);

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg border ${
                              isAnnual 
                                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                              {isAnnual ? <CalendarDays size={12} /> : <Layers size={12} />}
                              {isAnnual ? "Annual Report" : `Quarter ${sub.quarter}`}
                            </div>
                            <span className="text-[8px] font-mono text-slate-400">
                              {sub.year}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1d3331] text-[#c2a336] flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm flex-shrink-0">
                              {sub.resolvedName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-[#1d3331] uppercase">
                                {sub.resolvedName}
                              </p>
                              <p className="text-[8px] text-slate-400">Awaiting Admin Action</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="max-w-[220px]">
                            <p className="font-bold text-[#1d3331] text-sm leading-tight mb-1 line-clamp-2">
                              {sub.indicatorTitle}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-400">
                              <Hash size={9} /> {sub.id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div>
                            <p className="text-base font-black text-emerald-600">
                              {sub.submittedValue || '-'}
                            </p>
                            <p className="text-[8px] text-slate-400">Achieved Value</p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1 text-[#1d3331]">
                              <Files size={13} className="opacity-40" />
                              <span className="text-sm font-black">{sub.documentsCount || 0}</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Files</span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-slate-600 font-bold text-xs">{submittedDate}</span>
                            <span className="text-[8px] text-amber-500 font-black mt-1">Pending Admin</span>
                          </div>
                        </td>

                        <td className="px-6 py-5 w-[120px]">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => setDeleteTarget({
                                submissionId: sub.submissionId,
                                indicatorId: sub.indicatorId ?? '',
                                title: sub.indicatorTitle,
                              })}
                              className="p-2.5 rounded-xl border border-red-100 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                              title="Delete submission (admin hasn't reviewed yet)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing{' '}
                <span className="text-[#1d3331]">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredQueue.length)}
                </span>
                {' '}of{' '}
                <span className="text-[#1d3331]">{filteredQueue.length}</span>
                {' '}pending submissions
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-300 text-xs font-black">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                            safePage === item
                              ? 'bg-[#1d3331] text-white shadow-md'
                              : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d3331]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => !actionLoading && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden text-center">
            <div className="h-1.5 w-full bg-red-600" />
            <div className="p-8">
              <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-sm font-black text-[#1d3331] uppercase mb-2">Delete Submission</h3>
              <p className="text-[11px] text-slate-500 mb-2">This submission is awaiting admin review.</p>
              <p className="text-[10px] text-slate-400 mb-6">ID: {deleteTarget.submissionId.slice(-8).toUpperCase()}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 border rounded-2xl text-[10px] font-black uppercase">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubmissions;