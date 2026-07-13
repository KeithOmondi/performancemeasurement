import React, { useState, useEffect, useMemo } from "react";
import { X, Loader2, Users, UserPlus, UserMinus, Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addUsersToIndicator, removeUsersFromIndicator, type IIndicator } from "../../store/slices/indicatorSlice";
import { fetchAllUsers } from "../../store/slices/user/userSlice";
import toast from "react-hot-toast";

// Import the User type from your userSlice
import type { User } from "../../store/slices/user/userSlice";

interface AddUsersToIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicator: IIndicator;
}

const AddUsersToIndicatorModal: React.FC<AddUsersToIndicatorModalProps> = ({
  isOpen,
  onClose,
  indicator,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [removingUserIds, setRemovingUserIds] = useState<string[]>([]);
  const [actionType, setActionType] = useState<"add" | "remove">("add");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  // Get users from Redux store
  const { users, isLoading: usersLoading } = useAppSelector((state) => ({
    users: state.users.users,
    isLoading: state.users.isLoading,
  }));

  // Memoize current assignee IDs to prevent unnecessary re-renders
  const currentAssigneeIds = useMemo(
    () => indicator.allAssignees?.map((a) => a.userId) || [],
    [indicator.allAssignees]
  );

  const primaryAssigneeId = indicator.assigneeId;

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen && !hasFetched) {
      dispatch(fetchAllUsers())
        .unwrap()
        .then(() => setHasFetched(true))
        .catch(() => {
          toast.error("Failed to load users");
        });
    }
  }, [isOpen, dispatch, hasFetched]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserIds([]);
      setRemovingUserIds([]);
      setActionType("add");
      setSearchTerm("");
      setHasFetched(false);
    }
  }, [isOpen]);

  // Reset selections when switching action type
  useEffect(() => {
    setSelectedUserIds([]);
    setRemovingUserIds([]);
    setSearchTerm("");
  }, [actionType]);

  const handleAddUsers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user to add.");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        addUsersToIndicator({
          id: indicator.id,
          userIds: selectedUserIds,
        })
      ).unwrap();
      toast.success(`${selectedUserIds.length} user(s) added successfully.`);
      onClose();
    } catch (error) {
      console.error("Add users failed:", error);
      toast.error("Failed to add users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUsers = async () => {
    if (removingUserIds.length === 0) {
      toast.error("Please select at least one user to remove.");
      return;
    }

    // Check if trying to remove primary assignee
    const removingPrimary = removingUserIds.some((id) => id === primaryAssigneeId);
    if (removingPrimary) {
      toast.error("Cannot remove the primary assignee. Use Reassign instead.");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        removeUsersFromIndicator({
          id: indicator.id,
          userIds: removingUserIds,
        })
      ).unwrap();
      toast.success(`${removingUserIds.length} user(s) removed successfully.`);
      onClose();
    } catch (error) {
      console.error("Remove users failed:", error);
      toast.error("Failed to remove users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType === "add") {
      handleAddUsers();
    } else {
      handleRemoveUsers();
    }
  };

  const toggleUserSelection = (userId: string) => {
    if (actionType === "add") {
      setSelectedUserIds((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    } else {
      setRemovingUserIds((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const isUserSelected = (userId: string) => {
    if (actionType === "add") {
      return selectedUserIds.includes(userId);
    } else {
      return removingUserIds.includes(userId);
    }
  };

  const getAssigneeDisplayName = (userId: string) => {
    const assignee = indicator.allAssignees?.find((a) => a.userId === userId);
    return assignee?.name || "Unknown";
  };

  // Get available and removable users with proper dependencies
  const availableUsers = useMemo(() => {
    return users.filter((u: User) => !currentAssigneeIds.includes(u.id));
  }, [users, currentAssigneeIds]);

  const removableUsers = useMemo(() => {
    return users.filter(
      (u: User) => currentAssigneeIds.includes(u.id) && u.id !== primaryAssigneeId
    );
  }, [users, currentAssigneeIds, primaryAssigneeId]);

  // Filtered lists - filtering logic inlined so useMemo deps are complete
  // and don't depend on a plain function that gets recreated every render.
  const filteredAvailableUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return availableUsers;
    return availableUsers.filter(
      (user: User) =>
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.pjNumber?.toLowerCase().includes(term)
    );
  }, [availableUsers, searchTerm]);

  const filteredRemovableUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return removableUsers;
    return removableUsers.filter(
      (user: User) =>
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.pjNumber?.toLowerCase().includes(term)
    );
  }, [removableUsers, searchTerm]);

  if (!isOpen) return null;

  const currentUserList = actionType === "add" ? filteredAvailableUsers : filteredRemovableUsers;
  const hasNoUsers = actionType === "add" 
    ? availableUsers.length === 0
    : removableUsers.length === 0;
  const hasNoFilteredUsers = currentUserList.length === 0;

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
          <div className="p-2 bg-purple-50 rounded-xl">
            <Users size={24} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a3a32]">Manage Assignees</h2>
            <p className="text-sm text-gray-500">
              Add or remove users from this indicator
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
            <span className="font-semibold">Current Assignees:</span>{" "}
            {currentAssigneeIds.length > 0 ? (
              <span className="text-purple-600 font-medium">
                {currentAssigneeIds.length} user(s)
                {indicator.isMultiAssignee && " (multi-assignee)"}
              </span>
            ) : (
              "None"
            )}
          </p>
          {primaryAssigneeId && (
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Primary:</span>{" "}
              {getAssigneeDisplayName(primaryAssigneeId)}
            </p>
          )}
        </div>

        {/* Action toggle */}
        <div className="flex rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setActionType("add")}
            className={`flex-1 px-4 py-2 text-sm font-bold transition-all ${
              actionType === "add"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <UserPlus size={14} className="inline mr-1" />
            Add Users
          </button>
          <button
            type="button"
            onClick={() => setActionType("remove")}
            className={`flex-1 px-4 py-2 text-sm font-bold transition-all ${
              actionType === "remove"
                ? "bg-rose-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <UserMinus size={14} className="inline mr-1" />
            Remove Users
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Search input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search users by name, email, or PJ number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={usersLoading}
              />
            </div>
          </div>

          {/* User selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {actionType === "add" ? "Select Users to Add" : "Select Users to Remove"}
              {searchTerm && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({currentUserList.length} result{currentUserList.length !== 1 ? "s" : ""})
                </span>
              )}
            </label>
            {usersLoading ? (
              <div className="flex items-center gap-2 text-gray-500 p-4 justify-center">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
                {hasNoUsers ? (
                  <p className="text-sm text-gray-500 p-2 text-center">
                    {actionType === "add"
                      ? "All available users are already assigned."
                      : "No users to remove."}
                  </p>
                ) : hasNoFilteredUsers ? (
                  <p className="text-sm text-gray-500 p-2 text-center">
                    No users match your search.
                  </p>
                ) : (
                  currentUserList.map((user: User) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isUserSelected(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {user.name}
                        </p>
                        {user.email && (
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        )}
                      </div>
                      {actionType === "add" &&
                        currentAssigneeIds.includes(user.id) && (
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Already assigned
                          </span>
                        )}
                      {actionType === "remove" &&
                        user.id === primaryAssigneeId && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Primary
                          </span>
                        )}
                    </label>
                  ))
                )}
              </div>
            )}
            {actionType === "add" && selectedUserIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedUserIds.length} user(s) selected to add
              </p>
            )}
            {actionType === "remove" && removingUserIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {removingUserIds.length} user(s) selected to remove
              </p>
            )}
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
              disabled={
                loading ||
                usersLoading ||
                (actionType === "add" && selectedUserIds.length === 0) ||
                (actionType === "remove" && removingUserIds.length === 0)
              }
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                actionType === "add"
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {actionType === "add" ? "Adding..." : "Removing..."}
                </>
              ) : (
                <>
                  {actionType === "add" ? (
                    <>
                      <UserPlus size={16} />
                      Add Users
                    </>
                  ) : (
                    <>
                      <UserMinus size={16} />
                      Remove Users
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUsersToIndicatorModal;