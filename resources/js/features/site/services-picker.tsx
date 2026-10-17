import { MediaThumb } from '@/components/media-thumb';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export interface ServiceOption {
    id: number;
    title: string;
    video: string;
}

const plain = (html: string) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');

function Row({ s, number, on, onToggle }: { s: ServiceOption; number: number | null; on: boolean; onToggle: (on: boolean) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('bg-background flex items-center gap-3 border-b px-2 py-2 last:border-0', isDragging && 'relative z-10 shadow')}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label={`اسحب لترتيب ${plain(s.title)}`}
                className="text-muted-foreground flex size-8 cursor-grab items-center justify-center"
            >
                <GripVertical className="size-4" />
            </button>
            <span className="text-muted-foreground w-6 text-center text-xs tabular-nums">{number ? String(number).padStart(2, '0') : '–'}</span>
            <MediaThumb src={s.video} className={cn('h-9 w-14 shrink-0 rounded', !on && 'opacity-40')} />
            <span className={cn('min-w-0 flex-1 truncate text-sm', !on && 'text-muted-foreground')}>{plain(s.title)}</span>
            <Switch
                checked={on}
                onCheckedChange={onToggle}
                aria-label={on ? `إخفاء ${plain(s.title)} من الرئيسية` : `إظهار ${plain(s.title)} بالرئيسية`}
            />
        </li>
    );
}

/**
 * The home page's services: every service with a switch (on = shown on the
 * site), dragged into order. Stored as the ids switched on, in list order.
 */
export function ServicesPicker({ value, options, onChange }: { value: number[]; options: ServiceOption[]; onChange: (ids: number[]) => void }) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const byId = new Map(options.map((o) => [o.id, o]));
    // Shown ones first, in their order; the rest after.
    const list = [...value.map((id) => byId.get(id)).filter((s): s is ServiceOption => !!s), ...options.filter((o) => !value.includes(o.id))];
    const on = new Set(value);
    const save = (order: ServiceOption[], shown: Set<number>) => onChange(order.map((s) => s.id).filter((id) => shown.has(id)));

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const ids = list.map((s) => s.id);
        save(arrayMove(list, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))), on);
    };

    let n = 0;
    return (
        <div className="grid gap-3">
            {list.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                    ما فيه خدمات للحين. أضفها من صفحة الخدمات.
                </p>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={list.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                        <ul className="overflow-hidden rounded-lg border">
                            {list.map((s) => (
                                <Row
                                    key={s.id}
                                    s={s}
                                    on={on.has(s.id)}
                                    number={on.has(s.id) ? ++n : null}
                                    onToggle={(v) => {
                                        const next = new Set(on);
                                        if (v) next.add(s.id);
                                        else next.delete(s.id);
                                        save(list, next);
                                    }}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
