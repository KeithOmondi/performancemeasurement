import { useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import toast from "react-hot-toast";

interface Props {
  indicator: IIndicator;
  onClose: () => void;
}

const SuperAdminEditIndicator = ({ indicator, onClose }: Props) => {
  const dispatch      = useAppDispatch();
  const actionLoading = useAppSelector((s) => s.indicators.actionLoading);

  const [reportingCycle, setReportingCycle] = useState<"Quarterly" | "Annual">(
    indicator.reportingCycle ?? "Quarterly"
  );

  /* Derived — no useEffect needed, recomputes on every render for free */
  const cycleWarning = reportingCycle !== indicator.reportingCycle;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (cycleWarning) {
      const confirmed = window.confirm(
        `Changing from "${indicator.reportingCycle}" to "${reportingCycle}" will permanently delete all submissions and review history for this indicator and reset its progress to zero. Continue?`
      );
      if (!confirmed) return;
    }

    try {
      await dispatch(
        updateIndicator({
          id:   indicator.id,
          data: { reportingCycle },
        })
      ).unwrap();

      toast.success("Reporting cycle updated.");
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to update indicator.";
      toast.error(message);
    }
  };

  const handleCycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReportingCycle(e.target.value as "Quarterly" | "Annual");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">

        {/* Header */}
        <div className="bg-[#1a3a32] px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-white font-serif font-bold text-lg tracking-tight">
              Edit Reporting Cycle
            </h2>
            <p className="text-white/60 text-[11px] font-medium mt-0.5 max-w-[300px] truncate">
              {indicator.activityDescription || indicator.instructions || indicator.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cycle-change warning */}
        {cycleWarning && (
          <div className="mx-6 mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              Changing the reporting cycle will{" "}
              <strong>delete all existing submissions and review history</strong> and
              reset this indicator's progress to zero. This cannot be undone.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">

          {/* Current value */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Current Cycle
            </span>
            <span className="text-[12px] font-bold text-[#1a3a32] uppercase">
              {indicator.reportingCycle}
            </span>
          </div>

          {/* Select */}
          <div>
            <label
              htmlFor="reportingCycle"
              className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5"
            >
              New Reporting Cycle
            </label>
            <select
              id="reportingCycle"
              value={reportingCycle}
              onChange={handleCycleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a3a32]/20 focus:border-[#1a3a32] transition-all"
            >
              <option value="Quarterly">Quarterly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading || !cycleWarning}
              className="px-5 py-2.5 rounded-lg bg-[#1a3a32] text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminEditIndicator;