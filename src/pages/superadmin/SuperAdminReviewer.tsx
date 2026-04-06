import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Search,
  RefreshCcw,
  Hourglass,
  XCircle,
  Users,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchSubmissionsQueue,
  fetchIndicators,
} from "../../store/slices/indicatorSlice";

const SuperAdminReviewer = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"ALL" | "Pending" | "Rejected" | "Verified">("ALL");

  const {
    queue = [],
    indicators = [],
    loading,
  } = useAppSelector((state) => state.indicators);

  useEffect(() => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  }, [dispatch]);

  const derivedData = useMemo(() => {
    // 1. ENRICH THE QUEUE (For Table Display)
    const enrichedQueue = queue.map((qItem) => {
      const parentIndicator = indicators.find((ind) => ind.id === qItem.id);

      const resolvedName =
        parentIndicator?.assigneeDisplayName ||
        qItem.submittedBy ||
        "System Registry";

      const rawStatus = (parentIndicator?.status || qItem.status || "").toLowerCase();
      const progress = parentIndicator?.progress ?? qItem.achievedValue ?? 0;

      let displayStatus: "Pending" | "Rejected" | "Verified" = "Pending";
      
      if (rawStatus.includes("rejected")) {
        displayStatus = "Rejected";
      } else if (
        ["completed", "verified", "approved", "partially approved"].includes(rawStatus)
      ) {
        displayStatus = "Verified";
      } else {
        displayStatus = "Pending";
      }

      return {
        ...qItem,
        resolvedName,
        displayStatus,
        progress,
        rawStatus: parentIndicator?.status || qItem.status,
        cycle: parentIndicator?.reportingCycle || "Quarterly",
        assignmentType: parentIndicator?.assignmentType || "User",
      };
    });

    // 2. GLOBAL METRICS (FIXED: Derived from Indicators to ensure "Awaiting" clears on completion)
    const metrics = {
      // 🔹 FIX: Only count as 'awaiting' if status is an 'Awaiting' state AND not yet completed/verified
      awaiting: indicators.filter((ind) => {
        const s = ind.status?.toLowerCase() || "";
        return (s.includes("awaiting") || s === "pending") && 
               !["completed", "verified", "approved"].includes(s);
      }).length,
      
      rejected: indicators.filter((ind) => 
        ind.status?.toLowerCase().includes("rejected")
      ).length,

      verified: indicators.filter((ind) => 
        ["completed", "verified", "approved", "partially approved"].includes(ind.status?.toLowerCase())
      ).length,
    };

    // 3. FILTERING & SEARCH
    const filteredList = enrichedQueue.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        item.indicatorTitle?.toLowerCase().includes(searchLower) ||
        item.resolvedName?.toLowerCase().includes(searchLower);

      const matchesFilter = filter === "ALL" || item.displayStatus === filter;
      return matchesSearch && matchesFilter;
    });

    return { ...metrics, filteredList };
  }, [queue, indicators, searchTerm, filter]);

  const handleRefresh = () => {
    dispatch(fetchSubmissionsQueue());
    dispatch(fetchIndicators());
  };

  return (
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1d3331] mb-2">
            Reviewer Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full bg-emerald-500 ${loading ? "animate-pulse" : ""}`}
            />
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Live view of submissions at each stage of your review workflow
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-[#1d3331] hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* METRIC GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard
          title="Awaiting My Review"
          value={derivedData.awaiting}
          color="amber"
          icon={<Hourglass size={20} />}
        />
        <MetricCard
          title="Rejected By Reviewer"
          value={derivedData.rejected}
          color="red"
          icon={<XCircle size={20} />}
        />
        <MetricCard
          title="Forwarded to Registrar"
          value={derivedData.verified}
          color="emerald"
          icon={<ShieldCheck size={20} />}
        />
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between mb-8">
        <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl w-full lg:w-auto overflow-x-auto">
          <FilterChip active={filter === "ALL"} label="All" onClick={() => setFilter("ALL")} />
          <FilterChip
            active={filter === "Pending"}
            label="Awaiting Review"
            icon={<Hourglass size={14} />}
            onClick={() => setFilter("Pending")}
            color="amber"
          />
          <FilterChip
            active={filter === "Rejected"}
            label="Rejected"
            icon={<XCircle size={14} />}
            onClick={() => setFilter("Rejected")}
            color="red"
          />
          <FilterChip
            active={filter === "Verified"}
            label="Forwarded"
            icon={<CheckCircle2 size={14} />}
            onClick={() => setFilter("Verified")}
            color="emerald"
          />
        </div>

        <div className="relative w-full lg:w-96 group">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1d3331] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search indicator or contributor..."
            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-50 rounded-2xl text-xs font-bold outline-none focus:border-[#1d3331]/20 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="pl-10 pr-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Assignee</th>
                <th className="px-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Indicator Asset</th>
                <th className="px-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Progress</th>
                <th className="px-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Status</th>
                <th className="pr-10 pl-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading && derivedData.filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <Loader2 className="animate-spin text-[#1d3331] mx-auto mb-4" size={40} strokeWidth={1} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p>
                  </td>
                </tr>
              ) : derivedData.filteredList.length > 0 ? (
                derivedData.filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="pl-10 pr-6 py-7">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-[#1d3331] text-white flex items-center justify-center mb-2 shadow-lg shadow-[#1d3331]/20">
                          {item.assignmentType === "Team" ? <Users size={18} /> : <FileText size={18} />}
                        </div>
                        <p className="text-[11px] font-black text-[#1a3a32] uppercase truncate max-w-[120px] text-center">
                          {item.resolvedName}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-7">
                      <div className="max-w-md">
                        <p className="font-serif font-bold text-[#1d3331] text-base leading-snug mb-1 line-clamp-2">
                          {item.indicatorTitle}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">ID: {item.id.slice(-6).toUpperCase()}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{item.cycle}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-7">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`text-xs font-black ${item.progress === 100 ? 'text-emerald-600' : 'text-[#1d3331]'}`}>
                          {Math.round(item.progress)}%
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${item.progress === 100 ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-7 text-center">
                      <StatusBadge status={item.displayStatus} rawStatus={item.rawStatus} progress={item.progress} />
                    </td>

                    <td className="pr-10 pl-6 py-7 text-right">
                      <button className="inline-flex items-center gap-2 px-7 py-3 bg-[#1d3331] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#2c4c48] transition-all shadow-lg shadow-[#1d3331]/10 group-hover:-translate-x-1">
                        View <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center">
                      <FileText size={24} className="text-slate-200 mb-4" />
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">No records found</p>
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

const MetricCard = ({ title, value, color, icon }: any) => {
  const colors = {
    amber: "border-amber-400 text-amber-600 bg-amber-50/50",
    red: "border-red-700 text-red-800 bg-red-50/50",
    emerald: "border-[#1d3331] text-[#1d3331] bg-emerald-50/30",
  };
  return (
    <div className={`bg-white p-8 rounded-[2rem] border-b-4 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between ${colors[color as keyof typeof colors]}`}>
      <div>
        <span className="text-4xl font-serif font-bold block mb-1">{value}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>
      </div>
      <div className="p-4 rounded-2xl bg-current/5 opacity-80">{icon}</div>
    </div>
  );
};

const FilterChip = ({ active, label, icon, onClick, color }: any) => {
  const themes = {
    amber: active ? "bg-amber-500 text-white border-amber-500" : "text-slate-400",
    red: active ? "bg-red-700 text-white border-red-700" : "text-slate-400",
    emerald: active ? "bg-[#1d3331] text-white border-[#1d3331]" : "text-slate-400",
    default: active ? "bg-[#1d3331] text-white border-[#1d3331]" : "text-slate-400",
  };
  const theme = color ? themes[color as keyof typeof themes] : themes.default;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border text-[10px] font-black tracking-widest transition-all ${active ? theme + " shadow-lg shadow-black/5" : "bg-transparent border-transparent hover:bg-slate-200/50"}`}
    >
      {icon} {label}
    </button>
  );
};

const StatusBadge = ({ status, rawStatus, progress }: { status: "Pending" | "Rejected" | "Verified", rawStatus: string, progress: number }) => {
  const s = rawStatus?.toLowerCase() || "";
  const isAwaitingAction = s.includes("awaiting") || s === "pending";
  
  const config = {
    Pending: { 
      label: progress === 100 && isAwaitingAction ? "Review Required" : "In Progress", 
      style: "bg-amber-50 text-amber-700 border-amber-200", 
      dot: "bg-amber-500" 
    },
    Rejected: { label: "Rejected", style: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-600" },
    Verified: { label: "Verified", style: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-600" },
  };
  const item = config[status];
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black border ${item.style} uppercase tracking-widest`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot} ${progress === 100 && isAwaitingAction ? 'animate-ping' : 'animate-pulse'}`} />
      {item.label}
    </span>
  );
};

export default SuperAdminReviewer;