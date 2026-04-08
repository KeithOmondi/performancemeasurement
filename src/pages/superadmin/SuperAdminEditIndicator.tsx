import { useState, useEffect } from "react";
import { 
  X, Loader2, Hash, Percent,
  CalendarDays, Trash2, Save 
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { fetchTeams } from "../../store/slices/teamSlice";
import { updateIndicator, deleteIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface SuperAdminEditProps {
  indicator: IIndicator;
  onClose: () => void;
}

// Error handling interface for unwrap() rejections
interface KnownError {
  message?: string;
}

/* ─── MAIN COMPONENT ───────────────────────────────────────────────── */

const SuperAdminEditIndicator = ({ indicator, onClose }: SuperAdminEditProps) => {
  const dispatch = useAppDispatch();
  
  // Explicitly typing selectors helps remove implicit 'any'
  const { users } = useAppSelector((s) => s.users);
  const { teams } = useAppSelector((s) => s.teams);
  const { actionLoading } = useAppSelector((s) => s.indicators);

  // Form State
  const [assignmentType, setAssignmentType] = useState<"User" | "Team">(indicator.assignmentType);
  const [reportingCycle] = useState(indicator.reportingCycle);
  const [weight, setWeight] = useState<number>(indicator.weight);
  const [unit, setUnit] = useState<string>(indicator.unit);
  const [assignee, setAssignee] = useState<string>(indicator.assignee as string || "");
  const [deadline, setDeadline] = useState(indicator.deadline?.split("T")[0] || "");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchAllUsers());
    dispatch(fetchTeams());
  }, [dispatch]);

  const handleUpdate = async () => {
    if (!assignee) return toast.error("Please select an assignee");
    if (!deadline) return toast.error("Deadline required");

    const data: Partial<IIndicator> = {
      assignee,
      assignmentType,
      reportingCycle,
      weight,
      unit,
      deadline,
    };

    try {
      await dispatch(updateIndicator({ id: indicator.id, data })).unwrap();
      toast.success("KPI updated successfully");
      onClose();
    } catch (err) {
      const error = err as KnownError;
      toast.error(error?.message || "Failed to update KPI");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this indicator? This action cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteIndicator(indicator.id)).unwrap();
      toast.success("Indicator deleted");
      onClose();
    } catch (err) {
      const error = err as KnownError;
      toast.error(error?.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d1a17]/60 z-[500] backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black text-[#1a3a32] uppercase tracking-tight">Edit KPI</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {indicator.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full shadow-sm transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Section 1: Target & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weighting</label>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <Hash size={16} className="text-slate-400" />
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="bg-transparent font-bold text-[#1a3a32] outline-none w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <Percent size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  value={unit} 
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-transparent font-bold text-[#1a3a32] outline-none w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Assignment */}
          <div className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => { setAssignmentType("User"); setAssignee(""); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${assignmentType === "User" ? "bg-white text-[#1a3a32] shadow-sm" : "text-slate-400"}`}
              >
                Individual
              </button>
              <button
                onClick={() => { setAssignmentType("Team"); setAssignee(""); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${assignmentType === "Team" ? "bg-white text-[#1a3a32] shadow-sm" : "text-slate-400"}`}
              >
                Team
              </button>
            </div>

            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
            >
              <option value="">Select {assignmentType}...</option>
              {assignmentType === "User" 
                ? users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                : teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
              }
            </select>
          </div>

          {/* Section 3: Deadline */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <CalendarDays size={12} /> Target Deadline
            </label>
            <input 
              type="date" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-[#1a3a32] outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-6 flex gap-3">
            <button
              onClick={handleDelete}
              type="button"
              disabled={isDeleting || actionLoading}
              className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
            </button>
            
            <button
              onClick={handleUpdate}
              type="button"
              disabled={actionLoading || isDeleting}
              className="flex-1 bg-[#1a3a32] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:bg-[#244d42] transition-all disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <><Save size={18} /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminEditIndicator;