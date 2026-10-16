import { useUpload } from '@/hooks/use-upload';
import { type MediaItem } from '@/lib/media';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';

/**
 * Drop files from the computer onto its children: they are uploaded to the
 * media library and handed to onUploaded, without leaving the page.
 */
export function DropZone({
    accept = 'any',
    multiple = false,
    onUploaded,
    className,
    children,
    label = 'أفلت الملف هنا لرفعه',
}: {
    accept?: 'image' | 'video' | 'any';
    multiple?: boolean;
    onUploaded: (items: MediaItem[]) => void;
    className?: string;
    children: React.ReactNode;
    label?: string;
}) {
    const { upload } = useUpload();
    const [over, setOver] = useState(false);
    const depth = useRef(0);

    const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

    return (
        <div
            className={cn('relative', className)}
            onDragEnter={(e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth.current++;
                setOver(true);
            }}
            onDragOver={(e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={(e) => {
                if (!hasFiles(e)) return;
                depth.current = Math.max(0, depth.current - 1);
                if (depth.current === 0) setOver(false);
            }}
            onDrop={async (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                e.stopPropagation();
                depth.current = 0;
                setOver(false);
                const files = Array.from(e.dataTransfer.files).slice(0, multiple ? undefined : 1);
                const items = await upload(files, accept);
                if (items.length) onUploaded(items);
            }}
        >
            {children}
            {over && (
                <div className="border-primary bg-background/85 pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[inherit] border-2 border-dashed text-sm font-medium">
                    <Upload className="size-5" />
                    {label}
                </div>
            )}
        </div>
    );
}
