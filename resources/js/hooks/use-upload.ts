import { HttpError } from '@/lib/http';
import { formatBytes, kindOf, LARGE_VIDEO_BYTES, type MediaItem, uploadMedia } from '@/lib/media';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * Uploads files to the media library with progress toasts: photos are
 * compressed first, large clips get a warning, refusals are explained.
 */
export function useUpload() {
    const [busy, setBusy] = useState(false);

    const upload = useCallback(async (files: File[] | FileList, accept: 'image' | 'video' | 'any' = 'any'): Promise<MediaItem[]> => {
        const list = Array.from(files).filter((f) => {
            const kind = kindOf(f.type);
            if (kind === 'file' || (accept !== 'any' && kind !== accept)) {
                toast.error(`${f.name}: ${accept === 'image' ? 'اختر صورة' : accept === 'video' ? 'اختر فيديو' : 'نوع الملف غير مدعوم'}.`);
                return false;
            }
            return true;
        });
        if (!list.length) return [];

        setBusy(true);
        const done: MediaItem[] = [];
        for (const file of list) {
            if (file.type.startsWith('video/') && file.size > LARGE_VIDEO_BYTES) {
                toast.warning(`الفيديو ${file.name} حجمه ${formatBytes(file.size)}`, {
                    description: 'الفيديوهات الكبيرة تبطّئ الموقع. يفضّل ضغطه لأقل من 50 MB قبل الرفع.',
                    duration: 8000,
                });
            }
            const id = toast.loading(`جاري رفع ${file.name}…`);
            try {
                const { item, saved } = await uploadMedia(file, (p) => toast.loading(`جاري رفع ${file.name}… ${Math.round(p * 100)}%`, { id }));
                done.push(item);
                toast.success(`تم رفع ${item.name}`, {
                    id,
                    description: saved > 0 ? `تم ضغط الصورة ووفّرنا ${formatBytes(saved)}.` : undefined,
                });
            } catch (e) {
                toast.error(`تعذّر رفع ${file.name}`, { id, description: e instanceof HttpError ? e.firstError : String(e) });
            }
        }
        setBusy(false);
        return done;
    }, []);

    return { upload, busy };
}
