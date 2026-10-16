import { DropZone } from '@/components/drop-zone';
import { MediaPicker } from '@/components/media-picker';
import { MediaThumb } from '@/components/media-thumb';
import { Button } from '@/components/ui/button';
import { useUpload } from '@/hooks/use-upload';
import { acceptFor, fileName, type MediaItem } from '@/lib/media';
import { cn } from '@/lib/utils';
import { FolderOpen, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * One media slot: preview, choose from the library, upload (button or drop
 * a file on it), and optionally clear.
 */
export function MediaField({
    value,
    onChange,
    accept = 'any',
    clearable = false,
    compact = false,
    invalid = false,
    dims,
}: {
    value: string | null | undefined;
    onChange: (item: Pick<MediaItem, 'url' | 'width' | 'height' | 'alt'> | null) => void;
    accept?: 'image' | 'video' | 'any';
    clearable?: boolean;
    compact?: boolean;
    invalid?: boolean;
    /** Shown under the name, e.g. "1920 × 1080". */
    dims?: string | null;
}) {
    const [picking, setPicking] = useState(false);
    const { upload, busy } = useUpload();
    const input = useRef<HTMLInputElement>(null);
    const pick = (items: MediaItem[]) => items[0] && onChange(items[0]);

    return (
        <DropZone accept={accept} onUploaded={pick} className={cn('min-w-0 rounded-lg', invalid && 'ring-destructive ring-1')}>
            <div className={cn('flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-2', compact && 'p-1.5')}>
                <MediaThumb src={value} className={cn('shrink-0 rounded-md', compact ? 'h-9 w-14' : 'h-16 w-28')} />
                <div className="min-w-24 flex-1">
                    <div className={cn('truncate', compact ? 'text-xs' : 'text-sm font-medium')} dir="ltr" style={{ textAlign: 'right' }}>
                        {value ? fileName(value) : <span className="text-muted-foreground">لم يتم الاختيار</span>}
                    </div>
                    {!compact && dims && (
                        <div className="text-muted-foreground text-xs" dir="ltr" style={{ textAlign: 'right' }}>
                            {dims}
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => setPicking(true)}>
                        <FolderOpen />
                        {!compact && 'المكتبة'}
                    </Button>
                    <input
                        ref={input}
                        type="file"
                        hidden
                        accept={acceptFor(accept)}
                        onChange={async (e) => {
                            const files = e.target.files;
                            e.target.value = '';
                            if (files?.length) pick(await upload(files, accept));
                        }}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => input.current?.click()} disabled={busy} aria-label="رفع ملف">
                        <Upload />
                    </Button>
                    {clearable && value && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} aria-label="إزالة">
                            <X />
                        </Button>
                    )}
                </div>
            </div>
            <MediaPicker open={picking} onOpenChange={setPicking} accept={accept} onSelect={pick} />
        </DropZone>
    );
}
