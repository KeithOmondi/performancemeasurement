// StrategicPlanEditModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Plus, Pencil } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  addObjective,
  updateObjective,
  addActivity,
  updateActivity,
} from "../../store/slices/strategicPlan/strategicPlanSlice";
import toast from "react-hot-toast";

/* ─── TYPES ────────────────────────────────────────────────────────────────── */

export interface ModalMode {
  type: "add-objective" | "edit-objective" | "add-activity" | "edit-activity";
  planId: string;
  planPerspective?: string;
  objectiveId?: string;
  currentTitle?: string;
  objectiveTitle?: string;
  activityId?: string;
  currentDescription?: string;
}

// Or if you prefer the discriminated union approach:

/*
export type ModalMode =
  | { type: "add-objective";  planId: string; planPerspective: string }
  | { type: "edit-objective"; planId: string; objectiveId: string; currentTitle: string }
  | { type: "add-activity";   planId: string; objectiveId: string; objectiveTitle: string }
  | { type: "edit-activity";  planId: string; objectiveId: string; activityId: string; currentDescription: string };
*/

interface Props {
  mode: ModalMode;
  onClose: () => void;
}

interface ModalMeta {
  heading: string;
  label: string;
  placeholder: string;
}

/* ─── CONFIG ───────────────────────────────────────────────────────────────── */

const LABELS: Record<ModalMode["type"], ModalMeta> = {
  "add-objective": {
    heading: "Add Objective",
    label: "Objective Title",
    placeholder: "e.g. Improve case disposal rate",
  },
  "edit-objective": {
    heading: "Edit Objective",
    label: "Objective Title",
    placeholder: "e.g. Improve case disposal rate",
  },
  "add-activity": {
    heading: "Add Activity",
    label: "Activity Description",
    placeholder: "e.g. Train judicial officers on e-filing",
  },
  "edit-activity": {
    heading: "Edit Activity",
    label: "Activity Description",
    placeholder: "e.g. Train judicial officers on e-filing",
  },
};

/* ─── COMPONENT ───────────────────────────────────────────────────────────── */

const StrategicPlanEditModal = ({ mode, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const actionLoading = useAppSelector((state) => state.strategicPlan.actionLoading);

  const getInitialValue = (): string => {
    switch (mode.type) {
      case "edit-objective":
        return mode.currentTitle || "";
      case "edit-activity":
        return mode.currentDescription || "";
      default:
        return "";
    }
  };

  const [value, setValue] = useState(getInitialValue());

  const meta = LABELS[mode.type];
  const isEdit = mode.type === "edit-objective" || mode.type === "edit-activity";

  const getSubtitle = (): string => {
    switch (mode.type) {
      case "add-activity":
        return `Under: ${mode.objectiveTitle || ""}`;
      case "edit-activity":
        return "Editing activity";
      case "add-objective":
        return `Plan: ${mode.planPerspective || ""}`;
      case "edit-objective":
        return "Editing objective";
      default:
        return "";
    }
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(`${meta.label} cannot be empty.`);
      return;
    }

    try {
      switch (mode.type) {
        case "add-objective":
          await dispatch(addObjective({ planId: mode.planId, title: trimmed })).unwrap();
          toast.success("Objective added.");
          break;

        case "edit-objective":
          await dispatch(
            updateObjective({
              planId: mode.planId,
              objectiveId: mode.objectiveId || "",
              title: trimmed,
            })
          ).unwrap();
          toast.success("Objective updated.");
          break;

        case "add-activity":
          await dispatch(
            addActivity({
              planId: mode.planId,
              objectiveId: mode.objectiveId || "",
              description: trimmed,
            })
          ).unwrap();
          toast.success("Activity added.");
          break;

        case "edit-activity":
          await dispatch(
            updateActivity({
              planId: mode.planId,
              objectiveId: mode.objectiveId || "",
              activityId: mode.activityId || "",
              description: trimmed,
            })
          ).unwrap();
          toast.success("Activity updated.");
          break;
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
    }
  };

  const subtitle = getSubtitle();

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a3a32] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEdit ? (
              <Pencil size={16} className="text-[#c2a336]" />
            ) : (
              <Plus size={16} className="text-[#c2a336]" />
            )}
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-white">
                {meta.heading}
              </h2>
              {subtitle && (
                <p className="text-[9px] text-white/50 mt-0.5 truncate max-w-[260px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              {meta.label}
            </label>
            <textarea
              autoFocus
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[13px] text-[#1a3a32] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1a3a32]/20 focus:border-[#1a3a32] resize-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <p className="text-[9px] text-slate-400 mt-1">
              Press Enter to save · Shift+Enter for new line
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={actionLoading}
              className="flex-1 border border-slate-200 text-slate-500 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={actionLoading || !value.trim()}
              className="flex-1 bg-[#1a3a32] text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default StrategicPlanEditModal;