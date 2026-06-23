import { useEffect, useMemo, useState } from "react";
//import { createPortal } from "react-dom";
import {
  Folder, ChevronDown, Search, RefreshCcw, Loader2, FileText,
  Target, ShieldCheck, Lock, Archive, AlertTriangle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAllStrategicPlans } from "../../store/slices/strategicPlan/strategicPlanSlice";
import {
  fetchIndicators,
  fetchIndicatorById,
  clearSelectedIndicator,
  clearIndicatorError,
  type IIndicator,
} from "../../store/slices/indicatorSlice";
import { fetchRegistryStatus } from "../../store/slices/registrySlice";
import FilePreviewModal from "../PreviewModal";

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

interface PreviewTarget {
  url:      string;
  fileName: string;
}

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

const getIndicatorDocs = (indicator: IIndicator): PreviewTarget[] => {
  if (!indicator.submissions) return [];
  return indicator.submissions
    .flatMap((sub) =>
      (sub.documents ?? []).map((doc) => ({
        url:      doc.evidenceUrl ?? "",
        fileName: doc.description?.trim() || doc.fileName || "Document",
      }))
    )
    .filter((d) => d.url);
};

/* ─── DOCUMENT PICKER MODAL ──────────────────────────────────────────────── */

interface DocPickerProps {
  docs:    PreviewTarget[];
  onPick:  (doc: PreviewTarget) => void;
  onClose: () => void;
}

const DocPickerModal = ({ docs, onPick, onClose }: DocPickerProps) => (
  <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#1d3331]">
          Select Document to Preview
        </p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
        >
          ✕
        </button>
      </div>
      <ul className="p-4 space-y-2 max-h-80 overflow-y-auto">
        {docs.map((doc, idx) => (
          <li key={idx}>
            <button
              onClick={() => onPick(doc)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 hover:border-[#c2a336]/40 hover:bg-[#c2a336]/5 transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-slate-400" />
              </div>
              <p className="text-[11px] font-semibold text-slate-700 truncate group-hover:text-[#1d3331]">
                {doc.fileName}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */

const SuperAdminRegistry = () => {
  const dispatch = useAppDispatch();

  const { plans = [], loading }                          = useAppSelector((s) => s.strategicPlan);
  const { indicators = [], detailLoading }               = useAppSelector((s) => s.indicators);
  const { settings = [], loading: registryLoading }      = useAppSelector((s) => s.registry);

  const [activePerspective, setActivePerspective] = useState("All Indicators");
  const [searchTerm,        setSearchTerm]        = useState("");
  const [expandedFolders,   setExpandedFolders]   = useState<Record<string, boolean>>({});
  const [preview,           setPreview]           = useState<PreviewTarget | null>(null);
  const [pickerDocs,        setPickerDocs]        = useState<PreviewTarget[] | null>(null);

  const currentRegistry = useMemo(
    () => settings.find((s) => s.isOpen) || settings[0],
    [settings]
  );

  const perspectives = [
    "All Indicators", "Core Business", "Customer",
    "Financial", "Innovation & Learning", "Internal Process",
  ];

  useEffect(() => {
    dispatch(getAllStrategicPlans());
    dispatch(fetchRegistryStatus());
    dispatch(fetchIndicators());
    return () => { dispatch(clearIndicatorError()); };
  }, [dispatch]);

  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleViewClick = async (indicator: IIndicator) => {
    try {
      const result = await dispatch(fetchIndicatorById(indicator.id)).unwrap();
      dispatch(clearSelectedIndicator());
      const docs = getIndicatorDocs(result as IIndicator);
      console.log('📄 Documents found:', docs.length, docs);
      if (docs.length === 0) {
        console.warn('No documents found for this indicator');
        return;
      }
      if (docs.length === 1) {
        console.log('📄 Setting single preview:', docs[0]);
        setPreview(docs[0]);
      } else {
        console.log('📄 Setting picker with multiple docs:', docs.length);
        setPickerDocs(docs);
      }
    } catch (error) {
      console.error('Error fetching indicator:', error);
    }
  };

  const handlePickerSelect = (doc: PreviewTarget) => {
    setPickerDocs(null);
    setPreview(doc);
  };

  const filteredRegistry = useMemo(() => {
    return (plans ?? [])
      .filter(
        (plan) =>
          activePerspective === "All Indicators" ||
          plan.perspective?.toLowerCase().includes(
            activePerspective.toLowerCase().split(" ")[0]
          )
      )
      .map((plan) => {
        const filteredObjectives = (plan.objectives ?? [])
          .map((obj) => {
            const activitiesWithIndicators = (obj.activities ?? []).map((act) => ({
              activity:  act,
              indicator: indicators.find((ind) => ind.activityId === act.id),
            }));

            const matchedActivities = activitiesWithIndicators.filter(
              ({ activity }) =>
                activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                obj.title?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return {
              ...obj,
              activitiesWithIndicators: matchedActivities,
              certifiedCount: matchedActivities.filter(
                (item) => item.indicator?.status === "Completed"
              ).length,
              totalCount: matchedActivities.length,
            };
          })
          .filter((obj) => obj.activitiesWithIndicators.length > 0);

        return { ...plan, objectives: filteredObjectives };
      })
      .filter((plan) => plan.objectives.length > 0);
  }, [plans, indicators, activePerspective, searchTerm]);

  /* ── Loading ── */
  if ((loading || registryLoading) && plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Decrypting Registry Archives...
        </p>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="p-4 md:p-8 bg-[#fcfcf7] min-h-screen font-sans text-[#1a2c2c]">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-[#1d3331] p-2 rounded-lg shadow-xl shadow-[#1d3331]/20">
              <Archive className="text-[#c2a336]" size={20} />
            </div>
            <h1 className="text-2xl font-black font-serif text-[#1d3331] tracking-tight uppercase">
              PMMU Registry
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-12">
            All submitted evidence, filed automatically under each indicator
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentRegistry && (
            <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
              currentRegistry.isLocked
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              {currentRegistry.isLocked
                ? <Lock className="text-amber-600" size={16} />
                : <ShieldCheck className="text-emerald-600" size={16} />}
              <div>
                <p className="text-[8px] font-black uppercase text-slate-500 leading-none mb-1">
                  Q{currentRegistry.quarter} Window
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-tighter leading-none ${
                  currentRegistry.isLocked ? "text-amber-700" : "text-emerald-700"
                }`}>
                  {currentRegistry.isLocked ? "Archives Secured" : "Submission Open"}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              dispatch(getAllStrategicPlans());
              dispatch(fetchIndicators());
              dispatch(fetchRegistryStatus());
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:border-[#c2a336] transition-all group"
          >
            <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
            Sync
          </button>
        </div>
      </div>

      {/* LOCK BANNER */}
      {currentRegistry?.isLocked && (
        <div className="mb-8 p-4 bg-amber-600 text-white rounded-2xl flex items-center gap-4 shadow-lg">
          <div className="bg-white/20 p-2.5 rounded-xl">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider">
              Registry System Locked
            </p>
            <p className="text-[10px] font-medium opacity-90">
              {currentRegistry.lockedReason || "Formal auditing process in progress."}
            </p>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex flex-wrap gap-1 flex-1">
          {perspectives.map((p) => (
            <button
              key={p}
              onClick={() => setActivePerspective(p)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                activePerspective === p
                  ? "bg-[#1d3331] text-white shadow-lg"
                  : "bg-transparent text-slate-400 hover:text-[#1d3331]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            type="text"
            placeholder="Search Objective Folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none"
          />
        </div>
      </div>

      {/* REGISTRY GRID */}
      <div className="space-y-8">
        {filteredRegistry.map((plan) => (
          <div key={plan.id} className="space-y-4">
            <div className="flex items-center gap-4 px-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                {plan.perspective}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {plan.objectives.map((obj) => {
              const isFullyCertified =
                obj.certifiedCount === obj.totalCount && obj.totalCount > 0;

              return (
                <div
                  key={obj.id}
                  className={`bg-white rounded-[1.8rem] border transition-all duration-500 overflow-hidden ${
                    expandedFolders[obj.id]
                      ? "border-[#c2a336]/30 shadow-2xl scale-[1.01]"
                      : "border-slate-100 shadow-sm"
                  }`}
                >
                  <div
                    onClick={() => toggleFolder(obj.id)}
                    className="p-6 flex items-center justify-between cursor-pointer group hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl transition-all shadow-sm ${
                        isFullyCertified
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-500"
                      }`}>
                        {isFullyCertified
                          ? <ShieldCheck size={24} />
                          : <Folder className="fill-current" size={24} />}
                      </div>
                      <div>
                        <h3 className="text-[13px] font-black text-[#1d3331] uppercase tracking-tight group-hover:text-[#c2a336]">
                          {obj.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase ${
                            isFullyCertified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {obj.certifiedCount} / {obj.totalCount} Tasks Completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`transition-transform duration-500 ${
                      expandedFolders[obj.id] ? "rotate-180 text-[#c2a336]" : "text-slate-300"
                    }`}>
                      <ChevronDown size={22} />
                    </div>
                  </div>

                  {expandedFolders[obj.id] && (
                    <div className="p-5 bg-slate-50/40 border-t border-slate-50 space-y-3">
                      {obj.activitiesWithIndicators?.map(({ activity, indicator }) => {
                        const isCompleted  = indicator?.status === "Completed";
                        const hasIndicator = !!indicator;

                        return (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-[#c2a336]/40 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-xl ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-300"
                              }`}>
                                {isCompleted
                                  ? <ShieldCheck size={18} />
                                  : <FileText size={18} />}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-700 max-w-md line-clamp-1">
                                  {activity.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">
                                    REG-ID: {activity.id?.slice(-10).toUpperCase()}
                                  </p>
                                  {indicator && (
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${
                                      isCompleted
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-100 text-slate-500"
                                    }`}>
                                      {indicator.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => indicator && handleViewClick(indicator)}
                              disabled={!hasIndicator || detailLoading}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                !hasIndicator
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                  : isCompleted
                                  ? "bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                  : "bg-[#1d3331] text-white hover:bg-[#c2a336] hover:text-[#1d3331]"
                              }`}
                            >
                              {detailLoading && hasIndicator
                                ? <Loader2 size={12} className="animate-spin" />
                                : null}
                              {!hasIndicator ? "No Record" : "View"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredRegistry.length === 0 && (
        <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 mt-10">
          <Target className="mx-auto text-slate-200 mb-4" size={48} />
          <h3 className="text-xs font-black text-[#1d3331] uppercase tracking-[0.3em]">
            No Matching Records
          </h3>
        </div>
      )}

      {/* MODALS - Rendered at the end with proper z-index */}
      {pickerDocs && (
        <DocPickerModal
          docs={pickerDocs}
          onPick={handlePickerSelect}
          onClose={() => setPickerDocs(null)}
        />
      )}

      {/* File Preview with high z-index wrapper */}
      {preview && (
        <div className="relative z-[9999]">
          <FilePreviewModal
            url={preview.url}
            fileName={preview.fileName}
            onClose={() => setPreview(null)}
          />
        </div>
      )}
    </div>
  );
};

export default SuperAdminRegistry;