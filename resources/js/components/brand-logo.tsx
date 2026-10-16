import wordmark from '@/assets/brand/logo-wordmark.svg?raw';
import logo from '@/assets/brand/logo.svg?raw';
import { cn } from '@/lib/utils';

/** Sekka's official logo (from the site's brand files). Takes its color from `currentColor`. */
export function BrandLogo({ variant = 'full', className }: { variant?: 'full' | 'wordmark'; className?: string }) {
    return (
        <span
            role="img"
            aria-label="سكة"
            className={cn('inline-block [&>svg]:block [&>svg]:h-full [&>svg]:w-auto', className)}
            dangerouslySetInnerHTML={{ __html: variant === 'full' ? logo : wordmark }}
        />
    );
}
