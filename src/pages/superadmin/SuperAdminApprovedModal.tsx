import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchIndicatorById, clearSelectedIndicator } from "../../store/slices/indicatorSlice";

interface SuperAdminApprovedModalProps {
  indicatorId: string;
  onClose: () => void;
}

const SuperAdminApprovedModal = ({ indicatorId, onClose }: SuperAdminApprovedModalProps) => {
  const dispatch = useAppDispatch();
  const { selectedIndicator, detailLoading } = useAppSelector((state) => state.indicators);

  useEffect(() => {
    if (indicatorId) {
      dispatch(fetchIndicatorById(indicatorId));
    }
    return () => {
      dispatch(clearSelectedIndicator());
    };
  }, [dispatch, indicatorId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const getYearFromDate = (dateStr: string) => new Date(dateStr).getFullYear();

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {detailLoading || !selectedIndicator ? (
          <div className="p-8 text-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Clock className="text-emerald-600 animate-spin" size={32} />
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Loading certified record...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">
                    Finally Certified Record
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Ref: {selectedIndicator.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Activity Dossier */}
              <div className="bg-emerald-50/30 rounded-xl p-5 border border-emerald-100">
                <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <FileText size={14} /> Activity Dossier
                </h3>
                <p className="text-slate-700 text-sm font-medium mb-4">
                  {selectedIndicator.activityDescription || "N/A"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block mb-1">
                      Strategic Objective
                    </span>
                    <span className="text-slate-700">
                      {selectedIndicator.objectiveTitle || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block mb-1">
                      Lead Officer
                    </span>
                    <div className="flex items-center gap-2">
                      <UserCheck size={12} className="text-emerald-600" />
                      <span className="text-slate-700">
                        {selectedIndicator.assigneeDisplayName || "Unassigned"}
                      </span>
                      {selectedIndicator.assigneePjNumber && (
                        <span className="text-slate-400">
                          (PJ: {selectedIndicator.assigneePjNumber})
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block mb-1">
                      Instructions
                    </span>
                    <span className="text-slate-700">
                      {selectedIndicator.instructions || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress & Targets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    Performance Target
                  </h3>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-black text-slate-800">
                      {selectedIndicator.target} {selectedIndicator.unit}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Achieved: {selectedIndicator.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${selectedIndicator.progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>
                      Deadline:{" "}
                      {new Date(selectedIndicator.deadline).toLocaleDateString()}
                    </span>
                    <span>
                      Cycle: {selectedIndicator.reportingCycle}{" "}
                      {selectedIndicator.activeQuarter && `Q${selectedIndicator.activeQuarter}`}
                    </span>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    Certification Status
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span className="text-sm font-bold text-slate-700">
                        Admin Registry
                      </span>
                    </div>
                    <ArrowRight size={12} className="text-slate-300" />
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className="text-emerald-600" />
                      <span className="text-sm font-bold text-slate-700">
                        Super Admin Certification
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full text-emerald-700 text-[10px] font-black uppercase">
                    <CheckCircle2 size={10} />
                    {selectedIndicator.status === "Completed"
                      ? "Finally Certified"
                      : selectedIndicator.status}
                  </div>
                </div>
              </div>

              {/* Submissions Table (using only existing fields) */}
              {selectedIndicator.submissions && selectedIndicator.submissions.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Submitted Reports
                  </h3>
                  <div className="border border-slate-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-500">Period</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Achieved</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Documents</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Review Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedIndicator.submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono font-bold text-slate-600">
                              Q{sub.quarter} {getYearFromDate(sub.submittedAt)}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {sub.achievedValue} {selectedIndicator.unit}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {sub.documents.map((doc) => (
                                  <span
                                    key={doc.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600"
                                  >
                                    {doc.fileName?.split(".")[0].slice(0, 12) || "Document"}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                                  sub.reviewStatus === "Accepted"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : sub.reviewStatus === "Verified"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {sub.reviewStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Review History Timeline */}
              {selectedIndicator.reviewHistory && selectedIndicator.reviewHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
                    Approval Trail
                  </h3>
                  <div className="space-y-3">
                    {selectedIndicator.reviewHistory.map((entry) => (
                      <div key={entry.id} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {entry.reviewerRole === "admin" ? (
                            <ShieldCheck size={14} className="text-slate-500" />
                          ) : (
                            <ShieldAlert size={14} className="text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-black uppercase text-slate-700">
                                {entry.action}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-2">
                                by {entry.reviewedByName || entry.reviewerRole}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400">
                              {new Date(entry.at).toLocaleString()}
                            </span>
                          </div>
                          {entry.reason && (
                            <p className="text-[11px] text-slate-600 mt-1">{entry.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SuperAdminApprovedModal;