import { AppearanceToggle } from '@/components/appearance-toggle';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationBell } from '@/components/notification-bell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

/**
 * Top bar: breadcrumbs, then notifications, light/dark and the profile menu.
 * On phones it also holds the button that opens the sidebar drawer.
 */
export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth } = usePage<SharedData>().props;

    return (
        <header className="border-sidebar-border/50 flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
            <SidebarTrigger className="-ms-1 md:hidden" />
            <Breadcrumbs breadcrumbs={breadcrumbs} />

            <div className="ms-auto flex items-center gap-1">
                <NotificationBell className="size-9" />
                <AppearanceToggle className="size-9" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label="قائمة الحساب"
                            className="hover:bg-muted data-[state=open]:bg-muted flex items-center gap-2 rounded-lg p-1 pe-2 transition-colors"
                        >
                            <span className="flex items-center gap-2 [&>div]:hidden sm:[&>div]:grid">
                                <UserInfo user={auth.user} />
                            </span>
                            <ChevronDown className="text-muted-foreground size-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-56 rounded-lg" align="end">
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
