import { BulkBar, BulkDeleteButton, runBulk, SelectAllCheckbox, SelectCheckbox, useSelection } from '@/components/bulk-actions';
import InputError from '@/components/input-error';
import { MediaField } from '@/components/media-field';
import { MediaThumb } from '@/components/media-thumb';
import { PageHeader } from '@/components/page-header';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { FITS } from '@/features/site/registry';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { LayoutGrid, LoaderCircle, Pencil, Plus, Rows3, Search, Trash2 } from 'lucide-react';
import { type FormEventHandler, useEffect, useState } from 'react';

interface Service {
    id: number;
    title: string;
    title_en: string;
    subtitle: string;
    subtitle_en: string;
    video: string;
    fit: string;
}

// Titles keep the site's <br> line breaks; the form shows them as new lines.
const toLines = (html: string) => html.replace(/<br\s*\/?>/gi, '\n');
const toHtml = (text: string) => text.trim().replace(/\r?\n/g, '<br>');
const plain = (html: string) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');

const EMPTY = { title: '', title_en: '', subtitle: '', subtitle_en: '', video: '', fit: 'cover' };

function ServiceDialog({ service, open, onClose }: { service: Service | null; open: boolean; onClose: () => void }) {
    const { data, setData, transform, post, put, processing, errors, reset, clearErrors } = useForm(EMPTY);

    useEffect(() => {
        if (!open) return;
        clearErrors();
        setData(
            service
                ? {
                      title: toLines(service.title),
                      title_en: toLines(service.title_en),
                      subtitle: service.subtitle,
                      subtitle_en: service.subtitle_en,
                      video: service.video,
                      fit: service.fit,
                  }
                : EMPTY,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, service]);

    transform((d) => ({ ...d, title: toHtml(d.title), title_en: toHtml(d.title_en) }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const done = { preserveScroll: true, onSuccess: () => (reset(), onClose()) };
        if (service) put(route('services.update', service.id), done);
        else post(route('services.store'), done);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <form onSubmit={submit} className="grid gap-6">
                    <DialogHeader>
                        <DialogTitle>{service ? 'تعديل الخدمة' : 'خدمة جديدة'}</DialogTitle>
                        <DialogDescription>Enter داخل الاسم يكسر السطر كما يظهر على الموقع.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="s-title">الاسم</Label>
                            <Textarea id="s-title" rows={2} value={data.title} onChange={(e) => setData('title', e.target.value)} />
                            <InputError message={errors.title} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="s-title-en">الاسم بالإنجليزي</Label>
                            <Textarea
                                id="s-title-en"
                                dir="ltr"
                                rows={2}
                                value={data.title_en}
                                onChange={(e) => setData('title_en', e.target.value)}
                            />
                            <InputError message={errors.title_en} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="s-sub">الوصف</Label>
                            <Input id="s-sub" value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
                            <InputError message={errors.subtitle} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="s-sub-en">الوصف بالإنجليزي</Label>
                            <Input id="s-sub-en" dir="ltr" value={data.subtitle_en} onChange={(e) => setData('subtitle_en', e.target.value)} />
                            <InputError message={errors.subtitle_en} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>الفيديو</Label>
                        <MediaField
                            value={data.video}
                            accept="video"
                            invalid={!!errors.video}
                            onChange={(item) => item && setData('video', item.url)}
                        />
                        <InputError message={errors.video} />
                    </div>

                    <div className="grid gap-2">
                        <Label>طريقة عرض الفيديو</Label>
                        <Select value={data.fit} onValueChange={(v) => setData('fit', v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FITS.map(([v, l]) => (
                                    <SelectItem key={v} value={v}>
                                        {l}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            إلغاء
                        </Button>
                        <Button disabled={processing}>
                            {processing && <LoaderCircle className="animate-spin" />}
                            {service ? 'حفظ' : 'إضافة'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type View = 'table' | 'cards';
const VIEW_KEY = 'sekka.services.view';

export default function Services({ services }: { services: Service[] }) {
    const [editing, setEditing] = useState<Service | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<Service | null>(null);
    const [q, setQ] = useState('');
    const shown = services.filter((s) => [s.title, s.title_en, s.subtitle].some((t) => plain(t).toLowerCase().includes(q.trim().toLowerCase())));
    const selection = useSelection(shown.map((s) => s.id));
    const [savedView, setView] = useState<View>('table');
    // Phones always get cards, like the projects and users pages.
    const isMobile = useIsMobile();
    const view: View = isMobile ? 'cards' : savedView;
    useEffect(() => {
        try {
            if (localStorage.getItem(VIEW_KEY) === 'cards') setView('cards');
        } catch {
            /* private mode */
        }
    }, []);
    const changeView = (v: View) => {
        setView(v);
        try {
            localStorage.setItem(VIEW_KEY, v);
        } catch {
            /* private mode */
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'الخدمات', href: '/services' }]}>
            <Head title="الخدمات" />
            <div className="max-w-page mx-auto flex w-full flex-col gap-5 p-4 md:p-8">
                <PageHeader
                    title="الخدمات"
                    description="الخدمات اللي تقدمها سكة، والظاهر منها يطلع على الموقع."
                    actions={
                        <Button onClick={() => setCreating(true)}>
                            <Plus /> خدمة جديدة
                        </Button>
                    }
                />

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-56 flex-1 sm:max-w-80">
                        <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ابحث باسم الخدمة…"
                            className="ps-9"
                            aria-label="بحث في الخدمات"
                        />
                    </div>
                    <div role="group" aria-label="طريقة العرض" className="ms-auto hidden rounded-md border p-0.5 md:flex">
                        {(
                            [
                                ['table', Rows3, 'جدول'],
                                ['cards', LayoutGrid, 'بطاقات'],
                            ] as const
                        ).map(([v, Icon, label]) => (
                            <button
                                key={v}
                                type="button"
                                aria-pressed={view === v}
                                aria-label={label}
                                title={label}
                                onClick={() => changeView(v)}
                                className={cn(
                                    'flex h-8 items-center gap-1.5 rounded px-3 text-sm',
                                    view === v ? 'bg-muted font-semibold' : 'text-muted-foreground',
                                )}
                            >
                                <Icon className="size-4" />
                            </button>
                        ))}
                    </div>
                </div>

                <BulkBar selection={selection}>
                    <BulkDeleteButton
                        selection={selection}
                        title={`حذف ${selection.count} خدمة؟`}
                        description="اللي منها ظاهر في الرئيسية ينشال منها بعد. لا يمكن التراجع عن هذا."
                        onConfirm={() => runBulk('services.bulk', selection, 'delete')}
                    >
                        <Trash2 /> حذف
                    </BulkDeleteButton>
                </BulkBar>

                {services.length === 0 ? (
                    <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">لا توجد خدمات بعد.</p>
                ) : shown.length === 0 ? (
                    <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">ما فيه خدمات تطابق البحث.</p>
                ) : view === 'table' ? (
                    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                        <SelectAllCheckbox selection={selection} label="تحديد كل الخدمات الظاهرة" />
                                    </TableHead>
                                    <TableHead>الخدمة</TableHead>
                                    <TableHead>الوصف</TableHead>
                                    <TableHead className="w-0" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shown.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell>
                                            <SelectCheckbox selection={selection} id={s.id} label={plain(s.title)} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <MediaThumb src={s.video} className="h-10 w-16 shrink-0 rounded" />
                                                <span className="font-medium">{plain(s.title)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">{s.subtitle}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setEditing(s)}
                                                    aria-label={`تعديل ${plain(s.title)}`}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    onClick={() => setDeleting(s)}
                                                    aria-label={`حذف ${plain(s.title)}`}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map((s) => (
                            <li key={s.id} className="bg-card relative flex flex-col overflow-hidden rounded-xl border">
                                <span className="bg-background/90 absolute end-2 top-2 z-10 flex size-8 items-center justify-center rounded-md border">
                                    <SelectCheckbox selection={selection} id={s.id} label={plain(s.title)} />
                                </span>
                                <MediaThumb src={s.video} className="aspect-video w-full" />
                                <div className="flex flex-1 flex-col gap-1.5 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <h2 className="font-semibold">{plain(s.title)}</h2>
                                    </div>
                                    {s.subtitle && <p className="text-muted-foreground text-sm">{s.subtitle}</p>}
                                    <div className="mt-auto flex gap-2 pt-3">
                                        <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                                            <Pencil /> تعديل
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() => setDeleting(s)}
                                            aria-label={`حذف ${plain(s.title)}`}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ServiceDialog service={editing} open={creating || !!editing} onClose={() => (setCreating(false), setEditing(null))} />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>حذف «{deleting && plain(deleting.title)}»؟</AlertDialogTitle>
                        <AlertDialogDescription>إذا كانت ظاهرة في الرئيسية تنشال منها بعد.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleting && router.delete(route('services.destroy', deleting.id), { preserveScroll: true })}
                        >
                            حذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
