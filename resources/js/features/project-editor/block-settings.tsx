import { DropZone } from '@/components/drop-zone';
import InputError from '@/components/input-error';
import { MediaField } from '@/components/media-field';
import { MediaPicker } from '@/components/media-picker';
import { MediaThumb } from '@/components/media-thumb';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { type MediaItem } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePage } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { type Block, BLOCK_LABELS, embedSrc, type Media, SPACING_LABELS, toMedia, withDims } from './model';

type Patch = (fn: (b: Block) => Block, key?: string) => void;
type Errors = Record<string, string>;

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-1.5">
            <Label>{label}</Label>
            {hint && <p className="text-muted-foreground -mt-1 text-xs">{hint}</p>}
            {children}
            <InputError message={error} />
        </div>
    );
}

function Segmented<T extends string>({
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: [T, string][];
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div role="group" aria-label={label} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            {options.map(([v, text]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => onChange(v)}
                    className={cn(
                        'h-9 rounded-md border text-sm',
                        value === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted',
                    )}
                >
                    {text}
                </button>
            ))}
        </div>
    );
}

function GridItem({ m, index, onRemove, onAlt }: { m: Media; index: number; onRemove: () => void; onAlt: (alt: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `${index}:${m.src}` });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className="bg-background group relative overflow-hidden rounded-md border"
        >
            <div {...attributes} {...listeners} className="cursor-grab" aria-label={`اسحب لترتيب العنصر ${index + 1}`}>
                <MediaThumb src={m.src} className="aspect-square w-full" />
            </div>
            <button
                type="button"
                onClick={onRemove}
                aria-label="إزالة من الشبكة"
                className="bg-background/90 absolute start-1 top-1 flex size-6 items-center justify-center rounded border opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
                <X className="size-3.5" />
            </button>
            <input
                value={m.alt}
                onChange={(e) => onAlt(e.target.value)}
                placeholder="وصف بديل"
                aria-label={`الوصف البديل للعنصر ${index + 1}`}
                className="w-full border-t px-1.5 py-1 text-[11px] outline-none"
            />
        </div>
    );
}

function GridItems({ items, onChange }: { items: Media[]; onChange: (items: Media[], key?: string) => void }) {
    const { siteUrl } = usePage<SharedData>().props;
    const [picking, setPicking] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const ids = items.map((m, i) => `${i}:${m.src}`);
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        onChange(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
    };
    const add = async (list: MediaItem[]) => onChange([...items, ...(await Promise.all(list.map((i) => withDims(i, siteUrl)))).map(toMedia)]);

    return (
        <DropZone accept="any" multiple onUploaded={add} label="أفلت لإضافتها للشبكة" className="rounded-lg">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={ids} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 gap-2">
                        {items.map((m, i) => (
                            <GridItem
                                key={ids[i]}
                                m={m}
                                index={i}
                                onRemove={() => onChange(items.filter((_, j) => j !== i))}
                                onAlt={(alt) =>
                                    onChange(
                                        items.map((x, j) => (j === i ? { ...x, alt } : x)),
                                        `grid-alt-${i}`,
                                    )
                                }
                            />
                        ))}
                        <button
                            type="button"
                            onClick={() => setPicking(true)}
                            className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs"
                        >
                            <Plus className="size-4" /> إضافة
                        </button>
                    </div>
                </SortableContext>
            </DndContext>
            <p className="text-muted-foreground mt-2 text-xs">اسحب الصور لترتيبها، أو أفلت ملفات من جهازك هنا.</p>
            <MediaPicker open={picking} onOpenChange={setPicking} multiple onSelect={add} title="إضافة إلى الشبكة" />
        </DropZone>
    );
}

/** The block's content fields, by type. */
function ContentFields({ block: b, patch, errors, prefix }: { block: Block; patch: Patch; errors: Errors; prefix: string }) {
    const { siteUrl } = usePage<SharedData>().props;
    const err = (k: string) => errors[`${prefix}.${k}`];
    const setMedia = async (item: Parameters<React.ComponentProps<typeof MediaField>['onChange']>[0]) => {
        if (!item) return;
        const m = toMedia(await withDims(item, siteUrl));
        patch((x) => ({ ...x, media: m }) as Block);
    };

    switch (b.type) {
        case 'text':
            return (
                <>
                    <Field label="العنوان" error={err('title')}>
                        <Input
                            value={b.title}
                            onChange={(e) => patch((x) => ({ ...x, title: e.target.value }) as Block, 'title')}
                            placeholder="مثل: التحدي"
                        />
                    </Field>
                    <Field label="النص" hint="سطر فاضي يبدأ فقرة جديدة." error={err('body')}>
                        <Textarea rows={8} value={b.body} onChange={(e) => patch((x) => ({ ...x, body: e.target.value }) as Block, 'body')} />
                    </Field>
                    <Field label="المحاذاة">
                        <Segmented
                            label="المحاذاة"
                            value={b.align}
                            options={[
                                ['start', 'بداية'],
                                ['center', 'وسط'],
                            ]}
                            onChange={(v) => patch((x) => ({ ...x, align: v }) as Block)}
                        />
                    </Field>
                </>
            );
        case 'image':
            return (
                <>
                    <Field label="الصورة" error={err('media.src') || err('media.width') || err('media')}>
                        <MediaField
                            value={b.media?.src}
                            accept="image"
                            onChange={setMedia}
                            dims={b.media ? `${b.media.width} × ${b.media.height}` : null}
                            invalid={!!err('media')}
                        />
                    </Field>
                    <Field label="الوصف البديل" hint="يقرأه قارئ الشاشة ومحركات البحث.">
                        <Input
                            value={b.media?.alt ?? ''}
                            onChange={(e) => patch((x) => ({ ...x, media: { ...(x as typeof b).media, alt: e.target.value } }) as Block, 'alt')}
                        />
                    </Field>
                    <Field label="تعليق تحت الصورة">
                        <Input value={b.caption} onChange={(e) => patch((x) => ({ ...x, caption: e.target.value }) as Block, 'caption')} />
                    </Field>
                </>
            );
        case 'video':
            return (
                <>
                    <Field label="الفيديو" error={err('media.src') || err('media.width') || err('media')}>
                        <MediaField
                            value={b.media?.src}
                            accept="video"
                            onChange={setMedia}
                            dims={b.media ? `${b.media.width} × ${b.media.height}` : null}
                            invalid={!!err('media')}
                        />
                    </Field>
                    <Field label="طريقة التشغيل">
                        <Segmented
                            label="طريقة التشغيل"
                            value={b.mode}
                            options={[
                                ['loop', 'متكرر بدون صوت'],
                                ['player', 'مشغّل بأزرار'],
                            ]}
                            onChange={(v) => patch((x) => ({ ...x, mode: v }) as Block)}
                        />
                    </Field>
                    {b.mode === 'player' && (
                        <Field label="صورة قبل التشغيل" hint="اختياري.">
                            <MediaField
                                value={b.poster}
                                accept="image"
                                clearable
                                compact
                                onChange={(item) => patch((x) => ({ ...x, poster: item?.url ?? null }) as Block)}
                            />
                        </Field>
                    )}
                    <Field label="تعليق تحت الفيديو">
                        <Input value={b.caption} onChange={(e) => patch((x) => ({ ...x, caption: e.target.value }) as Block, 'caption')} />
                    </Field>
                </>
            );
        case 'grid':
            return (
                <>
                    <Field label="الصور والفيديوهات" error={err('items')}>
                        <GridItems items={b.items} onChange={(items, key) => patch((x) => ({ ...x, items }) as Block, key)} />
                    </Field>
                    <Field label="عدد العناصر في الصف" error={err('perRow')}>
                        <Segmented
                            label="عدد العناصر في الصف"
                            value={String(b.perRow) as '1' | '2' | '3' | '4'}
                            options={[
                                ['1', '1'],
                                ['2', '2'],
                                ['3', '3'],
                                ['4', '4'],
                            ]}
                            onChange={(v) => patch((x) => ({ ...x, perRow: Number(v) }) as Block)}
                        />
                    </Field>
                    <Field label={`المسافة بين الصور: ${b.gap}px`} error={err('gap')}>
                        <input
                            type="range"
                            min={0}
                            max={64}
                            step={4}
                            value={b.gap}
                            onChange={(e) => patch((x) => ({ ...x, gap: Number(e.target.value) }) as Block, 'gap')}
                            className="accent-primary w-full"
                        />
                    </Field>
                </>
            );
        case 'embed': {
            const ok = !!embedSrc(b.url);
            return (
                <>
                    <Field
                        label="رابط الفيديو"
                        hint="رابط صفحة الفيديو على يوتيوب أو فيميو."
                        error={err('url') || (b.url && !ok ? 'هذا ليس رابط يوتيوب أو فيميو.' : undefined)}
                    >
                        <Input
                            dir="ltr"
                            value={b.url}
                            onChange={(e) => patch((x) => ({ ...x, url: e.target.value.trim() }) as Block, 'url')}
                            placeholder="https://www.youtube.com/watch?v=…"
                        />
                    </Field>
                    <Field label="تعليق تحت الفيديو">
                        <Input value={b.caption} onChange={(e) => patch((x) => ({ ...x, caption: e.target.value }) as Block, 'caption')} />
                    </Field>
                </>
            );
        }
    }
}

const BLACK = '#000000';

/** Background, spacing, width and visibility: folded away under «تنسيق». */
function FormatFields({ block: b, patch }: { block: Block; patch: Patch }) {
    const [open, setOpen] = useState(false);
    const spacing = Object.entries(SPACING_LABELS) as [Block['spacingTop'], string][];
    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium">
                تنسيق
                <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 border-t p-3">
                <Field label="العرض">
                    <Segmented
                        label="العرض"
                        value={b.width}
                        options={[
                            ['contained', 'بهوامش'],
                            ['full', 'كامل العرض'],
                        ]}
                        onChange={(v) => patch((x) => ({ ...x, width: v }))}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    {(['spacingTop', 'spacingBottom'] as const).map((k) => (
                        <Field key={k} label={k === 'spacingTop' ? 'مسافة فوق' : 'مسافة تحت'}>
                            <Select value={b[k]} onValueChange={(v) => patch((x) => ({ ...x, [k]: v as Block['spacingTop'] }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {spacing.map(([v, text]) => (
                                        <SelectItem key={v} value={v}>
                                            {text}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    ))}
                </div>
                <Field label="لون الخلفية" hint="بدون لون = أسود الصفحة. الخلفية الفاتحة تقلب النص للأسود تلقائياً.">
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={/^#[0-9a-f]{6}$/i.test(b.background ?? '') ? b.background! : BLACK}
                            onChange={(e) => patch((x) => ({ ...x, background: e.target.value }), 'bg')}
                            aria-label="اختيار اللون"
                            className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                        />
                        <Input
                            dir="ltr"
                            value={b.background ?? ''}
                            placeholder="أسود الصفحة"
                            onChange={(e) => patch((x) => ({ ...x, background: e.target.value || null }), 'bg')}
                        />
                        {b.background && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => patch((x) => ({ ...x, background: null }))}
                                aria-label="إرجاع لأسود الصفحة"
                            >
                                <X />
                            </Button>
                        )}
                    </div>
                </Field>
                <label className="flex items-center justify-between gap-2 border-t pt-3">
                    <span className="text-sm font-medium">إخفاء عن الموقع</span>
                    <Switch checked={b.hidden} onCheckedChange={(v) => patch((x) => ({ ...x, hidden: v }))} />
                </label>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function BlockSettings({
    block,
    index,
    count,
    patch,
    errors,
    onMove,
    onDuplicate,
    onDelete,
}: {
    block: Block;
    index: number;
    count: number;
    patch: Patch;
    errors: Errors;
    onMove: (delta: -1 | 1) => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">
                    {BLOCK_LABELS[block.type]}{' '}
                    <span className="text-muted-foreground font-normal">
                        · {index + 1} من {count}
                    </span>
                </h2>
                <div className="flex">
                    <Button size="icon" variant="ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="تحريك لفوق">
                        <ArrowUp />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="تحريك لتحت">
                        <ArrowDown />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => patch((x) => ({ ...x, hidden: !x.hidden }))}
                        aria-label={block.hidden ? 'إظهار' : 'إخفاء'}
                    >
                        {block.hidden ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={onDuplicate} aria-label="نسخ البلوك">
                        <Copy />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={onDelete} aria-label="حذف البلوك" className="text-destructive">
                        <Trash2 />
                    </Button>
                </div>
            </div>
            {block.hidden && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">هذا البلوك مخفي: محفوظ في المشروع لكن لا يظهر على الموقع.</p>
            )}
            <ContentFields block={block} patch={patch} errors={errors} prefix={`blocks.${index}`} />
            <FormatFields block={block} patch={patch} />
        </div>
    );
}
