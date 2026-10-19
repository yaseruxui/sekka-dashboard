import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';

/** Over every page while maintenance mode is on, so it is never left on by mistake. */
export function MaintenanceBanner() {
    const { maintenance, auth } = usePage<SharedData>().props;
    const [busy, setBusy] = useState(false);
    if (!maintenance) return null;

    const canEdit = auth.permissions.includes('site');
    const stop = () =>
        router.put(
            route('site.update'),
            { section: 'maintenance.state', home: { maintenance: false } },
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );

    return (
        <div
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive mx-4 mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-4 py-2.5 text-sm"
        >
            <TriangleAlert className="size-4 shrink-0" />
            <span className="font-medium">الموقع حالياً تحت الصيانة</span>
            <span className="text-destructive/80">الزوار بيشوفوا شاشة الصيانة بس.</span>
            {canEdit && (
                <span className="ms-auto flex items-center gap-2">
                    <Button size="sm" variant="ghost" asChild>
                        <Link href="/site/maintenance">صفحة الصيانة</Link>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={stop} disabled={busy}>
                        إيقاف الصيانة
                    </Button>
                </span>
            )}
        </div>
    );
}
