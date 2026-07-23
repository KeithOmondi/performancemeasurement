import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DeleteDocumentModalProps {
  documentId: string;
  fileName: string;
  indicatorId: string;
  onClose: () => void;
  onConfirm: (documentId: string, reason: string) => void;
}

const DeleteDocumentModal = ({
  documentId,
  fileName,
  onClose,
  onConfirm,
}: DeleteDocumentModalProps) => {
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

export default DeleteDocumentModal;