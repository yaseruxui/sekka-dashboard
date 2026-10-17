import InputError from '@/components/input-error';
import { MediaField as MediaPickerField } from '@/components/media-field';
import { MediaThumb } from '@/components/media-thumb';
import { timeAgo } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router } from '@inertiajs/react';
import { ChevronDown, GripVertical, LoaderCircle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as z from 'zod/mini';
import { HighlightText } from './highlight-text';
import { clone, getPath, leafKeys } from './paths';
import { type Field, type ItemText, type ListField, type Section, type TextField, usedTextKeys } from './registry';
import { RichText } from './rich-text';

export type Locale = 'ar' | 'en';
type Policy = { updated: string; title: string; html: string };
export type Messages = Record<Locale, Record<string, unknown>>;
export interface SiteContentProps {
    home: Record<string, unknown> | null;
    contact: Record<string, unknown> | null;
    policy: { ar: Policy; en: Policy | null } | null;
    messages: Messages;
}

interface CardState {
    texts: Record<Locale, Record<string, unknown>>;
    data: Record<string, unknown>; // "home:path" → value
    policy?: { ar: Policy; en: Policy | null };
}

const policySchema = z.object({ updated: z.string(), title: z.string(), html: z.string() });
const recordSchema = z.record(z.string(), z.unknown());

/** Unsaved edits kept in localStorage: only restored if they still look like a CardState. */
const localDraftSchema = z.object({
    base: z.string(),
    state: z.object({
        texts: z.object({ ar: recordSchema, en: recordSchema }),
        data: recordSchema,
        policy: z.optional(z.object({ ar: policySchema, en: z.nullable(policySchema) })),
    }) satisfies z.ZodMiniType<CardState>,
});

export type CardStatus = 'saved' | 'dirty' | 'error';

const LOCALES: Locale[] = ['ar', 'en'];
const USED = usedTextKeys();
const dataKey = (doc: string, path: string) => `${doc}:${path}`;

/** Texts no section shows, for the "نصوص إضافية" cards. */
function leftoverFields(namespaces: string[], defaults: Messages): TextField[] {
    const keys = new Set<string>();
    for (const ns of namespaces) for (const l of LOCALES) leafKeys(defaults[l]?.[ns], ns).forEach((k) => keys.add(k));
    return [...keys]
        .filter((k) => !USED.has(k) && ![...USED].some((u) => k.startsWith(u + '.')))
        .sort()
        .map((key) => ({ kind: 'text', key, label: key }));
}

function textFieldsOf(fields: Field[], defaults: Messages): TextField[] {
    return fields.flatMap((f) => (f.kind === 'text' ? [f] : f.kind === 'leftovers' ? leftoverFields(f.namespaces, defaults) : []));
}

function initialState(section: Section, content: SiteContentProps, defaults: Messages): CardState {
    const texts: CardState['texts'] = { ar: {}, en: {} };
    const data: CardState['data'] = {};
    for (const l of LOCALES) {
        for (const f of textFieldsOf(section.fields, defaults)) texts[l][f.key] = (getPath(content.messages[l], f.key) as string | undefined) ?? '';
    }
    for (const f of section.fields) {
        if (f.kind === 'list') {
            if (f.texts)
                for (const l of LOCALES)
                    texts[l][f.texts.key] = clone(
                        (getPath(content.messages[l], f.texts.key) ?? getPath(defaults[l], f.texts.key) ?? []) as unknown[],
                    );
            if (f.data) data[dataKey(f.data.doc, f.data.path)] = clone((getPath(content[f.data.doc], f.data.path) ?? []) as unknown[]);
        } else if ('doc' in f) {
            data[dataKey(f.doc, f.path)] = getPath(content[f.doc], f.path) ?? '';
        } else if (f.kind === 'policy') {
            return { texts, data, policy: clone(content.policy ?? { ar: { updated: '', title: '', html: '' }, en: null }) };
        }
    }
    return { texts, data };
}

/** What changed since the server's version, in the shape PUT /site expects. */
function payload(section: string, state: CardState, base: CardState) {
    const body: Record<string, unknown> = { section };
    const texts: Record<Locale, Record<string, unknown>> = { ar: {}, en: {} };
    let anyText = false;
    for (const l of LOCALES)
        for (const [k, v] of Object.entries(state.texts[l]))
            if (JSON.stringify(v) !== JSON.stringify(base.texts[l][k])) {
                texts[l][k] = typeof v === 'string' && v.trim() === '' ? null : v;
                anyText = true;
            }
    if (anyText) body.texts = texts;
    for (const [k, v] of Object.entries(state.data)) {
        if (JSON.stringify(v) === JSON.stringify(base.data[k])) continue;
        const [doc, path] = k.split(':');
        body[doc] = { ...((body[doc] as object) ?? {}), [path]: v };
    }
    if (state.policy && JSON.stringify(state.policy) !== JSON.stringify(base.policy)) body.policy = state.policy;
    return body;
}

// --- small field pieces ------------------------------------------------------

function FieldShell({
    label,
    hint,
    error,
    counter,
    children,
    htmlFor,
}: {
    label: string;
    hint?: string;
    error?: string;
    counter?: string;
    children: React.ReactNode;
    htmlFor?: string;
}) {
    return (
        <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={htmlFor}>{label}</Label>
                {counter && <span className="text-muted-foreground text-xs tabular-nums">{counter}</span>}
            </div>
            {hint && <p className="text-muted-foreground -mt-1 text-xs">{hint}</p>}
            {children}
            <InputError message={error} />
        </div>
    );
}

function TextInput({
    f,
    value,
    placeholder,
    onChange,
    locale,
    error,
}: {
    f: TextField;
    value: string;
    placeholder: string;
    onChange: (v: string) => void;
    locale: Locale;
    error?: string;
}) {
    const id = `t-${f.key}`;
    const dir = f.ltr || locale === 'en' ? 'ltr' : 'rtl';
    return (
        <FieldShell
            label={f.label}
            hint={f.hint}
            error={error}
            htmlFor={id}
            counter={f.max ? `${(value || placeholder).length} / ${f.max}` : undefined}
        >
            {f.html ? (
                <HighlightText id={id} value={value} onChange={onChange} placeholder={placeholder} dir={dir} />
            ) : f.multiline ? (
                <Textarea id={id} dir={dir} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
            ) : (
                <Input id={id} dir={dir} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
            )}
        </FieldShell>
    );
}

// --- lists -----------------------------------------------------------------

function SortableItem({
    id,
    label,
    thumb,
    open,
    onToggle,
    onRemove,
    children,
    invalid,
}: {
    id: string;
    label: string;
    thumb?: string;
    open: boolean;
    onToggle: () => void;
    onRemove: () => void;
    children: React.ReactNode;
    invalid: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('bg-background border-b last:border-0', isDragging && 'relative z-10 shadow', invalid && 'bg-red-50')}
        >
            <div className="flex items-center gap-2 px-2 py-1.5">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    aria-label={`اسحب لترتيب ${label}`}
                    className="text-muted-foreground flex size-8 cursor-grab items-center justify-center"
                >
                    <GripVertical className="size-4" />
                </button>
                {thumb !== undefined && <MediaThumb src={thumb} className="h-8 w-12 shrink-0 rounded" />}
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1 text-start text-sm"
                >
                    <span className="truncate">{label}</span>
                    <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
                </button>
                <Button type="button" size="icon" variant="ghost" className="text-destructive size-8" onClick={onRemove} aria-label={`حذف ${label}`}>
                    <Trash2 className="size-4" />
                </Button>
            </div>
            {open && <div className="grid grid-cols-1 gap-3 px-3 pb-4 sm:grid-cols-2 [&>*]:min-w-0">{children}</div>}
        </li>
    );
}

function ListEditor({
    f,
    state,
    setState,
    locale,
    errors,
}: {
    f: ListField;
    state: CardState;
    setState: (fn: (s: CardState) => CardState) => void;
    locale: Locale;
    errors: Record<string, string>;
}) {
    const [open, setOpen] = useState<Set<number>>(new Set());
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
    const dk = f.data && dataKey(f.data.doc, f.data.path);
    const dataItems = (dk ? (state.data[dk] as Record<string, unknown>[]) : undefined) ?? [];
    const textItems = (f.texts ? (state.texts[locale][f.texts.key] as unknown[]) : undefined) ?? [];
    const count = f.data ? dataItems.length : ((state.texts.ar[f.texts!.key] as unknown[] | undefined)?.length ?? 0);
    // Stable ids for dnd while the list is open (index-based, refreshed on change).
    const ids = Array.from({ length: count }, (_, i) => `${f.label}-${i}`);

    /** Applies the same list operation to every paired list (data, texts ar, texts en). */
    const apply = (op: <T>(list: T[], blank: T) => T[]) =>
        setState((s) => {
            const next: CardState = { ...s, texts: { ar: { ...s.texts.ar }, en: { ...s.texts.en } }, data: { ...s.data } };
            if (f.data && dk) next.data[dk] = op((s.data[dk] as unknown[]) ?? [], clone(f.data.blank));
            if (f.texts)
                for (const l of LOCALES) {
                    const list = [...(((s.texts[l][f.texts.key] as unknown[]) ?? []) as unknown[])];
                    while (list.length < count) list.push(clone(f.texts.blank));
                    next.texts[l][f.texts.key] = op(list, clone(f.texts.blank));
                }
            return next;
        });

    const setItemText = (i: number, name: string | null, value: unknown) =>
        setState((s) => {
            const list = [...((s.texts[locale][f.texts!.key] as unknown[]) ?? [])];
            while (list.length <= i) list.push(clone(f.texts!.blank));
            list[i] = name === null ? value : { ...(list[i] as object), [name]: value };
            return { ...s, texts: { ...s.texts, [locale]: { ...s.texts[locale], [f.texts!.key]: list } } };
        });
    const setItemData = (i: number, name: string, value: unknown) =>
        setState((s) => ({
            ...s,
            data: { ...s.data, [dk!]: ((s.data[dk!] as Record<string, unknown>[]) ?? []).map((it, j) => (j === i ? { ...it, [name]: value } : it)) },
        }));

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        apply((list) => arrayMove(list, from, to));
        setOpen(new Set());
    };

    const itemError = (i: number) => (f.data ? Object.keys(errors).some((k) => k.startsWith(`${f.data!.doc}.${f.data!.path}.${i}.`)) : false);

    return (
        <div className="grid gap-2 sm:col-span-2">
            <div className="flex items-center justify-between">
                <Label>
                    {f.label} <span className="text-muted-foreground font-normal">({count})</span>
                </Label>
                {count > 0 && (
                    <button
                        type="button"
                        className="text-muted-foreground text-xs hover:underline"
                        onClick={() => setOpen((o) => (o.size === count ? new Set() : new Set(ids.map((_, i) => i))))}
                    >
                        {open.size === count ? 'طيّ الكل' : 'توسيع الكل'}
                    </button>
                )}
            </div>
            {f.hint && <p className="text-muted-foreground -mt-1 text-xs">{f.hint}</p>}
            {count > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                        <ol className="overflow-hidden rounded-lg border">
                            {ids.map((id, i) => {
                                const text = textItems[i];
                                const data = dataItems[i];
                                return (
                                    <SortableItem
                                        key={id}
                                        id={id}
                                        label={f.itemLabel(i, text, data)}
                                        thumb={f.thumb ? String(data?.[f.thumb] ?? '') : undefined}
                                        open={open.has(i)}
                                        invalid={itemError(i)}
                                        onToggle={() => setOpen((o) => new Set(o.has(i) ? [...o].filter((x) => x !== i) : [...o, i]))}
                                        onRemove={() => {
                                            apply((list) => list.filter((_, j) => j !== i));
                                            setOpen(new Set());
                                        }}
                                    >
                                        {f.texts &&
                                            (f.texts.fields === null ? (
                                                <FieldShell label="النص">
                                                    <Input
                                                        dir={locale === 'en' ? 'ltr' : 'rtl'}
                                                        value={String(text ?? '')}
                                                        onChange={(e) => setItemText(i, null, e.target.value)}
                                                    />
                                                </FieldShell>
                                            ) : (
                                                f.texts.fields.map((tf) => (
                                                    <ItemTextInput
                                                        key={tf.name}
                                                        tf={tf}
                                                        value={(text as Record<string, unknown>)?.[tf.name]}
                                                        locale={locale}
                                                        onChange={(v) => setItemText(i, tf.name, v)}
                                                    />
                                                ))
                                            ))}
                                        {f.data?.fields.map((df) => {
                                            const v = data?.[df.name];
                                            const err = errors[`${f.data!.doc}.${f.data!.path}.${i}.${df.name}`];
                                            if (df.kind === 'media')
                                                return (
                                                    <FieldShell key={df.name} label={df.label} error={err}>
                                                        <MediaPickerField
                                                            compact
                                                            value={String(v ?? '')}
                                                            accept={df.accept}
                                                            invalid={!!err}
                                                            onChange={(item) => item && setItemData(i, df.name, item.url)}
                                                        />
                                                    </FieldShell>
                                                );
                                            if (df.kind === 'select')
                                                return (
                                                    <FieldShell key={df.name} label={df.label} error={err}>
                                                        <Select value={String(v ?? '')} onValueChange={(nv) => setItemData(i, df.name, nv)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {df.options.map(([ov, ol]) => (
                                                                    <SelectItem key={ov} value={ov}>
                                                                        {ol}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FieldShell>
                                                );
                                            if (df.kind === 'switch')
                                                return (
                                                    <label
                                                        key={df.name}
                                                        className="flex items-center justify-between gap-2 self-end rounded-md border px-3 py-2"
                                                    >
                                                        <span className="text-sm font-medium">{df.label}</span>
                                                        <Switch checked={!!v} onCheckedChange={(nv) => setItemData(i, df.name, nv)} />
                                                    </label>
                                                );
                                            return (
                                                <FieldShell key={df.name} label={df.label} hint={df.hint} error={err}>
                                                    <Input
                                                        dir={df.ltr ? 'ltr' : undefined}
                                                        value={String(v ?? '')}
                                                        onChange={(e) => setItemData(i, df.name, e.target.value)}
                                                        aria-invalid={!!err}
                                                    />
                                                </FieldShell>
                                            );
                                        })}
                                    </SortableItem>
                                );
                            })}
                        </ol>
                    </SortableContext>
                </DndContext>
            )}
            <Button
                type="button"
                variant="outline"
                className="border-dashed"
                onClick={() => {
                    apply((list, blank) => [...list, blank]);
                    setOpen(new Set([count]));
                }}
            >
                <Plus /> {f.addLabel}
            </Button>
        </div>
    );
}

function ItemTextInput({ tf, value, locale, onChange }: { tf: ItemText; value: unknown; locale: Locale; onChange: (v: unknown) => void }) {
    const dir = locale === 'en' ? 'ltr' : 'rtl';
    if (tf.kind === 'list') {
        const rows = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
        return (
            <div className="grid gap-2 sm:col-span-2">
                <Label>{tf.label}</Label>
                {rows.map((row, r) => (
                    <div key={r} className="flex items-center gap-2">
                        {tf.fields.map((sf) => (
                            <Input
                                key={sf.name}
                                dir={dir}
                                aria-label={sf.label}
                                placeholder={sf.label}
                                value={String(row[sf.name] ?? '')}
                                onChange={(e) => onChange(rows.map((x, j) => (j === r ? { ...x, [sf.name]: e.target.value } : x)))}
                            />
                        ))}
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive shrink-0"
                            aria-label="حذف"
                            onClick={() => onChange(rows.filter((_, j) => j !== r))}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="justify-self-start"
                    onClick={() => onChange([...rows, Object.fromEntries(tf.fields.map((sf) => [sf.name, '']))])}
                >
                    <Plus /> {tf.addLabel}
                </Button>
            </div>
        );
    }
    const v = String(value ?? '');
    return (
        <FieldShell label={tf.label}>
            {tf.html ? (
                <HighlightText id={`it-${tf.name}`} value={v} onChange={onChange} dir={dir} />
            ) : (
                <Input dir={dir} value={v} onChange={(e) => onChange(e.target.value)} />
            )}
        </FieldShell>
    );
}

// --- the card --------------------------------------------------------------

export function SectionCard({
    page,
    section,
    index,
    content,
    defaults,
    meta,
    errors,
    open,
    onOpenChange,
    onStatus,
    onSubmit,
}: {
    page: string;
    section: Section;
    index: number;
    content: SiteContentProps;
    defaults: Messages;
    meta?: { at: string; by: string };
    errors: Record<string, string>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStatus: (status: CardStatus) => void;
    onSubmit: () => void;
}) {
    const base = useMemo(() => initialState(section, content, defaults), [section, content, defaults]);
    const storageKey = `sekka.site.${page}.${section.id}`;
    const [state, setState] = useState<CardState>(base);
    const [locale, setLocale] = useState<Locale>('ar');
    const [saving, setSaving] = useState(false);
    const [restored, setRestored] = useState(false);
    const dirty = JSON.stringify(state) !== JSON.stringify(base);
    const hasErrors = Object.keys(errors).length > 0;
    const textFields = textFieldsOf(section.fields, defaults);
    const bilingual = textFields.length > 0 || section.fields.some((f) => f.kind === 'policy' || (f.kind === 'list' && f.texts));

    // New server data (after a save): start from it, unless a local draft for it exists.
    useEffect(() => {
        let next = base;
        try {
            const saved = localDraftSchema.safeParse(JSON.parse(localStorage.getItem(storageKey) || 'null'));
            if (saved.success && saved.data.base === JSON.stringify(base)) {
                next = saved.data.state;
                setRestored(true);
                onOpenChange(true);
            } else localStorage.removeItem(storageKey);
        } catch {
            /* no storage */
        }
        setState(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base]);

    // Keep unsaved edits in the browser, so a closed tab does not lose them.
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                if (dirty) localStorage.setItem(storageKey, JSON.stringify({ base: JSON.stringify(base), state }));
                else localStorage.removeItem(storageKey);
            } catch {
                /* no storage */
            }
        }, 500);
        return () => clearTimeout(t);
    }, [state, dirty, base, storageKey]);

    useEffect(() => onStatus(hasErrors ? 'error' : dirty ? 'dirty' : 'saved'), [dirty, hasErrors, onStatus]);

    const save = () => {
        if (!dirty) return;
        onSubmit();
        router.put(route('site.update'), payload(`${page}.${section.id}`, state, base) as never, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: () => {
                try {
                    localStorage.removeItem(storageKey);
                } catch {
                    /* no storage */
                }
                setRestored(false);
            },
        });
    };

    const revert = () => {
        setState(base);
        setRestored(false);
        try {
            localStorage.removeItem(storageKey);
        } catch {
            /* no storage */
        }
    };

    const setText = (key: string, v: string) => setState((s) => ({ ...s, texts: { ...s.texts, [locale]: { ...s.texts[locale], [key]: v } } }));
    const setData = (doc: string, path: string, v: unknown) => setState((s) => ({ ...s, data: { ...s.data, [dataKey(doc, path)]: v } }));
    const err = (doc: string, path: string) => errors[`${doc}.${path}`];

    const renderField = (f: Field, i: number) => {
        switch (f.kind) {
            case 'text':
                return null; // rendered with textFields below, in order
            case 'leftovers':
                return null;
            case 'value':
                return (
                    <FieldShell key={i} label={f.label} hint={f.hint} error={err(f.doc, f.path)} htmlFor={`v-${f.path}`}>
                        <Input
                            id={`v-${f.path}`}
                            type={f.type ?? 'text'}
                            dir={f.ltr ? 'ltr' : undefined}
                            value={String(state.data[dataKey(f.doc, f.path)] ?? '')}
                            onChange={(e) => setData(f.doc, f.path, e.target.value)}
                            aria-invalid={!!err(f.doc, f.path)}
                        />
                    </FieldShell>
                );
            case 'number':
                return (
                    <FieldShell key={i} label={f.label} hint={f.hint} error={err(f.doc, f.path)}>
                        <Input
                            type="number"
                            dir="ltr"
                            min={f.min}
                            max={f.max}
                            step={f.step}
                            value={String(state.data[dataKey(f.doc, f.path)] ?? '')}
                            onChange={(e) => setData(f.doc, f.path, e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-32"
                        />
                    </FieldShell>
                );
            case 'media':
                return (
                    <FieldShell key={i} label={f.label} hint={f.hint} error={err(f.doc, f.path)}>
                        <MediaPickerField
                            value={String(state.data[dataKey(f.doc, f.path)] ?? '')}
                            accept={f.accept}
                            invalid={!!err(f.doc, f.path)}
                            onChange={(item) => item && setData(f.doc, f.path, item.url)}
                        />
                    </FieldShell>
                );
            case 'select':
                return (
                    <FieldShell key={i} label={f.label} error={err(f.doc, f.path)}>
                        <Select value={String(state.data[dataKey(f.doc, f.path)] ?? '')} onValueChange={(v) => setData(f.doc, f.path, v)}>
                            <SelectTrigger className="w-56">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {f.options.map(([v, l]) => (
                                    <SelectItem key={v} value={v}>
                                        {l}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FieldShell>
                );
            case 'switch':
                return (
                    <label key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5">
                        <span className="text-sm font-medium">{f.label}</span>
                        <Switch checked={!!state.data[dataKey(f.doc, f.path)]} onCheckedChange={(v) => setData(f.doc, f.path, v)} />
                    </label>
                );
            case 'list':
                return <ListEditor key={i} f={f} state={state} setState={setState} locale={locale} errors={errors} />;
            case 'policy': {
                const p = state.policy!;
                const current = p[locale];
                const setPolicy = (next: Policy | null) =>
                    setState((s) => ({ ...s, policy: { ...s.policy!, [locale]: next } as CardState['policy'] }));
                if (locale === 'en' && !current)
                    return (
                        <div
                            key={i}
                            className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm"
                        >
                            لا توجد نسخة إنجليزية؛ الموقع يعرض النسخة العربية لزوار /en.
                            <Button type="button" variant="outline" onClick={() => setPolicy({ updated: '', title: 'Privacy Policy', html: '' })}>
                                إضافة نسخة إنجليزية
                            </Button>
                        </div>
                    );
                return (
                    <div key={i} className="grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FieldShell label="العنوان" error={errors[`policy.${locale}.title`]}>
                                <Input
                                    dir={locale === 'en' ? 'ltr' : 'rtl'}
                                    value={current!.title}
                                    onChange={(e) => setPolicy({ ...current!, title: e.target.value })}
                                />
                            </FieldShell>
                            <FieldShell label="تاريخ آخر تحديث" hint="كما يظهر للزائر.">
                                <Input
                                    dir={locale === 'en' ? 'ltr' : 'rtl'}
                                    value={current!.updated}
                                    onChange={(e) => setPolicy({ ...current!, updated: e.target.value })}
                                />
                            </FieldShell>
                        </div>
                        <FieldShell label="النص" error={errors[`policy.${locale}.html`]}>
                            <RichText
                                dir={locale === 'en' ? 'ltr' : 'rtl'}
                                value={current!.html}
                                onChange={(html) => setPolicy({ ...current!, html })}
                                invalid={!!errors[`policy.${locale}.html`]}
                            />
                        </FieldShell>
                        {locale === 'en' && (
                            <Button type="button" variant="ghost" className="text-destructive justify-self-start" onClick={() => setPolicy(null)}>
                                <Trash2 /> حذف النسخة الإنجليزية
                            </Button>
                        )}
                    </div>
                );
            }
        }
    };

    const fieldOrder = section.fields.map((f, i) =>
        f.kind === 'text' ? (
            <TextInput
                key={`${f.key}-${locale}`}
                f={f}
                locale={locale}
                value={String(state.texts[locale][f.key] ?? '')}
                placeholder={String(getPath(defaults[locale], f.key) ?? '')}
                onChange={(v) => setText(f.key, v)}
            />
        ) : f.kind === 'leftovers' ? (
            leftoverFields(f.namespaces, defaults).length === 0 ? (
                <p key={i} className="text-muted-foreground text-sm">
                    لا توجد نصوص إضافية في هذه الصفحة.
                </p>
            ) : (
                leftoverFields(f.namespaces, defaults).map((lf) => (
                    <TextInput
                        key={`${lf.key}-${locale}`}
                        f={lf}
                        locale={locale}
                        value={String(state.texts[locale][lf.key] ?? '')}
                        placeholder={String(getPath(defaults[locale], lf.key) ?? '')}
                        onChange={(v) => setText(lf.key, v)}
                    />
                ))
            )
        ) : (
            renderField(f, i)
        ),
    );

    return (
        <section
            id={`section-${section.id}`}
            aria-label={section.title}
            className={cn(
                'bg-background scroll-mt-20 overflow-hidden rounded-xl border',
                dirty && 'border-orange-600',
                hasErrors && 'border-destructive',
            )}
            onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    save();
                }
            }}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <button type="button" onClick={() => onOpenChange(!open)} aria-expanded={open} className="flex min-w-0 items-center gap-3 text-start">
                    <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">{index + 1}</span>
                    <span className="min-w-0">
                        <strong className="flex items-center gap-2">
                            {section.title}
                            {dirty && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-normal text-orange-900">غير محفوظ</span>}
                            {hasErrors && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-normal text-red-900">به أخطاء</span>}
                        </strong>
                        <span className="text-muted-foreground block truncate text-xs">{section.description}</span>
                    </span>
                </button>
                <div className="flex items-center gap-2">
                    {open && bilingual && (
                        <div role="group" aria-label="لغة الحقول" className="flex rounded-md border p-0.5">
                            {LOCALES.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    aria-pressed={locale === l}
                                    onClick={() => setLocale(l)}
                                    className={cn(
                                        'h-7 min-w-10 rounded px-2.5 text-sm',
                                        locale === l ? 'bg-muted font-semibold' : 'text-muted-foreground',
                                    )}
                                >
                                    {l === 'ar' ? 'ع' : 'EN'}
                                </button>
                            ))}
                        </div>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(!open)}
                        aria-label={open ? 'طيّ القسم' : 'فتح القسم'}
                    >
                        <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                    </Button>
                </div>
            </div>

            {open && (
                <>
                    {restored && dirty && (
                        <div className="flex items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900">
                            استرجعنا تعديلات ما انحفظت من آخر زيارة.
                            <button type="button" className="underline" onClick={revert}>
                                تجاهلها
                            </button>
                        </div>
                    )}
                    {errors['texts.ar'] || errors['texts.en'] ? (
                        <p className="text-destructive border-b px-4 py-2 text-sm">{errors['texts.ar'] || errors['texts.en']}</p>
                    ) : null}
                    <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 [&>*]:min-w-0">{fieldOrder}</div>
                    <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                        <span className="text-muted-foreground text-xs">
                            {meta ? `آخر تحديث ${timeAgo(meta.at)} · ${meta.by}` : 'لم يُعدَّل من اللوحة بعد'} · Ctrl + S
                        </span>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={revert} disabled={!dirty}>
                                <RotateCcw /> تراجع عن التغييرات
                            </Button>
                            <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
                                {saving && <LoaderCircle className="animate-spin" />}
                                حفظ القسم
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
