import React, { useState, useEffect } from "react";
import { X, Loader2, Users } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { reassignIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import toast from "react-hot-toast";
import { shallowEqual } from "react-redux";

interface ReassignIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicator: IIndicator;
}

const ReassignIndicatorModal: React.FC<ReassignIndicatorModalProps> = ({
  isOpen,
  onClose,
  indicator,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");

  const { users, isLoading: usersLoading } = useAppSelector(
    (s) => s.users,
    shallowEqual
  );

  useEffect(() => {
    if (isOpen && users.length === 0) {
      dispatch(fetchAllUsers());
    }
    // Reset form when modal opens
    if (isOpen) {
      setSelectedUserId("");
      setReason("");
    }
  }, [isOpen, dispatch, users.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Please select a new assignee.");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        reassignIndicator({
          id: indicator.id,
          newAssigneeId: selectedUserId,
          newAssigneeModel: "User",
          reason: reason || undefined,
        })
      ).unwrap();
      toast.success("Indicator reassigned successfully.");
      onClose();
    } catch (error) {
      console.error("Reassign failed:", error);
      toast.error("Failed to reassign indicator. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentAssigneeName = indicator.assigneeDisplayName || "Unknown";
  const userOptions = users.filter((u) => u.id !== indicator.assigneeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Users size={24} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a3a32]">Reassign Indicator</h2>
            <p className="text-sm text-gray-500">
              Change the primary assignee for this indicator
            </p>
          </div>
        </div>

        {/* Indicator info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Activity:</span>{" "}
            {indicator.activityDescription || "Unknown"}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Current Assignee:</span>{" "}
            {currentAssigneeName}
          </p>
          {indicator.isMultiAssignee && (
            <p className="text-sm text-purple-600">
              <span className="font-semibold">Multi-Assignee:</span>{" "}
              {indicator.allAssignees?.length || 0} users assigned
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Assignee selection */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              New Assignee <span className="text-red-500">*</span>
            </label>
            {usersLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : userOptions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No other users available to assign.
              </p>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select a user...</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} {user.email ? `(${user.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason (optional) */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being reassigned?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedUserId || usersLoading}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Reassigning...
                </>
              ) : (
                "Reassign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignIndicatorModal;