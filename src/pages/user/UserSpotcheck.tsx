import { useEffect, useState } from "react";
import {
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  Plus,
  Calendar,
  MapPin,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  createSpotCheck,
  fetchSpotChecks,
  deleteSpotCheck,
  clearSpotCheckError,
} from "../../store/slices/spotCheckSlice";
import { toast } from "react-hot-toast";
import type { ISpotCheck } from "../../types/spot-check.types";

/* ────────────────────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────────────────────── */

const formatDate = (d?: string) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const DocIcon = ({ fileType }: { fileType?: string }) => {
  if (fileType === "image") return <ImageIcon size={14} className="text-blue-400" />;
  if (fileType === "video") return <Video size={14} className="text-purple-400" />;
  return <FileText size={14} className="text-slate-400" />;
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ────────────────────────────────────────────────────────────────────────────
   UPLOAD FORM
   ──────────────────────────────────────────────────────────────────────────── */

interface UploadFormProps {
  onSuccess: () => void;
}

const UploadForm = ({ onSuccess }: UploadFormProps) => {
  const dispatch = useAppDispatch();
  const { actionLoading, error } = useAppSelector((s) => s.spotCheck);

  const [station, setStation] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(clearSpotCheckError());
    return () => {
      dispatch(clearSpotCheckError());
    };
  }, [dispatch]);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => [...prev, ...arr]);
    setFileDescriptions((prev) => [...prev, ...arr.map(() => "")]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileDescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const setFileDescription = (index: number, value: string) => {
    setFileDescriptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!station.trim()) errs.station = "Station is required.";
    if (!visitDate) errs.visitDate = "Visit date is required.";
    if (!description.trim()) errs.description = "Description is required.";
    if (files.length === 0) errs.files = "At least one file is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const reset = () => {
    setStation("");
    setVisitDate("");
    setDescription("");
    setFiles([]);
    setFileDescriptions([]);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await dispatch(
        createSpotCheck({
          station: station.trim(),
          visitDate,
          description: description.trim(),
          documentDescriptions: fileDescriptions.map((d) => d.trim()),
          files,
        })
      ).unwrap();

      toast.success("Spot check uploaded successfully.");
      reset();
      onSuccess();
    } catch (err) {
      // error already stored in slice; toast for immediate feedback
      toast.error(typeof err === "string" ? err : "Upload failed.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-emerald-100">
          <Plus size={18} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1d3331]">
            New Spot Check
          </h2>
          <p className="text-[10px] text-slate-400 font-medium">
            Record a field visit and upload evidence
          </p>
        </div>
      </div>

      {/* Station + date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
            Station *
          </label>
          <div className="relative">
            <MapPin
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={station}
              onChange={(e) => {
                setStation(e.target.value);
                if (formErrors.station)
                  setFormErrors((p) => ({ ...p, station: "" }));
              }}
              placeholder="e.g. Nairobi Station"
              className={`w-full rounded-xl border text-[11px] px-3 py-2.5 pl-8 focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 bg-white ${
                formErrors.station ? "border-rose-300" : "border-slate-200"
              }`}
            />
          </div>
          {formErrors.station && (
            <p className="text-[9px] text-rose-500 font-bold mt-1">
              {formErrors.station}
            </p>
          )}
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
            Visit Date *
          </label>
          <div className="relative">
            <Calendar
              size={12}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="date"
              value={visitDate}
              onChange={(e) => {
                setVisitDate(e.target.value);
                if (formErrors.visitDate)
                  setFormErrors((p) => ({ ...p, visitDate: "" }));
              }}
              className={`w-full rounded-xl border text-[11px] px-3 py-2.5 pl-8 focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 bg-white ${
                formErrors.visitDate ? "border-rose-300" : "border-slate-200"
              }`}
            />
          </div>
          {formErrors.visitDate && (
            <p className="text-[9px] text-rose-500 font-bold mt-1">
              {formErrors.visitDate}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (formErrors.description)
              setFormErrors((p) => ({ ...p, description: "" }));
          }}
          rows={3}
          placeholder="What was observed during the visit?"
          className={`w-full resize-none rounded-xl border text-[11px] p-3 focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20 bg-white ${
            formErrors.description ? "border-rose-300" : "border-slate-200"
          }`}
        />
        {formErrors.description && (
          <p className="text-[9px] text-rose-500 font-bold mt-1">
            {formErrors.description}
          </p>
        )}
      </div>

      {/* Dropzone */}
      <div className="mb-4">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
          Files *
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-emerald-400 bg-emerald-50"
              : formErrors.files
              ? "border-rose-300 bg-rose-50/30"
              : "border-slate-200 bg-slate-50/50"
          }`}
        >
          <Upload
            size={22}
            className="mx-auto mb-2 text-slate-400"
          />
          <p className="text-[10px] font-bold text-slate-600 mb-1">
            Drag files here, or
          </p>
          <label className="inline-block cursor-pointer text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 underline">
            Browse
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <p className="text-[8px] text-slate-400 mt-2">
            Images, PDFs, Office docs, videos · 55 MB each · up to 50 files
          </p>
        </div>

        {formErrors.files && (
          <p className="text-[9px] text-rose-500 font-bold mt-1">
            {formErrors.files}
          </p>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white"
              >
                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <DocIcon
                    fileType={
                      file.type.startsWith("image/")
                        ? "image"
                        : file.type.startsWith("video/")
                        ? "video"
                        : "document"
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-[8px] text-slate-400 uppercase">
                    {file.type || "file"} · {formatBytes(file.size)}
                  </p>
                  <input
                    type="text"
                    value={fileDescriptions[i] ?? ""}
                    onChange={(e) => setFileDescription(i, e.target.value)}
                    placeholder="Optional description for this file…"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 text-[10px] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1d3331]/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                >
                  <X size={12} className="text-rose-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slice error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
          <AlertCircle size={13} className="text-rose-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={actionLoading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-[#1d3331] hover:bg-[#0f2219] text-white disabled:opacity-60"
      >
        {actionLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            <Upload size={13} /> Upload Spot Check
          </>
        )}
      </button>
    </form>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   SPOT CHECK CARD (list item)
   ──────────────────────────────────────────────────────────────────────────── */

interface SpotCheckCardProps {
  spotCheck: ISpotCheck;
  onDeleted: () => void;
}

const SpotCheckCard = ({ spotCheck, onDeleted }: SpotCheckCardProps) => {
  const dispatch = useAppDispatch();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteSpotCheck(spotCheck.id)).unwrap();
      toast.success("Spot check deleted.");
      onDeleted();
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : "Failed to delete spot check."
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase tracking-wider">
              <MapPin size={10} />
              {spotCheck.station}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 text-[8px] font-black uppercase tracking-wider">
              <Calendar size={10} />
              {formatDate(spotCheck.visitDate)}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-700 leading-snug line-clamp-2">
            {spotCheck.description}
          </p>
        </div>

        <button
          onClick={() => setConfirmDelete(true)}
          className="p-2 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
          title="Delete spot check"
        >
          <Trash2 size={13} className="text-rose-500" />
        </button>
      </div>

      {/* Files */}
      {spotCheck.documents.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">
            {spotCheck.documents.length} file
            {spotCheck.documents.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1.5">
            {spotCheck.documents.slice(0, 4).map((doc) => (
              <a
                key={doc.id}
                href={doc.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group"
              >
                <DocIcon fileType={doc.fileType} />
                <span className="text-[10px] font-medium text-slate-700 truncate flex-1">
                  {doc.description?.trim() || doc.fileName}
                </span>
                {doc.sizeBytes ? (
                  <span className="text-[8px] text-slate-400 shrink-0">
                    {formatBytes(doc.sizeBytes)}
                  </span>
                ) : null}
              </a>
            ))}
            {spotCheck.documents.length > 4 && (
              <p className="text-[9px] text-slate-400 pl-2">
                + {spotCheck.documents.length - 4} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400">
        <span>
          Uploaded {formatDate(spotCheck.createdAt)}
          {spotCheck.createdByName && ` by ${spotCheck.createdByName}`}
        </span>
      </div>

      {/* Confirm delete overlay */}
      {confirmDelete && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
          <p className="text-[10px] font-bold text-rose-700 mb-2">
            Delete this spot check and all its files?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {deleting ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <>Delete</>
              )}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────────────────────── */

const UserSpotcheck = () => {
  const dispatch = useAppDispatch();
  const { spotChecks, spotChecksCount, loading, error } = useAppSelector(
    (s) => s.spotCheck
  );

  const [stationFilter, setStationFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  /* Fetch list on mount + when filters change (with light debounce) */
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(
        fetchSpotChecks({
          station: stationFilter || undefined,
          search: searchTerm || undefined,
          page: 1,
          pageSize: 50,
        })
      );
    }, 250);
    return () => clearTimeout(t);
  }, [dispatch, stationFilter, searchTerm]);

  /* Reload when an upload succeeds */
  const handleUploadSuccess = () => {
    setShowUpload(false);
    dispatch(
      fetchSpotChecks({
        station: stationFilter || undefined,
        search: searchTerm || undefined,
        page: 1,
        pageSize: 50,
      })
    );
  };

  /* Slice already removes the deleted record from state. */
  const handleDeleted = () => {
    // No additional action needed — the slice handles removal.
  };

  const isEmpty = !loading && spotChecks.length === 0;

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black font-serif text-[#1d3331] tracking-tight uppercase flex items-center gap-3">
            <FolderOpen size={22} className="text-[#1d3331]" />
            Spot Checks
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
            {spotChecksCount} record{spotChecksCount !== 1 ? "s" : ""} in the library
          </p>
        </div>

        <button
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0f2219] transition-all shadow-sm"
        >
          {showUpload ? (
            <>
              <X size={13} /> Close
            </>
          ) : (
            <>
              <Plus size={13} /> New Spot Check
            </>
          )}
        </button>
      </div>

      {/* Upload form (collapsible) */}
      {showUpload && (
        <div className="mb-6">
          <UploadForm onSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by description or file name…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20"
          />
        </div>

        <input
          type="text"
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          placeholder="Filter by station…"
          className="rounded-xl border border-slate-200 text-[11px] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1d3331]/20"
        />

        {(stationFilter || searchTerm) && (
          <button
            onClick={() => {
              setStationFilter("");
              setSearchTerm("");
            }}
            className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl px-4 py-2.5 bg-white transition-all hover:border-rose-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2
            className="animate-spin text-[#1d3331] mb-3"
            size={32}
          />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Loading spot checks…
          </p>
        </div>
      )}

      {/* Empty */}
      {isEmpty && (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200">
          <CheckCircle2
            className="mx-auto mb-4 text-emerald-200"
            size={48}
          />
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
            {stationFilter || searchTerm
              ? "No matches"
              : "No spot checks yet"}
          </h2>
          <p className="text-[10px] text-slate-400">
            {stationFilter || searchTerm
              ? "Try a different filter."
              : "Click “New Spot Check” to add the first record."}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && spotChecks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {spotChecks.map((sc) => (
            <SpotCheckCard
              key={sc.id}
              spotCheck={sc}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSpotcheck;