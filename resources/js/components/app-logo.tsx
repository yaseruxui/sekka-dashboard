import { BrandLogo } from '@/components/brand-logo';

/** Sidebar header: the logo as the avatar, the name beside it (hidden when the sidebar collapses to icons). */
export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-[#0A55FB] text-white shadow-sm">
                <BrandLogo variant="wordmark" className="h-2.75" />
            </div>
            <div className="ms-1 grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">وكالة سكة الإبداعية</span>
                <span className="text-muted-foreground truncate text-xs">لوحة التحكم</span>
            </div>
        </>
    );
}
