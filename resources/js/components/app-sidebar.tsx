import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import { Briefcase, FolderKanban, Home, Images, Inbox, LayoutDashboard, Mail, Menu, PanelRightClose, ShieldCheck } from 'lucide-react';
import AppLogo from './app-logo';

const navGroups: NavGroup[] = [
    {
        title: 'عام',
        items: [
            { title: 'الرئيسية', url: '/dashboard', icon: LayoutDashboard },
            { title: 'المشاريع', url: '/projects', icon: FolderKanban },
            { title: 'صندوق الوارد', url: '/inbox', icon: Inbox },
        ],
    },
    {
        title: 'التحكم بالموقع',
        items: [
            { title: 'الصفحة الرئيسية', url: '/site/home', icon: Home },
            { title: 'أعمالنا', url: '/site/work', icon: Briefcase },
            { title: 'تواصل معنا', url: '/site/contact', icon: Mail },
            { title: 'سياسة الخصوصية', url: '/site/policy', icon: ShieldCheck },
            { title: 'القائمة والفوتر', url: '/site/menu', icon: Menu },
        ],
    },
    {
        title: 'الوسائط',
        items: [{ title: 'مكتبة الوسائط', url: '/media', icon: Images }],
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
    return (
        <Sidebar side="right" collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarBrand />
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navGroups.map((group) => (
                    <NavMain key={group.title} label={group.title} items={group.items} />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
