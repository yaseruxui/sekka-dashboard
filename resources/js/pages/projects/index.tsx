import { MediaThumb } from '@/components/media-thumb';
import { PageHeader, timeAgo } from '@/components/page-header';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Copy, ExternalLink, GripVertical, LayoutGrid, MoreHorizontal, Pencil, Plus, Rows3, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface ProjectRow {
    id: number;
    slug: string;
    title: string;
    category: string;
    year: string;
    cover: string;
    preview: string | null;
    aspect: string;
    blocksCount: number;
    published: boolean;
    everPublished: boolean;
    hasDraft: boolean;
    updatedAt: string | null;
}

type View = 'table' | 'cards';
type Status = 'all' | 'published' | 'draft';
const VIEW_KEY = 'sekka.projects.view';

function readView(): View {
    try {
        return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table';
    } catch {
        return 'table';
    }
}

function StatusBadge({ p }: { p: ProjectRow }) {
    if (!p.everPublished) return <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">مسودة</span>;
    if (p.hasDraft) return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">تعديلات غير منشورة</span>;
    if (!p.published) return <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">مخفي</span>;
    return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">منشور</span>;
}

function VisibilitySwitch({ p }: { p: ProjectRow }) {
    return (
        <Switch
            checked={p.published}
            disabled={!p.everPublished}
            title={p.everPublished ? undefined : 'انشر المشروع من المحرّر أولاً'}
            aria-label={p.published ? `إخفاء ${p.title} من الموقع` : `إظهار ${p.title} على الموقع`}
            onCheckedChange={(v) => router.patch(route('projects.visibility', p.id), { published: v }, { preserveScroll: true })}
        />
    );
}

function RowMenu({ p, siteUrl, onDelete }: { p: ProjectRow; siteUrl: string; onDelete: (p: ProjectRow) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`خيارات ${p.title}`}>
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={route('projects.edit', p.id)}>
                        <Pencil /> تعديل
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.post(route('projects.duplicate', p.id))}>
                    <Copy /> نسخ المشروع
                </DropdownMenuItem>
                {p.published && (
                    <DropdownMenuItem asChild>
                        <a href={`${siteUrl}/work/${p.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink /> عرض في الموقع
                        </a>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(p)}>
                    <Trash2 /> حذف
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SortableRow({ p, sortable, children }: { p: ProjectRow; sortable: boolean; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled: !sortable });
    return (
        <TableRow
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn(isDragging && 'bg-muted relative z-10 shadow')}
        >
            <TableCell className="w-10 pe-0">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    disabled={!sortable}
                    aria-label={`اسحب لترتيب ${p.title}`}
                    className="text-muted-foreground flex size-8 cursor-grab items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <GripVertical className="size-4" />
                </button>
            </TableCell>
            {children}
        </TableRow>
    );
}

function SortableCard({ p, sortable, children }: { p: ProjectRow; sortable: boolean; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled: !sortable });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('group bg-card relative flex flex-col overflow-hidden rounded-xl border', isDragging && 'z-10 shadow-lg')}
        >
            {sortable && (
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    aria-label={`اسحب لترتيب ${p.title}`}
                    className="bg-background/90 absolute start-2 top-2 z-10 flex size-8 cursor-grab items-center justify-center rounded-md border opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                >
                    <GripVertical className="size-4" />
                </button>
            )}
            {children}
        </div>
    );
}

export default function ProjectsIndex({ projects, categories }: { projects: ProjectRow[]; categories: string[] }) {
    const { siteUrl } = usePage<SharedData>().props;
    const [view, setView] = useState<View>('table');
    const [order, setOrder] = useState(projects);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<Status>('all');
    const [category, setCategory] = useState('all');
    const [deleting, setDeleting] = useState<ProjectRow | null>(null);

    useEffect(() => setView(readView()), []);
    useEffect(() => setOrder(projects), [projects]);

    const changeView = (v: View) => {
        setView(v);
        try {
            localStorage.setItem(VIEW_KEY, v);
        } catch {
            /* private mode */
        }
    };

    const filtering = q.trim() !== '' || status !== 'all' || category !== 'all';
    const visible = useMemo(
        () =>
            order.filter((p) => {
                if (q.trim() && !`${p.title} ${p.slug}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
                if (status === 'published' && !p.published) return false;
                if (status === 'draft' && p.published && !p.hasDraft) return false;
                if (category !== 'all' && p.category !== category) return false;
                return true;
            }),
        [order, q, status, category],
    );

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const next = arrayMove(
            order,
            order.findIndex((p) => p.id === active.id),
            order.findIndex((p) => p.id === over.id),
        );
        setOrder(next);
        router.post(route('projects.reorder'), { ids: next.map((p) => p.id) }, { preserveScroll: true, preserveState: true });
    };

    const newProject = () => router.post(route('projects.store'));

    return (
        <AppLayout breadcrumbs={[{ title: 'المشاريع', href: '/projects' }]}>
            <Head title="المشاريع" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-8">
                <PageHeader
                    title="المشاريع"
                    description={filtering ? 'الترتيب بالسحب متاح لما تلغي البحث والفلاتر.' : 'اسحب المشاريع لتغيير ترتيب ظهورها في صفحة أعمالنا.'}
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <a href={`${siteUrl}/work`} target="_blank" rel="noreferrer">
                                    صفحة أعمالنا <ExternalLink />
                                </a>
                            </Button>
                            <Button onClick={newProject}>
                                <Plus /> مشروع جديد
                            </Button>
                        </>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-56 flex-1 sm:max-w-80">
                        <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ابحث باسم المشروع…"
                            className="ps-9"
                            aria-label="بحث في المشاريع"
                        />
                    </div>
                    <div role="group" aria-label="الحالة" className="flex rounded-md border p-0.5">
                        {(['all', 'published', 'draft'] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={status === s}
                                onClick={() => setStatus(s)}
                                className={cn('h-8 rounded px-3 text-sm', status === s ? 'bg-muted font-semibold' : 'text-muted-foreground')}
                            >
                                {{ all: 'الكل', published: 'منشور', draft: 'مسودة' }[s]}
                            </button>
                        ))}
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-9 w-44" aria-label="المجال">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل المجالات</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div role="group" aria-label="طريقة العرض" className="ms-auto flex rounded-md border p-0.5">
                        <button
                            type="button"
                            aria-pressed={view === 'table'}
                            onClick={() => changeView('table')}
                            className={cn(
                                'flex h-8 items-center gap-1.5 rounded px-3 text-sm',
                                view === 'table' ? 'bg-muted font-semibold' : 'text-muted-foreground',
                            )}
                        >
                            <Rows3 className="size-4" /> جدول
                        </button>
                        <button
                            type="button"
                            aria-pressed={view === 'cards'}
                            onClick={() => changeView('cards')}
                            className={cn(
                                'flex h-8 items-center gap-1.5 rounded px-3 text-sm',
                                view === 'cards' ? 'bg-muted font-semibold' : 'text-muted-foreground',
                            )}
                        >
                            <LayoutGrid className="size-4" /> بطاقات
                        </button>
                    </div>
                </div>

                {visible.length === 0 ? (
                    <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center">
                        {order.length === 0 ? 'لا توجد مشاريع بعد. اضغط «مشروع جديد» للبدء.' : 'لا توجد مشاريع تطابق البحث.'}
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext
                            items={visible.map((p) => p.id)}
                            strategy={view === 'table' ? verticalListSortingStrategy : rectSortingStrategy}
                        >
                            {view === 'table' ? (
                                <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                                    <Table className="min-w-[860px]">
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="w-10">
                                                    <span className="sr-only">ترتيب</span>
                                                </TableHead>
                                                <TableHead>المشروع</TableHead>
                                                <TableHead>المجال</TableHead>
                                                <TableHead>السنة</TableHead>
                                                <TableHead>النسبة</TableHead>
                                                <TableHead>البلوكات</TableHead>
                                                <TableHead>الحالة</TableHead>
                                                <TableHead>على الموقع</TableHead>
                                                <TableHead className="w-12">
                                                    <span className="sr-only">إجراءات</span>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {visible.map((p) => (
                                                <SortableRow key={p.id} p={p} sortable={!filtering}>
                                                    <TableCell>
                                                        <Link href={route('projects.edit', p.id)} className="flex items-center gap-3">
                                                            <MediaThumb src={p.cover} className="h-10 w-14 shrink-0 rounded-md" />
                                                            <span className="min-w-0">
                                                                <strong className="block truncate">{p.title}</strong>
                                                                <span
                                                                    className="text-muted-foreground block text-xs"
                                                                    dir="ltr"
                                                                    style={{ textAlign: 'right' }}
                                                                >
                                                                    /work/{p.slug}
                                                                </span>
                                                            </span>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        {p.category && (
                                                            <span className="rounded-full border px-2.5 py-0.5 text-xs">{p.category}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{p.year}</TableCell>
                                                    <TableCell className="text-muted-foreground" dir="ltr" style={{ textAlign: 'right' }}>
                                                        {p.aspect}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{p.blocksCount}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge p={p} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <VisibilitySwitch p={p} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <RowMenu p={p} siteUrl={siteUrl} onDelete={setDeleting} />
                                                    </TableCell>
                                                </SortableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {visible.map((p) => (
                                        <SortableCard key={p.id} p={p} sortable={!filtering}>
                                            <Link href={route('projects.edit', p.id)}>
                                                <MediaThumb src={p.cover} className="aspect-[4/3] w-full" />
                                            </Link>
                                            <div className="flex flex-1 flex-col gap-2 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <Link href={route('projects.edit', p.id)} className="min-w-0">
                                                        <strong className="block truncate">{p.title}</strong>
                                                        <span className="text-muted-foreground text-xs">
                                                            {[p.category, p.year].filter(Boolean).join(' · ')}
                                                        </span>
                                                    </Link>
                                                    <RowMenu p={p} siteUrl={siteUrl} onDelete={setDeleting} />
                                                </div>
                                                <div className="mt-auto flex items-center justify-between gap-2">
                                                    <StatusBadge p={p} />
                                                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                                                        {timeAgo(p.updatedAt)}
                                                        <VisibilitySwitch p={p} />
                                                    </span>
                                                </div>
                                            </div>
                                        </SortableCard>
                                    ))}
                                </div>
                            )}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف «{deleting?.title}»؟</AlertDialogTitle>
                        <AlertDialogDescription>
                            سيُحذف المشروع مع كل بلوكاته{deleting?.published ? ' ويختفي من الموقع' : ''}. لا يمكن التراجع عن هذا. الملفات تبقى في
                            مكتبة الوسائط.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleting && router.delete(route('projects.destroy', deleting.id), { preserveScroll: true })}
                        >
                            حذف المشروع
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
