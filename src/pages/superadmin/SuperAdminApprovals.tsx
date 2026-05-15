import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  User,
  Clock,
  CalendarDays,
  Layers,
  FileSearch,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  Hash,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchIndicators,
  type IIndicator,
} from "../../store/slices/indicatorSlice";

interface ApprovalIndicator extends IIndicator {
  verifiedByAdmin?: string;
  verifiedAt?: string;
  adminComment?: string;
  submittedValue?: number;
}

const SuperAdminApprovals = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCycle, setFilterCycle] = useState<"all" | "quarterly" | "annual">("all");

  const { indicators, loading } = useAppSelector((state) => state.indicators);

  useEffect(() => {
    dispatch(fetchIndicators());
  }, [dispatch]);

  // Filter indicators that are awaiting super admin approval
  const pendingApprovals = useMemo<ApprovalIndicator[]>(() => {
    const approvals: ApprovalIndicator[] = [];

    indicators.forEach((ind) => {
      // Only show indicators awaiting super admin approval
      if (ind.status === "Awaiting Super Admin") {
        // Find the latest verified submission (from admin review)
        const verifiedSubmission = ind.submissions?.find(
          (s) => s.reviewStatus === "Verified"
        );
        
        // Find the admin review event
        const adminReviewEvent = ind.reviewHistory?.find(
          (h) => h.action === "Verified" && h.reviewerRole === "admin"
        );

        approvals.push({
          ...ind,
          verifiedByAdmin: adminReviewEvent?.reviewedByName,
          verifiedAt: adminReviewEvent?.at || ind.updatedAt,
          adminComment: verifiedSubmission?.adminComment || ind.adminOverallComments,
          submittedValue: verifiedSubmission?.achievedValue,
        });
      }
    });

    // Sort by most recently verified first
    return approvals.sort(
      (a, b) => new Date(b.verifiedAt || "").getTime() - new Date(a.verifiedAt || "").getTime()
    );
  }, [indicators]);

  // Apply filters
  const filteredApprovals = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return pendingApprovals.filter((ind) => {
      // Apply cycle filter
      if (filterCycle === "quarterly" && ind.reportingCycle !== "Quarterly") return false;
      if (filterCycle === "annual" && ind.reportingCycle !== "Annual") return false;
      
      // Apply search filter
      if (!searchTerm) return true;
      
      return (
        ind.activityDescription?.toLowerCase().includes(searchLower) ||
        ind.objectiveTitle?.toLowerCase().includes(searchLower) ||
        ind.assigneeDisplayName?.toLowerCase().includes(searchLower)
      );
    });
  }, [pendingApprovals, searchTerm, filterCycle]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) 
      ? "N/A" 
      : date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && pendingApprovals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
          Loading Approvals Queue...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-[#fdfcfc] min-h-screen font-sans">
      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-serif font-black text-[#1d3331] tracking-tighter uppercase flex items-center gap-3">
              FINAL APPROVALS
              <span className="bg-emerald-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">
                {filteredApprovals.length} Pending
              </span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              Submissions verified by Admin awaiting your final certification
            </p>
          </div>

          <div className="relative">
            <FileSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by activity or officer..."
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-600/5 w-full md:w-96 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Cycle Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => setFilterCycle("all")}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterCycle === "all"
                ? "bg-[#1d3331] text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            All ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setFilterCycle("quarterly")}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filterCycle === "quarterly"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Layers size={12} />
            Quarterly ({pendingApprovals.filter(i => i.reportingCycle === "Quarterly").length})
          </button>
          <button
            onClick={() => setFilterCycle("annual")}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filterCycle === "annual"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <CalendarDays size={12} />
            Annual ({pendingApprovals.filter(i => i.reportingCycle === "Annual").length})
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredApprovals.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          {searchTerm ? (
            <>
              <FileSearch className="mx-auto mb-4 text-gray-200" size={48} />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                No matches found for "{searchTerm}"
              </h2>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-xs font-bold text-emerald-600 underline"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <CheckCircle className="mx-auto mb-4 text-emerald-200" size={48} />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                No Pending Approvals
              </h2>
              <p className="text-[10px] text-slate-400 mt-2">
                All verified submissions have been processed
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApprovals.map((indicator) => {
            const isAnnual = indicator.reportingCycle === "Annual";
            const latestSubmission = indicator.submissions?.find(s => s.reviewStatus === "Verified");
            const resubmissionCount = latestSubmission?.resubmissionCount ?? 0;
            const achievedValue = indicator.submittedValue ?? latestSubmission?.achievedValue ?? 0;
            const submissionId = latestSubmission?.id;
            
            return (
              <div
                key={indicator.id}
                className="bg-white rounded-2xl border border-emerald-100 hover:border-emerald-200 transition-all duration-300 overflow-hidden hover:shadow-lg"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                            isAnnual
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isAnnual ? <CalendarDays size={10} /> : <Layers size={10} />}
                          {indicator.reportingCycle}
                        </span>
                        
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={10} />
                          Verified by Admin
                        </span>

                        {resubmissionCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                            <Clock size={10} />
                            Resubmission #{resubmissionCount}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-[#1d3331] leading-tight mb-2">
                        {indicator.activityDescription || indicator.objectiveTitle || "Untitled Activity"}
                      </h3>

                      {/* Performance */}
                      <div className="flex flex-wrap items-center gap-6 mb-3">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Achieved Value</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {achievedValue}
                            <span className="text-xs font-normal text-slate-400 ml-1">{indicator.unit || "%"}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Target</p>
                          <p className="text-sm font-bold text-[#1d3331]">
                            {indicator.target} {indicator.unit || "%"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Progress</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${indicator.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">{indicator.progress || 0}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Verification Info */}
                      <div className="flex flex-wrap items-center gap-4 text-[10px] mb-3">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-700">
                            Assignee: {indicator.assigneeDisplayName || "Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={12} className="text-emerald-500" />
                          <span className="text-slate-500">
                            Verified by: {indicator.verifiedByAdmin || "Admin"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-slate-500">
                            Verified on: {formatDateTime(indicator.verifiedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Admin Comment */}
                      {indicator.adminComment && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border-l-4 border-emerald-400">
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-500 flex items-center gap-1">
                            <MessageSquare size={10} /> Admin Verification Note:
                          </p>
                          <p className="text-[11px] font-medium text-slate-700">
                            "{indicator.adminComment}"
                          </p>
                        </div>
                      )}

                      {/* Submission ID */}
                      <div className="mt-3 flex items-center gap-1 text-[9px] font-mono text-slate-400">
                        <Hash size={9} />
                        Submission ID: {submissionId?.slice(-12).toUpperCase() || "N/A"}
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-row lg:flex-col items-center gap-2 min-w-[140px]">
                      <button
                        onClick={() => navigate(`/super-admin/indicators/${indicator.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                      >
                        <Eye size={14} /> Review
                      </button>
                      
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[8px] text-slate-300">or</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                      
                      <button
                        onClick={() => navigate(`/super-admin/indicators/${indicator.id}?action=reject`)}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all"
                      >
                        <XCircle size={14} /> Request Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuperAdminApprovals;