import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X, Upload, CheckCircle2, Loader2, AlertCircle,
  Trash2, FileText, Users,
  RefreshCw, PlusCircle, Clock, AlertTriangle, Send
} from "lucide-react";
import {
  updateSubmission,
  getActiveQuarterDisplay,
  buildSubmissionFormData,
} from "../../store/slices/userIndicatorSlice";
import type { AppDispatch, RootState } from "../../store/store";
import type { IIndicatorUI, ISubmissionUI } from "../../store/slices/userIndicatorSlice";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmissionModalProps {
  task: IIndicatorUI | null;
  onClose: () => void;
  existingSubmission?: ISubmissionUI;
  /** Optional callback to handle submission externally. If not provided, uses Redux dispatch. */
  onSubmit?: (formData: FormData) => Promise<void>;
  /** Force the modal to treat the indicator as quarterly, even if reporting_cycle is "Annual". */
  forceQuarterly?: boolean;
}

interface ExtendedFile {
  file: File;
  description: string;
  previewUrl?: string;
}

type SubmitMode = "replace" | "append";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const MAX_FILE_SIZE      = 10 * 1024 * 1024;      // 10 MB
const MAX_DESC_LENGTH    = 500;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf", "video/mp4"];

// ─── Component ────────────────────────────────────────────────────────────────

const SubmissionModal = ({
  task,
  onClose,
  existingSubmission,
  onSubmit,
  forceQuarterly = false,
}: SubmissionModalProps) => {
  const dispatch      = useDispatch<AppDispatch>();
  const { uploading } = useSelector((state: RootState) => state.userIndicators);

  // ── Determine if the indicator is annual ──────────────────────────────────
  // If forceQuarterly is true, we always show quarter selection.
  // Otherwise, we rely on the reporting_cycle field.
  const isAnnual = forceQuarterly ? false : task?.reporting_cycle === "Annual";
  const isTeam   = task?.assignee_model === "Team";

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getSubmissionForQuarter = useCallback(
    (quarter: string): ISubmissionUI | undefined => {
      if (!task?.submissions) return undefined;
      const key = `${quarter}_${new Date().getFullYear()}`;
      return task.submissions[key]?.[0];
    },
    [task],
  );

  const getInitialQuarter = useCallback((): string => {
    // If we have an existing rejected submission, use its quarter.
    if (existingSubmission?.reviewStatus === "Rejected") {
      return isAnnual && existingSubmission.quarter === 1
        ? "Annual"
        : `Q${existingSubmission.quarter}`;
    }
    // Otherwise, default to the active quarter or "Annual" if applicable.
    return isAnnual
      ? "Annual"
      : (task ? getActiveQuarterDisplay(task) : "Q1");
  }, [existingSubmission, isAnnual, task]);

  // ─── State ──────────────────────────────────────────────────────────────────

  const [selectedQuarter,  setSelectedQuarter]  = useState<string>(getInitialQuarter);
  const [fileEntries,      setFileEntries]      = useState<ExtendedFile[]>([]);
  const [success,          setSuccess]          = useState(false);
  const [submitMode,       setSubmitMode]       = useState<SubmitMode>("replace");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const syncedSubmissionIdRef = useRef<string | undefined>(undefined);

  // ─── Derived submission state ────────────────────────────────────────────────

  const currentPeriodSubmission = useMemo<ISubmissionUI | undefined>(
    () => getSubmissionForQuarter(selectedQuarter),
    [selectedQuarter, getSubmissionForQuarter],
  );

  const submissionType = useMemo(() => {
    if (!currentPeriodSubmission)                            return "new";
    if (currentPeriodSubmission.reviewStatus === "Rejected") return "resubmit";
    if (currentPeriodSubmission.reviewStatus === "Pending")  return "addDocuments";
    if (currentPeriodSubmission.reviewStatus === "Accepted") return "locked";
    return "new";
  }, [currentPeriodSubmission]);

  const isRejected = submissionType === "resubmit";
  const isPending  = submissionType === "addDocuments";
  const isAccepted = submissionType === "locked";
  const isNew      = submissionType === "new";

  const showModeSwitcher = !!currentPeriodSubmission && !isAccepted && !isPending && !isNew;

  // ─── Reset sync tracker when task changes ───────────────────────────────────

  useEffect(() => {
    syncedSubmissionIdRef.current = undefined;
  }, [task?.id]);

  // ─── Global keyboard handler ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ─── Revoke object URLs on unmount ──────────────────────────────────────────

  useEffect(() => {
    const snapshot = [...fileEntries];
    return () => {
      snapshot.forEach((e) => {
        if (e.previewUrl) URL.revokeObjectURL(e.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Quarter change ──────────────────────────────────────────────────────────

  const handleQuarterChange = useCallback((q: string) => {
    setSelectedQuarter(q);
    setFileEntries([]);
    setSubmitMode("replace");
    setValidationErrors({});
    syncedSubmissionIdRef.current = undefined;
  }, []);

  // ─── File handling ───────────────────────────────────────────────────────────

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type not allowed. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`;
    }
    return null;
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const newFiles: ExtendedFile[] = [];
      const errors: string[] = [];

      Array.from(e.target.files).forEach((file) => {
        const err = validateFile(file);
        if (err) {
          errors.push(`${file.name}: ${err}`);
          return;
        }
        newFiles.push({
          file,
          description: "",
          previewUrl: URL.createObjectURL(file),
        });
      });

      if (errors.length) toast.error(errors.join("\n"));
      if (newFiles.length) {
        setFileEntries((prev) => [...prev, ...newFiles].slice(0, 50));
        setValidationErrors((prev) => {
          const n = { ...prev };
          delete n.files;
          return n;
        });
      }
    },
    [validateFile],
  );

  const updateFileDescription = useCallback((index: number, text: string) => {
    const clamped = text.slice(0, MAX_DESC_LENGTH);
    setFileEntries((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, description: clamped } : item,
      ),
    );
    setValidationErrors((prev) => {
      const n = { ...prev };
      if (text.length > MAX_DESC_LENGTH) {
        n[`desc_${index}`] = `Description cannot exceed ${MAX_DESC_LENGTH} characters`;
      } else {
        delete n[`desc_${index}`];
        delete n.descriptions;
      }
      return n;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFileEntries((prev) => {
      const entry = prev[index];
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setValidationErrors((prev) => {
      const n = { ...prev };
      delete n[`desc_${index}`];
      return n;
    });
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Require at least one file unless we are only adding documents to an existing pending submission.
    if (submissionType !== "addDocuments" && fileEntries.length === 0) {
      errors.files = "At least one evidence file is required";
    }

    // Ensure each file has a description.
    if (fileEntries.length > 0) {
      fileEntries.forEach((f, i) => {
        if (!f.description.trim()) {
          errors[`desc_${i}`] = "Description is required for each document";
        }
      });
      if (fileEntries.some((f) => !f.description.trim())) {
        errors.descriptions = "Please provide a description for every document";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fileEntries, submissionType]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const getQuarterNumber = useCallback((display: string): number => {
    return display === "Annual" ? 0 : parseInt(display.replace("Q", ""), 10);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    const year = new Date().getFullYear();
    const quarterValue = getQuarterNumber(selectedQuarter);

    const formData = buildSubmissionFormData({
      quarter: quarterValue,
      year,
      descriptions: fileEntries.map((f) => f.description),
      files: fileEntries.map((f) => f.file),
      idempotencyKey: crypto.randomUUID(),
    });

    try {
      if (onSubmit) {
        // Parent-provided submit handler (only needs formData).
        await onSubmit(formData);
      } else {
        // Default: use Redux thunk.
        await dispatch(updateSubmission({ id: task!.id, formData })).unwrap();
      }

      const messages: Record<string, string> = {
        new: "Evidence submitted successfully! Awaiting admin review.",
        resubmit: "Correction submitted for review. Thank you for updating.",
        addDocuments: `${fileEntries.length} document(s) added to your pending submission.`,
      };
      toast.success(messages[submissionType] ?? "Submitted successfully.");

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  // ─── Quarter status helper ───────────────────────────────────────────────────

  const getQuarterStatus = useCallback(
    (quarter: string) => {
      const sub = getSubmissionForQuarter(quarter);
      if (!sub) return null;
      return { status: sub.reviewStatus, isLocked: sub.reviewStatus === "Accepted" };
    },
    [getSubmissionForQuarter],
  );

  // ─── Labels ──────────────────────────────────────────────────────────────────

  const modalTitle = isPending
    ? "Add More Documents"
    : isRejected
      ? "Correct Returned Filing"
      : isNew && submitMode === "append" && currentPeriodSubmission
        ? "Add More Documents"
        : currentPeriodSubmission && !isNew
          ? "Update Registry"
          : "Submit Evidence";

  const buttonText = uploading
    ? "Processing..."
    : isAccepted
      ? "Period Certified"
      : isPending
        ? "Add Documents to Pending Submission"
        : isRejected
          ? "Submit Correction"
          : isNew && submitMode === "append" && currentPeriodSubmission
            ? "Append Evidence"
            : currentPeriodSubmission && !isNew
              ? "Update & Resubmit"
              : "Finalize Submission";

  if (!task) return null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-[#1a3a32]/40 backdrop-blur-sm" onClick={onClose} />

      <section className="relative w-full max-w-lg md:max-w-xl bg-[#fcfdfb] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-500">
        {/* ── Header ── */}
        <div className="px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 bg-white flex justify-between items-start shrink-0">
          <div className="text-[#1a3a32] space-y-1">
            <h3 className="text-lg md:text-xl font-serif font-black uppercase tracking-tighter">
              {modalTitle}
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-full transition-all group shrink-0 ml-4"
          >
            <X
              size={18}
              className="text-slate-400 group-hover:rotate-90 group-hover:text-rose-500 transition-all"
            />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8f9fa] custom-scrollbar">
          {success ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-[#1a3a32] w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h4 className="text-lg font-black text-[#1a3a32] uppercase tracking-tight">
                Filing Received
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Updating registry record...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Mode switcher ── */}
              {showModeSwitcher && (
                <div className="grid grid-cols-2 gap-2">
                  {(["replace", "append"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSubmitMode(mode);
                        setFileEntries([]);
                        setValidationErrors({});
                      }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                        submitMode === mode
                          ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-md"
                          : "bg-white text-slate-500 border-slate-200 hover:border-[#1a3a32]"
                      }`}
                    >
                      {mode === "replace" ? (
                        <>
                          <RefreshCw size={14} /> Replace All
                        </>
                      ) : (
                        <>
                          <PlusCircle size={14} /> Add More
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Pending banner ── */}
              {isPending && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                  <p className="text-[9px] text-blue-700 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                    <Clock size={12} /> Pending Review
                  </p>
                  <p className="text-xs text-blue-600">
                    You have a pending submission awaiting admin review. You can
                    add more documents without modifying existing ones.
                  </p>
                </div>
              )}

              {/* ── Rejection banner ── */}
              {isRejected && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
                  <p className="text-[9px] text-rose-700 font-black uppercase tracking-widest flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} /> Revision Required
                  </p>
                  <p className="text-xs text-rose-600 font-medium italic">
                    "
                    {currentPeriodSubmission?.adminComment ??
                      "Please update your filing based on the feedback above."}
                    "
                  </p>
                </div>
              )}

              {/* ── Quarter selector ── */}
              {!isAnnual ? (
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Target Period
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUARTERS.map((q) => {
                      const qs = getQuarterStatus(q);
                      const locked = qs?.isLocked ?? false;
                      const selected = selectedQuarter === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          disabled={locked}
                          onClick={() => handleQuarterChange(q)}
                          className={`py-2.5 rounded-lg text-[10px] font-black border transition-all relative ${
                            locked
                              ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                              : selected
                                ? "bg-[#1a3a32] text-white border-[#1a3a32] shadow-sm"
                                : "bg-white border-slate-200 hover:border-[#1a3a32]"
                          }`}
                        >
                          {q}
                          {qs?.status === "Pending" && (
                            <Clock
                              size={10}
                              className="absolute -top-1 -right-1 text-amber-500"
                            />
                          )}
                          {qs?.status === "Rejected" && (
                            <AlertCircle
                              size={10}
                              className="absolute -top-1 -right-1 text-rose-500"
                            />
                          )}
                          {locked && (
                            <CheckCircle2
                              size={10}
                              className="absolute -top-1 -right-1 text-emerald-500"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ── Annual display ── */
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Reporting Period
                  </label>
                  <div className="bg-slate-100 rounded-xl p-4 text-center">
                    <p className="text-[11px] font-black text-[#1a3a32] uppercase tracking-wider">
                      Annual Report {new Date().getFullYear()}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-1">
                      Single annual submission for the entire year
                    </p>
                  </div>
                </div>
              )}

              {/* ── Upload zone ── */}
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
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isAccepted
                        ? "bg-slate-50 border-slate-200"
                        : validationErrors.files
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-slate-200 bg-white group-hover:border-[#c2a336]"
                    }`}
                  >
                    <Upload className="mx-auto mb-2 text-slate-300" size={24} />
                    <p className="text-[9px] font-black text-[#1a3a32] uppercase tracking-widest">
                      {isAccepted ? "Registry Certified" : "Select Evidence Batch"}
                    </p>
                    <p className="text-[7px] text-slate-400 mt-1">
                      Max 50 files, 10 MB each. Supported: JPG, PNG, GIF, PDF,
                      MP4
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

              {/* ── File cards ── */}
              <div className="space-y-4">
                {fileEntries.map((entry, i) => (
                  <div
                    key={i}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 ${
                      validationErrors[`desc_${i}`]
                        ? "border-rose-200"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between p-3 px-4 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {entry.previewUrl &&
                          entry.file.type.startsWith("image/") && (
                            <img
                              src={entry.previewUrl}
                              alt="preview"
                              className="w-6 h-6 object-cover rounded"
                            />
                          )}
                        <FileText
                          size={14}
                          className="text-[#c2a336] shrink-0"
                        />
                        <span className="text-[10px] font-black text-slate-600 truncate">
                          {entry.file.name}
                        </span>
                        <span className="text-[7px] text-slate-400">
                          ({(entry.file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                      >
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
                          {entry.description.length}/{MAX_DESC_LENGTH}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 md:px-8 md:py-5 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={uploading || success || isAccepted}
            className="w-full bg-[#1a3a32] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-lg"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Syncing...</span>
              </>
            ) : isAccepted ? (
              "Period Certified"
            ) : (
              <>
                {isPending ? <PlusCircle size={14} /> : <Send size={14} />}
                <span>{buttonText}</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SubmissionModal;