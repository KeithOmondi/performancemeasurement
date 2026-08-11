import { useEffect, useState } from "react";
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
  ArrowLeft,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Video,
  File,
  ExternalLink,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchIndicatorById,
  clearSelectedIndicator,
  sendBackToAdmin,
  type IDocument,
  type ISubmission,
} from "../../store/slices/indicatorSlice";
import { toast } from "react-hot-toast";

interface SuperAdminApprovedModalProps {
  indicatorId: string;
  onClose: () => void;
}

interface PreviewDoc {
  url: string;
  name: string;
  type?: string;
  description?: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

const DocIcon = ({ fileType }: { fileType?: string }) => {
  if (fileType === "image") return <ImageIcon size={14} className="text-blue-400" />;
  if (fileType === "video") return <Video size={14} className="text-purple-400" />;
  return <File size={14} className="text-slate-400" />;
};

const SuperAdminApprovedModal = ({ indicatorId, onClose }: SuperAdminApprovedModalProps) => {
  const dispatch = useAppDispatch();
  const { selectedIndicator, detailLoading, actionLoading } = useAppSelector((state) => state.indicators);
  const [sendingBack, setSendingBack] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

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

  const openPreview = (doc: IDocument, idx: number) => {
    setPreviewDoc({
      url: doc.evidenceUrl,
      name: doc.fileName || `Document ${idx + 1}`,
      type: doc.fileType,
      description: doc.description,
    });
  };

  const handleSendBackToAdmin = async () => {
    if (!window.confirm(
      "This will send this indicator back to the admin queue for review. Continue?"
    )) {
      return;
    }
    
    setSendingBack(true);
    try {
      await dispatch(sendBackToAdmin({ 
        id: indicatorId, 
        reason: sendBackReason.trim() || "Sent back to admin for verification" 
      })).unwrap();
      toast.success("Indicator sent back to admin queue");
      await dispatch(fetchIndicatorById(indicatorId));
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send back to admin");
    } finally {
      setSendingBack(false);
    }
  };

  // ─── Helper: Get all submissions (handles both array and grouped object) ──
  const getAllSubmissions = (): ISubmission[] => {
    if (!selectedIndicator?.submissions) return [];
    
    // If it's already an array
    if (Array.isArray(selectedIndicator.submissions)) {
      return selectedIndicator.submissions;
    }
    
    // If it's a grouped object (Record<string, ISubmission[]>)
    const grouped = selectedIndicator.submissions as Record<string, ISubmission[]>;
    const result: ISubmission[] = [];
    for (const key of Object.keys(grouped)) {
      const subs = grouped[key];
      if (Array.isArray(subs)) {
        result.push(...subs);
      }
    }
    return result;
  };

  const allSubmissions = getAllSubmissions();

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

              {/* Send Back to Admin - For indicators awaiting admin approval */}
              {selectedIndicator.status === "Awaiting Admin Approval" && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-700">
                        Waiting for Admin Review
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        This indicator was reopened or sent back and needs admin verification before Super Admin review.
                      </p>
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={sendBackReason}
                          onChange={(e) => setSendBackReason(e.target.value)}
                          placeholder="Optional: Add a reason for sending back to admin..."
                          className="w-full resize-none rounded-lg border border-amber-200 text-xs p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                          rows={2}
                          disabled={sendingBack}
                        />
                        <button
                          onClick={handleSendBackToAdmin}
                          disabled={sendingBack || actionLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60"
                        >
                          {sendingBack ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ArrowLeft size={16} />
                          )}
                          Send Back to Admin Queue
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submissions Table with Document Details */}
              {allSubmissions.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Submitted Reports
                  </h3>
                  <div className="border border-slate-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[900px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-bold text-slate-500">Period</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Achieved</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Documents & Descriptions</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Review Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/50 align-top">
                            <td className="px-4 py-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                              Q{sub.quarter} {getYearFromDate(sub.submittedAt)}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                              {sub.achievedValue} {selectedIndicator.unit}
                            </td>
                            <td className="px-4 py-3">
                              {sub.documents && sub.documents.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {sub.documents.map((doc, idx) => (
                                    <button
                                      key={doc.id || idx}
                                      onClick={() => openPreview(doc, idx)}
                                      className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left w-full group"
                                    >
                                      <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-white flex items-center justify-center shrink-0 mt-0.5">
                                        <DocIcon fileType={doc.fileType} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-semibold text-slate-700 truncate">
                                          {doc.fileName || `Document ${idx + 1}`}
                                        </p>
                                        {doc.description && (
                                          <p className="text-[9px] text-slate-500 line-clamp-2 leading-snug">
                                            {doc.description}
                                          </p>
                                        )}
                                      </div>
                                      <ExternalLink size={10} className="text-slate-300 group-hover:text-emerald-600 shrink-0 mt-1" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">No documents</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                                  sub.reviewStatus === "Accepted"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : sub.reviewStatus === "Verified"
                                    ? "bg-blue-100 text-blue-700"
                                    : sub.reviewStatus === "Partially Approved"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {sub.reviewStatus}
                              </span>
                              {sub.adminComment && (
                                <p className="text-[8px] text-slate-400 mt-1 italic line-clamp-2">
                                  "{sub.adminComment}"
                                </p>
                              )}
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

  // ── Document Preview Modal ──────────────────────────────────────────────
  const previewContent = previewDoc && createPortal(
    <div
      className="fixed inset-0 z-[10000] flex flex-col bg-black/90"
      onClick={() => setPreviewDoc(null)}
    >
      <div
        className="flex items-center justify-between px-5 py-3 bg-[#1a3a32] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <DocIcon fileType={previewDoc.type} />
          <div>
            <p className="text-white text-sm font-semibold leading-tight">
              {previewDoc.name}
            </p>
            <p className="text-emerald-300 text-[9px] uppercase tracking-wider">
              {previewDoc.type ?? "document"}
            </p>
            {previewDoc.description && (
              <p className="text-emerald-100 text-[10px] mt-1 max-w-lg leading-snug">
                {previewDoc.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={previewDoc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={11} /> Open in new tab
          </a>
          <button
            onClick={() => setPreviewDoc(null)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4" onClick={(e) => e.stopPropagation()}>
        {previewDoc.type === "image" ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={previewDoc.url}
              alt={previewDoc.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        ) : (
          <iframe
            src={previewDoc.url}
            title={previewDoc.name}
            className="w-full h-full rounded-lg bg-white"
          />
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {modalContent}
      {previewContent}
    </>
  );
};

export default SuperAdminApprovedModal;