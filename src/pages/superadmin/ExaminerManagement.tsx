import { useEffect, useState, useMemo } from "react";
import {
  Loader2, UserCheck, Folder, Search, ChevronDown,
  X, ShieldCheck, AlertTriangle, Users,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAllAssignments,
  fetchExaminers,
  assignExaminer,
  unassignExaminer,
  type IFolderAssignment,
} from "../../store/slices/examinerSlice";
import toast from "react-hot-toast";

/* ─── ASSIGN MODAL ───────────────────────────────────────────────────────── */

interface AssignModalProps {
  folder:    IFolderAssignment;
  onClose:   () => void;
}

const AssignModal = ({ folder, onClose }: AssignModalProps) => {
  const dispatch     = useAppDispatch();
  const { examiners, actionLoading } = useAppSelector((s) => s.examiner);
  const [selected, setSelected] = useState(folder.examinerId ?? "");

  const handleSave = async () => {
    if (!selected) return;
    try {
      await dispatch(
        assignExaminer({ objectiveId: folder.objectiveId, examinerId: selected })
      ).unwrap();
      toast.success("Folder assigned successfully.");
      onClose();
    } catch {
      toast.error("Failed to assign. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-[15px] font-black text-[#1d3331] uppercase tracking-tight">
              Assign Examiner
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              {folder.objectiveTitle}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {folder.examinerId && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 font-medium">
              Currently assigned to <span className="font-black">{folder.examinerName}</span>.
              Saving will replace them.
            </p>
          </div>
        )}

        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
          Select Examiner
        </label>
        <div className="relative mb-6">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium text-[#1d3331] outline-none focus:border-[#1d3331] transition-colors pr-10"
          >
            <option value="">— Choose an examiner —</option>
            {examiners.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.email})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[11px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected || actionLoading}
            className="flex-1 py-2.5 rounded-xl bg-[#1d3331] text-white text-[11px] font-black uppercase hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
            {folder.examinerId ? "Reassign" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */

const ExaminerManagement = () => {
  const dispatch = useAppDispatch();
  const { assignments, loading, actionLoading } = useAppSelector((s) => s.examiner);

  const [search,      setSearch]      = useState("");
  const [filterPerspective, setFilterPerspective] = useState("All");
  const [activeModal, setActiveModal] = useState<IFolderAssignment | null>(null);

  useEffect(() => {
    dispatch(fetchAllAssignments());
    dispatch(fetchExaminers());
  }, [dispatch]);

  const perspectives = useMemo(() => {
    const set = new Set(assignments.map((a) => a.perspective));
    return ["All", ...Array.from(set)];
  }, [assignments]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const matchPerspective = filterPerspective === "All" || a.perspective === filterPerspective;
      const matchSearch =
        a.objectiveTitle.toLowerCase().includes(search.toLowerCase()) ||
        (a.examinerName ?? "").toLowerCase().includes(search.toLowerCase());
      return matchPerspective && matchSearch;
    });
  }, [assignments, filterPerspective, search]);

  const handleUnassign = async (objectiveId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this folder?`)) return;
    try {
      await dispatch(unassignExaminer(objectiveId)).unwrap();
      toast.success("Examiner unassigned.");
    } catch {
      toast.error("Failed to unassign.");
    }
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfcf7] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#1d3331] mb-4" size={36} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading folders...
        </p>
      </div>
    );
  }

  const assigned   = assignments.filter((a) => a.examinerId).length;
  const unassigned = assignments.length - assigned;

  return (
    <div className="min-h-screen bg-[#fcfcf7] p-4 md:p-8 font-sans text-[#1a2c2c]">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-[#1d3331] p-2 rounded-lg">
            <Users className="text-[#c2a336]" size={20} />
          </div>
          <h1 className="text-2xl font-black font-serif text-[#1d3331] uppercase tracking-tight">
            Examiner Management
          </h1>
        </div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-12">
          Assign objective folders to examiners — one examiner per folder
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-3xl font-serif font-bold text-[#1d3331]">{assignments.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Total folders</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-3xl font-serif font-bold text-emerald-700">{assigned}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Assigned</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-3xl font-serif font-bold text-amber-600">{unassigned}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Unassigned</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex flex-wrap gap-1 flex-1">
          {perspectives.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPerspective(p)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                filterPerspective === p
                  ? "bg-[#1d3331] text-white"
                  : "text-slate-400 hover:text-[#1d3331]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input
            type="text"
            placeholder="Search folders or examiners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-[12px] font-medium outline-none border border-slate-100 focus:border-[#1d3331] transition-colors"
          />
        </div>
      </div>

      {/* Folder table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1d3331] text-white text-[9px] uppercase tracking-widest">
              <th className="p-4 font-bold">Objective Folder</th>
              <th className="p-4 font-bold">Perspective</th>
              <th className="p-4 font-bold text-center">Completed</th>
              <th className="p-4 font-bold">Assigned Examiner</th>
              <th className="p-4 font-bold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400 text-sm">
                  No folders found.
                </td>
              </tr>
            ) : (
              filtered.map((folder) => (
                <tr
                  key={folder.objectiveId}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Folder name */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        folder.completedCount === folder.totalActivities && folder.totalActivities > 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-500"
                      }`}>
                        {folder.completedCount === folder.totalActivities && folder.totalActivities > 0
                          ? <ShieldCheck size={16} />
                          : <Folder size={16} />}
                      </div>
                      <span className="text-[13px] font-bold text-[#1d3331]">
                        {folder.objectiveTitle}
                      </span>
                    </div>
                  </td>

                  {/* Perspective */}
                  <td className="p-4">
                    <span className="text-[10px] font-black text-[#c2a336] uppercase tracking-wider">
                      {folder.perspective}
                    </span>
                  </td>

                  {/* Completed count */}
                  <td className="p-4 text-center">
                    <span className={`text-[12px] font-black ${
                      folder.completedCount > 0 ? "text-emerald-700" : "text-slate-300"
                    }`}>
                      {folder.completedCount} / {folder.totalActivities}
                    </span>
                  </td>

                  {/* Assigned examiner */}
                  <td className="p-4">
                    {folder.examinerId ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1d3331] text-white flex items-center justify-center text-[9px] font-black uppercase">
                          {folder.examinerName?.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-[#1d3331]">{folder.examinerName}</p>
                          <p className="text-[10px] text-slate-400">{folder.examinerEmail}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setActiveModal(folder)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-[#1d3331] text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-800 transition-colors disabled:opacity-50"
                      >
                        {folder.examinerId ? "Reassign" : "Assign"}
                      </button>
                      {folder.examinerId && (
                        <button
                          onClick={() => handleUnassign(folder.objectiveId, folder.examinerName!)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 border border-rose-200 text-rose-500 rounded-lg text-[9px] font-black uppercase hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assign modal */}
      {activeModal && (
        <AssignModal
          folder={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};

export default ExaminerManagement;