import { DropZone } from '@/components/drop-zone';
import { ErrorBoundary, WidgetError } from '@/components/error-boundary';
import { FlashToasts } from '@/components/flash-toasts';
import { MediaPicker } from '@/components/media-picker';
import { timeAgo } from '@/components/page-header';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BlockSettings } from '@/features/project-editor/block-settings';
import { CasePreview, type Device, type Selection } from '@/features/project-editor/case-preview';
import { DetailsPanel } from '@/features/project-editor/details-panel';
import { Layers } from '@/features/project-editor/layers';
import {
    BLOCK_LABELS,
    blockForMedia,
    newBlock,
    newId,
    slugify,
    toMedia,
    withDims,
    type Block,
    type BlockType,
    type WorkingProject,
} from '@/features/project-editor/model';
import { useHistory } from '@/features/project-editor/use-history';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import { api } from '@/lib/http';
import { kindOf, type MediaItem } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    CloudOff,
    Copy,
    ExternalLink,
    LoaderCircle,
    Monitor,
    MoreHorizontal,
    Redo2,
    RotateCcw,
    Smartphone,
    Trash2,
    Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import * as z from 'zod/mini';

interface EditProject extends WorkingProject {
    id: number;
    published: boolean;
    everPublished: boolean;
    hasDraft: boolean;
    draftSavedAt: string | null;
    publishedAt: string | null;
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const AUTOSAVE_MS = 1500;

/** PUT projects/{id}/draft */
const draftSavedSchema = z.object({ savedAt: z.string(), hasDraft: z.boolean() });

function working(p: EditProject): WorkingProject {
    const { slug, title, title_en, summary, category, year, cover, preview, aspect, blocks } = p;
    return { slug, title, title_en: title_en ?? '', summary, category, year, cover, preview, aspect, blocks };
}

export default function ProjectEdit({
    project,
    aspects,
    categories: initialCategories,
}: {
    project: EditProject;
    aspects: string[];
    categories: string[];
}) {
    const { siteUrl } = usePage<SharedData>().props;
    const history = useHistory<WorkingProject>(working(project));
    const p = history.present;
    const [selected, setSelected] = useState<Selection>(null);
    const [device, setDevice] = useState<Device>('desktop');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState(initialCategories);
    const [slugLinked, setSlugLinked] = useState(
        () => !project.everPublished && (project.slug.startsWith('new-project') || project.slug === slugify(project.title_en ?? '')),
    );
    const [save, setSave] = useState<SaveState>('saved');
    const [savedAt, setSavedAt] = useState(project.draftSavedAt ?? project.publishedAt);
    const [hasDraft, setHasDraft] = useState(project.hasDraft);
    const [publishing, setPublishing] = useState(false);
    const [picker, setPicker] = useState<{ type: BlockType } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const lastSaved = useRef(JSON.stringify(working(project)));
    const inFlight = useRef<Promise<void> | null>(null);

    // Fresh data from the server (after publish / discard): start over from it.
    useEffect(() => {
        history.reset(working(project));
        lastSaved.current = JSON.stringify(working(project));
        setSave('saved');
        setHasDraft(project.hasDraft);
        setSavedAt(project.draftSavedAt ?? project.publishedAt);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project]);

    const saveDraft = useCallback(async () => {
        const body = JSON.stringify(history.present);
        if (body === lastSaved.current) return;
        setSave('saving');
        const run = api(route('projects.draft', project.id), { schema: draftSavedSchema, method: 'PUT', body: JSON.parse(body) })
            .then((res) => {
                lastSaved.current = body;
                setSavedAt(res.savedAt);
                setHasDraft(res.hasDraft);
                setSave(JSON.stringify(history.present) === body ? 'saved' : 'dirty');
            })
            .catch(() => setSave('error'));
        inFlight.current = run;
        await run;
        inFlight.current = null;
    }, [history.present, project.id]);

    // Autosave a little after the last change.
    useEffect(() => {
        if (JSON.stringify(p) === lastSaved.current) return;
        setSave((s) => (s === 'saving' ? s : 'dirty'));
        const t = setTimeout(() => void saveDraft(), AUTOSAVE_MS);
        return () => clearTimeout(t);
    }, [p, saveDraft]);

    useUnsavedGuard(save !== 'saved');

    // Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y) / Ctrl+S
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const k = e.key.toLowerCase();
            if (k === 'z' && !e.shiftKey) {
                e.preventDefault();
                history.undo();
            } else if ((k === 'z' && e.shiftKey) || k === 'y') {
                e.preventDefault();
                history.redo();
            } else if (k === 's') {
                e.preventDefault();
                void saveDraft();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [history, saveDraft]);

    const set = history.set;
    const selectedIndex = p.blocks.findIndex((b) => b.id === selected);
    const selectedBlock = selectedIndex >= 0 ? p.blocks[selectedIndex] : null;
    const errorBlocks = useMemo(
        () => new Set(Object.keys(errors).flatMap((k) => (k.match(/^blocks\.(\d+)/) ? [Number(k.split('.')[1])] : []))),
        [errors],
    );

    const setBlocks = (fn: (blocks: Block[]) => Block[], key?: string) => set((x) => ({ ...x, blocks: fn(x.blocks) }), key);
    const patchBlock = (id: string) => (fn: (b: Block) => Block, key?: string) =>
        setBlocks((bs) => bs.map((b) => (b.id === id ? fn(b) : b)), key && `${id}.${key}`);

    const insertAfterSelection = (blocks: Block[]) => {
        setBlocks((bs) => {
            const at = selectedIndex >= 0 ? selectedIndex + 1 : bs.length;
            return [...bs.slice(0, at), ...blocks, ...bs.slice(at)];
        });
        setSelected(blocks.at(-1)!.id);
    };

    const addBlock = (type: BlockType) => {
        if (type === 'text' || type === 'embed') insertAfterSelection([newBlock(type)]);
        else setPicker({ type });
    };

    const fromItems = async (items: MediaItem[]) => Promise.all(items.map(async (i) => toMedia(await withDims(i, siteUrl))));

    const onPicked = async (items: MediaItem[]) => {
        if (!picker || !items.length) return;
        const media = await fromItems(items);
        insertAfterSelection([newBlock(picker.type, media)]);
    };

    /** A file dropped on a block: fills / replaces its media, or becomes a new block after it. */
    const onDropMedia = async (blockId: string, items: MediaItem[]) => {
        const media = await fromItems(items);
        const target = p.blocks.find((b) => b.id === blockId);
        if (!target || !media.length) return;
        const kind = kindOf(media[0].src);
        if (target.type === 'grid') {
            patchBlock(blockId)((b) => ({ ...b, items: [...(b as typeof target).items, ...media] }));
        } else if ((target.type === 'image' && kind === 'image') || (target.type === 'video' && kind === 'video')) {
            patchBlock(blockId)((b) => ({ ...b, media: media[0] }) as Block);
        } else {
            setBlocks((bs) => {
                const at = bs.findIndex((b) => b.id === blockId) + 1;
                return [...bs.slice(0, at), blockForMedia(media), ...bs.slice(at)];
            });
        }
        setSelected(blockId);
    };

    const moveBlock = (delta: -1 | 1) =>
        setBlocks((bs) => {
            const i = selectedIndex;
            const j = i + delta;
            if (i < 0 || j < 0 || j >= bs.length) return bs;
            const next = [...bs];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });

    const duplicateBlock = () => {
        if (!selectedBlock) return;
        const copy = { ...structuredClone(selectedBlock), id: newId(selectedBlock.type) };
        insertAfterSelection([copy]);
    };

    const deleteBlock = () => {
        if (!selectedBlock) return;
        setBlocks((bs) => bs.filter((b) => b.id !== selectedBlock.id));
        setSelected(null);
        toast('تم حذف البلوك', { action: { label: 'تراجع', onClick: () => history.undo() } });
    };

    const publish = async () => {
        if (inFlight.current) await inFlight.current;
        await saveDraft();
        router.post(route('projects.publish', project.id), p as unknown as Record<string, never>, {
            preserveScroll: true,
            onStart: () => setPublishing(true),
            onFinish: () => setPublishing(false),
            onSuccess: () => setErrors({}),
            onError: (errs) => {
                setErrors(errs);
                const first = Object.keys(errs)[0];
                const block = first?.match(/^blocks\.(\d+)/);
                setSelected(block ? (p.blocks[Number(block[1])]?.id ?? null) : 'details');
                toast.error('ما قدرنا ننشر: فيه حقول ناقصة', { description: Object.values(errs)[0] });
            },
        });
    };

    const discard = () => router.delete(route('projects.draft.discard', project.id), { preserveScroll: true });

    const status = !project.everPublished ? 'مسودة' : hasDraft ? 'تعديلات غير منشورة' : project.published ? 'منشور' : 'مخفي';

    return (
        <div className="bg-muted/40 flex min-h-svh flex-col">
            <Head title={p.title || 'تعديل مشروع'} />

            <header className="bg-background sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={route('projects.index')} aria-label="رجوع إلى المشاريع">
                            <ArrowRight />
                        </Link>
                    </Button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <strong className="truncate">{p.title || 'مشروع بدون اسم'}</strong>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                    hasDraft || !project.everPublished ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900',
                                )}
                            >
                                {status}
                            </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs" aria-live="polite">
                            {save === 'saving' && (
                                <>
                                    <LoaderCircle className="size-3 animate-spin" /> جاري حفظ المسودة…
                                </>
                            )}
                            {save === 'dirty' && 'تعديلات لم تُحفظ بعد'}
                            {save === 'saved' && (
                                <>
                                    <Check className="size-3" /> {hasDraft ? `المسودة محفوظة ${timeAgo(savedAt)}` : 'مطابق للنسخة المنشورة'}
                                </>
                            )}
                            {save === 'error' && (
                                <button type="button" onClick={() => void saveDraft()} className="text-destructive flex items-center gap-1 underline">
                                    <CloudOff className="size-3" /> تعذّر حفظ المسودة، اضغط للمحاولة
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={history.undo}
                            disabled={!history.canUndo}
                            aria-label="تراجع (Ctrl+Z)"
                            title="تراجع (Ctrl+Z)"
                        >
                            <Undo2 />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={history.redo}
                            disabled={!history.canRedo}
                            aria-label="إعادة (Ctrl+Shift+Z)"
                            title="إعادة (Ctrl+Shift+Z)"
                        >
                            <Redo2 />
                        </Button>
                    </div>
                    <div role="group" aria-label="حجم المعاينة" className="bg-background flex rounded-md border p-0.5">
                        {(
                            [
                                ['desktop', Monitor, 'ديسكتوب'],
                                ['mobile', Smartphone, 'جوال'],
                            ] as const
                        ).map(([d, Icon, label]) => (
                            <button
                                key={d}
                                type="button"
                                aria-pressed={device === d}
                                onClick={() => setDevice(d)}
                                className={cn(
                                    'flex h-8 items-center gap-1.5 rounded px-2.5 text-sm',
                                    device === d ? 'bg-muted font-semibold' : 'text-muted-foreground',
                                )}
                            >
                                <Icon className="size-4" /> {label}
                            </button>
                        ))}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="خيارات المشروع">
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {project.published && (
                                <DropdownMenuItem asChild>
                                    <a href={`${siteUrl}/work/${project.slug}`} target="_blank" rel="noreferrer">
                                        <ExternalLink /> عرض النسخة المنشورة
                                    </a>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => router.post(route('projects.duplicate', project.id))}>
                                <Copy /> نسخ المشروع
                            </DropdownMenuItem>
                            {project.everPublished && hasDraft && (
                                <DropdownMenuItem onSelect={discard}>
                                    <RotateCcw /> تجاهل المسودة والرجوع للمنشور
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(true)}>
                                <Trash2 /> حذف المشروع
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={publish} disabled={publishing}>
                        {publishing && <LoaderCircle className="animate-spin" />}
                        نشر
                    </Button>
                </div>
            </header>

            <div className="grid flex-1 items-start gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
                <aside
                    className={cn(
                        'bg-card min-w-0 rounded-xl border p-4 shadow-xs xl:sticky xl:top-20 xl:max-h-[calc(100svh-6rem)] xl:overflow-y-auto',
                        selected === 'details' && 'ring-primary ring-2',
                    )}
                >
                    <DetailsPanel
                        project={p}
                        set={set}
                        errors={errors}
                        aspects={aspects}
                        categories={categories}
                        onCategories={setCategories}
                        slugLinked={slugLinked}
                        onSlugLinked={setSlugLinked}
                    />
                </aside>

                <section aria-label="المعاينة" className="flex min-w-0 flex-col gap-3">
                    <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>معاينة حيّة بشكل الموقع · اضغط على أي قسم لتعديله</span>
                        {selected && (
                            <button type="button" className="underline" onClick={() => setSelected(null)}>
                                إلغاء التحديد
                            </button>
                        )}
                    </div>
                    <div className={cn(device === 'mobile' && 'mx-auto w-full max-w-[390px]')}>
                        <ErrorBoundary fallback={WidgetError} resetKey={p}>
                            <CasePreview
                                project={p}
                                siteUrl={siteUrl}
                                device={device}
                                selected={selected}
                                onSelect={setSelected}
                                errorBlocks={errorBlocks}
                                onDropMedia={onDropMedia}
                            />
                        </ErrorBoundary>
                    </div>
                    <DropZone
                        accept="any"
                        multiple
                        onUploaded={async (items) => insertAfterSelection([blockForMedia(await fromItems(items))])}
                        label="أفلت لإضافة بلوك جديد"
                        className="rounded-xl"
                    >
                        <div className="bg-background flex flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed p-3">
                            <span className="text-muted-foreground text-sm">أضف بلوك{selectedIndex >= 0 ? ' بعد المحدد' : ''}:</span>
                            {(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => (
                                <Button key={t} type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addBlock(t)}>
                                    {BLOCK_LABELS[t]}
                                </Button>
                            ))}
                            <span className="text-muted-foreground w-full text-center text-xs">أو اسحب صوراً وفيديوهات من جهازك وأفلتها هنا</span>
                        </div>
                    </DropZone>
                </section>

                <aside className="bg-card min-w-0 rounded-xl border p-4 shadow-xs xl:sticky xl:top-20 xl:max-h-[calc(100svh-6rem)] xl:overflow-y-auto">
                    {selectedBlock ? (
                        <BlockSettings
                            key={selectedBlock.id}
                            block={selectedBlock}
                            index={selectedIndex}
                            count={p.blocks.length}
                            patch={patchBlock(selectedBlock.id)}
                            errors={errors}
                            onMove={moveBlock}
                            onDuplicate={duplicateBlock}
                            onDelete={deleteBlock}
                        />
                    ) : (
                        <Layers blocks={p.blocks} errorBlocks={errorBlocks} onReorder={(blocks) => setBlocks(() => blocks)} onSelect={setSelected} />
                    )}
                </aside>
            </div>

            <MediaPicker
                open={!!picker}
                onOpenChange={(o) => !o && setPicker(null)}
                accept={picker?.type === 'video' ? 'video' : picker?.type === 'grid' ? 'any' : 'image'}
                multiple={picker?.type === 'grid'}
                onSelect={onPicked}
                title={picker ? `بلوك ${BLOCK_LABELS[picker.type]}` : undefined}
            />

            <AlertDialog open={deleting} onOpenChange={setDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف «{p.title}»؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيُحذف المشروع مع كل بلوكاته{project.published ? ' ويختفي من الموقع' : ''}. لا يمكن التراجع عن هذا.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                lastSaved.current = JSON.stringify(p);
                                setSave('saved');
                                router.delete(route('projects.destroy', project.id));
                            }}
                        >
                            حذف المشروع
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <FlashToasts />
        </div>
    );
}
