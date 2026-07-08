import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Loader2,
  FileCheck,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Clock,
  Filter,
  FileSearch,
  ShieldAlert,
  ArrowRight,
  X,
  Calendar,
  Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAdminApprovedIndicators } from "../../store/slices/adminIndicatorSlice";
import type { IAdminIndicator } from "../../store/slices/adminIndicatorSlice";
import ApprovedIndicatorModal from "./ApprovedIndicatorModal";

// ─── Helper: format date/time ──────────────────────────────────────────────
const formatDateTime = (dateString?: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// ─── Component ──────────────────────────────────────────────────────────────
const AdminApprovals = () => {
  const dispatch = useAppDispatch();
  const { approvedIndicators, isLoading } = useAppSelector(
    (state) => state.adminIndicators
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(
    null
  );
  
  // ── Filter states ──
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedReportingCycle, setSelectedReportingCycle] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  useEffect(() => {
    dispatch(fetchAdminApprovedIndicators());
  }, [dispatch]);

  // ── Extract unique values for filters ──
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    approvedIndicators.forEach(ind => {
      if (ind.assigneeName) assignees.add(ind.assigneeName);
    });
    return Array.from(assignees).sort();
  }, [approvedIndicators]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    approvedIndicators.forEach(ind => {
      statuses.add(ind.status);
    });
    return Array.from(statuses).sort();
  }, [approvedIndicators]);

  const uniqueCycles = useMemo(() => {
    const cycles = new Set<string>();
    approvedIndicators.forEach(ind => {
      if (ind.reportingCycle) cycles.add(ind.reportingCycle);
    });
    return Array.from(cycles).sort();
  }, [approvedIndicators]);

  // ── Apply all filters ──
  const filteredItems = useMemo(() => {
    let result = approvedIndicators;

    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (ind) =>
          ind.objective?.title?.toLowerCase().includes(lower) ||
          ind.assigneeName?.toLowerCase().includes(lower) ||
          ind.activity?.description?.toLowerCase().includes(lower) ||
          ind.perspective?.toLowerCase().includes(lower)
      );
    }

    // Assignee filter
    if (selectedAssignee !== "all") {
      result = result.filter(ind => ind.assigneeName === selectedAssignee);
    }

    // Status filter
    if (selectedStatus !== "all") {
      result = result.filter(ind => ind.status === selectedStatus);
    }

    // Reporting cycle filter
    if (selectedReportingCycle !== "all") {
      result = result.filter(ind => ind.reportingCycle === selectedReportingCycle);
    }

    // Date range filter (based on updatedAt)
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(ind => {
        const updatedDate = new Date(ind.updatedAt);
        return updatedDate >= fromDate;
      });
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(ind => {
        const updatedDate = new Date(ind.updatedAt);
        return updatedDate <= toDate;
      });
    }

    return result;
  }, [
    approvedIndicators,
    searchTerm,
    selectedAssignee,
    selectedStatus,
    selectedReportingCycle,
    dateRange,
  ]);

  const handleRowClick = (indicatorId: string) => {
    setSelectedIndicatorId(indicatorId);
  };

  // ── Clear all filters ──
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedAssignee("all");
    setSelectedStatus("all");
    setSelectedReportingCycle("all");
    setDateRange({ from: "", to: "" });
  };

  // ── Check if any filter is active ──
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== "" ||
      selectedAssignee !== "all" ||
      selectedStatus !== "all" ||
      selectedReportingCycle !== "all" ||
      dateRange.from !== "" ||
      dateRange.to !== ""
    );
  }, [searchTerm, selectedAssignee, selectedStatus, selectedReportingCycle, dateRange]);

  // ── Loading skeleton ──
  if (isLoading && approvedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfdfb]">
        <div className="relative mb-6">
          <Loader2 className="animate-spin text-[#1a3a32]" size={48} />
          <ShieldCheck
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600"
            size={18}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1a3a32] animate-pulse">
          Accessing Verified Vault...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fcfdfb] min-h-screen font-sans">
      {/* ─── Header ─── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#1a3a32] rounded-2xl shadow-xl shadow-emerald-900/20 text-white">
              <FileCheck size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black text-[#1a3a32] tracking-tighter uppercase leading-none">
                Verified Tasks
              </h1>
              <div className="flex gap-2 mt-2">
                <span className="bg-emerald-50 text-emerald-700 text-[9px] px-3 py-1 rounded-lg font-black border border-emerald-100 uppercase tracking-widest">
                  {filteredItems.length} Performance Records
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="bg-slate-100 text-slate-600 text-[9px] px-3 py-1 rounded-lg font-black hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <X size={10} />
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            ORHC Performance Management & Measurement Unit (PMMU)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1a3a32] transition-colors"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by activity, officer, or perspective..."
              className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-[#1a3a32]/5 transition-all w-full md:w-96 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3.5 border rounded-2xl transition-all shadow-sm flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? "bg-[#1a3a32] border-[#1a3a32] text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
              Filters
            </span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Filters Panel ─── */}
      {showFilters && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/30 p-6 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Filter size={14} />
              Filter Records
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Assignee Filter */}
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users size={12} />
                Lead Officer
              </label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1a3a32]/10 focus:border-[#1a3a32] transition-all"
              >
                <option value="all">All Officers</option>
                {uniqueAssignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ShieldCheck size={12} />
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1a3a32]/10 focus:border-[#1a3a32] transition-all"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/([A-Z])/g, " $1").trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Reporting Cycle Filter */}
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={12} />
                Reporting Cycle
              </label>
              <select
                value={selectedReportingCycle}
                onChange={(e) => setSelectedReportingCycle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1a3a32]/10 focus:border-[#1a3a32] transition-all"
              >
                <option value="all">All Cycles</option>
                {uniqueCycles.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock size={12} />
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="flex-1 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1a3a32]/10 focus:border-[#1a3a32] transition-all"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="flex-1 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#1a3a32]/10 focus:border-[#1a3a32] transition-all"
                  placeholder="To"
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[9px] font-black text-slate-600 uppercase tracking-wider transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-[#1a3a32] hover:bg-[#2a4a42] rounded-xl text-[9px] font-black text-white uppercase tracking-wider transition-colors"
            >
              Apply & Close
            </button>
          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-[0.5rem] py-40 text-center border border-dashed border-slate-200 shadow-2xl shadow-slate-200/30">
          <FileSearch className="mx-auto mb-6 text-slate-100" size={80} />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
            No verified records found
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-4 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[0.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1400px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Activity Dossier
                  </th>
                  <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-48">
                    Execution
                  </th>
                  <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                    Verification Pipeline
                  </th>
                  <th className="px-6 py-8 w-10" /> {/* spacer */}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((indicator: IAdminIndicator) => {
                  const isCompleted = indicator.status === "Verified";
                  const history = indicator.reviewHistory ?? [];

                  // Latest admin "Verified" entry
                  const adminEntry = [...history]
                    .filter(
                      (h) => h.reviewerRole === "admin" && h.action === "Verified"
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.at).getTime() - new Date(a.at).getTime()
                    )[0];

                  // Latest superadmin "Approved" entry
                  const superEntry = [...history]
                    .filter(
                      (h) =>
                        h.reviewerRole === "superadmin" && h.action === "Approved"
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.at).getTime() - new Date(a.at).getTime()
                    )[0];

                  const adminDate = adminEntry?.at;
                  const superDate = superEntry?.at;
                  const formattedAdmin = formatDateTime(adminDate);
                  const formattedSuper = formatDateTime(superDate);

                  return (
                    <tr
                      key={indicator.id}
                      className="hover:bg-slate-50/60 transition-all cursor-pointer group"
                      onClick={() => handleRowClick(indicator.id)}
                    >
                      {/* Activity Dossier */}
                      <td className="px-10 py-7">
                        <div className="max-w-md">
                          <h3 className="text-[13px] font-black text-[#1a3a32] tracking-tight mb-3 line-clamp-2 leading-snug">
                            {indicator.activity?.description || "Untitled Activity"}
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-[#1a3a32] group-hover:border-[#1a3a32] transition-colors">
                              <UserCheck
                                size={12}
                                className="text-slate-400 group-hover:text-white"
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                              {indicator.assigneeName || "Unassigned"}
                            </span>
                            {indicator.perspective && (
                              <span className="ml-2 text-[8px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                                {indicator.perspective}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Execution (progress) */}
                      <td className="px-6 py-7">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[11px] font-black text-[#1a3a32]">
                            {indicator.progress}%
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                isCompleted
                                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                  : "bg-[#1a3a32]"
                              }`}
                              style={{ width: `${indicator.progress}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            Target: {indicator.target} {indicator.unit}
                          </span>
                        </div>
                      </td>

                      {/* Verification Pipeline */}
                      <td className="px-6 py-7">
                        <div className="flex items-center justify-center gap-4">
                          {/* Admin node */}
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all border ${
                                adminEntry
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                  : "bg-slate-50 border-slate-100 text-slate-300"
                              }`}
                            >
                              <ShieldCheck size={16} />
                            </div>
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest ${
                                adminEntry ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              Registry
                            </span>
                            {adminEntry && (
                              <span className="text-[7px] font-mono text-emerald-600/70 whitespace-nowrap">
                                {formattedAdmin}
                              </span>
                            )}
                          </div>

                          {/* Connector */}
                          <div className="flex items-center">
                            <div
                              className={`w-12 h-[2px] rounded-full transition-all ${
                                superEntry ? "bg-emerald-500" : "bg-slate-100"
                              }`}
                            />
                            <ArrowRight
                              size={10}
                              className={superEntry ? "text-emerald-500" : "text-slate-200"}
                            />
                          </div>

                          {/* Super Admin node */}
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all border ${
                                superEntry
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10"
                                  : "bg-slate-50 border-slate-100 text-slate-300"
                              }`}
                            >
                              <ShieldAlert size={16} />
                            </div>
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest ${
                                superEntry ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              Certification
                            </span>
                            {superEntry && (
                              <span className="text-[7px] font-mono text-emerald-600/70 whitespace-nowrap">
                                {formattedSuper}
                              </span>
                            )}
                          </div>

                          {/* Status badge */}
                          <div className="ml-6">
                            <div
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-[#1a3a32] text-white border-[#1a3a32]"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={10} />
                              ) : (
                                <Clock size={10} className="animate-pulse" />
                              )}
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                {indicator.status.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-7" /> {/* spacer */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modal ─── */}
      {selectedIndicatorId && (
        <ApprovedIndicatorModal
          indicatorId={selectedIndicatorId}
          onClose={() => setSelectedIndicatorId(null)}
        />
      )}
    </div>
  );
};

export default AdminApprovals;