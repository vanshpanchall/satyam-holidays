import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PiCalendarBlank, PiEye, PiFileText, PiUsers } from "react-icons/pi";
import {
  PIPELINE,
  destinationLabel,
  estimatedValue,
  inrCompact,
  isFollowUpDue,
  leadTier,
  travellersLabel,
} from "./adminUi";

const DAY_MS = 24 * 60 * 60 * 1000;
const idOf = (e) => e._id || e.id;

const COLUMN_ACCENT = {
  pending: "bg-saffron-500",
  contacted: "bg-series-2",
  quoted: "bg-violet-500",
  confirmed: "bg-emerald-500",
  cancelled: "bg-fg/30",
};

const QUOTE_LABEL = {
  draft: "Quote draft",
  sent: "Quote sent",
  accepted: "Quote accepted",
  declined: "Quote declined",
};

const daysIn = (e) => {
  const since = e.statusChangedAt || e.createdAt;
  return since ? Math.max(0, Math.floor((Date.now() - new Date(since)) / DAY_MS)) : 0;
};

const CardBody = ({ enquiry, quote }) => {
  const tier = leadTier(enquiry.leadScore);
  const days = daysIn(enquiry);
  const due = isFollowUpDue(enquiry);
  // A lead left untouched in an early stage for 3+ days is going cold
  const stale = days >= 3 && ["pending", "contacted"].includes(enquiry.status);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-fg">{enquiry.name}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.className}`}
        >
          {tier.label}
        </span>
      </div>
      <p className="mt-0.5 truncate text-sm text-muted">{destinationLabel(enquiry.destination)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {enquiry.travelDate && (
          <span className="flex items-center gap-1">
            <PiCalendarBlank className="h-3.5 w-3.5" aria-hidden="true" />
            {new Date(enquiry.travelDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
        <span className="flex items-center gap-1">
          <PiUsers className="h-3.5 w-3.5" aria-hidden="true" />
          {travellersLabel(enquiry.travelers)}
        </span>
        <span className="tabular-nums">~{inrCompact(estimatedValue(enquiry))}</span>
      </div>
      {(quote || due || stale) && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5 text-[11px] font-medium">
          {quote && (
            <span className="flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-fg">
              <PiFileText className="h-3 w-3" aria-hidden="true" />
              {QUOTE_LABEL[quote.status] || "Quote"} · {inrCompact(quote.totals?.total)}
              {quote.status === "sent" && quote.viewCount > 0 && (
                <PiEye className="h-3 w-3 text-emerald-600" aria-label="viewed by customer" />
              )}
            </span>
          )}
          {due && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-300">
              Follow-up due
            </span>
          )}
          {stale && !due && (
            <span className="rounded-full bg-saffron-500/10 px-2 py-0.5 text-saffron-800 dark:text-saffron-300">
              {days}d in stage
            </span>
          )}
        </div>
      )}
    </>
  );
};

const Card = ({ enquiry, quote, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idOf(enquiry),
    data: { status: enquiry.status },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? "opacity-40" : ""}
    >
      <div
        {...listeners}
        {...attributes}
        role="button"
        aria-roledescription="Draggable enquiry"
        aria-label={`${enquiry.name}. Press space to pick up and move between stages, or enter to open.`}
        onClick={() => onOpen(enquiry)}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          if (e.key === "Enter") onOpen(enquiry);
        }}
        className="cursor-grab touch-manipulation select-none rounded-2xl border border-line bg-surface p-3.5 shadow-sm transition hover:border-fg/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500/50 active:cursor-grabbing"
      >
        <CardBody enquiry={enquiry} quote={quote} />
      </div>
    </li>
  );
};

const Column = ({ stage, items, quotesByEnquiry, onOpen, activeId }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const value = items.reduce((sum, e) => sum + estimatedValue(e), 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.label}: ${items.length}`}
      className={`flex w-[82vw] max-w-[20rem] shrink-0 snap-start flex-col rounded-3xl border bg-raised/60 transition-colors sm:w-72 xl:w-auto xl:max-w-none ${
        isOver && activeId ? "border-saffron-500/60 bg-saffron-500/5" : "border-line"
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
            <span
              className={`h-2 w-2 rounded-full ${COLUMN_ACCENT[stage.id]}`}
              aria-hidden="true"
            />
            {stage.label}
            <span className="text-muted">{items.length}</span>
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted">{stage.hint}</p>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 text-xs tabular-nums text-muted" title="Estimated value">
            {inrCompact(value)}
          </span>
        )}
      </header>
      <ul className="flex min-h-[8rem] flex-1 flex-col gap-2.5 p-2.5 pt-1">
        {items.map((e) => (
          <Card key={idOf(e)} enquiry={e} quote={quotesByEnquiry.get(idOf(e))} onOpen={onOpen} />
        ))}
        {items.length === 0 && (
          <li className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
            Drop a lead here
          </li>
        )}
      </ul>
    </section>
  );
};

/**
 * Kanban view of enquiries. Drag a card to another column (mouse, touch press-and-hold,
 * or keyboard: space to pick up, arrows to move, space to drop) to change its status.
 */
const PipelineBoard = ({ enquiries, quotesByEnquiry, onMove, onOpen }) => {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    // Mouse rather than Pointer: pointer events also fire for touch and would hijack sideways scrolling
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press-and-hold on touch so the board can still be scrolled sideways
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    // Space picks up / drops; Enter stays free to open the lead
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  const columns = useMemo(() => {
    const map = Object.fromEntries(PIPELINE.map((s) => [s.id, []]));
    enquiries.forEach((e) => (map[e.status] || map.pending).push(e));
    // Hottest, then newest, at the top of each column
    Object.values(map).forEach((list) =>
      list.sort(
        (a, b) =>
          (b.leadScore || 0) - (a.leadScore || 0) || new Date(b.createdAt) - new Date(a.createdAt)
      )
    );
    return map;
  }, [enquiries]);

  const active = activeId ? enquiries.find((e) => idOf(e) === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active: a }) => setActiveId(a.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active: a, over }) => {
        setActiveId(null);
        if (over && over.id !== a.data.current?.status) onMove(a.id, over.id);
      }}
      accessibility={{
        announcements: {
          onDragStart: () => "Picked up lead.",
          onDragOver: ({ over }) =>
            over ? `Over ${PIPELINE.find((s) => s.id === over.id)?.label}.` : undefined,
          onDragEnd: ({ over }) =>
            over ? `Moved to ${PIPELINE.find((s) => s.id === over.id)?.label}.` : "Dropped.",
          onDragCancel: () => "Move cancelled.",
        },
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 scrollbar-none lg:-mx-8 lg:scroll-px-8 lg:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
        {PIPELINE.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            items={columns[stage.id]}
            quotesByEnquiry={quotesByEnquiry}
            onOpen={onOpen}
            activeId={activeId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="w-72 rotate-[1.5deg] cursor-grabbing rounded-2xl border border-saffron-500/50 bg-surface p-3.5 shadow-2xl">
            <CardBody enquiry={active} quote={quotesByEnquiry.get(idOf(active))} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PipelineBoard;
