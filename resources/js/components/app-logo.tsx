import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';
import { PanelRightOpen } from 'lucide-react';

/**
 * Sidebar header: the logo as the avatar, the name beside it (hidden when the
 * sidebar collapses to icons). With `expandHint`, hovering the row
 * (group/brand) swaps the logo for the expand icon.
 */
export default function AppLogo({ expandHint = false }: { expandHint?: boolean }) {
    return (
        <>
            <div
                className={cn(
                    'relative flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg',
                    // On hover the badge gives way to a plain (gray) sidebar button around the expand icon.
                    expandHint && 'group-hover/brand:bg-sidebar-accent group-hover/brand:text-sidebar-accent-foreground transition-colors',
                )}
            >
                <BrandLogo variant="icon" className={cn('size-8 transition-opacity', expandHint && 'group-hover/brand:opacity-0')} />
                {expandHint && <PanelRightOpen aria-hidden className="absolute size-4 opacity-0 transition-opacity group-hover/brand:opacity-100" />}
            </div>
            <div className="ms-1 grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">وكالة سكة الإبداعية</span>
                <span className="text-muted-foreground truncate text-xs">لوحة التحكم</span>
            </div>
        </>
    );
}
