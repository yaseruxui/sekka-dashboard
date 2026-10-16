import { cn } from '@/lib/utils';

export function PageHeader({
    title,
    description,
    actions,
    className,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
            <div className="min-w-0">
                <h1 className="text-2xl font-bold">{title}</h1>
                {description && <p className="text-muted-foreground mt-1.5">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** Relative time in Arabic ("منذ ٥ دقائق"). */
export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return '';
    const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
    const s = (new Date(iso).getTime() - Date.now()) / 1000;
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];
    for (const [unit, secs] of steps) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
    return 'الآن';
}

export function formatDate(iso: string | null | undefined, withTime = true): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), numberingSystem: 'latn' }).format(
        new Date(iso),
    );
}
