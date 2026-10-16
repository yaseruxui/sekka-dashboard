import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon: LucideIcon;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('bg-muted/30 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center', className)}>
            <span className="bg-background text-muted-foreground flex size-12 items-center justify-center rounded-full border shadow-xs">
                <Icon className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
                <p className="font-medium">{title}</p>
                {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
            </div>
            {action}
        </div>
    );
}
