import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import { Briefcase, FolderKanban, Home, Images, Inbox, LayoutDashboard, Mail, Menu, ShieldCheck } from 'lucide-react';
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

export function AppSidebar() {
    return (
        <Sidebar side="right" collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
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
