import { useEffect, useState, useMemo } from 'react';
import { 
  ArrowRight, Loader2, Search, 
  RefreshCcw, Files, Hash,
  Layers, CalendarDays, Inbox, Trash2, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  fetchSubmissionsQueue, 
  fetchIndicators,
  deleteSubmission
} from '../../store/slices/indicatorSlice';
import IndicatorsPageIdModal from './IndicatorsPageIdModal';

/* --- TYPES --- */

type StatusFilter = "PENDING" | "ALL" | "ARCHIVED";
type CycleFilter = "ALL" | "QUARTERLY" | "ANNUAL";

interface StatusConfig {
  label: string;
  style: string;
  dot: string;
}

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
  const { users = [] } = useAppSelector((state) => state.users);

  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm]     = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [cycleFilter, setCycleFilter]   = useState<CycleFilter>("ALL");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);

  // Track filter key to reset page during render (avoids useEffect cascade)
  const filterKey = `${searchTerm}|${statusFilter}|${cycleFilter}`;
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

  const processedQueue = useMemo(() => {
    return queue.map((qItem) => {
      const parentIndicator = indicators.find((ind) => ind.id === qItem.indicatorId);
      return {
        ...qItem,
        resolvedName:   qItem.submittedBy || parentIndicator?.assigneeDisplayName || "System Registry",
        currentStatus:  qItem.status      || parentIndicator?.status              || 'Unknown',
        indicatorTitle: qItem.indicatorTitle || parentIndicator?.activityDescription || "Untitled Indicator",
        reportingCycle: parentIndicator?.reportingCycle || "Quarterly",
        indicatorId:    qItem.indicatorId  || parentIndicator?.id,
      };
    });
  }, [queue, indicators]);

  const filteredQueue = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return processedQueue.filter((item) => {
      const s = item.currentStatus.toLowerCase();
      const isAwaiting  = s === 'awaiting super admin';
      const isFinalized = ['completed', 'partially approved', 'rejected by super admin'].includes(s);

      if (statusFilter === "PENDING"  && !isAwaiting)  return false;
      if (statusFilter === "ARCHIVED" && !isFinalized)  return false;
      if (cycleFilter  === "QUARTERLY" && item.reportingCycle !== "Quarterly") return false;
      if (cycleFilter  === "ANNUAL"    && item.reportingCycle !== "Annual")    return false;

      return (
        item.indicatorTitle?.toLowerCase().includes(searchLower) ||
        item.resolvedName?.toLowerCase().includes(searchLower)   ||
        item.id.toLowerCase().includes(searchLower)
      );
    });
  }, [processedQueue, searchTerm, statusFilter, cycleFilter]);

  /* ── Pagination ── */

  const totalPages     = Math.max(1, Math.ceil(filteredQueue.length / PAGE_SIZE));
  const safePage       = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedQueue = filteredQueue.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── Derived ── */

  const activeIndicator = indicators.find((ind) => ind.id === selectedIndicatorId);

  /* ── Handlers ── */

  const handleRefresh = () => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  };

 const handleDeleteConfirm = async () => {
  if (!deleteTarget) return;
  await dispatch(deleteSubmission({
    submissionId: deleteTarget.submissionId,
    indicatorId:  deleteTarget.indicatorId,
  }));
  setDeleteTarget(null);
};

  /* ── Render ── */

  return (
    <div className="p-6 md:p-12 bg-[#fdfcfc] min-h-screen font-sans">

      {/* ── HEADER ── */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#c2a336] animate-pulse" />
            </div>
            <h1 className="text-2xl font-serif font-black text-[#1d3331] tracking-tighter uppercase">
              Submissions Queue
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              Evidence awaiting review and approval
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search submissions..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-[#1d3331]/5 transition-all"
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

        {/* ── FILTERS ── */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter */}
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
            {(["PENDING", "ALL", "ARCHIVED"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === id
                    ? "bg-[#1d3331] text-white shadow-md"
                    : "text-slate-400 hover:text-[#1d3331]"
                }`}
              >
                {id === "PENDING" ? "Awaiting Certification" : id === "ALL" ? "All Items" : "Finalized Records"}
              </button>
            ))}
          </div>

          {/* Cycle filter */}
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
            {(["ALL", "QUARTERLY", "ANNUAL"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setCycleFilter(id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5 ${
                  cycleFilter === id
                    ? id === "QUARTERLY" ? "bg-blue-600 text-white shadow-sm"
                      : id === "ANNUAL"  ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white text-[#1d3331] shadow-sm"
                    : id === "QUARTERLY" ? "text-slate-400 hover:text-blue-600"
                      : id === "ANNUAL"  ? "text-slate-400 hover:text-amber-600"
                      : "text-slate-400"
                }`}
              >
                {id === "QUARTERLY" && <Layers size={11} />}
                {id === "ANNUAL"    && <CalendarDays size={11} />}
                {id === "ALL" ? "All Cycles" : id === "QUARTERLY" ? "Quarterly" : "Annual"}
              </button>
            ))}
          </div>

          {!loading && (
            <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filteredQueue.length} record{filteredQueue.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="max-w-7xl mx-auto bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="animate-spin text-[#1d3331]" size={40} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Synchronizing Audit Records...
            </p>
          </div>

        ) : filteredQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Inbox size={48} strokeWidth={1.5} className="text-slate-200" />
            <div className="text-center">
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No submissions found</p>
              <p className="text-[10px] text-slate-300 mt-1">
                {statusFilter === "PENDING"
                  ? "Nothing is awaiting certification right now."
                  : "Try adjusting your filters."}
              </p>
            </div>
          </div>

        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    {["Cycle", "Submitted By", "Details", "Docs", "Timestamp", "Status"].map((h) => (
                      <th key={h} className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {h}
                      </th>
                    ))}
                    <th className="px-6 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[180px]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {paginatedQueue.map((sub) => {
                    const isQuarterly = sub.reportingCycle === "Quarterly";
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/40 transition-colors group">

                        {/* Cycle */}
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg ${
                            isQuarterly ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isQuarterly ? <Layers size={12} /> : <CalendarDays size={12} />}
                            {isQuarterly ? `Q${sub.quarter || '?'}` : 'Annual'}
                          </div>
                        </td>

                        {/* Submitted By */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1d3331] text-[#c2a336] flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm flex-shrink-0">
                              {sub.resolvedName.substring(0, 2).toUpperCase()}
                            </div>
                            <p className="text-xs font-black text-[#1d3331] uppercase truncate max-w-[120px]">
                              {sub.resolvedName}
                            </p>
                          </div>
                        </td>

                        {/* Details */}
                        <td className="px-6 py-5">
                          <div className="max-w-[220px]">
                            <p className="font-bold text-[#1d3331] text-sm leading-tight mb-1 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                              {sub.indicatorTitle}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-400">
                              <Hash size={9} /> {sub.id.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </td>

                        {/* Docs */}
                        <td className="px-6 py-5">
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1 text-[#1d3331]">
                              <Files size={13} className="opacity-40" />
                              <span className="text-sm font-black">{sub.documentsCount || 0}</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Files</span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-slate-600 font-bold text-xs">
                              {sub.submittedOn
                                ? new Date(sub.submittedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                : "---"}
                            </span>
                            <span className="text-[9px] text-slate-300 font-black">
                              {sub.submittedOn
                                ? new Date(sub.submittedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ""}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5">
                          <StatusBadge status={sub.currentStatus} />
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-5 w-[180px]">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedIndicatorId(sub.indicatorId ?? null)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1d3331] text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-black transition-colors shadow-md whitespace-nowrap"
                            >
                              Verify <ArrowRight size={13} />
                            </button>
                           
<button
  onClick={() => setDeleteTarget({
    submissionId: sub.submissionId,  // ← correct, actual submission id
    indicatorId:  sub.indicatorId ?? '',
    title:        sub.indicatorTitle,
  })}
                              className="flex-shrink-0 p-2.5 rounded-xl border border-red-100 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                              title="Delete submission"
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

            {/* ── PAGINATION ── */}
            <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing{' '}
                <span className="text-[#1d3331]">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredQueue.length)}
                </span>
                {' '}of{' '}
                <span className="text-[#1d3331]">{filteredQueue.length}</span>
                {' '}records
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

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d3331]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => !actionLoading && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-red-600" />
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={22} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1d3331] uppercase tracking-tight mb-1">
                    Delete Submission
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    This will permanently remove the submission and all its attached documents. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Submission</p>
                <p className="text-sm font-bold text-[#1d3331] line-clamp-2">{deleteTarget.title}</p>
                <span className="text-[9px] font-mono text-slate-400">
                  ID: {deleteTarget.submissionId.slice(-8).toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {actionLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER MODAL ── */}
      {selectedIndicatorId && activeIndicator && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1d3331]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedIndicatorId(null)} />
          <div className="relative w-full max-w-4xl h-full bg-white shadow-2xl border-l-[12px] border-[#c2a336] animate-in slide-in-from-right duration-500">
            <IndicatorsPageIdModal
              indicator={activeIndicator}
              allStaff={users || []}
              onClose={() => setSelectedIndicatorId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();

  const config: Record<string, StatusConfig> = {
    'awaiting super admin': {
      label: 'Awaiting Certification',
      style: 'bg-amber-50 text-amber-700 border-amber-200',
      dot:   'bg-amber-500',
    },
    'completed': {
      label: 'Completed',
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot:   'bg-emerald-500',
    },
    'rejected by super admin': {
      label: 'Returned to Registry',
      style: 'bg-red-50 text-red-700 border-red-200',
      dot:   'bg-red-500',
    },
    'rejected by admin': {
      label: 'Rejected by Admin',
      style: 'bg-orange-50 text-orange-700 border-orange-200',
      dot:   'bg-orange-400',
    },
    'awaiting admin approval': {
      label: 'Pending Admin',
      style: 'bg-slate-50 text-slate-500 border-slate-200',
      dot:   'bg-slate-300',
    },
    'partially approved': {
      label: 'Partially Approved',
      style: 'bg-blue-50 text-blue-700 border-blue-200',
      dot:   'bg-blue-400',
    },
  };

  const item = config[s] || { label: status, style: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black border tracking-widest uppercase shadow-sm ${item.style}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dot}`} />
      {item.label}
    </span>
  );
};

export default SuperAdminSubmissions;