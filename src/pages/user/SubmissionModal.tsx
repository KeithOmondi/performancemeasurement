import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X, Upload, CheckCircle2, Loader2, AlertCircle,
  Trash2, ShieldCheck, FileText, Users,
  RefreshCw, PlusCircle, Clock, AlertTriangle
} from "lucide-react";
import {
  submitIndicatorProgress,
  resubmitIndicatorProgress,
  addIndicatorDocuments,
  updateRejectedSubmission,
  getActiveQuarterDisplay,
} from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import {
  type IIndicatorUI,
  type ISubmissionUI,
} from "../../store/slices/userIndicatorSlice";
import toast from "react-hot-toast";

interface SubmissionModalProps {
  task: IIndicatorUI | null;
  onClose: () => void;
  existingSubmission?: ISubmissionUI;
}

interface ExtendedFile {
  file: File;
  description: string;
  previewUrl?: string;
}

type SubmitMode = "replace" | "append";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf", "video/mp4"];
const MAX_DESCRIPTION_LENGTH = 500;

const SubmissionModal = ({ task, onClose, existingSubmission }: SubmissionModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { uploading } = useSelector((state: RootState) => state.userIndicators);

  const isAnnual = task?.reporting_cycle === "Annual";
  const isTeam = task?.assignee_model === "Team";

  const getInitialQuarter = useCallback(() => {
    if (existingSubmission?.reviewStatus === "Rejected") {
      return existingSubmission.quarter === 0 ? "Annual" : `Q${existingSubmission.quarter}`;
    }
    return isAnnual ? "Annual" : (task ? getActiveQuarterDisplay(task) : "Q1");
  }, [existingSubmission, isAnnual, task]);

  const [selectedQuarter, setSelectedQuarter] = useState<string>(getInitialQuarter);
  const [fileEntries, setFileEntries] = useState<ExtendedFile[]>([]);
  const [success, setSuccess] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("replace");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const getSubmissionForQuarter = useCallback((quarter: string): ISubmissionUI | undefined => {
    if (!task?.submissions) return undefined;
    const currentYear = new Date().getFullYear();
    const quarterKey = `${quarter}_${currentYear}`;
    const submissions = task.submissions[quarterKey];
    return submissions?.[0];
  }, [task]);

  const currentPeriodSubmission = useMemo<ISubmissionUI | undefined>(
    () => getSubmissionForQuarter(selectedQuarter),
    [selectedQuarter, getSubmissionForQuarter]
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    const currentFiles = [...fileEntries];
    return () => {
      currentFiles.forEach(entry => {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      });
    };
  }, [fileEntries]);

  const isRejected = currentPeriodSubmission?.reviewStatus === "Rejected";
  const isAccepted = currentPeriodSubmission?.reviewStatus === "Accepted";
  const showModeSwitcher = !!currentPeriodSubmission && !isAccepted;

  const handleQuarterChange = useCallback((q: string) => {
    setSelectedQuarter(q);
    setFileEntries([]);
    setSubmitMode("replace");
    setValidationErrors({});
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type not allowed. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    return null;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles: ExtendedFile[] = [];
    const errors: string[] = [];

    Array.from(e.target.files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        newFiles.push({
          file,
          description: "",
          previewUrl: URL.createObjectURL(file),
        });
      }
    });

    if (errors.length > 0) toast.error(errors.join("\n"));
    if (newFiles.length > 0) {
      setFileEntries((prev) => [...prev, ...newFiles].slice(0, 50));
      // Clear files error as soon as files are added
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next.files;
        return next;
      });
    }
  }, [validateFile]);

  const updateFileDescription = useCallback((index: number, text: string) => {
    if (text.length > MAX_DESCRIPTION_LENGTH) {
      setValidationErrors(prev => ({
        ...prev,
        [`desc_${index}`]: `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      }));
    } else {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[`desc_${index}`];
        delete next.descriptions;
        return next;
      });
    }
    setFileEntries((prev) =>
      prev.map((item, i) => (i === index ? { ...item, description: text.slice(0, MAX_DESCRIPTION_LENGTH) } : item))
    );
  }, []);

  const removeFile = useCallback((index: number) => {
    const entry = fileEntries[index];
    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next[`desc_${index}`];
      return next;
    });
  }, [fileEntries]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (fileEntries.length === 0) {
      errors.files = "At least one evidence file is required";
    } else {
      fileEntries.forEach((f, i) => {
        if (!f.description.trim()) {
          errors[`desc_${i}`] = "Description is required";
        }
      });
      if (fileEntries.some((f) => !f.description.trim())) {
        errors.descriptions = "Please provide a description for every document";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fileEntries]);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    toast.error("Please fix the validation errors");
    return;
  }

  const formData = new FormData();
  const year = new Date().getFullYear();
  formData.append("quarter", selectedQuarter);
  formData.append("year", String(year));

  try {
    if (submitMode === "replace") {
      formData.append("notes", "-");
      formData.append("achievedValue", "0");

      fileEntries.forEach((entry) => {
        formData.append("documents", entry.file);
        formData.append("descriptions", entry.description.trim());
      });

      let result;

      if (existingSubmission && existingSubmission.reviewStatus === "Rejected") {
        result = await dispatch(updateRejectedSubmission({ id: task!.id, formData }));
      } else if (currentPeriodSubmission) {
        result = await dispatch(resubmitIndicatorProgress({ id: task!.id, formData }));
      } else {
        result = await dispatch(submitIndicatorProgress({ id: task!.id, formData }));
      }

      if (
        submitIndicatorProgress.rejected.match(result) ||
        resubmitIndicatorProgress.rejected.match(result) ||
        updateRejectedSubmission.rejected.match(result)
      ) {
        const payload = result.payload;
        const errMsg =
          typeof payload === "object" && payload !== null && "message" in payload
            ? String((payload as { message: unknown }).message)
            : result.error?.message ?? "Submission failed. Please try again.";
        toast.error(errMsg);
        return;
      }

      if (
        submitIndicatorProgress.fulfilled.match(result) ||
        resubmitIndicatorProgress.fulfilled.match(result) ||
        updateRejectedSubmission.fulfilled.match(result)
      ) {
        toast.success(
          existingSubmission?.reviewStatus === "Rejected"
            ? "Correction submitted for review."
            : currentPeriodSubmission
            ? "Registry updated — record revised."
            : "Evidence filed successfully."
        );
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      }

    } else {
      fileEntries.forEach((entry) => {
        formData.append("documents", entry.file);
        formData.append("descriptions", entry.description.trim());
      });

      const result = await dispatch(
        addIndicatorDocuments({ id: task!.id, quarter: selectedQuarter, formData })
      );

      if (addIndicatorDocuments.rejected.match(result)) {
        const payload = result.payload;
        const errMsg =
          typeof payload === "object" && payload !== null && "message" in payload
            ? String((payload as { message: unknown }).message)
            : result.error?.message ?? "Failed to add documents.";
        toast.error(errMsg);
        return;
      }

      if (addIndicatorDocuments.fulfilled.match(result)) {
        const payload = result.payload;
        const successMsg =
          typeof payload === "object" && payload !== null && "message" in payload
            ? String((payload as { message: unknown }).message)
            : `${fileEntries.length} document(s) added to the registry.`;
        toast.success(successMsg);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[SubmissionModal] Unexpected error:", err);
    toast.error(message);
  }
};

  const getQuarterStatus = useCallback((quarter: string) => {
    const submission = getSubmissionForQuarter(quarter);
    if (!submission) return null;
    return {
      status: submission.reviewStatus,
      isLocked: submission.reviewStatus === "Accepted",
    };
  }, [getSubmissionForQuarter]);

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm" onClick={onClose} />

      <section className="relative w-full max-w-lg md:max-w-xl bg-[#fcfdfb] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-500">

        {/* Header */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 bg-white flex justify-between items-start shrink-0">
          <div className="text-[#1a3a32] space-y-1">
            <h3 className="text-lg md:text-xl font-serif font-black uppercase tracking-tighter">
              {existingSubmission?.reviewStatus === "Rejected"
                ? "Correct Returned Filing"
                : isRejected
                ? "Returned for Correction"
                : submitMode === "append"
                ? "Add More Documents"
                : currentPeriodSubmission
                ? "Update Registry"
                : "Submit Evidence"}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-[#c2a336] text-[9px] font-bold uppercase tracking-[0.15em] line-clamp-1">
                {task.activity?.description}
              </p>
              {isTeam && (
                <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-indigo-100 shrink-0">
                  <Users size={8} /> Team Filing
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-all group shrink-0 ml-4">
            <X size={18} className="text-slate-400 group-hover:rotate-90 group-hover:text-rose-500 transition-all" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8f9fa] custom-scrollbar">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-[#1a3a32] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h4 className="text-lg font-black text-[#1a3a32] uppercase tracking-tight">Filing Received</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Updating registry record...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Mode switcher */}
              {showModeSwitcher && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSubmitMode("replace"); setFileEntries([]); setValidationErrors({}); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                      submitMode === "replace"
                        ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-md"
                        : "bg-white text-slate-500 border-slate-200 hover:border-[#1a3a32]"
                    }`}
                  >
                    <RefreshCw size={14} /> Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSubmitMode("append"); setFileEntries([]); setValidationErrors({}); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                      submitMode === "append"
                        ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-md"
                        : "bg-white text-slate-500 border-slate-200 hover:border-[#1a3a32]"
                    }`}
                  >
                    <PlusCircle size={14} /> Add More
                  </button>
                </div>
              )}

              {/* Rejection feedback banner */}
              {(isRejected || existingSubmission?.reviewStatus === "Rejected") && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                  <p className="text-[9px] text-rose-700 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} /> Revision Required
                  </p>
                  <p className="text-xs text-rose-600 font-medium italic">
                    "{currentPeriodSubmission?.adminComment ?? existingSubmission?.adminComment ?? "Please update your filing based on the feedback above."}"
                  </p>
                </div>
              )}

              {/* Quarter selector */}
              {!isAnnual && (
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Target Period
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUARTERS.map((q) => {
                      const quarterStatus = getQuarterStatus(q);
                      const isLocked = quarterStatus?.isLocked || false;
                      const isCurrentSelected = selectedQuarter === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleQuarterChange(q)}
                          className={`py-2.5 rounded-lg text-[10px] font-black border transition-all relative ${
                            isLocked
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : isCurrentSelected
                              ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-sm"
                              : "bg-white border-slate-200 hover:border-[#1a3a32]"
                          }`}
                        >
                          {q}
                          {quarterStatus?.status === "Pending" && (
                            <Clock size={10} className="absolute -top-1 -right-1 text-amber-500" />
                          )}
                          {quarterStatus?.status === "Rejected" && (
                            <AlertCircle size={10} className="absolute -top-1 -right-1 text-rose-500" />
                          )}
                          {isLocked && (
                            <CheckCircle2 size={10} className="absolute -top-1 -right-1 text-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload zone */}
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Evidence Documents *
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    disabled={isAccepted}
                    onChange={handleFileChange}
                    accept={ALLOWED_FILE_TYPES.join(",")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                  />
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isAccepted
                      ? "bg-slate-50 border-slate-200"
                      : validationErrors.files
                      ? "border-rose-300 bg-rose-50/30"
                      : "border-slate-200 bg-white group-hover:border-[#c2a336]"
                  }`}>
                    <Upload className="mx-auto mb-2 text-slate-300" size={24} />
                    <p className="text-[9px] font-black text-[#1a3a32] uppercase tracking-widest">
                      {isAccepted ? "Registry Certified" : "Select Evidence Batch"}
                    </p>
                    <p className="text-[7px] text-slate-400 mt-1">
                      Max 50 files, 10MB each. Supported: JPG, PNG, GIF, PDF, MP4
                    </p>
                  </div>
                </div>
                {validationErrors.files && (
                  <p className="text-[8px] text-rose-500 px-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {validationErrors.files}
                  </p>
                )}
                {validationErrors.descriptions && (
                  <p className="text-[8px] text-rose-500 px-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {validationErrors.descriptions}
                  </p>
                )}
              </div>

              {/* File entry cards */}
              <div className="space-y-4">
                {fileEntries.map((entry, i) => (
                  <div
                    key={i}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 ${
                      validationErrors[`desc_${i}`] ? "border-rose-200" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between p-3 px-4 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {entry.previewUrl && entry.file.type.startsWith("image/") && (
                          <img src={entry.previewUrl} alt="preview" className="w-6 h-6 object-cover rounded" />
                        )}
                        <FileText size={14} className="text-[#c2a336] shrink-0" />
                        <span className="text-[10px] font-black text-slate-600 truncate">{entry.file.name}</span>
                        <span className="text-[7px] text-slate-400">({(entry.file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-3 bg-white">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Description *
                      </label>
                      <textarea
                        placeholder="Describe how this document supports the achievement..."
                        value={entry.description}
                        onChange={(e) => updateFileDescription(i, e.target.value)}
                        className={`w-full text-[11px] font-medium text-slate-600 focus:outline-none min-h-[60px] resize-none placeholder:text-slate-300 border rounded-lg p-2 transition-colors focus:ring-1 ${
                          validationErrors[`desc_${i}`]
                            ? "border-rose-300 bg-rose-50 focus:ring-rose-400"
                            : "border-slate-200 focus:ring-[#c2a336]"
                        }`}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {validationErrors[`desc_${i}`] ? (
                          <p className="text-[7px] text-rose-500 flex items-center gap-1">
                            <AlertCircle size={8} /> {validationErrors[`desc_${i}`]}
                          </p>
                        ) : (
                          <span />
                        )}
                        <span className="text-[7px] text-slate-300">
                          {entry.description.length}/{MAX_DESCRIPTION_LENGTH}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 md:px-8 md:py-5 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={uploading || success || isAccepted}
            className="w-full bg-[#1a3a32] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-lg"
          >
            {uploading ? (
              <><Loader2 className="animate-spin" size={14} /><span>Syncing...</span></>
            ) : isAccepted ? (
              "Quarter Certified"
            ) : (
              <>
                <ShieldCheck size={14} />
                <span>
                  {existingSubmission?.reviewStatus === "Rejected"
                    ? "Submit Correction"
                    : currentPeriodSubmission
                    ? submitMode === "append" ? "Append Evidence" : "Update & Resubmit"
                    : "Finalize Submission"}
                </span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SubmissionModal;