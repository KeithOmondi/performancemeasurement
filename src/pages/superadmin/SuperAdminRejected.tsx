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
} from "../../store/slices/indicatorSlice";

interface RejectedIndicator extends IIndicator {
  rejectionType: "Admin" | "Super Admin";
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedQuarter?: string;
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
    // Fetch all indicators and rejected by admin specifically
    dispatch(fetchIndicators());
    dispatch(fetchRejectedByAdmin());
  }, [dispatch]);

  // Combine and process rejected indicators from both sources
  const rejectedIndicators = useMemo<RejectedIndicator[]>(() => {
    const allRejected: RejectedIndicator[] = [];

    // Process indicators rejected by admin
    rejectedByAdmin.forEach((ind) => {
      // Find the latest rejection from review history
      const rejectionEvent = ind.reviewHistory?.find(
        (h) => h.action === "Correction Requested" && h.reviewerRole === "admin"
      );
      
      // Find the rejected submission
      const rejectedSubmission = ind.submissions?.find(
        (s) => s.reviewStatus === "Rejected"
      );

      allRejected.push({
        ...ind,
        rejectionType: "Admin",
        rejectionReason: rejectionEvent?.reason || ind.adminOverallComments,
        rejectedAt: rejectionEvent?.at || ind.updatedAt,
        rejectedQuarter: rejectedSubmission 
          ? `Q${rejectedSubmission.quarter} ${new Date().getFullYear()}`
          : undefined,
      });
    });

    // Process indicators rejected by super admin (from main indicators list)
    indicators.forEach((ind) => {
      if (ind.status === "Rejected by Super Admin") {
        // Check if already added from rejectedByAdmin
        if (!allRejected.some((r) => r.id === ind.id)) {
          const rejectionEvent = ind.reviewHistory?.find(
            (h) => h.action === "Rejected" && h.reviewerRole === "superadmin"
          );
          
          const rejectedSubmission = ind.submissions?.find(
            (s) => s.reviewStatus === "Rejected"
          );

          allRejected.push({
            ...ind,
            rejectionType: "Super Admin",
            rejectionReason: rejectionEvent?.reason || ind.adminOverallComments,
            rejectedAt: rejectionEvent?.at || ind.updatedAt,
            rejectedQuarter: rejectedSubmission 
              ? `Q${rejectedSubmission.quarter} ${new Date().getFullYear()}`
              : undefined,
          });
        }
      }
    });

    // Sort by most recent first
    return allRejected.sort(
      (a, b) => new Date(b.rejectedAt || "").getTime() - new Date(a.rejectedAt || "").getTime()
    );
  }, [indicators, rejectedByAdmin]);

  // Filter based on search and type
  const filteredRejected = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return rejectedIndicators.filter((ind) => {
      // Apply type filter
      if (filterType === "admin" && ind.rejectionType !== "Admin") return false;
      if (filterType === "super-admin" && ind.rejectionType !== "Super Admin") return false;
      
      // Apply search filter
      if (!searchTerm) return true;
      
      return (
        ind.activityDescription?.toLowerCase().includes(searchLower) ||
        ind.objectiveTitle?.toLowerCase().includes(searchLower) ||
        ind.assigneeDisplayName?.toLowerCase().includes(searchLower) ||
        ind.rejectionReason?.toLowerCase().includes(searchLower)
      );
    });
  }, [rejectedIndicators, searchTerm, filterType]);

  const handleDeleteSubmission = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteSubmission({
      submissionId: deleteTarget.submissionId,
      indicatorId: deleteTarget.indicatorId,
    }));
    setDeleteTarget(null);
    // Refresh data
    dispatch(fetchIndicators());
    dispatch(fetchRejectedByAdmin());
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  if (loading && rejectedIndicators.length === 0) {
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
              Complete record of all rejected submissions across all cycles
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
            All ({rejectedIndicators.length})
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
            Rejected by Admin ({rejectedIndicators.filter(i => i.rejectionType === "Admin").length})
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
            Rejected by Super Admin ({rejectedIndicators.filter(i => i.rejectionType === "Super Admin").length})
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
                All submissions have been properly reviewed and approved
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRejected.map((indicator) => {
            const isAdminRejection = indicator.rejectionType === "Admin";
            const isAnnual = indicator.reportingCycle === "Annual";
            
            return (
              <div
                key={indicator.id}
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
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                            isAdminRejection
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {isAdminRejection ? (
                            <AlertOctagon size={10} />
                          ) : (
                            <ShieldAlert size={10} />
                          )}
                          Rejected by {indicator.rejectionType}
                        </span>
                        
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                            isAnnual
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {isAnnual ? <CalendarDays size={10} /> : <Layers size={10} />}
                          {indicator.reportingCycle}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#1d3331] leading-tight mb-2">
                        {indicator.activityDescription || indicator.objectiveTitle || "Untitled Activity"}
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
                            Rejected: {formatDate(indicator.rejectedAt)}
                          </span>
                        </div>
                        {indicator.rejectedQuarter && (
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-slate-400" />
                            <span className="text-slate-500">
                              {indicator.rejectedQuarter}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rejection Reason */}
                      {indicator.rejectionReason && (
                        <div className={`mt-4 p-3 rounded-xl border-l-4 ${
                          isAdminRejection
                            ? "bg-orange-50 border-orange-400"
                            : "bg-red-50 border-red-400"
                        }`}>
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-500">
                            Rejection Reason:
                          </p>
                          <p className="text-[11px] font-medium text-slate-700">
                            "{indicator.rejectionReason}"
                          </p>
                        </div>
                      )}
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
                          const submissionId = indicator.submissions?.[0]?.id;
                          if (submissionId) {
                            setDeleteTarget({
                              submissionId,
                              indicatorId: indicator.id,
                              title: indicator.activityDescription || "Submission",
                            });
                          }
                        }}
                        disabled={!indicator.submissions?.length}
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
                    This will permanently remove the submission and all its attached documents. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Submission</p>
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