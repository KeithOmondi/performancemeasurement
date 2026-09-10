import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  MapPin,
  Calendar,
  FileText,
  Image as ImageIcon,
  Video,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchSpotCheckLibrary,
  clearLibrary,
} from "../../store/slices/spotCheckSlice";
import type { ISpotCheckLibraryItem } from "../../types/spot-check.types";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Optional initial filter to focus the picker on a specific station */
  initialStation?: string;
}

const DocIcon = ({ fileType }: { fileType?: string }) => {
  if (fileType === "image") return <ImageIcon size={14} className="text-blue-400" />;
  if (fileType === "video") return <Video size={14} className="text-purple-400" />;
  return <FileText size={14} className="text-slate-400" />;
};

const formatDate = (d?: string) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const SpotCheckPicker = ({ selectedIds, onChange, initialStation }: Props) => {
  const dispatch = useAppDispatch();
  const { libraryItems, libraryCount, loading, error } = useAppSelector(
    (s) => s.spotCheck
  );

  const [station, setStation] = useState(initialStation ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  /* Fetch on mount + when filters change (debounced) */
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(
        fetchSpotCheckLibrary({
          station: station || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: search || undefined,
          page: 1,
          pageSize: 100,
        })
      );
    }, 250);
    return () => clearTimeout(t);
  }, [dispatch, station, fromDate, toDate, search]);

  /* Clear library state when the picker unmounts */
  useEffect(() => {
    return () => {
      dispatch(clearLibrary());
    };
  }, [dispatch]);

  const toggleItem = (documentId: string) => {
    if (selectedSet.has(documentId)) {
      onChange(selectedIds.filter((id) => id !== documentId));
    } else {
      onChange([...selectedIds, documentId]);
    }
  };

  const handleRefresh = () => {
    dispatch(
      fetchSpotCheckLibrary({
        station: station || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search || undefined,
        page: 1,
        pageSize: 100,
      })
    );
  };

  const hasFilters = !!(station || fromDate || toDate || search);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description or file name…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#1a3a32]/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <MapPin
              size={10}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="Station"
              className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#1a3a32]/20"
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Calendar
              size={10}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#1a3a32]/20"
            />
          </div>
          <div className="relative">
            <Calendar
              size={10}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#1a3a32]/20"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setStation("");
              setFromDate("");
              setToDate("");
              setSearch("");
            }}
            className="text-[8px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
          <AlertCircle size={12} className="text-rose-500 mt-0.5 shrink-0" />
          <p className="text-[9px] text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* List */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : libraryItems.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
              {hasFilters ? "No matches" : "No spot checks available"}
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {libraryItems.map((item: ISpotCheckLibraryItem) => {
              const isSelected = selectedSet.has(item.documentId);
              return (
                <button
                  key={item.documentId}
                  type="button"
                  onClick={() => toggleItem(item.documentId)}
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                    isSelected
                      ? "bg-emerald-50 hover:bg-emerald-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isSelected ? (
                      <CheckSquare size={14} className="text-emerald-600" />
                    ) : (
                      <Square size={14} className="text-slate-300" />
                    )}
                  </div>
                  <div className="mt-0.5 shrink-0">
                    <DocIcon fileType={item.fileType} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-slate-700 truncate">
                      {item.description?.trim() || item.fileName}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={8} />
                        {item.station}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={8} />
                        {formatDate(item.visitDate)}
                      </span>
                    </p>
                    {item.spotCheckDescription && (
                      <p className="text-[8px] text-slate-400 mt-1 line-clamp-1 italic">
                        {item.spotCheckDescription}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer: count */}
        {libraryItems.length > 0 && (
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400">
            <span>
              Showing {libraryItems.length} of {libraryCount}
            </span>
            <span>
              {selectedIds.length} selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotCheckPicker;