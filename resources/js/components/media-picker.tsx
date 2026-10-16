import { DropZone } from '@/components/drop-zone';
import { MediaThumb } from '@/components/media-thumb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUpload } from '@/hooks/use-upload';
import { api } from '@/lib/http';
import { acceptFor, type MediaItem } from '@/lib/media';
import { cn } from '@/lib/utils';
import { Check, LoaderCircle, Search, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Page = { data: MediaItem[]; current_page: number; last_page: number };

/**
 * Pick a file from the media library, or upload one (button or drop). With
 * `multiple`, several can be chosen in order (for grids).
 */
export function MediaPicker({
    open,
    onOpenChange,
    accept = 'any',
    multiple = false,
    onSelect,
    title,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accept?: 'image' | 'video' | 'any';
    multiple?: boolean;
    onSelect: (items: MediaItem[]) => void;
    title?: string;
}) {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [q, setQ] = useState('');
    const [kind, setKind] = useState<'all' | 'image' | 'video'>(accept === 'any' ? 'all' : accept);
    const [loading, setLoading] = useState(false);
    const [chosen, setChosen] = useState<MediaItem[]>([]);
    const { upload, busy } = useUpload();
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const ctrl = new AbortController();
        setLoading(true);
        const params = new URLSearchParams({ page: String(page) });
        if (q.trim()) params.set('q', q.trim());
        if (kind !== 'all') params.set('kind', kind);
        const t = setTimeout(() => {
            api<Page>(`/media/list?${params}`, { signal: ctrl.signal })
                .then((res) => {
                    setItems((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
                    setLastPage(res.last_page);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }, 200);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [open, page, q, kind]);

    useEffect(() => {
        if (open) {
            setChosen([]);
            setPage(1);
        }
    }, [open]);

    const finish = (list: MediaItem[]) => {
        if (!list.length) return;
        onSelect(list);
        onOpenChange(false);
    };

    const toggle = (item: MediaItem) => {
        if (!multiple) return finish([item]);
        setChosen((c) => (c.some((x) => x.id === item.id) ? c.filter((x) => x.id !== item.id) : [...c, item]));
    };

    const uploaded = (list: MediaItem[]) => {
        setItems((prev) => [...list, ...prev]);
        if (!multiple) finish(list.slice(0, 1));
        else setChosen((c) => [...c, ...list]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-4">
                <DialogHeader>
                    <DialogTitle>{title ?? 'مكتبة الوسائط'}</DialogTitle>
                    <DialogDescription>اختر ملفاً، أو ارفع ملفاً جديداً من جهازك (أو اسحبه وأفلته هنا).</DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-48 flex-1">
                        <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            value={q}
                            onChange={(e) => {
                                setQ(e.target.value);
                                setPage(1);
                            }}
                            placeholder="ابحث باسم الملف…"
                            className="ps-9"
                        />
                    </div>
                    {accept === 'any' && (
                        <div className="flex rounded-md border p-0.5">
                            {(['all', 'image', 'video'] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => {
                                        setKind(k);
                                        setPage(1);
                                    }}
                                    className={cn('h-8 rounded px-3 text-sm', kind === k ? 'bg-muted font-semibold' : 'text-muted-foreground')}
                                >
                                    {{ all: 'الكل', image: 'صور', video: 'فيديو' }[k]}
                                </button>
                            ))}
                        </div>
                    )}
                    <input
                        ref={fileInput}
                        type="file"
                        hidden
                        multiple={multiple}
                        accept={acceptFor(accept)}
                        onChange={async (e) => {
                            const files = e.target.files;
                            e.target.value = '';
                            if (files?.length) uploaded(await upload(files, accept));
                        }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={busy}>
                        {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}
                        رفع من الجهاز
                    </Button>
                </div>

                <DropZone accept={accept} multiple={multiple} onUploaded={uploaded} className="min-h-64 flex-1 overflow-y-auto rounded-lg">
                    {items.length === 0 && !loading ? (
                        <div className="text-muted-foreground flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm">
                            <Upload className="size-5" />
                            لا توجد ملفات بعد. اسحب ملفاً هنا أو اضغط «رفع من الجهاز».
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                            {items.map((item) => {
                                const index = chosen.findIndex((c) => c.id === item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggle(item)}
                                        title={item.name}
                                        className={cn(
                                            'group relative overflow-hidden rounded-md border text-start outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            index >= 0 && 'ring-primary ring-2',
                                        )}
                                    >
                                        <MediaThumb src={item.url} className="aspect-square w-full" />
                                        <span className="bg-background/90 absolute inset-x-0 bottom-0 truncate px-1.5 py-0.5 text-[11px]" dir="ltr">
                                            {item.width && item.height ? `${item.width}×${item.height}` : item.name}
                                        </span>
                                        {index >= 0 && (
                                            <span className="bg-primary text-primary-foreground absolute top-1 start-1 flex size-5 items-center justify-center rounded-full text-[11px]">
                                                {multiple ? index + 1 : <Check className="size-3" />}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {loading && <LoaderCircle className="text-muted-foreground mx-auto my-4 animate-spin" />}
                    {!loading && page < lastPage && (
                        <div className="flex justify-center py-3">
                            <Button type="button" variant="ghost" onClick={() => setPage((p) => p + 1)}>
                                تحميل المزيد
                            </Button>
                        </div>
                    )}
                </DropZone>

                {multiple && (
                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                        <span className="text-muted-foreground text-sm">تم اختيار {chosen.length}</span>
                        <Button type="button" onClick={() => finish(chosen)} disabled={!chosen.length}>
                            إضافة المختار
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
