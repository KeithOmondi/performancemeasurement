// ActivityReorderModal.tsx
import { useState, useEffect } from 'react';
import { X, GripVertical, Loader2 } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { useAppDispatch } from '../../store/hooks';
import { reorderActivities } from '../../store/slices/strategicPlan/strategicPlanSlice';
import toast from 'react-hot-toast';

interface ActivityReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  objectiveId: string;
  objectiveTitle: string;
  activities: Array<{ id: string; description: string }>;
}

const ActivityReorderModal = ({
  isOpen,
  onClose,
  planId,
  objectiveId,
  objectiveTitle,
  activities,
}: ActivityReorderModalProps) => {
  const dispatch = useAppDispatch();
  const [orderedActivities, setOrderedActivities] = useState(activities);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setOrderedActivities(activities);
  }, [activities]);

  if (!isOpen) return null;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(orderedActivities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedActivities(items);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const activityIds = orderedActivities.map(a => a.id);
      await dispatch(reorderActivities({ planId, objectiveId, activityIds })).unwrap();
      toast.success('Activities reordered successfully');
      onClose();
    } catch (error) {
      console.error('Failed to reorder activities:', error);
      toast.error('Failed to reorder activities. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-[#1a3a32]">Reorder Activities</h2>
            <p className="text-sm text-gray-500 mt-1">
              Objective: <span className="font-medium text-[#1a3a32]">{objectiveTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-gray-500 mb-4">
            Drag and drop to reorder activities
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="activities">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {orderedActivities.map((activity, index) => (
                    <Draggable
                      key={activity.id}
                      draggableId={activity.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border ${
                            snapshot.isDragging
                              ? 'border-emerald-400 shadow-lg bg-white'
                              : 'border-gray-200'
                          } transition-shadow`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab hover:text-emerald-600 text-gray-400"
                          >
                            <GripVertical size={20} />
                          </div>
                          <span className="flex-1 text-sm text-gray-700">
                            {activity.description || 'Untitled Activity'}
                          </span>
                          <span className="text-xs text-gray-400">
                            #{index + 1}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No activities to reorder
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || orderedActivities.length === 0}
            className="px-4 py-2 bg-[#1a3a32] text-white rounded-lg hover:bg-[#1a3a32]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Save Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityReorderModal;