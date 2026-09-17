// Drag-to-reorder for the habit and to-do lists, built on dnd-kit so it works with a mouse,
// a finger and the keyboard. Each row gets a grip handle; only the handle starts a drag,
// so tapping a checkbox or stepper never moves a row by accident.

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { prefersReducedMotion } from '../state/fx';
import { Icon } from './Icon';

/** What a row needs to become draggable: attach `ref` and `style` to the row, and render `handle`. */
export interface SortableRow {
  ref: (el: HTMLElement | null) => void;
  style: CSSProperties;
  isDragging: boolean;
  handle: ReactNode;
}

export function SortableList<T extends { id: string }>({
  items,
  label,
  onReorder,
  disabled = false,
  className = 'habit-list',
  children,
}: {
  items: T[];
  /** Name read out by screen readers while moving a row. */
  label: (item: T) => string;
  onReorder: (orderedIds: string[]) => void;
  /** Read-only days show the list without handles. */
  disabled?: boolean;
  className?: string;
  children: (item: T, row: SortableRow | null) => ReactNode;
}) {
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a click on the handle doesn't count as one.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (disabled || items.length < 2) {
    return <ul className={className}>{items.map((item) => children(item, null))}</ul>;
  }

  const nameOf = (id: string | number) => {
    const item = items.find((i) => i.id === id);
    return item ? label(item) : 'item';
  };
  const position = (id: string | number | undefined) => items.findIndex((i) => i.id === id) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}. Use the up and down arrow keys to move it, space to drop it, or escape to cancel.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is now at position ${position(over.id)} of ${items.length}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${nameOf(active.id)} at position ${position(over.id)} of ${items.length}.` : `Dropped ${nameOf(active.id)}.`),
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'To reorder, press space on the handle, move with the arrow keys, then press space again to drop.' },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} name={label(item)}>
              {(row) => children(item, row)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, name, children }: { id: string; name: string; children: (row: SortableRow) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    // Rows snap into place instead of sliding when reduced motion is on.
    transition: prefersReducedMotion() ? null : undefined,
  });

  const handle = (
    <button type="button" className="drag-handle" ref={setActivatorNodeRef} aria-label={`Reorder ${name}`} {...attributes} {...listeners}>
      <Icon name="grip" size={14} />
    </button>
  );

  return <>{children({ ref: setNodeRef, style: { transform: CSS.Translate.toString(transform), transition }, isDragging, handle })}</>;
}
