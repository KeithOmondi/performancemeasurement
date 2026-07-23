import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  X, CheckCircle2, FileText, Clock, ShieldCheck, ShieldAlert, 
  UserCheck, Calendar, ArrowRight, File, ChevronDown, ChevronUp,
  Eye, Trash2
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { 
  getIndicatorByIdAdmin, 
  setSelectedIndicator, 
  type ISubmission,
  getDocumentDescription,
  type IDocument,
  deleteDocumentAdmin      // ✅ imported
} from "../../store/slices/adminIndicatorSlice";
import FilePreviewModal from "../PreviewModal";

interface ApprovedIndicatorModalProps {
  indicatorId: string;
  onClose: () => void;
  isAdmin?: boolean;        // ✅ new prop to control delete visibility
}

// ─── Delete document modal (internal) ────────────────────────────────────────
const DeleteDocumentModal = ({
  documentId,
  fileName,
  onClose,
  onConfirm,
}: {
  documentId: string;
  fileName: string;
  indicatorId: string;
  onClose: () => void;
  onConfirm: (documentId: string, reason: string) => void;
}) => {
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide a reason for deletion.");
      return;
    }
    onConfirm(documentId, reason.trim());
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-slate-800">Delete Evidence</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          You are about to delete <strong>"{fileName}"</strong> from the submission.
          This action will mark it as deleted and the user will see the reason.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Deletion Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              rows={3}
              placeholder="Explain why this document is being deleted (e.g., duplicate, irrelevant, etc.)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
            >
              Delete Permanently
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const ApprovedIndicatorModal = ({ indicatorId, onClose, isAdmin = false }: ApprovedIndicatorModalProps) => {
  const dispatch = useAppDispatch();
  const { selectedIndicator, isLoading } = useAppSelector((state) => state.adminIndicators);
  const [expandedDocuments, setExpandedDocuments] = useState<Record<string, boolean>>({});
  const [previewDocument, setPreviewDocument] = useState<{ url: string; fileName: string } | null>(null);
  
  // State for delete modal
  const [deleteModal, setDeleteModal] = useState<{
    documentId: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    if (indicatorId) {
      dispatch(getIndicatorByIdAdmin(indicatorId));
    }
    return () => {
      dispatch(setSelectedIndicator(null));
    };
  }, [dispatch, indicatorId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const toggleDocumentExpand = (submissionId: string) => {
    setExpandedDocuments(prev => ({
      ...prev,
      [submissionId]: !prev[submissionId]
    }));
  };

  const handleDocumentClick = (doc: IDocument) => {
    // Allow preview only if the document is not marked as deleted
    if (doc.evidenceUrl && doc.status !== "Deleted") {
      setPreviewDocument({
        url: doc.evidenceUrl,
        fileName: doc.fileName
      });
    }
  };

  const openDeleteModal = (doc: IDocument) => {
    setDeleteModal({ documentId: doc.id, fileName: doc.fileName });
  };

  const closeDeleteModal = () => setDeleteModal(null);

  const handleDeleteConfirm = (documentId: string, reason: string) => {
    if (!selectedIndicator) return;
    dispatch(deleteDocumentAdmin({
      indicatorId: selectedIndicator.id,
      documentId,
      reason,
    })).then(() => {
      closeDeleteModal();
      // The thunk refetches the indicator, so state updates automatically
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !selectedIndicator ? (
          <div className="p-8 text-center">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Clock className="text-emerald-600 animate-spin" size={32} />
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Loading verified record...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">
                    Certified Performance Record
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
                  {selectedIndicator.activity?.description || "N/A"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase block mb-1">
                      Strategic Objective
                    </span>
                    <span className="text-slate-700">
                      {selectedIndicator.objective?.title || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase block mb-1">
                      Lead Officer
                    </span>
                    <div className="flex items-center gap-2">
                      <UserCheck size={12} className="text-emerald-600" />
                      <span className="text-slate-700">
                        {selectedIndicator.assigneeName}
                      </span>
                      {selectedIndicator.pjNumber && (
                        <span className="text-slate-400">
                          (PJ: {selectedIndicator.pjNumber})
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
                    {selectedIndicator.status === "Verified"
                      ? "Finally Certified"
                      : selectedIndicator.status}
                  </div>
                </div>
              </div>

              {/* Submissions Table with Document Descriptions */}
              {Object.values(selectedIndicator.submissions || {}).flat().length > 0 && (
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
                          <th className="px-4 py-3 font-bold text-slate-500">Submitted By</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Documents</th>
                          <th className="px-4 py-3 font-bold text-slate-500">Review Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(Object.values(selectedIndicator.submissions || {}) as ISubmission[][])
                          .flat()
                          .map((sub) => {
                            const isExpanded = expandedDocuments[sub.id] || false;
                            const hasDescriptions = sub.documents.some(doc => getDocumentDescription(doc) || doc.rejectionReason);
                            
                            return (
                              <tr key={sub.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-mono font-bold text-slate-600">
                                  Q{sub.quarter} {sub.year}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {sub.achievedValue} {selectedIndicator.unit}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <UserCheck size={12} className="text-slate-400 shrink-0" />
                                    <span className="text-slate-700 font-medium">
                                      {sub.submittedByName || 
                                        (sub.resubmissionCount > 0 ? "Resubmitted (name missing)" : "Unknown")}
                                    </span>
                                    {sub.resubmissionCount > 0 && (
                                      <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                        Resubmission #{sub.resubmissionCount}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-2">
                                    {/* Document List - Now Clickable */}
                                    <div className="flex flex-wrap gap-1">
                                      {sub.documents.map((doc) => {
                                        const isDeleted = doc.status === "Deleted";
                                        const isRejected = doc.status === "Rejected";
                                        const isAccepted = doc.status === "Accepted";
                                        
                                        // Style based on status
                                        let bgColor = "bg-slate-100 text-slate-400 hover:bg-slate-200";
                                        let icon = null;
                                        if (isAccepted) {
                                          bgColor = "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
                                          icon = <CheckCircle2 size={8} />;
                                        } else if (isRejected) {
                                          bgColor = "bg-red-100 text-red-700 hover:bg-red-200";
                                        } else if (isDeleted) {
                                          bgColor = "bg-gray-200 text-gray-500 line-through hover:bg-gray-300";
                                          icon = <Trash2 size={8} />;
                                        }
                                        
                                        const canPreview = !isDeleted && doc.evidenceUrl;
                                        
                                        return (
                                          <div key={doc.id} className="inline-flex items-center gap-1">
                                            <button
                                              onClick={() => canPreview && handleDocumentClick(doc)}
                                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-all hover:scale-105 ${bgColor} ${canPreview ? 'cursor-pointer' : 'cursor-default'}`}
                                              disabled={!canPreview}
                                              title={isDeleted ? `Deleted: ${doc.rejectionReason || "No reason provided"}` : (doc.evidenceUrl ? "Click to preview document" : "No document available")}
                                            >
                                              {icon}
                                              <span>{doc.fileName.split(".")[0].slice(0, 15)}</span>
                                              {isDeleted && (
                                                <span className="ml-0.5 text-[8px] bg-red-200 text-red-800 px-1 rounded-full">
                                                  DEL
                                                </span>
                                              )}
                                              {canPreview && <Eye size={8} className="ml-0.5" />}
                                            </button>
                                            {/* ✅ Delete button (only for admins and if not already deleted) */}
                                            {isAdmin && !isDeleted && (
                                              <button
                                                onClick={() => openDeleteModal(doc)}
                                                className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                                                title="Delete this evidence"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* Toggle button if there are descriptions or rejection reasons */}
                                    {hasDescriptions && (
                                      <button
                                        onClick={() => toggleDocumentExpand(sub.id)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp size={14} />
                                            Hide details
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown size={14} />
                                            Show document details
                                          </>
                                        )}
                                      </button>
                                    )}
                                    
                                    {/* Document Descriptions & Rejection Reasons */}
                                    {isExpanded && (
                                      <div className="mt-2 space-y-1.5 bg-slate-50 rounded-lg p-2">
                                        {sub.documents.map((doc) => {
                                          const description = getDocumentDescription(doc);
                                          const rejectionReason = doc.rejectionReason;
                                          const isDeleted = doc.status === "Deleted";
                                          const isRejected = doc.status === "Rejected";
                                          
                                          // Only show if there's something to display
                                          if (!description && !rejectionReason) return null;
                                          
                                          return (
                                            <div key={doc.id} className="flex items-start gap-2 text-[11px]">
                                              <File size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                              <div>
                                                <span className="font-medium text-slate-700">
                                                  {doc.fileName}:
                                                </span>
                                                {description && (
                                                  <span className="text-slate-600 ml-1">
                                                    {description}
                                                  </span>
                                                )}
                                                {(isDeleted || isRejected) && rejectionReason && (
                                                  <span className={`ml-2 text-[10px] font-bold uppercase ${isDeleted ? 'text-red-500' : 'text-amber-600'}`}>
                                                    ({isDeleted ? 'Deleted' : 'Rejected'}: {rejectionReason})
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                                      sub.reviewStatus === "Accepted" || sub.reviewStatus === "Verified"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : sub.reviewStatus === "Rejected"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {sub.reviewStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Review History Timeline */}
              {selectedIndicator.reviewHistory &&
                selectedIndicator.reviewHistory.length > 0 && (
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
                                  by {entry.reviewerName || entry.reviewerRole}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400">
                                {new Date(entry.at).toLocaleString()}
                              </span>
                            </div>
                            {entry.reason && (
                              <p className="text-[11px] text-slate-600 mt-1">
                                {entry.reason}
                              </p>
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

  return (
    <>
      {createPortal(modalContent, document.body)}
      
      {/* File Preview Modal */}
      {previewDocument && (
        <FilePreviewModal
          url={previewDocument.url}
          fileName={previewDocument.fileName}
          onClose={() => setPreviewDocument(null)}
        />
      )}

      {/* Delete Document Modal */}
      {deleteModal && (
        <DeleteDocumentModal
          documentId={deleteModal.documentId}
          fileName={deleteModal.fileName}
          indicatorId={selectedIndicator?.id || ""}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
};

export default ApprovedIndicatorModal;