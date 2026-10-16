import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * Phones only: the button that opens the sidebar drawer. From md up the
 * sidebar toggles from its logo row and every page has its own title.
 */
export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 md:hidden">
            <SidebarTrigger className="-ms-1" />
            <Breadcrumbs breadcrumbs={breadcrumbs} />
        </header>
    );
}
