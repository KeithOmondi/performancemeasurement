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
  AlertCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchSuperAdminApprovedIndicators,
  superAdminReview,
  type IIndicator,
  type ISuperAdminReviewPayload,
} from "../../store/slices/indicatorSlice";
import { toast } from "react-hot-toast";

interface ApprovalIndicator extends IIndicator {
  verifiedByAdmin?: string;
  verifiedAt?: string;
  adminComment?: string;
  submittedValue?: number;
  submissionId?: string;
}

// Define error type for better type safety
interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const SuperAdminApprovals = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCycle, setFilterCycle] = useState<"all" | "quarterly" | "annual">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { superAdminApprovedIndicators, loading } = useAppSelector(
    (state) => state.indicators
  );

  useEffect(() => {
    dispatch(fetchSuperAdminApprovedIndicators());
  }, [dispatch]);

  // Transform indicators to include admin verification info
  const pendingApprovals = useMemo<ApprovalIndicator[]>(() => {
    const approvals: ApprovalIndicator[] = [];

    superAdminApprovedIndicators.forEach((ind) => {
      // Only show indicators awaiting Super Admin review
      if (ind.status === "Awaiting Super Admin") {
        // Find the admin verification event from review history
        const adminReviewEvent = ind.reviewHistory?.find(
          (h) => h.action === "Verified" && h.reviewerRole === "admin"
        );
        
        // Find the verified submission
        const verifiedSubmission = ind.submissions?.find(
          (s) => s.reviewStatus === "Verified" && s.isReviewed === true
        );

        approvals.push({
          ...ind,
          verifiedByAdmin: adminReviewEvent?.reviewedByName || verifiedSubmission?.adminComment ? "Admin" : undefined,
          verifiedAt: adminReviewEvent?.at || verifiedSubmission?.submittedAt,
          adminComment: verifiedSubmission?.adminComment,
          submittedValue: verifiedSubmission?.achievedValue,
          submissionId: verifiedSubmission?.id,
        });
      }
    });

    // Sort by most recently verified first
    return approvals.sort(
      (a, b) =>
        new Date(b.verifiedAt || "").getTime() -
        new Date(a.verifiedAt || "").getTime()
    );
  }, [superAdminApprovedIndicators]);

  const handleSuperAdminDecision = async (
    indicator: ApprovalIndicator,
    decision: "Approved" | "Rejected",
    progressOverride?: number
  ) => {
    if (decision === "Approved" && (progressOverride === undefined || progressOverride === null)) {
      toast.error("Please enter the achieved value before approving.");
      return;
    }

    setProcessingId(indicator.id);
    
    try {
      let reason: string | undefined;
      
      if (decision === "Rejected") {
        const promptResult = prompt("Please provide a reason for rejection:");
        if (!promptResult || promptResult.trim() === "") {
          toast.error("Please provide a reason for rejection.");
          setProcessingId(null);
          return;
        }
        reason = promptResult;
      }

      const reviewData: ISuperAdminReviewPayload = {
        decision,
        progressOverride: progressOverride || 0,
        reason,
      };

      await dispatch(superAdminReview({ id: indicator.id, reviewData })).unwrap();
      
      toast.success(
        decision === "Approved" 
          ? "Indicator successfully certified and completed!" 
          : "Changes requested successfully. User has been notified."
      );
      
      // Refresh the list
      dispatch(fetchSuperAdminApprovedIndicators());
    } catch (error) {
      // Type-safe error handling
      let errorMessage = `Failed to ${decision === "Approved" ? "approve" : "request changes"}`;
      
      if (error && typeof error === 'object') {
        const apiError = error as ApiError;
        if (apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApprovals = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return pendingApprovals.filter((ind) => {
      if (filterCycle === "quarterly" && ind.reportingCycle !== "Quarterly") return false;
      if (filterCycle === "annual" && ind.reportingCycle !== "Annual") return false;
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
      : date.toLocaleDateString() +
          " " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
              Admin-verified submissions awaiting your final certification
            </p>
          </div>

          <div className="relative">
            <FileSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
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
            Quarterly (
            {pendingApprovals.filter((i) => i.reportingCycle === "Quarterly").length})
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
            Annual (
            {pendingApprovals.filter((i) => i.reportingCycle === "Annual").length})
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
            const latestSubmission = indicator.submissions?.find(
              (s) => s.reviewStatus === "Verified"
            );
            const resubmissionCount = latestSubmission?.resubmissionCount ?? 0;
            const achievedValue =
              indicator.submittedValue ?? latestSubmission?.achievedValue ?? 0;
            
            // Determine if this is the final quarter for Quarterly reports
            const isFinalQuarter = !isAnnual && indicator.activeQuarter === 4;
            const willComplete = isAnnual || isFinalQuarter;

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
                          {isAnnual ? (
                            <CalendarDays size={10} />
                          ) : (
                            <Layers size={10} />
                          )}
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

                        {!willComplete && indicator.reportingCycle === "Quarterly" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                            <AlertCircle size={10} />
                            Q{indicator.activeQuarter} of 4
                          </span>
                        )}

                        {willComplete && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle size={10} />
                            Final Certification
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-[#1d3331] leading-tight mb-2">
                        {indicator.activityDescription ||
                          indicator.objectiveTitle ||
                          "Untitled Activity"}
                      </h3>

                      {/* Performance */}
                      <div className="flex flex-wrap items-center gap-6 mb-3">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            Submitted Value
                          </p>
                          <p className="text-lg font-bold text-emerald-600">
                            {achievedValue}
                            <span className="text-xs font-normal text-slate-400 ml-1">
                              {indicator.unit || "%"}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            Annual Target
                          </p>
                          <p className="text-sm font-bold text-[#1d3331]">
                            {indicator.target} {indicator.unit || "%"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            Overall Progress
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${indicator.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">
                              {indicator.progress || 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quarter Info for Quarterly Reports */}
                      {!isAnnual && (
                        <div className="mb-3 p-2 bg-blue-50 rounded-lg inline-block">
                          <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                            Reporting Period: Q{indicator.activeQuarter} •{" "}
                            {new Date().getFullYear()}
                          </p>
                        </div>
                      )}

                      {/* Admin Verification Info */}
                      <div className="flex flex-wrap items-center gap-4 text-[10px] mb-3">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-700">
                            Assignee:{" "}
                            {indicator.assigneeDisplayName || "Unassigned"}
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
                        Submission ID:{" "}
                        {indicator.submissionId?.slice(-12).toUpperCase() || "N/A"}
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-row lg:flex-col items-center gap-3 min-w-[160px]">
                      <button
                        onClick={() => navigate(`/super-admin/approvals/${indicator.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                      >
                        <Eye size={14} /> Review Details
                      </button>

                      <button
                        onClick={() => {
                          const value = prompt(
                            `Enter the achieved value for approval:\n\nTarget: ${indicator.target} ${indicator.unit}\nSubmitted: ${achievedValue} ${indicator.unit}\n\nNote: This will be added to the cumulative progress.`,
                            String(achievedValue)
                          );
                          if (value !== null && !isNaN(Number(value))) {
                            handleSuperAdminDecision(indicator, "Approved", Number(value));
                          } else if (value !== null) {
                            toast.error("Please enter a valid number");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={processingId === indicator.id}
                      >
                        {processingId === indicator.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        {willComplete ? "Approve & Complete" : "Approve & Continue"}
                      </button>

                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[8px] text-slate-300">or</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      <button
                        onClick={() => handleSuperAdminDecision(indicator, "Rejected")}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={processingId === indicator.id}
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