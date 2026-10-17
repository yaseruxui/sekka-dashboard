import { timeAgo } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { readDisplayPrefs } from '@/hooks/use-display-prefs';
import { playNotificationSound } from '@/lib/notification-sound';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const POLL_MS = 10_000;

/**
 * Sidebar bell: unread count, the latest notifications, and a toast when a
 * new one arrives (unless turned off in Settings → Appearance). Refreshes the
 * shared `notifications` prop every 10s.
 */
export function NotificationBell({ className }: { className?: string }) {
    const {
        props: { notifications },
        url,
    } = usePage<SharedData>();
    const unread = notifications?.unread ?? 0;
    const items = notifications?.items ?? [];
    const seen = useRef(unread);

    // Keeps polling in background tabs too, so the chime still plays while
    // you work elsewhere; coming back to the tab checks straight away.
    // Skipped while a visit is running: a poll landing between a save and its
    // redirect would age the session flash, and that save's toast would be lost.
    useEffect(() => {
        let busy = false;
        const offStart = router.on('start', (e) => {
            if (!e.detail.visit.only.length) busy = true;
        });
        const offFinish = router.on('finish', (e) => {
            if (!e.detail.visit.only.length) busy = false;
        });
        const check = () => !busy && router.reload({ only: ['notifications', 'unreadMessages'] });
        const t = setInterval(check, POLL_MS);
        const onVisible = () => document.visibilityState === 'visible' && check();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(t);
            offStart();
            offFinish();
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    // The unread count in the tab title, visible from other tabs.
    useEffect(() => {
        const base = document.title.replace(/^\(\d+\+?\) /, '');
        document.title = unread > 0 ? `(${unread > 9 ? '9+' : unread}) ${base}` : base;
    }, [unread, url]);

    useEffect(() => {
        if (unread > seen.current && items[0] && !items[0].read) {
            const prefs = readDisplayPrefs();
            if (prefs.notificationToasts) toast(items[0].title, { description: items[0].body || undefined });
            if (prefs.notificationSound) playNotificationSound();
        }
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
