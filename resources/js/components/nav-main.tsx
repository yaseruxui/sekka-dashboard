import { Badge } from '@/components/ui/badge';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [], label }: { items: NavItem[]; label: string }) {
    const page = usePage<SharedData>();
    const unread = page.props.unreadMessages ?? 0;
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            className="data-[active=true]:bg-brand-soft data-[active=true]:text-brand-ink data-[active=true]:before:bg-brand relative group-data-[collapsible=icon]:before:hidden data-[active=true]:font-semibold data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:end-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full"
                            isActive={page.url === item.url || page.url.startsWith(item.url + '/') || page.url.startsWith(item.url + '?')}
                        >
                            <Link href={item.url} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                {item.url === '/inbox' && unread > 0 && (
                                    <Badge className="bg-brand ms-auto h-5 rounded-full px-1.5 text-[10px] font-bold text-[#0b0b0b]">{unread}</Badge>
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
