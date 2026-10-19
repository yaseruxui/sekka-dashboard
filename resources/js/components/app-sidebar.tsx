import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { NotificationBell } from '@/components/notification-bell';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { type NavGroup, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Briefcase,
    Construction,
    FileQuestion,
    FolderKanban,
    Home,
    Images,
    Inbox,
    LayoutDashboard,
    Mail,
    Menu,
    PanelRightClose,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

const navGroups: NavGroup[] = [
    {
        title: 'عام',
        items: [
            { title: 'الرئيسية', url: '/dashboard', icon: LayoutDashboard },
            { title: 'المشاريع', url: '/projects', icon: FolderKanban, permission: 'projects' },
            { title: 'الخدمات', url: '/services', icon: Sparkles, permission: 'site' },
            { title: 'طلبات التواصل', url: '/inbox', icon: Inbox, permission: 'inbox' },
            { title: 'المستخدمون', url: '/users', icon: Users, permission: 'users' },
        ],
    },
    {
        title: 'التحكم بالموقع',
        items: [
            { title: 'الصفحة الرئيسية', url: '/site/home', icon: Home, permission: 'site' },
            { title: 'أعمالنا', url: '/site/work', icon: Briefcase, permission: 'site' },
            { title: 'تواصل معنا', url: '/site/contact', icon: Mail, permission: 'site' },
            { title: 'سياسة الخصوصية', url: '/site/policy', icon: ShieldCheck, permission: 'site' },
            { title: 'صفحة 404', url: '/site/not-found', icon: FileQuestion, permission: 'site' },
            { title: 'وضع الصيانة', url: '/site/maintenance', icon: Construction, permission: 'site' },
            { title: 'القائمة والفوتر', url: '/site/menu', icon: Menu, permission: 'site' },
        ],
    },
    {
        title: 'الوسائط',
        items: [{ title: 'مكتبة الوسائط', url: '/media', icon: Images, permission: 'media' }],
    },
];

/**
 * The logo row doubles as the sidebar toggle: collapsed, the logo turns into
 * the expand icon on hover and opens the sidebar; expanded, a collapse button
 * shows at the end of the row on hover (always on touch screens, which have
 * no hover). Ctrl/⌘+B still toggles too.
 */
function SidebarBrand() {
    const { state, isMobile, toggleSidebar } = useSidebar();

    if (state === 'collapsed' && !isMobile) {
        return (
            <SidebarMenuItem className="group/brand">
                <SidebarMenuButton size="lg" onClick={toggleSidebar} tooltip="توسيع القائمة" aria-label="توسيع القائمة">
                    <AppLogo expandHint />
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem className="group/brand">
            <SidebarMenuButton size="lg" asChild className="pe-10">
                <Link href="/dashboard" prefetch>
                    <AppLogo />
                </Link>
            </SidebarMenuButton>
            <button
                type="button"
                onClick={toggleSidebar}
                aria-label="طي القائمة"
                title="طي القائمة"
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ring-sidebar-ring absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md opacity-0 outline-hidden transition-opacity group-hover/brand:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 [@media(hover:none)]:opacity-100"
            >
                <PanelRightClose className="size-4" />
            </button>
        </SidebarMenuItem>
    );
}

export function AppSidebar() {
    const { props } = usePage<SharedData>();
    const { permissions } = props.auth;

    return (
        <Sidebar side="right" collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarBrand />
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navGroups.map((group) => {
                    // Only what this user may open; a group with nothing left is dropped.
                    const items = group.items.filter((i) => !i.permission || permissions.includes(i.permission));
                    return items.length > 0 && <NavMain key={group.title} label={group.title} items={items} />;
                })}
            </SidebarContent>

            {/* The profile (its menu opens Settings) and the bell; a line keeps them apart from the nav. */}
            <SidebarSeparator className="bg-foreground/15 mx-4 my-1 w-auto group-data-[collapsible=icon]:mx-3" />
            <SidebarFooter>
                {/* Collapsed to icons: the bell stacks above the avatar. */}
                <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col-reverse">
                    <div className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
                        <NavUser />
                    </div>
                    <NotificationBell className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-8 shrink-0" />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
