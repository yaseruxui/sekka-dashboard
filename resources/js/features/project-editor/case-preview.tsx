import '../../../css/case-preview.css';

import { DropZone } from '@/components/drop-zone';
import { kindOf, type MediaItem, mediaSrc } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { type Block, BLOCK_LABELS, embedSrc, isLight, type Media, type WorkingProject } from './model';

export type Device = 'desktop' | 'mobile';
export type Selection = string | 'details' | null;

const DEVICES: Record<Device, { width: number; vh: number }> = {
    desktop: { width: 1440, vh: 9 },
    mobile: { width: 390, vh: 8.44 },
};

/**
 * Renders the page at the device's real width (1440 / 390 px) and scales it
 * down to fit the column, so type and spacing look as they will on the site.
 */
function Frame({ device, children }: { device: Device; children: ReactNode }) {
    const outer = useRef<HTMLDivElement>(null);
    const inner = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState(0);
    const { width, vh } = DEVICES[device];

    useLayoutEffect(() => {
        const ro = new ResizeObserver(() => {
            if (outer.current) setScale(Math.min(1, outer.current.clientWidth / width));
            if (inner.current) setHeight(inner.current.offsetHeight);
        });
        if (outer.current) ro.observe(outer.current);
        if (inner.current) ro.observe(inner.current);
        return () => ro.disconnect();
    }, [width]);

    return (
        <div ref={outer} className="w-full" style={{ height: height * scale }}>
            <div
                ref={inner}
                className={cn('cp mx-auto overflow-hidden shadow-sm', device === 'mobile' ? 'rounded-[28px]' : 'rounded-lg')}
                style={{ width, transform: `scale(${scale})`, transformOrigin: 'top right', '--cp-vh': `${vh}px` } as CSSProperties}
            >
                {children}
            </div>
        </div>
    );
}

function Video({ src, poster, controls }: { src: string; poster?: string; controls?: boolean }) {
    return controls ? (
        <video src={src} poster={poster} controls playsInline preload="metadata" />
    ) : (
        <video src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" />
    );
}

function CaseMedia({ media, siteUrl, style }: { media: Media; siteUrl: string; style?: CSSProperties }) {
    const src = mediaSrc(media.src, siteUrl);
    return (
        <figure className="cb-media" style={{ aspectRatio: `${media.width} / ${media.height}`, ...style }}>
            {kindOf(media.src) === 'video' ? <Video src={src} /> : <img src={src} alt={media.alt} loading="lazy" />}
        </figure>
    );
}

function Caption({ text }: { text: string }) {
    return text ? <figcaption className="cb__caption">{text}</figcaption> : null;
}

function rows<T>(items: T[], perRow: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += perRow) out.push(items.slice(i, i + perRow));
    return out;
}

function Empty({ children }: { children: ReactNode }) {
    return <div className="cp-empty">{children}</div>;
}

function content(b: Block, siteUrl: string): ReactNode {
    switch (b.type) {
        case 'text': {
            const paras = b.body.split(/\n\s*\n/).filter(Boolean);
            if (!b.title && !paras.length) return <Empty>بلوك نص فارغ: اكتب العنوان والنص من الإعدادات</Empty>;
            return (
                <div className={cn('cb-text', `--${b.align}`)}>
                    {b.title ? <h2 className="cb-text__title">{b.title}</h2> : null}
                    {paras.length ? (
                        <div className="cb-text__body">
                            {paras.map((p, i) => (
                                <p key={i}>{p}</p>
                            ))}
                        </div>
                    ) : null}
                </div>
            );
        }
        case 'image':
            if (!b.media?.src) return <Empty>اختر صورة، أو اسحبها من جهازك وأفلتها هنا</Empty>;
            return (
                <div className="cb-single">
                    <CaseMedia media={b.media} siteUrl={siteUrl} />
                    <Caption text={b.caption} />
                </div>
            );
        case 'video':
            if (!b.media?.src) return <Empty>اختر فيديو، أو اسحبه من جهازك وأفلته هنا</Empty>;
            return (
                <div className="cb-single">
                    {b.mode === 'player' ? (
                        <figure className="cb-media" style={{ aspectRatio: `${b.media.width} / ${b.media.height}` }}>
                            <Video src={mediaSrc(b.media.src, siteUrl)} poster={b.poster ? mediaSrc(b.poster, siteUrl) : undefined} controls />
                        </figure>
                    ) : (
                        <CaseMedia media={b.media} siteUrl={siteUrl} />
                    )}
                    <Caption text={b.caption} />
                </div>
            );
        case 'grid':
            if (!b.items.length) return <Empty>شبكة فارغة: أضف صوراً أو أفلتها هنا</Empty>;
            return (
                <div className="cb-grid" style={{ display: 'grid', gap: b.gap }}>
                    {rows(b.items, b.perRow).map((r, i) => (
                        <div key={i} className="cb-grid__row" style={{ gap: b.gap }}>
                            {r.map((m, j) => (
                                <CaseMedia key={m.src + j} media={m} siteUrl={siteUrl} style={{ flex: `${m.width / m.height} 1 0%` }} />
                            ))}
                        </div>
                    ))}
                </div>
            );
        case 'embed': {
            const src = embedSrc(b.url);
            if (!src) return <Empty>{b.url ? 'الرابط ليس رابط يوتيوب أو فيميو' : 'ضع رابط فيديو يوتيوب أو فيميو'}</Empty>;
            return (
                <div className="cb-single">
                    <figure className="cb-media" style={{ aspectRatio: '16 / 9' }}>
                        <iframe
                            src={src}
                            title={b.caption || 'video'}
                            loading="lazy"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        />
                    </figure>
                    <Caption text={b.caption} />
                </div>
            );
        }
    }
}

/**
 * The case study as the site renders it (hero, then the blocks). Click a
 * block to select it; drop a file on a block to put it there.
 */
export function CasePreview({
    project,
    siteUrl,
    device,
    selected,
    onSelect,
    errorBlocks,
    onDropMedia,
}: {
    project: WorkingProject;
    siteUrl: string;
    device: Device;
    selected: Selection;
    onSelect: (s: Selection) => void;
    errorBlocks: Set<number>;
    onDropMedia: (blockId: string, items: MediaItem[]) => void;
}) {
    const p = project;
    const heroClip = p.preview ? mediaSrc(p.preview, siteUrl) : null;
    const cover = mediaSrc(p.cover, siteUrl);

    return (
        <Frame device={device}>
            <section
                className={cn('cp-hero cp-pick', selected === 'details' && '--selected')}
                onClick={() => onSelect('details')}
                aria-label="رأس صفحة المشروع"
            >
                {heroClip ? <Video src={heroClip} poster={cover || undefined} /> : cover ? <img src={cover} alt={p.title} /> : null}
                <div className="cp-hero__text">
                    <div className="cp-hero__cat">
                        {p.category}
                        <span className="cp-hero__dot" aria-hidden="true" />
                        <span className="cp-hero__year">{p.year}</span>
                    </div>
                    <h1 className="cp-hero__title">{p.title || 'اسم المشروع'}</h1>
                    <p className="cp-hero__lede">{p.summary}</p>
                </div>
            </section>

            {p.blocks.map((b, i) => (
                <DropZone
                    key={b.id}
                    accept={b.type === 'video' ? 'video' : b.type === 'image' || b.type === 'grid' ? 'image' : 'any'}
                    multiple={b.type === 'grid'}
                    onUploaded={(items) => onDropMedia(b.id, items)}
                    label={
                        b.type === 'grid'
                            ? 'أفلت لإضافتها للشبكة'
                            : b.type === 'image' || b.type === 'video'
                              ? 'أفلت لاستبدال الملف'
                              : 'أفلت لإضافة بلوك بعد هذا'
                    }
                >
                    <section
                        className={cn(
                            'cb cp-pick',
                            `--pt-${b.spacingTop}`,
                            `--pb-${b.spacingBottom}`,
                            b.width === 'full' && '--full',
                            b.background && '--bg',
                            isLight(b.background) && '--light',
                            selected === b.id && '--selected',
                            b.hidden && '--hidden',
                            errorBlocks.has(i) && '--error',
                        )}
                        style={b.background ? ({ '--cb-bg': b.background } as CSSProperties) : undefined}
                        onClick={() => onSelect(b.id)}
                        aria-label={`${BLOCK_LABELS[b.type]} ${i + 1}`}
                    >
                        <div className="cb__inner">{content(b, siteUrl)}</div>
                    </section>
                </DropZone>
            ))}
        </Frame>
    );
}
