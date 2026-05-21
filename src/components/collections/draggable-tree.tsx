"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCollectionStore, RequestItem } from "@/store/collection-store";
import { GripVertical } from "lucide-react";

interface DraggableRequestListProps {
  requests: RequestItem[];
  collectionId: string;
  folderId: string | null;
}

export function DraggableRequestList({ requests, collectionId, folderId }: DraggableRequestListProps) {
  const { reorderRequests } = useCollectionStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = requests.findIndex((r) => r.id === active.id);
    const newIndex = requests.findIndex((r) => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...requests];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    reorderRequests(collectionId, folderId, newOrder.map((r) => r.id));
  };

  const activeRequest = requests.find((r) => r.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={requests.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        {requests.map((request) => (
          <SortableRequestItem key={request.id} request={request} />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeRequest && (
          <div className="rounded border border-[var(--accent)] bg-[var(--bg-secondary)] px-2 py-1 shadow-lg">
            <div className="flex items-center gap-2">
              <MethodBadge method={activeRequest.method} />
              <span className="text-xs text-[var(--text-primary)]">{activeRequest.name}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SortableRequestItem({ request }: { request: RequestItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: request.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group/drag">
      <button
        type="button"
        className="cursor-grab rounded p-0.5 text-[var(--text-secondary)] opacity-0 group-hover/drag:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical size={12} />
      </button>
      <div className="flex-1 min-w-0">
        {/* The actual request row content is rendered by the parent */}
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
  };
  return (
    <span className={`text-[10px] font-bold ${colors[method] || "text-gray-400"}`}>
      {method}
    </span>
  );
}
