import { BulkBar, BulkDeleteButton, SelectAllCheckbox, SelectCheckbox, useSelection } from '@/components/bulk-actions';
import { EmptyState } from '@/components/empty-state';
import { formatDate, PageHeader, timeAgo } from '@/components/page-header';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { pageLabel } from '@/lib/pagination';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronDown, Copy, Download, Inbox as InboxIcon, Mail, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';

type Status = 'new' | 'in_progress' | 'replied' | 'closed' | 'spam';

interface Person {
    id: number;
    name: string;
}

interface Note {
    id: number;
    body: string;
    created_at: string;
    user: Person | null;
}

interface Event {
    id: number;
    type: 'status' | 'note';
    data: { from?: Status; to?: Status } | null;
    created_at: string;
    user: Person | null;
}

interface Message {
    id: number;
    name: string;
    company: string;
    email: string;
    message: string | null;
    estimated_budget: string | null;
    locale: string | null;
    page_uri: string | null;
    submitted_at: string | null;
    created_at: string;
    status: Status;
    notes: Note[];
    events: Event[];
}

interface Props {
    messages: {
        data: Message[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    /** The ?open= message when it is not on the current page. */
    opened: Message | null;
    filters: { filter?: string; q?: string };
    counts: Record<'all' | Status, number>;
    canDelete: boolean;
}

const RELOAD = { preserveScroll: true, preserveState: true, only: ['messages', 'opened', 'counts', 'unreadMessages', 'flash'] };

const STATUSES: Record<Status, { label: string; className: string }> = {
    new: { label: 'جديد', className: 'bg-primary text-primary-foreground' },
    in_progress: { label: 'قيد المتابعة', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
    replied: { label: 'تم الرد', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
    closed: { label: 'مغلق', className: 'bg-muted text-muted-foreground' },
    spam: { label: 'مزعج', className: 'bg-destructive/10 text-destructive' },
};
const STATUS_KEYS = Object.keys(STATUSES) as Status[];

const FILTERS = ['all', ...STATUS_KEYS] as const;
type Filter = (typeof FILTERS)[number];

const badge = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold';

/** The only place a status changes: the status column of the list. */
function StatusMenu({ m }: { m: Message }) {
    const s = STATUSES[m.status];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`الحالة: ${s.label}، تغيير`}
                    className={cn(badge, 'pe-1.5', s.className)}
                >
                    {s.label}
                    <ChevronDown className="size-3.5 opacity-70" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuRadioGroup value={m.status} onValueChange={(v) => router.patch(route('inbox.status', m.id), { status: v }, RELOAD)}>
                    {STATUS_KEYS.map((k) => (
                        <DropdownMenuRadioItem key={k} value={k}>
                            {STATUSES[k].label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-muted-foreground text-xs font-semibold">{title}</h3>
                    {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[6rem_1fr] gap-3 px-3 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0">{children}</dd>
        </div>
    );
}

/** A note; its author (or an admin) can edit it in place or delete it. */
function NoteItem({ n, canEdit }: { n: Note; canEdit: boolean }) {
    const [editing, setEditing] = useState(false);
    const [body, setBody] = useState(n.body);
    const save = () => {
        if (!body.trim()) return;
        router.patch(route('inbox.notes.update', n.id), { body }, { ...RELOAD, onSuccess: () => setEditing(false) });
    };
    return (
        <div className="group bg-muted/40 rounded-lg p-3 text-sm">
            <div className="text-muted-foreground mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-foreground font-medium">{n.user?.name ?? 'مستخدم محذوف'}</span>
                <span className="flex items-center gap-1">
                    <span title={formatDate(n.created_at)}>{timeAgo(n.created_at)}</span>
                    {canEdit && !editing && (
                        <>
                            <Button variant="ghost" size="icon" className="size-6" aria-label="تعديل الملاحظة" onClick={() => setEditing(true)}>
                                <Pencil className="size-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive size-6"
                                aria-label="حذف الملاحظة"
                                onClick={() => confirm('حذف هذه الملاحظة؟') && router.delete(route('inbox.notes.destroy', n.id), RELOAD)}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </>
                    )}
                </span>
            </div>
            {editing ? (
                <div className="flex flex-col gap-2">
                    <Textarea
                        autoFocus
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && save()}
                        rows={2}
                        className="bg-background resize-none"
                    />
                    <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => (setBody(n.body), setEditing(false))}>
                            إلغاء
                        </Button>
                        <Button size="sm" disabled={!body.trim()} onClick={save}>
                            حفظ
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="whitespace-pre-wrap">{n.body}</p>
            )}
        </div>
    );
}

function describe(e: Event): string {
    if (e.type === 'note') return 'أضاف ملاحظة';
    return `غيّر الحالة من «${STATUSES[e.data?.from as Status]?.label ?? '—'}» إلى «${STATUSES[e.data?.to as Status]?.label ?? '—'}»`;
}

export default function Inbox({ messages, opened, filters, counts, canDelete }: Props) {
    const me = usePage<SharedData>().props.auth.user.id;
    const selection = useSelection(messages.data.map((m) => m.id));
    const [q, setQ] = useState(filters.q ?? '');
    const [note, setNote] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);
    const [openId, setOpenId] = useState<number | null>(() => {
        const id = Number(new URLSearchParams(window.location.search).get('open'));
        return id || null;
    });
    const [deleting, setDeleting] = useState<Message | null>(null);
    const filter: Filter = (FILTERS as readonly string[]).includes(filters.filter ?? '') ? (filters.filter as Filter) : 'all';
    const open = messages.data.find((m) => m.id === openId) ?? (opened?.id === openId ? opened : null);

    const bulkStatus = (status: Status) =>
        router.patch(route('inbox.bulk-status'), { ids: selection.selected, status }, { ...RELOAD, onSuccess: selection.clear });

    const params = (extra: Record<string, string | undefined> = {}) => ({
        q: q || undefined,
        filter: filter === 'all' ? undefined : filter,
        ...extra,
    });
    const visit = (extra: Record<string, string | undefined>) =>
        router.get(route('inbox.index'), params(extra), { preserveState: true, preserveScroll: true, replace: true });

    useEffect(() => {
        if (q === (filters.q ?? '')) return;
        const t = setTimeout(() => visit({ q: q || undefined, page: undefined }), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    useEffect(() => {
        setNote('');
        setNoteOpen(false);
    }, [open?.id]);

    const exportUrl = route('inbox.export', params());

    const addNote = () => {
        if (!open || !note.trim()) return;
        router.post(route('inbox.notes', open.id), { body: note }, { ...RELOAD, onSuccess: () => (setNote(''), setNoteOpen(false)) });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'طلبات التواصل', href: '/inbox' }]}>
            <Head title="طلبات التواصل" />
            <div className="max-w-page mx-auto flex w-full flex-col gap-5 p-4 md:p-8">
                <PageHeader
                    title="طلبات التواصل"
                    description="الرسائل من نموذج «تواصل معنا» في الموقع."
                    actions={
                        <Button variant="outline" asChild>
                            <a href={exportUrl}>
                                <Download /> تصدير Excel / CSV
                            </a>
                        </Button>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-56 flex-1 sm:max-w-80">
                        <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ابحث بالاسم أو البريد أو الشركة…"
                            className="ps-9"
                            aria-label="بحث في الرسائل"
                        />
                    </div>
                    <div role="group" aria-label="الحالة" className="flex flex-wrap rounded-md border p-0.5">
                        {FILTERS.map((f) => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={filter === f}
                                onClick={() => visit({ filter: f === 'all' ? undefined : f, page: undefined })}
                                className={cn('h-8 rounded px-3 text-sm', filter === f ? 'bg-muted font-semibold' : 'text-muted-foreground')}
                            >
                                {f === 'all' ? 'الكل' : STATUSES[f].label} ({counts[f]})
                            </button>
                        ))}
                    </div>
                </div>

                {messages.data.length === 0 ? (
                    <EmptyState
                        icon={counts.all === 0 ? InboxIcon : Search}
                        title={counts.all === 0 ? 'لا توجد رسائل بعد' : 'لا توجد رسائل تطابق البحث'}
                        description={counts.all === 0 ? 'ستظهر هنا الرسائل القادمة من نموذج «تواصل معنا».' : 'جرّب كلمة أخرى أو امسح الفلتر.'}
                    />
                ) : (
                    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                        <BulkBar selection={selection} className="rounded-none border-0 border-b">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                        تغيير الحالة <ChevronDown className="opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuRadioGroup value="" onValueChange={(v) => bulkStatus(v as Status)}>
                                        {STATUS_KEYS.map((k) => (
                                            <DropdownMenuRadioItem key={k} value={k}>
                                                {STATUSES[k].label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {canDelete && (
                                <BulkDeleteButton
                                    selection={selection}
                                    title={`حذف ${selection.count} رسالة؟`}
                                    description="تنحذف الرسائل مع ملاحظاتها وسجلها نهائياً. لو تبي تخفيها بس، غيّر حالتها لـ«مغلق»."
                                    onConfirm={() =>
                                        router.post(
                                            route('inbox.bulk'),
                                            { ids: selection.selected, action: 'delete' },
                                            { ...RELOAD, onSuccess: selection.clear },
                                        )
                                    }
                                >
                                    <Trash2 /> حذف
                                </BulkDeleteButton>
                            )}
                        </BulkBar>
                        <Table className="min-w-[760px]">
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-10">
                                        <SelectAllCheckbox selection={selection} />
                                    </TableHead>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>الشركة</TableHead>
                                    <TableHead>البريد</TableHead>
                                    <TableHead>الميزانية</TableHead>
                                    <TableHead>التاريخ</TableHead>
                                    <TableHead>الحالة</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {messages.data.map((m) => (
                                    <TableRow
                                        key={m.id}
                                        onClick={() => setOpenId(m.id)}
                                        className={cn('cursor-pointer', m.status === 'new' && 'font-semibold', openId === m.id && 'bg-muted')}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <SelectCheckbox selection={selection} id={m.id} label={m.name} />
                                        </TableCell>
                                        <TableCell>
                                            <button type="button" onClick={() => setOpenId(m.id)} className="text-start">
                                                {m.name}
                                            </button>
                                        </TableCell>
                                        <TableCell>{m.company || '—'}</TableCell>
                                        <TableCell dir="ltr" style={{ textAlign: 'right' }}>
                                            {m.email}
                                        </TableCell>
                                        <TableCell>{m.estimated_budget || '—'}</TableCell>
                                        <TableCell className="text-muted-foreground font-normal" title={formatDate(m.submitted_at ?? m.created_at)}>
                                            {timeAgo(m.submitted_at ?? m.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <StatusMenu m={m} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {messages.last_page > 1 && (
                    <nav aria-label="الصفحات" className="flex flex-wrap justify-center gap-1">
                        {messages.links.map((l, i) => (
                            <Button
                                key={i}
                                variant={l.active ? 'default' : 'ghost'}
                                size="sm"
                                disabled={!l.url}
                                aria-current={l.active ? 'page' : undefined}
                                onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                            >
                                {pageLabel(l.label)}
                            </Button>
                        ))}
                    </nav>
                )}
            </div>

            <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
                {open && (
                    <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
                        {/* Header: who and status. Actions stay pinned in the footer. */}
                        <div className="border-b p-6">
                            <SheetHeader className="gap-1 space-y-0 pe-8">
                                <SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
                                    {open.name}
                                    <span className={cn(badge, STATUSES[open.status].className)}>{STATUSES[open.status].label}</span>
                                </SheetTitle>
                                <SheetDescription>
                                    {open.company ? `${open.company} · ` : ''}
                                    {formatDate(open.submitted_at ?? open.created_at)}
                                </SheetDescription>
                            </SheetHeader>
                        </div>

                        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
                            <Section title="الرسالة">
                                <div className="bg-muted/50 rounded-lg p-4 text-sm leading-7 whitespace-pre-wrap">
                                    {open.message || <span className="text-muted-foreground">بدون نص رسالة.</span>}
                                </div>
                            </Section>

                            <Section title="التفاصيل">
                                <dl className="divide-y rounded-lg border text-sm">
                                    <Detail label="البريد">
                                        <span dir="ltr">{open.email}</span>
                                    </Detail>
                                    <Detail label="الشركة">{open.company || '—'}</Detail>
                                    <Detail label="الميزانية">{open.estimated_budget || '—'}</Detail>
                                    {open.page_uri && (
                                        <Detail label="من صفحة">
                                            <span className="block truncate" dir="ltr">
                                                {open.page_uri}
                                            </span>
                                        </Detail>
                                    )}
                                </dl>
                            </Section>

                            <Section
                                title="ملاحظات داخلية"
                                hint="للفريق فقط، العميل لا يراها."
                                action={
                                    !noteOpen && (
                                        <Button variant="outline" size="sm" className="border-dashed" onClick={() => setNoteOpen(true)}>
                                            <Plus /> إضافة ملاحظة
                                        </Button>
                                    )
                                }
                            >
                                {noteOpen && (
                                    <div className="focus-within:ring-ring rounded-lg border focus-within:ring-1">
                                        <Textarea
                                            autoFocus
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            onKeyDown={(e) => {
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addNote();
                                                if (e.key === 'Escape' && !note.trim()) {
                                                    e.stopPropagation();
                                                    setNoteOpen(false);
                                                }
                                            }}
                                            placeholder="اكتب ملاحظة…"
                                            rows={2}
                                            className="resize-none border-0 shadow-none focus-visible:ring-0"
                                        />
                                        <div className="flex items-center justify-between gap-2 px-3 pb-2">
                                            <span className="text-muted-foreground text-xs">Ctrl + Enter للإضافة</span>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => (setNote(''), setNoteOpen(false))}>
                                                    إلغاء
                                                </Button>
                                                <Button size="sm" disabled={!note.trim()} onClick={addNote}>
                                                    إضافة
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {open.notes.map((n) => (
                                    <NoteItem key={n.id} n={n} canEdit={canDelete || n.user?.id === me} />
                                ))}
                            </Section>

                            {open.events.length > 0 && (
                                <Section title="السجل">
                                    <ol className="flex flex-col gap-2 border-s ps-4 text-xs">
                                        {open.events.map((e) => (
                                            <li key={e.id} className="text-muted-foreground">
                                                <span className="text-foreground font-medium">{e.user?.name ?? 'النظام'}</span> {describe(e)}
                                                <span title={formatDate(e.created_at)}> · {timeAgo(e.created_at)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </Section>
                            )}
                        </div>
                        <div className="border-t p-4">
                            <div className="flex w-full items-center gap-2">
                                <Button asChild className="flex-1">
                                    <a href={`mailto:${open.email}?subject=${encodeURIComponent('رد من سكة')}`}>
                                        <Mail /> رد بالبريد
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="نسخ البريد"
                                    title="نسخ البريد"
                                    onClick={() => navigator.clipboard.writeText(open.email).then(() => toast.success('تم نسخ البريد.'))}
                                >
                                    <Copy />
                                </Button>
                                {canDelete && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        aria-label="حذف الطلب"
                                        title="حذف الطلب"
                                        onClick={() => setDeleting(open)}
                                    >
                                        <Trash2 />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </SheetContent>
                )}
            </Sheet>

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف رسالة {deleting?.name}؟</AlertDialogTitle>
                        <AlertDialogDescription>تُحذف الرسالة نهائياً. صدّر الرسائل أولاً لو تحتاج نسخة.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() =>
                                deleting && router.delete(route('inbox.destroy', deleting.id), { ...RELOAD, onSuccess: () => setOpenId(null) })
                            }
                        >
                            حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
