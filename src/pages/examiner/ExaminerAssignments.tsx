import { useEffect, useState, useMemo } from "react";
import {
  Loader2, Folder, Search, AlertCircle,
  ChevronDown, FileText, RefreshCcw, FolderOpen,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchMyFolders } from "../../store/slices/examinerSlice";
import type { IMyFolder, ICompletedIndicator, ISubmission, IDocument } from "../../store/slices/examinerSlice";
import FilePreviewModal from "../PreviewModal";

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */

const PERSPECTIVE_TABS = [
  "All Indicators",
  "Core Business",
  "Customer",
  "Financial",
  "Innovation & Learning",
  "Internal Process",
] as const;

const PERSPECTIVE_MATCH: Record<string, string> = {
  "Core Business":         "Core Business / Mandate",
  "Customer":              "Customer Perspective",
  "Financial":             "Finance Perspective",
  "Innovation & Learning": "Innovation & Learning",
  "Internal Process":      "Internal Process",
};

/* ─── INDICATOR ROW ──────────────────────────────────────────────────────── */

interface IndicatorRowProps {
  indicator: ICompletedIndicator;
  onPreview: (doc: IDocument) => void;
}

const IndicatorRow = ({ indicator, onPreview }: IndicatorRowProps) => (
  <div className="flex items-start px-5 py-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all gap-4">
    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
      <FileText size={16} className="text-slate-400" />
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-[12px] font-bold text-[#1a2c2c] leading-snug">
        {indicator.activityDescription}
      </p>

      {/* Documents only — no period label, no metadata row, no Examine button */}
      {indicator.submissions && indicator.submissions.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {indicator.submissions.map((sub: ISubmission) =>
            sub.documents?.map((doc: IDocument, idx: number) => (
              <div
                key={`${sub.submissionId}-${idx}`}
                className="flex items-center justify-between gap-2 pl-3 py-1 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <p className="text-[10px] text-slate-500 truncate max-w-[400px]">
                  {doc.description?.trim() || doc.fileName || "Unnamed file"}
                </p>
                <button
                  onClick={() => onPreview(doc)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[8px] font-black uppercase tracking-wider text-slate-400 hover:border-[#c2a336] hover:text-[#1d3331] transition-colors opacity-0 group-hover:opacity-100"
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  </div>
);

/* ─── FOLDER CARD ────────────────────────────────────────────────────────── */

interface FolderCardProps {
  folder:    IMyFolder;
  expanded:  boolean;
  onToggle:  () => void;
  onPreview: (doc: IDocument) => void;
}

const FolderCard = ({ folder, expanded, onToggle, onPreview }: FolderCardProps) => {
  const total = folder.completedIndicators.length;

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
      expanded ? "border-slate-200 shadow-md" : "border-slate-100 shadow-sm"
    }`}>
      {/* Header */}
      <div
        onClick={onToggle}
        className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            {expanded
              ? <FolderOpen size={28} className="text-amber-500 fill-amber-400" />
              : <Folder     size={28} className="text-amber-500 fill-amber-400" />
            }
          </div>

          <div>
            <h3 className="text-[13px] font-black text-[#1d3331] uppercase tracking-tight">
              {folder.objectiveTitle}
            </h3>
            {/* Removed: assignedAt date */}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                {total} / {total} Task{total !== 1 ? "s" : ""} Completed
              </span>
            </div>
          </div>
        </div>

        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-1 space-y-3 border-t border-slate-50 bg-slate-50/40">
          {total === 0 ? (
            <div className="py-12 text-center">
              <Folder size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                No completed indicators in this folder yet.
              </p>
            </div>
          ) : (
            folder.completedIndicators.map((ind) => (
              <IndicatorRow
                key={ind.id}
                indicator={ind}
                onPreview={onPreview}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─── PERSPECTIVE SECTION ────────────────────────────────────────────────── */

interface PerspectiveSectionProps {
  perspective: string;
  folders:     IMyFolder[];
  isExpanded:  (id: string) => boolean;
  onToggle:    (id: string) => void;
  onPreview:   (doc: IDocument) => void;
}

const PerspectiveSection = ({
  perspective, folders, isExpanded, onToggle, onPreview,
}: PerspectiveSectionProps) => (
  <div>
    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4 px-1">
      {perspective} Perspective
    </p>
    <div className="space-y-4">
      {folders.map((folder) => (
        <FolderCard
          key={folder.objectiveId}
          folder={folder}
          expanded={isExpanded(folder.objectiveId)}
          onToggle={() => onToggle(folder.objectiveId)}
          onPreview={onPreview}
        />
      ))}
    </div>
  </div>
);

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */

const ExaminerAssignments = () => {
  const dispatch = useAppDispatch();
  const { myFolders, loading, error } = useAppSelector((s) => s.examiner);

  const [search,         setSearch]        = useState("");
  const [activeTab,      setActiveTab]     = useState<string>("All Indicators");
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});

  const [previewDoc, setPreviewDoc] = useState<IDocument | null>(null);
  const openPreview  = (doc: IDocument) => setPreviewDoc(doc);
  const closePreview = ()              => setPreviewDoc(null);

  useEffect(() => {
    dispatch(fetchMyFolders());
  }, [dispatch]);

  const toggleFolder = (id: string) =>
    setManualExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Auto-expand when there's only one folder — pure derivation, no effect needed
  const isExpanded = (id: string): boolean => {
    if (id in manualExpanded) return manualExpanded[id];
    return myFolders.length === 1;
  };

  const totalIndicators = myFolders.reduce(
    (acc, f) => acc + f.completedIndicators.length, 0
  );

  const filtered = useMemo(() => {
    return myFolders.filter((f) => {
      const matchTab =
        activeTab === "All Indicators" ||
        f.perspective === PERSPECTIVE_MATCH[activeTab] ||
        f.perspective.toLowerCase().includes(activeTab.toLowerCase());
      const matchSearch =
        f.objectiveTitle.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [myFolders, activeTab, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, IMyFolder[]>();
    filtered.forEach((f) => {
      if (!map.has(f.perspective)) map.set(f.perspective, []);
      map.get(f.perspective)!.push(f);
    });
    return map;
  }, [filtered]);

  /* ── Loading ── */
  if (loading && myFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#fcfcf7]">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Loading your folders...
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#fcfcf7] gap-4">
        <AlertCircle className="text-red-500" size={40} />
        <p className="text-[11px] font-bold text-slate-600">{error}</p>
        <button
          onClick={() => dispatch(fetchMyFolders())}
          className="px-6 py-3 bg-[#1d3331] text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Empty ── */
  if (myFolders.length === 0) {
    return (
      <div className="p-8 bg-[#fcfcf7] min-h-screen">
        <div className="py-40 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <Folder className="mx-auto text-slate-200 mb-4" size={48} />
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            No folders assigned yet
          </h3>
          <p className="text-[10px] text-slate-400 font-medium mt-2">
            Your administrator will assign folders to you.
          </p>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-xl font-black font-serif text-[#1d3331] uppercase tracking-tight">
            Assigned Folders
          </h1>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
            Objective folders assigned to you for examination
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2">
            <span className="text-[8px] font-black uppercase text-slate-400">Folders</span>
            <span className="text-[14px] font-black text-[#1d3331]">{myFolders.length}</span>
          </div>
          <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <span className="text-[8px] font-black uppercase text-emerald-600">Indicators</span>
            <span className="text-[14px] font-black text-emerald-700">{totalIndicators}</span>
          </div>
          <button
            onClick={() => dispatch(fetchMyFolders())}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase hover:border-[#c2a336] transition-all group"
          >
            <RefreshCcw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
            Sync
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-8 p-2 flex flex-col lg:flex-row items-center gap-3">
        <div className="flex flex-wrap gap-1 flex-1">
          {PERSPECTIVE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? "bg-[#1d3331] text-white shadow-md"
                  : "text-slate-400 hover:text-[#1d3331] hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72 flex-shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input
            type="text"
            placeholder="Search Objective Folders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-[11px] font-semibold text-slate-600 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#c2a336]/20 transition-all"
          />
        </div>
      </div>

      {/* Folder list grouped by perspective */}
      {filtered.length === 0 ? (
        <div className="py-32 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <Search size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            No folders match your search.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([perspective, folders]) => (
            <PerspectiveSection
              key={perspective}
              perspective={perspective}
              folders={folders}
              isExpanded={isExpanded}
              onToggle={toggleFolder}
              onPreview={openPreview}
            />
          ))}
        </div>
      )}

      {/* File preview modal */}
      {previewDoc && (
        <FilePreviewModal
          url={previewDoc.evidenceUrl}
          fileName={previewDoc.fileName || previewDoc.description || "File Preview"}
          onClose={closePreview}
        />
      )}
    </div>
  );
};

export default ExaminerAssignments;