import { DropZone } from '@/components/drop-zone';
import { MediaThumb } from '@/components/media-thumb';
import { formatDate, PageHeader } from '@/components/page-header';
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
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUpload } from '@/hooks/use-upload';
import AppLayout from '@/layouts/app-layout';
import { api } from '@/lib/http';
import { acceptFor, formatBytes, type MediaItem, mediaSrc } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, Copy, ExternalLink, Grid3x3, List, LoaderCircle, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Paginated {
    data: MediaItem[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

type View = 'grid' | 'list';
const VIEW_KEY = 'sekka.media.view';
const KIND_LABEL = { image: 'صورة', video: 'فيديو', file: 'ملف' };

function Details({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
    const { siteUrl } = usePage<SharedData>().props;
    const [alt, setAlt] = useState('');
    const [usage, setUsage] = useState<{ label: string; href: string }[] | null>(null);
    const [copied, setCopied] = useState(false);
    const [confirm, setConfirm] = useState(false);

    useEffect(() => {
        if (!item) return;
        setAlt(item.alt);
        setUsage(null);
        setCopied(false);
        api<{ label: string; href: string }[]>(route('media.usage', item.id))
            .then(setUsage)
            .catch(() => setUsage([]));
    }, [item]);

    if (!item) return null;
    const url = mediaSrc(item.url, siteUrl);

    return (
        <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="left" className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="truncate pe-6" dir="ltr" style={{ textAlign: 'right' }}>
                        {item.name}
                    </SheetTitle>
                    <SheetDescription>
                        {KIND_LABEL[item.kind]} · <bdi dir="ltr">{item.width && item.height ? `${item.width} × ${item.height}` : '?'}</bdi> ·{' '}
                        <bdi dir="ltr">{formatBytes(item.size)}</bdi>
                    </SheetDescription>
                </SheetHeader>

                <div className="bg-muted overflow-hidden rounded-lg">
                    {item.kind === 'video' ? (
                        <video src={url} controls className="max-h-72 w-full" />
                    ) : (
                        <img src={url} alt={item.alt} className="max-h-72 w-full object-contain" />
                    )}
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">النوع</dt>
                    <dd dir="ltr" style={{ textAlign: 'right' }}>
                        {item.mime}
                    </dd>
                    <dt className="text-muted-foreground">المقاس</dt>
                    <dd dir="ltr" style={{ textAlign: 'right' }}>
                        {item.width && item.height ? `${item.width} × ${item.height}` : '—'}
                    </dd>
                    <dt className="text-muted-foreground">الحجم</dt>
                    <dd dir="ltr" style={{ textAlign: 'right' }}>
                        {formatBytes(item.size)}
                    </dd>
                    <dt className="text-muted-foreground">تاريخ الرفع</dt>
                    <dd>{formatDate(item.created_at)}</dd>
                </dl>

                <form
                    className="grid gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.patch(route('media.update', item.id), { alt }, { preserveScroll: true, preserveState: true });
                    }}
                >
                    <Label htmlFor="m-alt">الوصف البديل</Label>
                    <p className="text-muted-foreground -mt-1 text-xs">
                        وصف قصير يقرأه قارئ الشاشة ومحركات البحث. يُستخدم مبدئياً عند إضافة الملف لبلوك.
                    </p>
                    <div className="flex gap-2">
                        <Input id="m-alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
                        <Button type="submit" variant="outline" disabled={alt === item.alt}>
                            حفظ
                        </Button>
                    </div>
                </form>

                <div className="grid gap-2">
                    <Label>الرابط</Label>
                    <div className="flex gap-2">
                        <Input readOnly dir="ltr" value={url} onFocus={(e) => e.target.select()} />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                await navigator.clipboard.writeText(url);
                                setCopied(true);
                                toast.success('تم نسخ الرابط');
                            }}
                        >
                            {copied ? <Check /> : <Copy />} نسخ
                        </Button>
                        <Button type="button" variant="ghost" size="icon" asChild>
                            <a href={url} target="_blank" rel="noreferrer" aria-label="فتح الملف">
                                <ExternalLink />
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>مستخدم في</Label>
                    {usage === null ? (
                        <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
                    ) : usage.length === 0 ? (
                        <p className="text-muted-foreground text-sm">غير مستخدم حالياً.</p>
                    ) : (
                        <ul className="grid gap-1 text-sm">
                            {usage.map((u) => (
                                <li key={u.href + u.label}>
                                    <Link href={u.href} className="underline">
                                        {u.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <Button type="button" variant="outline" className="text-destructive mt-auto" onClick={() => setConfirm(true)}>
                    <Trash2 /> حذف الملف
                </Button>

                <AlertDialog open={confirm} onOpenChange={setConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>حذف «{item.name}»؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                {usage?.length
                                    ? `الملف مستخدم في ${usage.length === 1 ? 'مكان واحد' : `${usage.length} أماكن`}. لو حذفته سيختفي من هناك أيضاً. الأفضل تستبدله أولاً.`
                                    : 'سيُحذف الملف نهائياً من المكتبة.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() =>
                                    router.delete(route('media.destroy', { media: item.id, force: usage?.length ? 1 : undefined }), {
                                        preserveScroll: true,
                                        onSuccess: onClose,
                                    })
                                }
                            >
                                {usage?.length ? 'احذفه على أي حال' : 'حذف'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SheetContent>
        </Sheet>
    );
}

export default function MediaIndex({ media, filters }: { media: Paginated; filters: { q?: string; kind?: string } }) {
    const [view, setView] = useState<View>('grid');
    const [q, setQ] = useState(filters.q ?? '');
    const [selected, setSelected] = useState<MediaItem | null>(null);
    const { upload, busy } = useUpload();
    const input = useRef<HTMLInputElement>(null);
    const kind = filters.kind ?? 'all';

    useEffect(() => {
        try {
            if (localStorage.getItem(VIEW_KEY) === 'list') setView('list');
        } catch {
            /* private mode */
        }
    }, []);
    useEffect(() => setSelected((s) => (s ? (media.data.find((m) => m.id === s.id) ?? null) : s)), [media]);

    const visit = (params: Record<string, string | undefined>) =>
        router.get(
            route('media.index'),
            { q: q || undefined, kind: kind === 'all' ? undefined : kind, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    useEffect(() => {
        if (q === (filters.q ?? '')) return;
        const t = setTimeout(() => visit({ q: q || undefined, page: undefined }), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const reload = () => router.reload({ only: ['media'] });
    const changeView = (v: View) => {
        setView(v);
        try {
            localStorage.setItem(VIEW_KEY, v);
        } catch {
            /* private mode */
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'مكتبة الوسائط', href: '/media' }]}>
            <Head title="مكتبة الوسائط" />
            <DropZone accept="any" multiple onUploaded={reload} label="أفلت الملفات لرفعها للمكتبة" className="flex-1">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-8">
                    <PageHeader
                        title="مكتبة الوسائط"
                        description={`${media.total} ملف. اسحب ملفات من جهازك وأفلتها في أي مكان هنا لرفعها؛ الصور تنضغط تلقائياً.`}
                        actions={
                            <>
                                <input
                                    ref={input}
                                    type="file"
                                    hidden
                                    multiple
                                    accept={acceptFor('any')}
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        e.target.value = '';
                                        if (files?.length && (await upload(files)).length) reload();
                                    }}
                                />
                                <Button onClick={() => input.current?.click()} disabled={busy}>
                                    {busy ? <LoaderCircle className="animate-spin" /> : <Upload />} رفع ملفات
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
                                placeholder="ابحث باسم الملف…"
                                className="ps-9"
                                aria-label="بحث في الملفات"
                            />
                        </div>
                        <div role="group" aria-label="النوع" className="flex rounded-md border p-0.5">
                            {(['all', 'image', 'video'] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    aria-pressed={kind === k}
                                    onClick={() => visit({ kind: k === 'all' ? undefined : k, page: undefined })}
                                    className={cn('h-8 rounded px-3 text-sm', kind === k ? 'bg-muted font-semibold' : 'text-muted-foreground')}
                                >
                                    {{ all: 'الكل', image: 'صور', video: 'فيديو' }[k]}
                                </button>
                            ))}
                        </div>
                        <div role="group" aria-label="طريقة العرض" className="ms-auto flex rounded-md border p-0.5">
                            <button
                                type="button"
                                aria-pressed={view === 'grid'}
                                onClick={() => changeView('grid')}
                                className={cn(
                                    'flex h-8 items-center gap-1.5 rounded px-3 text-sm',
                                    view === 'grid' ? 'bg-muted font-semibold' : 'text-muted-foreground',
                                )}
                            >
                                <Grid3x3 className="size-4" /> شبكة
                            </button>
                            <button
                                type="button"
                                aria-pressed={view === 'list'}
                                onClick={() => changeView('list')}
                                className={cn(
                                    'flex h-8 items-center gap-1.5 rounded px-3 text-sm',
                                    view === 'list' ? 'bg-muted font-semibold' : 'text-muted-foreground',
                                )}
                            >
                                <List className="size-4" /> قائمة
                            </button>
                        </div>
                    </div>

                    {media.data.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
                            <Upload className="size-6" />
                            {filters.q || filters.kind ? 'لا توجد ملفات تطابق البحث.' : 'المكتبة فارغة. اسحب صوراً وفيديوهات من جهازك وأفلتها هنا.'}
                        </div>
                    ) : view === 'grid' ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                            {media.data.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setSelected(m)}
                                    title={m.name}
                                    className={cn(
                                        'group focus-visible:ring-ring relative overflow-hidden rounded-md border outline-none focus-visible:ring-2',
                                        selected?.id === m.id && 'ring-primary ring-2',
                                    )}
                                >
                                    <MediaThumb src={m.url} className="aspect-square w-full" alt={m.alt} />
                                    {m.kind === 'video' && (
                                        <span className="absolute start-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white">فيديو</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border">
                            <Table className="min-w-[640px]">
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead>الاسم</TableHead>
                                        <TableHead>النوع</TableHead>
                                        <TableHead>المقاس</TableHead>
                                        <TableHead>الحجم</TableHead>
                                        <TableHead>تاريخ الرفع</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {media.data.map((m) => (
                                        <TableRow
                                            key={m.id}
                                            onClick={() => setSelected(m)}
                                            className={cn('cursor-pointer', selected?.id === m.id && 'bg-muted')}
                                        >
                                            <TableCell>
                                                <button type="button" className="flex items-center gap-3 text-start" onClick={() => setSelected(m)}>
                                                    <MediaThumb src={m.url} className="h-9 w-12 shrink-0 rounded" />
                                                    <span className="max-w-64 truncate" dir="ltr">
                                                        {m.name}
                                                    </span>
                                                </button>
                                            </TableCell>
                                            <TableCell>{KIND_LABEL[m.kind]}</TableCell>
                                            <TableCell dir="ltr" style={{ textAlign: 'right' }}>
                                                {m.width && m.height ? `${m.width} × ${m.height}` : '—'}
                                            </TableCell>
                                            <TableCell dir="ltr" style={{ textAlign: 'right' }}>
                                                {formatBytes(m.size)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{formatDate(m.created_at, false)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {media.last_page > 1 && (
                        <nav aria-label="الصفحات" className="flex flex-wrap justify-center gap-1">
                            {media.links.map((l, i) => (
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
            </DropZone>
            <Details item={selected} onClose={() => setSelected(null)} />
        </AppLayout>
    );
}
