import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import { FileText, FolderKanban, Home, Images, Inbox, Languages, LayoutGrid, Phone } from 'lucide-react';
import AppLogo from './app-logo';

const navGroups: NavGroup[] = [
    {
        title: 'Overview',
        items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutGrid }],
    },
    {
        title: 'Content',
        items: [
            { title: 'Projects', url: '/projects', icon: FolderKanban },
            { title: 'Home media', url: '/content/home', icon: Home },
            { title: 'Texts', url: '/content/texts', icon: Languages },
            { title: 'Contact info', url: '/content/contact', icon: Phone },
            { title: 'Privacy policy', url: '/content/policy', icon: FileText },
        ],
    },
    {
        title: 'Library',
        items: [
            { title: 'Media', url: '/media', icon: Images },
            { title: 'Inbox', url: '/inbox', icon: Inbox },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
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
