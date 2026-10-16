import { timeAgo } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const POLL_MS = 30_000;

/**
 * Sidebar bell: unread count, the latest notifications, and a toast when a
 * new one arrives. Refreshes the shared `notifications` prop every 30s while
 * the tab is visible.
 */
export function NotificationBell({ className }: { className?: string }) {
    const { notifications } = usePage<SharedData>().props;
    const unread = notifications?.unread ?? 0;
    const items = notifications?.items ?? [];
    const seen = useRef(unread);

    useEffect(() => {
        const t = setInterval(() => {
            if (document.visibilityState === 'visible') router.reload({ only: ['notifications', 'unreadMessages'] });
        }, POLL_MS);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (unread > seen.current && items[0] && !items[0].read) toast(items[0].title, { description: items[0].body || undefined });
        seen.current = unread;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unread]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn('relative', className)}
                    aria-label={unread ? `الإشعارات، ${unread} غير مقروءة` : 'الإشعارات'}
                >
                    <Bell />
                    {unread > 0 && (
                        <span className="bg-destructive absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="text-sm font-semibold">الإشعارات</span>
                    {unread > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true, preserveState: true })}
                        >
                            <CheckCheck /> تعليم الكل كمقروء
                        </Button>
                    )}
                </div>
                {items.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-8 text-center text-sm">لا توجد إشعارات.</p>
                ) : (
                    <ul className="max-h-96 overflow-y-auto">
                        {items.map((n) => (
                            <li key={n.id} className="border-b last:border-0">
                                <Link href={route('notifications.open', n.id)} className="hover:bg-muted/60 flex gap-3 px-4 py-3">
                                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('block text-sm', !n.read && 'font-semibold')}>{n.title}</span>
                                        {n.body && <span className="text-muted-foreground block truncate text-xs">{n.body}</span>}
                                        <span className="text-muted-foreground text-xs">{timeAgo(n.created_at)}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
