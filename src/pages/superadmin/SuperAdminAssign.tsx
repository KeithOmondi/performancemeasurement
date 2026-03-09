import { useState, useMemo, useEffect } from "react";
import { X, Loader2, Trash2, CalendarRange, CalendarDays, Hash, Percent, Target } from "lucide-react"; 
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import { createIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

interface SuperAdminAssignProps {
  onClose: () => void;
}

const SuperAdminAssign = ({ onClose }: SuperAdminAssignProps) => {
  const dispatch = useAppDispatch();
  
  const { plans } = useAppSelector((state) => state.strategicPlan);
  const { users, isLoading: usersLoading } = useAppSelector((state) => state.users);
  const { createLoading } = useAppSelector((state) => state.indicators);
  const { user } = useAppSelector((state) => state.auth); 

  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState("");
  const [selectedObjectiveId, setSelectedObjectiveId] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  
  const [assignmentType, setAssignmentType] = useState<"Individual" | "Team">("Individual");
  const [reportingCycle, setReportingCycle] = useState<"Quarterly" | "Annual">("Quarterly");
  
  const [weight, setWeight] = useState<number>(5);
  const [unit, setUnit] = useState<string>("%");
  const [target, setTarget] = useState<number>(100);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  /* ---------------- HELPERS ---------------- */

  const selectedPlan = useMemo(() => 
    plans.find((p) => p._id === selectedPerspectiveId), 
    [plans, selectedPerspectiveId]
  );

  const selectedObjective = useMemo(() => 
    selectedPlan?.objectives.find((obj) => obj._id === selectedObjectiveId),
    [selectedPlan, selectedObjectiveId]
  );

  useEffect(() => {
    if (selectedObjective) {
      setWeight(selectedObjective.weight || 5);
      setUnit(selectedObjective.unit || "%");
      setTarget(selectedObjective.target || 100); 
    }
  }, [selectedObjective]);

  const handleAddUser = (id: string) => {
    if (!id) return;
    if (assignmentType === "Individual") {
      setSelectedUserIds([id]); 
    } else {
      if (!selectedUserIds.includes(id)) {
        setSelectedUserIds([...selectedUserIds, id]); 
      } else {
        toast.error("User already added to team");
      }
    }
  };

  const handleRemoveUser = (id: string) => {
    setSelectedUserIds(selectedUserIds.filter(userId => userId !== id));
  };

  const handleAssign = async () => {
    if (selectedUserIds.length === 0) {
      return toast.error("Please select at least one assignee");
    }

    // LOGIC FIX: Ensure assignee is correctly structured for the DB
    // Individual -> Single String ID
    // Team -> Array of String IDs
    const finalAssignee = assignmentType === "Individual" 
      ? selectedUserIds[0] 
      : selectedUserIds;

    const payload: Partial<IIndicator> = {
      strategicPlanId: selectedPerspectiveId,
      objectiveId: selectedObjectiveId,
      activityId: selectedActivityId,
      assignee: finalAssignee as any, 
      assignmentType: assignmentType === "Individual" ? "User" : "Team",
      reportingCycle,
      weight: Number(weight), 
      unit: unit.trim(),
      target: Number(target), 
      deadline,
      instructions,
      assignedBy: user?.id,
    };

    try {
      await dispatch(createIndicator(payload)).unwrap();
      toast.success(`KPI Assigned Successfully to ${assignmentType}`);
      onClose();
    } catch (error: any) {
      toast.error(error || "Failed to assign indicator");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100] backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-[600px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1a3a32] text-white px-6 py-5 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Assign KPI Indicator</h2>
            <p className="text-[10px] opacity-70 uppercase tracking-widest font-medium">Strategic Management Portal</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* STEP 1: PERSPECTIVE & INDICATOR */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Perspective</label>
              <select 
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
                value={selectedPerspectiveId}
                onChange={(e) => {
                  setSelectedPerspectiveId(e.target.value);
                  setSelectedObjectiveId("");
                  setSelectedActivityId("");
                }}
              >
                <option value="">Select Perspective...</option>
                {plans.map(p => <option key={p._id} value={p._id}>{p.perspective}</option>)}
              </select>
            </div>
            <div className={`space-y-1 ${!selectedPerspectiveId && 'opacity-40'}`}>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Indicator</label>
              <select 
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
                value={selectedObjectiveId}
                onChange={(e) => {
                  setSelectedObjectiveId(e.target.value);
                  setSelectedActivityId("");
                }}
                disabled={!selectedPerspectiveId}
              >
                <option value="">Select Indicator...</option>
                {selectedPlan?.objectives.map(obj => <option key={obj._id} value={obj._id}>{obj.title}</option>)}
              </select>
            </div>
          </div>

          <div className={`space-y-1 ${!selectedObjectiveId && 'opacity-40'}`}>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Activity / Sub-Indicator</label>
            <select 
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              disabled={!selectedObjectiveId}
            >
              <option value="">Select Activity...</option>
              {selectedObjective?.activities.map(act => <option key={act._id} value={act._id}>{act.description}</option>)}
            </select>
          </div>

          <div className={`grid grid-cols-3 gap-3 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100 ${!selectedObjectiveId && 'opacity-40'}`}>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-emerald-800 uppercase flex items-center gap-1">
                  <Hash size={12} /> Weight
                </label>
                <input 
                  type="number"
                  className="w-full border border-emerald-100 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  disabled={!selectedObjectiveId}
                />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-emerald-800 uppercase flex items-center gap-1">
                  <Percent size={12} /> Unit
                </label>
                <input 
                  type="text"
                  className="w-full border border-emerald-100 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="%"
                  disabled={!selectedObjectiveId}
                />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-emerald-800 uppercase flex items-center gap-1">
                  <Target size={12} /> Target
                </label>
                <input 
                  type="number"
                  className="w-full border border-emerald-100 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  disabled={!selectedObjectiveId}
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Reporting Cycle</label>
              <div className="flex bg-gray-100/80 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setReportingCycle("Quarterly")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black rounded-lg transition-all ${reportingCycle === "Quarterly" ? "bg-white shadow-sm text-emerald-800" : "text-gray-500"}`}
                >
                  <CalendarRange size={14} /> QUARTERLY
                </button>
                <button 
                  type="button"
                  onClick={() => setReportingCycle("Annual")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black rounded-lg transition-all ${reportingCycle === "Annual" ? "bg-white shadow-sm text-emerald-800" : "text-gray-500"}`}
                >
                  <CalendarDays size={14} /> ANNUAL
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Assignment Type</label>
              <div className="flex bg-gray-100/80 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => { setAssignmentType("Individual"); setSelectedUserIds([]); }}
                  className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${assignmentType === "Individual" ? "bg-white shadow-sm text-emerald-800" : "text-gray-500"}`}
                >INDIVIDUAL</button>
                <button 
                  type="button"
                  onClick={() => { setAssignmentType("Team"); setSelectedUserIds([]); }}
                  className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${assignmentType === "Team" ? "bg-white shadow-sm text-emerald-800" : "text-gray-500"}`}
                >TEAM</button>
              </div>
            </div>
          </div>

          {/* STAFF SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2 tracking-wider">
              {assignmentType === "Individual" ? "Select Assignee" : "Add Team Members"}
              {usersLoading && <Loader2 size={12} className="animate-spin text-emerald-600" />}
            </label>
            <select 
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50/50 outline-none focus:ring-2 focus:ring-emerald-500"
              onChange={(e) => handleAddUser(e.target.value)}
              value=""
              disabled={usersLoading}
            >
              <option value="">{usersLoading ? "Fetching staff list..." : "Choose personnel..."}</option>
              {users.filter(u => u.isActive).map(u => (
                <option key={u._id} value={u._id}>{u.name} — {u.title || u.role}</option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2 pt-2">
              {selectedUserIds.map(uid => {
                const userObj = users.find(u => u._id === uid);
                return (
                  <div key={uid} className="flex items-center gap-2 bg-[#1a3a32] text-white px-4 py-1.5 rounded-full shadow-md animate-in slide-in-from-bottom-1">
                    <span className="text-[11px] font-bold">{userObj?.name}</span>
                    <button onClick={() => handleRemoveUser(uid)} className="hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FINAL FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Deadline</label>
              <input 
                type="date" 
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Evidence Instructions</label>
              <textarea 
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500"
                rows={1}
                placeholder="Specify required evidence..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-gray-50 border-t flex justify-end items-center gap-4 shrink-0">
          <button onClick={onClose} className="text-xs font-black text-gray-400 uppercase hover:text-gray-600 transition-colors">Cancel</button>
          <button 
            disabled={!selectedActivityId || selectedUserIds.length === 0 || !deadline || createLoading}
            onClick={handleAssign}
            className="bg-[#1a3a32] hover:bg-[#142e27] text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98]"
          >
            {createLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAssign;