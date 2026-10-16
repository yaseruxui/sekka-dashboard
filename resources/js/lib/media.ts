import { postForm } from '@/lib/http';
import * as z from 'zod/mini';

/** A row of the media library, as the Media model serializes it. */
export const mediaItemSchema = z.object({
    id: z.number(),
    url: z.string(),
    name: z.string(),
    mime: z.string(),
    size: z.number(),
    width: z.nullable(z.number()),
    height: z.nullable(z.number()),
    alt: z.string(),
    kind: z.enum(['image', 'video', 'file']),
    created_at: z.string(),
});

/** One page of /media/list (Laravel paginator). */
export const mediaPageSchema = z.object({
    data: z.array(mediaItemSchema),
    current_page: z.number(),
    last_page: z.number(),
});

/** Where a file is used: /media/{id}/usage. */
/** `live`: the public site shows it now, so it cannot be deleted. */
export const mediaUsageSchema = z.array(z.object({ label: z.string(), href: z.string(), live: z.boolean() }));
export type MediaUsage = z.infer<typeof mediaUsageSchema>;

export type MediaItem = z.infer<typeof mediaItemSchema>;
export type MediaKind = MediaItem['kind'];

/** Clips above this size get a warning before upload. */
export const LARGE_VIDEO_BYTES = 50 * 1024 * 1024;

/** Longest side of an uploaded photo after compression. */
const MAX_IMAGE_SIDE = 2560;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function kindOf(srcOrMime: string): MediaKind {
    const s = srcOrMime.toLowerCase();
    if (s.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/.test(s)) return 'image';
    if (s.startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/.test(s)) return 'video';
    return 'file';
}

/**
 * Where a stored src can be loaded from in the dashboard: uploads are full
 * URLs already; the site's own files are paths like /media/... on the site.
 */
export function mediaSrc(src: string | null | undefined, siteUrl: string): string {
    if (!src) return '';
    if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:')) return src;
    if (src.startsWith('/storage/')) return src;
    return siteUrl.replace(/\/$/, '') + (src.startsWith('/') ? src : '/' + src);
}

export function fileName(src: string): string {
    try {
        return decodeURIComponent(src.split('?')[0].split('/').pop() || src);
    } catch {
        return src;
    }
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Intrinsic size of an image or clip, read in the browser. */
export function readSize(file: File): Promise<{ width: number; height: number } | null> {
    const url = URL.createObjectURL(file);
    const done = <T>(v: T) => {
        URL.revokeObjectURL(url);
        return v;
    };
    return new Promise((resolve) => {
        if (file.type.startsWith('video/')) {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.onloadedmetadata = () => resolve(done(v.videoWidth ? { width: v.videoWidth, height: v.videoHeight } : null));
            v.onerror = () => resolve(done(null));
            v.src = url;
        } else if (file.type.startsWith('image/')) {
            const img = new Image();
            img.onload = () => resolve(done(img.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : null));
            img.onerror = () => resolve(done(null));
            img.src = url;
        } else resolve(done(null));
    });
}

/**
 * Shrinks big photos before upload: longest side 2560 px, WebP at 85%.
 * GIF (animation) and SVG are left alone; so is anything that would not
 * come out smaller.
 */
export async function compressImage(file: File): Promise<File> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return file;
    const size = await readSize(file);
    if (!size) return file;
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(size.width, size.height));
    if (scale === 1 && file.size < 400 * 1024) return file;

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
}

export interface UploadResult {
    item: MediaItem;
    /** Bytes saved by compression, if any. */
    saved: number;
}

/** Compresses (photos), reads the size, and uploads to the media library. */
export async function uploadMedia(original: File, onProgress?: (p: number) => void): Promise<UploadResult> {
    const file = await compressImage(original);
    const size = await readSize(file);
    const form = new FormData();
    form.append('file', file);
    if (size) {
        form.append('width', String(size.width));
        form.append('height', String(size.height));
    }
    const item = await postForm('/media', form, { schema: mediaItemSchema, onProgress });
    return { item, saved: Math.max(0, original.size - file.size) };
}

export function acceptFor(kind: 'image' | 'video' | 'any'): string {
    if (kind === 'image') return IMAGE_TYPES.join(',');
    if (kind === 'video') return VIDEO_TYPES.join(',');
    return [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');
}
