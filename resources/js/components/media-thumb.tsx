import { kindOf, mediaSrc } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { FileQuestion, ImageOff } from 'lucide-react';
import { useState } from 'react';

/** A small preview of a stored image or clip (site paths load from the site). */
export function MediaThumb({
    src,
    className,
    fit = 'cover',
    alt = '',
}: {
    src: string | null | undefined;
    className?: string;
    fit?: 'cover' | 'contain';
    alt?: string;
}) {
    const { siteUrl } = usePage<SharedData>().props;
    const [failed, setFailed] = useState(false);
    const url = mediaSrc(src, siteUrl);
    const kind = src ? kindOf(src) : 'file';
    const box = cn('bg-muted text-muted-foreground flex items-center justify-center overflow-hidden', className);

    if (!src)
        return (
            <div className={box}>
                <FileQuestion className="size-4 opacity-50" />
            </div>
        );
    if (failed)
        return (
            <div className={box} title={src}>
                <ImageOff className="size-4 opacity-50" />
            </div>
        );

    const media = cn('size-full', fit === 'cover' ? 'object-cover' : 'object-contain');
    return (
        <div className={box}>
            {kind === 'video' ? (
                <video src={url + '#t=0.1'} className={media} muted playsInline preload="metadata" onError={() => setFailed(true)} />
            ) : (
                <img src={url} alt={alt} className={media} loading="lazy" onError={() => setFailed(true)} />
            )}
        </div>
    );
}
