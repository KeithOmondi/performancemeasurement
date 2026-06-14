import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  User,
  Clock,
  AlertOctagon,
  ShieldAlert,
  CalendarDays,
  Layers,
  FileSearch,
  AlertCircle,
  Eye,
  Trash2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchIndicators,
  fetchRejectedByAdmin,
  deleteSubmission,
  type IIndicator,
  type ISubmission,
} from "../../store/slices/indicatorSlice";

interface RejectedSubmission {
  id: string;
  indicatorId: string;
  indicator: IIndicator;
  rejectionType: "Admin" | "Super Admin";
  rejectionReason: string;
  rejectedAt: string;
  quarter: number;
  year: number;
  achievedValue: number;
  documentsCount: number;
  resubmissionCount: number;
}

const SuperAdminRejected = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "admin" | "super-admin">("all");
  const [deleteTarget, setDeleteTarget] = useState<{ submissionId: string; indicatorId: string; title: string } | null>(null);

  const { indicators, rejectedByAdmin, loading, actionLoading } = useAppSelector(
    (state) => state.indicators
  );

  useEffect(() => {
    dispatch(fetchIndicators());
    dispatch(fetchRejectedByAdmin());
  }, [dispatch]);

  // Extract rejection info from an indicator, optionally using a specific submission
  const extractRejection = (
    indicator: IIndicator,
    submission?: ISubmission
  ): RejectedSubmission | null => {
    let rejectionType: "Admin" | "Super Admin" | null = null;
    let rejectionReason = "";
    let rejectedAt = "";
    const targetSubmission = submission; // ✅ const, not let
    let quarter = 0;
    let year = new Date().getFullYear();
    let achievedValue = 0;
    let documentsCount = 0;
    let resubmissionCount = 0;

    const history = indicator.reviewHistory || [];

    // 1. Look for Super Admin rejection in history
    const superRejection = [...history]
      .filter((h) => h.action === "Rejected" && h.reviewerRole === "superadmin")
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];

    // 2. Look for Admin correction request in history
    const adminCorrection = [...history]
      .filter((h) => h.action === "Correction Requested" && h.reviewerRole === "admin")
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];

    if (superRejection) {
      rejectionType = "Super Admin";
      rejectionReason = superRejection.reason || "No reason provided";
      rejectedAt = superRejection.at;
      if (targetSubmission) {
        quarter = targetSubmission.quarter;
        year = targetSubmission.year;
        achievedValue = targetSubmission.achievedValue;
        documentsCount = targetSubmission.documents?.length || 0;
        resubmissionCount = targetSubmission.resubmissionCount || 0;
      } else {
        quarter = superRejection.quarter || indicator.activeQuarter || 1;
        year = superRejection.year || new Date().getFullYear();
      }
    } else if (adminCorrection) {
      rejectionType = "Admin";
      rejectionReason = adminCorrection.reason || "Correction requested";
      rejectedAt = adminCorrection.at;
      if (targetSubmission) {
        quarter = targetSubmission.quarter;
        year = targetSubmission.year;
        achievedValue = targetSubmission.achievedValue;
        documentsCount = targetSubmission.documents?.length || 0;
        resubmissionCount = targetSubmission.resubmissionCount || 0;
      } else {
        quarter = adminCorrection.quarter || indicator.activeQuarter || 1;
        year = adminCorrection.year || new Date().getFullYear();
      }
    }
    // 3. Fallback: if submission is marked as Rejected but no history entry
    else if (targetSubmission?.reviewStatus === "Rejected") {
      rejectionType = "Admin";
      rejectionReason = targetSubmission.adminComment || "No reason provided";
      rejectedAt = targetSubmission.submittedAt;
      quarter = targetSubmission.quarter;
      year = targetSubmission.year;
      achievedValue = targetSubmission.achievedValue;
      documentsCount = targetSubmission.documents?.length || 0;
      resubmissionCount = targetSubmission.resubmissionCount || 0;
    }

    if (!rejectionType) return null;

    const submissionId = targetSubmission?.id || `history-${indicator.id}-${rejectedAt}`;
    return {
      id: submissionId,
      indicatorId: indicator.id,
      indicator,
      rejectionType,
      rejectionReason,
      rejectedAt,
      quarter,
      year,
      achievedValue,
      documentsCount,
      resubmissionCount,
    };
  };

  // Build complete list using both rejectedByAdmin and all indicators
  const rejectedSubmissions = useMemo<RejectedSubmission[]>(() => {
    const results: RejectedSubmission[] = [];
    const processed = new Set<string>();

    // 1. Process rejectedByAdmin (trusted source for Admin rejections)
    rejectedByAdmin.forEach((indicator) => {
      processed.add(indicator.id);
      const submissions = indicator.submissions || [];
      if (submissions.length === 0) {
        const extracted = extractRejection(indicator);
        if (extracted) results.push(extracted);
      } else {
        submissions.forEach((sub) => {
          const extracted = extractRejection(indicator, sub);
          if (extracted) results.push(extracted);
        });
      }
    });

    // 2. Process all indicators for Super Admin rejections and any missed Admin ones
    indicators.forEach((indicator) => {
      if (processed.has(indicator.id)) return;

      // Check indicator status for Super Admin rejection
      if (indicator.status === "Rejected by Super Admin") {
        const extracted = extractRejection(indicator);
        if (extracted) results.push(extracted);
        return;
      }

      // Check submissions for explicit Rejected status
      const submissions = indicator.submissions || [];
      submissions.forEach((sub) => {
        if (sub.reviewStatus === "Rejected") {
          const extracted = extractRejection(indicator, sub);
          if (extracted) results.push(extracted);
        }
      });
    });

    // Sort by most recent rejection
    return results.sort(
      (a, b) => new Date(b.rejectedAt).getTime() - new Date(a.rejectedAt).getTime()
    );
  }, [indicators, rejectedByAdmin]);

  // Apply search and type filters
  const filteredRejected = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return rejectedSubmissions.filter((item) => {
      if (filterType === "admin" && item.rejectionType !== "Admin") return false;
      if (filterType === "super-admin" && item.rejectionType !== "Super Admin") return false;
      if (!searchTerm) return true;

      const ind = item.indicator;
      return (
        ind.activityDescription?.toLowerCase().includes(searchLower) ||
        ind.objectiveTitle?.toLowerCase().includes(searchLower) ||
        ind.assigneeDisplayName?.toLowerCase().includes(searchLower) ||
        item.rejectionReason.toLowerCase().includes(searchLower)
      );
    });
  }, [rejectedSubmissions, searchTerm, filterType]);

  const handleDeleteSubmission = async () => {
    if (!deleteTarget) return;
    await dispatch(
      deleteSubmission({
        submissionId: deleteTarget.submissionId,
        indicatorId: deleteTarget.indicatorId,
      })
    );
    setDeleteTarget(null);
    dispatch(fetchIndicators());
    dispatch(fetchRejectedByAdmin());
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (loading && indicators.length === 0 && rejectedByAdmin.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcfc]">
        <Loader2 className="animate-spin text-red-900 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-red-900">
          Loading Rejection Archive...
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
              REJECTION REGISTRY
              <span className="bg-red-600 text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">
                {filteredRejected.length} Rejected
              </span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
              Complete audit trail of every rejected submission (Admin & Super Admin)
            </p>
          </div>

          <div className="relative">
            <FileSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by activity, officer, or reason..."
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-red-600/5 w-full md:w-96 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => setFilterType("all")}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filterType === "all"
                ? "bg-[#1d3331] text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            All ({rejectedSubmissions.length})
          </button>
          <button
            onClick={() => setFilterType("admin")}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filterType === "admin"
                ? "bg-orange-600 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <AlertOctagon size={12} />
            Admin Rejections ({rejectedSubmissions.filter((i) => i.rejectionType === "Admin").length})
          </button>
          <button
            onClick={() => setFilterType("super-admin")}
            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filterType === "super-admin"
                ? "bg-red-600 text-white shadow-md"
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <ShieldAlert size={12} />
            Super Admin Rejections ({rejectedSubmissions.filter((i) => i.rejectionType === "Super Admin").length})
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredRejected.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          {searchTerm ? (
            <>
              <FileSearch className="mx-auto mb-4 text-gray-200" size={48} />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                No matches found for "{searchTerm}"
              </h2>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-xs font-bold text-red-600 underline"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <ShieldAlert className="mx-auto mb-4 text-gray-200" size={48} />
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                No Rejections Found
              </h2>
              <p className="text-[10px] text-slate-400 mt-2">
                Every submission has been properly reviewed and approved
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRejected.map((item) => {
            const indicator = item.indicator;
            const isAdminRejection = item.rejectionType === "Admin";
            const isAnnual = indicator.reportingCycle === "Annual";
            const isResubmission = item.resubmissionCount > 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden hover:shadow-lg ${
                  isAdminRejection
                    ? "border-orange-200 hover:border-orange-300"
                    : "border-red-200 hover:border-red-300"
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left Section - Main Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                            isAdminRejection
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {isAdminRejection ? <AlertOctagon size={10} /> : <ShieldAlert size={10} />}
                          Rejected by {item.rejectionType}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                            isAnnual
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {isAnnual ? <CalendarDays size={10} /> : <Layers size={10} />}
                          {indicator.reportingCycle} {!isAnnual && `Q${item.quarter}`}
                        </span>

                        {isResubmission && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-100">
                            🔁 Resubmission #{item.resubmissionCount}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#1d3331] leading-tight mb-2">
                        {indicator.activityDescription ||
                          indicator.objectiveTitle ||
                          "Untitled Activity"}
                      </h3>

                      <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">
                        {indicator.instructions || "No additional instructions provided"}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="font-bold text-slate-700">
                            {indicator.assigneeDisplayName || "Unassigned"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-slate-500">
                            Rejected: {formatDateTime(item.rejectedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-slate-400" />
                          <span className="text-slate-500">
                            Q{item.quarter} {item.year}
                          </span>
                        </div>
                        {item.documentsCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <FileSearch size={12} className="text-slate-400" />
                            <span className="text-slate-500">
                              {item.documentsCount} document{item.documentsCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rejection Reason */}
                      <div
                        className={`mt-4 p-3 rounded-xl border-l-4 ${
                          isAdminRejection
                            ? "bg-orange-50 border-orange-400"
                            : "bg-red-50 border-red-400"
                        }`}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-500">
                          Rejection Reason:
                        </p>
                        <p className="text-[11px] font-medium text-slate-700">
                          "{item.rejectionReason}"
                        </p>
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-row lg:flex-col items-center gap-2">
                      <button
                        onClick={() => navigate(`/super-admin/indicators/${indicator.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
                      >
                        <Eye size={14} /> View Dossier
                      </button>

                      <button
                        onClick={() => {
                          if (item.id && !item.id.startsWith("history-")) {
                            setDeleteTarget({
                              submissionId: item.id,
                              indicatorId: indicator.id,
                              title: indicator.activityDescription || "Submission",
                            });
                          } else {
                            alert(
                              "This rejection record is based on history only; the underlying submission may have been deleted."
                            );
                          }
                        }}
                        disabled={item.id.startsWith("history-")}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={12} /> Delete Submission
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d3331]/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => !actionLoading && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-red-600" />
            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={22} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1d3331] uppercase tracking-tight mb-1">
                    Delete Submission
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    This will permanently remove the submission and all its attached documents.
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Submission
                </p>
                <p className="text-sm font-bold text-[#1d3331] line-clamp-2">{deleteTarget.title}</p>
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
                  onClick={handleDeleteSubmission}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {actionLoading ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRejected;