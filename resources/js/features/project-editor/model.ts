import type { Block, BlockType, Media } from '@/contracts/blocks';
import { kindOf, type MediaItem, mediaSrc } from '@/lib/media';

export type { Block, BlockType, Media };

/** The editor's working copy: the site's projectSchema plus the English name. */
export interface WorkingProject {
    slug: string;
    title: string;
    title_en: string;
    summary: string;
    category: string;
    year: string;
    cover: string;
    preview: string | null;
    aspect: string;
    blocks: Block[];
}

export const BLOCK_LABELS: Record<BlockType, string> = {
    text: 'نص',
    image: 'صورة',
    video: 'فيديو',
    grid: 'شبكة صور',
    embed: 'يوتيوب / فيميو',
};

export const SPACING_LABELS = { none: 'بدون', sm: 'صغيرة', md: 'متوسطة', lg: 'كبيرة' } as const;

const frame = { hidden: false, background: null, spacingTop: 'md', spacingBottom: 'md', width: 'contained' } as const;

export function newId(type: string): string {
    return `${type}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toMedia(item: Pick<MediaItem, 'url' | 'width' | 'height' | 'alt'>): Media {
    return { src: item.url, width: item.width || 1, height: item.height || 1, alt: item.alt || '' };
}

export function newBlock(type: BlockType, media: Media[] = []): Block {
    const id = newId(type);
    switch (type) {
        case 'text':
            return { ...frame, id, type, title: '', body: '', align: 'start' };
        case 'image':
            return { ...frame, id, type, media: media[0], caption: '' };
        case 'video':
            return { ...frame, id, type, media: media[0], poster: null, mode: 'loop', caption: '' };
        case 'grid':
            return { ...frame, id, type, items: media, perRow: Math.min(Math.max(media.length, 1), 3), gap: 16 };
        case 'embed':
            return { ...frame, id, type, url: '', caption: '' };
    }
}

/** A dropped / picked file becomes the block that fits it. */
export function blockForMedia(items: Media[]): Block {
    if (items.length > 1) return newBlock('grid', items);
    return newBlock(kindOf(items[0].src) === 'video' ? 'video' : 'image', items);
}

/** "Chaos Campaign!" → "chaos-campaign". */
export function slugify(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/** YouTube / Vimeo page link → its embeddable player URL (as on the site). */
export function embedSrc(url: string): string | null {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    return null;
}

/** Is this CSS colour light enough to need dark text? (as on the site) */
export function isLight(color: string | null): boolean {
    const m = color?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return false;
    let hex = m[1];
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}

/**
 * Library items normally carry their size; for any that do not (an old
 * clip), read it from the file before it goes into a block.
 */
export async function withDims<T extends Pick<MediaItem, 'url' | 'width' | 'height' | 'alt'>>(item: T, siteUrl: string): Promise<T> {
    if (item.width && item.height) return item;
    const url = mediaSrc(item.url, siteUrl);
    const size = await new Promise<{ w: number; h: number } | null>((resolve) => {
        if (kindOf(item.url) === 'video') {
            const v = document.createElement('video');
            v.preload = 'metadata';
            v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight });
            v.onerror = () => resolve(null);
            v.src = url;
        } else {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve(null);
            img.src = url;
        }
    });
    return size?.w ? { ...item, width: size.w, height: size.h } : item;
}

/** One-line description of a block for the layers list. */
export function blockSummary(b: Block): string {
    switch (b.type) {
        case 'text':
            return b.title || b.body.slice(0, 40) || 'نص فارغ';
        case 'image':
        case 'video':
            return b.media?.src?.split('/').pop() ?? '';
        case 'grid':
            return `${b.items.length} عناصر · ${b.perRow} في الصف`;
        case 'embed':
            return b.url || 'بدون رابط';
    }
}
