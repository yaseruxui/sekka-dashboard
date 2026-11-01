import icon from '@/assets/brand/logo-icon.svg?raw';
import mark from '@/assets/brand/logo-mark.svg?raw';
import { cn } from '@/lib/utils';

/**
 * Sekka's badge logo (the site's i18n/brand/logo-mark.svg), in its own colors.
 * `icon` is the small version: the plates and the wordmark, square, without
 * «Creative Hub» and ® (unreadable at sidebar size).
 */
export function BrandLogo({ variant = 'mark', className }: { variant?: 'mark' | 'icon'; className?: string }) {
    return (
        <span
            role="img"
            aria-label="سكة"
            className={cn('inline-block [&>svg]:block [&>svg]:h-full [&>svg]:w-auto', className)}
            dangerouslySetInnerHTML={{ __html: variant === 'icon' ? icon : mark }}
        />
    );
}
