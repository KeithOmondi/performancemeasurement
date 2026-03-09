import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  submitIndicatorProgress,
  resubmitIndicatorProgress,
} from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import toast from "react-hot-toast";

interface SubmissionModalProps {
  task: any | null;
  onClose: () => void;
}

const SubmissionModal = ({ task, onClose }: SubmissionModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { uploading } = useSelector((state: RootState) => state.userIndicators);

  // Changed from single file to array for multi-upload support
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [success, setSuccess] = useState(false);

  const currentPeriodSubmission = useMemo(() => {
    return task?.submissions?.find((s: any) =>
      task.reportingCycle === "Annual"
        ? s.quarter === 1
        : s.quarter === selectedQuarter,
    );
  }, [task, selectedQuarter]);

  const isRejected = currentPeriodSubmission?.reviewStatus === "Rejected";
  const isPending = currentPeriodSubmission?.reviewStatus === "Pending";
  const isAccepted = currentPeriodSubmission?.reviewStatus === "Accepted";

  if (!task) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || files.length === 0) {
      return toast.error(
        "Please provide both notes and at least one evidence file.",
      );
    }

    const formData = new FormData();
    // Use the key "evidence" for all files - Multer upload.array("evidence") expects this
    files.forEach((file) => {
      formData.append("evidence", file);
    });

    formData.append("notes", notes.trim());
    formData.append(
      "quarter",
      task.reportingCycle === "Annual" ? "1" : selectedQuarter.toString(),
    );

    let result;
    if (isRejected) {
      result = await dispatch(
        resubmitIndicatorProgress({
          indicatorId: task._id,
          submissionId: currentPeriodSubmission._id,
          formData,
        }),
      );
    } else {
      result = await dispatch(
        submitIndicatorProgress({ id: task._id, formData }),
      );
    }

    if (
      submitIndicatorProgress.fulfilled.match(result) ||
      resubmitIndicatorProgress.fulfilled.match(result)
    ) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1d3331]/40 backdrop-blur-md flex items-center justify-center p-4 z-[300] animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-50 flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black text-[#1d3331]">
              {isRejected ? "Fix Resubmission" : "Submit Evidence"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Ref:{" "}
              <span className="text-emerald-600 font-bold">
                {task.objectiveTitle}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {success ? (
            <div className="py-12 text-center space-y-4">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <h4 className="text-xl font-bold text-[#1d3331]">
                Update Received
              </h4>
              <p className="text-slate-500">
                Registry records have been updated for verification.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {isRejected && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                  <AlertCircle className="text-red-500 shrink-0" size={18} />
                  <div className="space-y-1">
                    <p className="text-[11px] text-red-700 font-black uppercase">
                      Rejection Feedback
                    </p>
                    <p className="text-[12px] text-red-600 leading-tight italic">
                      "{currentPeriodSubmission.adminComment}"
                    </p>
                  </div>
                </div>
              )}

              {task.reportingCycle === "Quarterly" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Select Quarter
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((q) => {
                      const sub = task.submissions?.find(
                        (s: any) => s.quarter === q,
                      );
                      const locked =
                        sub?.reviewStatus === "Pending" ||
                        sub?.reviewStatus === "Accepted";
                      return (
                        <button
                          key={q}
                          type="button"
                          disabled={locked}
                          onClick={() => setSelectedQuarter(q)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            locked
                              ? "bg-slate-50 text-slate-300 border-slate-100"
                              : selectedQuarter === q
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          Q{q} {sub?.reviewStatus === "Accepted" && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Evidence (Multiple Allowed)
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div
                    className={`border-2 border-dashed rounded-3xl p-6 text-center ${files.length > 0 ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                  >
                    <Upload className="mx-auto mb-2 text-slate-300" size={24} />
                    <p className="text-xs font-bold text-slate-600">
                      {files.length > 0
                        ? `${files.length} files selected`
                        : "Upload Documents (Images, PDFs, Video)"}
                    </p>
                  </div>
                </div>

                {/* File List Preview */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-50 p-2 px-4 rounded-xl border border-slate-100"
                      >
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[80%]">
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Progress Remarks
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isRejected
                      ? "Explain the fixes made based on feedback..."
                      : "Describe achievements..."
                  }
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <button
                disabled={uploading || isPending || isAccepted}
                className="w-full bg-[#1d3331] text-white py-4 rounded-2xl font-bold hover:bg-emerald-900 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <FileText size={20} />
                )}
                {isRejected ? "Update & Resubmit" : "Submit for Approval"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionModal;
