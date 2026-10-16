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
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { Download, Inbox as InboxIcon, Mail, MailOpen, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    read_at: string | null;
    created_at: string;
}

interface Props {
    messages: {
        data: Message[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: { filter?: string; q?: string };
    counts: { all: number; unread: number };
}

const RELOAD = { preserveScroll: true, preserveState: true, only: ['messages', 'counts', 'unreadMessages', 'flash'] };

function StatusBadge({ m }: { m: Message }) {
    return m.read_at ? (
        <span className="text-muted-foreground text-xs">مقروءة</span>
    ) : (
        <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">جديدة</span>
    );
}

export default function Inbox({ messages, filters, counts }: Props) {
    const [q, setQ] = useState(filters.q ?? '');
    const [openId, setOpenId] = useState<number | null>(() => {
        const id = Number(new URLSearchParams(window.location.search).get('open'));
        return id || null;
    });
    const [deleting, setDeleting] = useState<Message | null>(null);
    const filter = filters.filter === 'unread' ? 'unread' : 'all';
    const open = messages.data.find((m) => m.id === openId) ?? null;

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

    // Opening a message marks it read.
    useEffect(() => {
        if (open && !open.read_at) router.patch(route('inbox.read', open.id), { read: true }, RELOAD);
    }, [open]);

    const exportUrl = route('inbox.export', params());

    return (
        <AppLayout breadcrumbs={[{ title: 'صندوق الوارد', href: '/inbox' }]}>
            <Head title="صندوق الوارد" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-8">
                <PageHeader
                    title="صندوق الوارد"
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
                    <div role="group" aria-label="الحالة" className="flex rounded-md border p-0.5">
                        {(['all', 'unread'] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={filter === f}
                                onClick={() => visit({ filter: f === 'all' ? undefined : f, page: undefined })}
                                className={cn('h-8 rounded px-3 text-sm', filter === f ? 'bg-muted font-semibold' : 'text-muted-foreground')}
                            >
                                {f === 'all' ? `الكل (${counts.all})` : `جديدة (${counts.unread})`}
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
                        <Table className="min-w-[760px]">
                            <TableHeader className="bg-muted/40">
                                <TableRow>
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
                                        className={cn('cursor-pointer', !m.read_at && 'font-semibold', openId === m.id && 'bg-muted')}
                                    >
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
                                            <StatusBadge m={m} />
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
                                onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                            >
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: l.label.replace('&laquo; Previous', 'السابق').replace('Next &raquo;', 'التالي'),
                                    }}
                                />
                            </Button>
                        ))}
                    </nav>
                )}
            </div>

            <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
                {open && (
                    <SheetContent side="left" className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-lg">
                        <SheetHeader>
                            <SheetTitle>{open.name}</SheetTitle>
                            <SheetDescription>
                                {open.company ? `${open.company} · ` : ''}
                                {formatDate(open.submitted_at ?? open.created_at)}
                            </SheetDescription>
                        </SheetHeader>

                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">البريد</dt>
                            <dd>
                                <a href={`mailto:${open.email}`} className="underline" dir="ltr">
                                    {open.email}
                                </a>
                            </dd>
                            <dt className="text-muted-foreground">الشركة</dt>
                            <dd>{open.company || '—'}</dd>
                            <dt className="text-muted-foreground">الميزانية</dt>
                            <dd>{open.estimated_budget || '—'}</dd>
                            <dt className="text-muted-foreground">لغة الموقع</dt>
                            <dd>{open.locale === 'en' ? 'الإنجليزية' : open.locale === 'ar' ? 'العربية' : '—'}</dd>
                            {open.page_uri && (
                                <>
                                    <dt className="text-muted-foreground">من صفحة</dt>
                                    <dd className="truncate" dir="ltr" style={{ textAlign: 'right' }}>
                                        {open.page_uri}
                                    </dd>
                                </>
                            )}
                        </dl>

                        <div className="bg-muted/50 rounded-lg p-4 text-sm leading-7 whitespace-pre-wrap">
                            {open.message || <span className="text-muted-foreground">بدون نص رسالة.</span>}
                        </div>

                        <div className="mt-auto flex flex-wrap gap-2">
                            <Button asChild>
                                <a href={`mailto:${open.email}?subject=${encodeURIComponent('رد من سكة')}`}>
                                    <Mail /> رد بالبريد
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.patch(route('inbox.read', open.id), { read: false }, { ...RELOAD, onSuccess: () => setOpenId(null) })
                                }
                            >
                                <MailOpen /> تعليم كغير مقروءة
                            </Button>
                            <Button variant="ghost" className="text-destructive ms-auto" onClick={() => setDeleting(open)}>
                                <Trash2 /> حذف
                            </Button>
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
