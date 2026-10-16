import { cn } from '@/lib/utils';
import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlignRight, EyeOff, Film, GripVertical, Image, LayoutGrid, Youtube } from 'lucide-react';
import { type Block, BLOCK_LABELS, blockSummary } from './model';

const ICONS = { text: AlignRight, image: Image, video: Film, grid: LayoutGrid, embed: Youtube };

function Layer({ b, index, error, onSelect }: { b: Block; index: number; error: boolean; onSelect: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
    const Icon = ICONS[b.type];
    return (
        <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('bg-background flex items-center gap-1 rounded-md border', isDragging && 'z-10 shadow', error && 'border-destructive')}>
            <button type="button" {...attributes} {...listeners} aria-label={`اسحب لترتيب البلوك ${index + 1}`} className="text-muted-foreground flex h-10 w-8 cursor-grab items-center justify-center">
                <GripVertical className="size-4" />
            </button>
            <button type="button" onClick={onSelect} className={cn('flex min-w-0 flex-1 items-center gap-2 py-2 pe-2 text-start text-sm', b.hidden && 'opacity-50')}>
                <Icon className="size-4 shrink-0" />
                <span className="shrink-0 font-medium">{BLOCK_LABELS[b.type]}</span>
                <span className="text-muted-foreground truncate text-xs">{blockSummary(b)}</span>
                {b.hidden && <EyeOff className="ms-auto size-3.5 shrink-0" aria-label="مخفي" />}
            </button>
        </li>
    );
}

/** All blocks in order; drag to reorder, click to open a block's settings. */
export function Layers({ blocks, errorBlocks, onReorder, onSelect }: { blocks: Block[]; errorBlocks: Set<number>; onReorder: (blocks: Block[]) => void; onSelect: (id: string) => void }) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        onReorder(arrayMove(blocks, blocks.findIndex((b) => b.id === active.id), blocks.findIndex((b) => b.id === over.id)));
    };

    return (
        <div className="grid gap-3">
            <div>
                <h2 className="font-semibold">البلوكات</h2>
                <p className="text-muted-foreground text-xs">اسحب لترتيبها، أو اضغط على أي قسم في المعاينة لتعديله.</p>
            </div>
            {blocks.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">لا توجد بلوكات بعد. أضف من الشريط تحت المعاينة.</p>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                        <ol className="grid gap-1.5">
                            {blocks.map((b, i) => (
                                <Layer key={b.id} b={b} index={i} error={errorBlocks.has(i)} onSelect={() => onSelect(b.id)} />
                            ))}
                        </ol>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
