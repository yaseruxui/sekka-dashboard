import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { Switch } from '@/components/ui/switch';
import { type FontSize, useDisplayPrefs } from '@/hooks/use-display-prefs';
import { playNotificationSound } from '@/lib/notification-sound';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'إعدادات اللوحة',
        href: '/settings/dashboard',
    },
];

const FONT_SIZES: { value: FontSize; label: string; sample: string }[] = [
    { value: 'sm', label: 'صغير', sample: 'text-sm' },
    { value: 'md', label: 'عادي', sample: 'text-base' },
    { value: 'lg', label: 'كبير', sample: 'text-lg' },
];

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{title}</span>
                <span className="text-muted-foreground text-xs">{description}</span>
            </span>
            {children}
        </label>
    );
}

export default function Appearance() {
    const { prefs, update } = useDisplayPrefs();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="إعدادات اللوحة" />

            <SettingsLayout>
                <div className="space-y-10">
                    <div className="space-y-6">
                        <HeadingSmall title="المظهر" description="تُحفظ على هذا الجهاز فقط." />

                        <section className="space-y-2">
                            <h3 className="text-sm font-medium">الوضع</h3>
                            <AppearanceTabs />
                        </section>

                        <section className="space-y-2">
                            <h3 className="text-sm font-medium">حجم الخط</h3>
                            <div role="radiogroup" aria-label="حجم الخط" className="bg-muted inline-flex gap-1 rounded-lg p-1">
                                {FONT_SIZES.map((s) => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={prefs.fontSize === s.value}
                                        onClick={() => update({ fontSize: s.value })}
                                        className={cn(
                                            'flex items-baseline gap-1.5 rounded-md px-3.5 py-1.5 transition-colors',
                                            prefs.fontSize === s.value
                                                ? 'bg-card text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                                        )}
                                    >
                                        <span className={cn('font-semibold', s.sample)}>أ</span>
                                        <span className="text-sm">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <Row title="تقليل الحركة" description="إيقاف الحركات والانتقالات في اللوحة.">
                                <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} />
                            </Row>
                        </section>
                    </div>

                    <div className="space-y-6 border-t pt-8">
                        <HeadingSmall title="الإشعارات" description="عند وصول طلب تواصل جديد، على هذا الجهاز." />
                        <section className="space-y-3">
                            <Row title="رسالة منبثقة" description="تظهر رسالة صغيرة أعلى الشاشة.">
                                <Switch checked={prefs.notificationToasts} onCheckedChange={(v) => update({ notificationToasts: v })} />
                            </Row>
                            <Row title="صوت" description="نغمة قصيرة مع كل إشعار.">
                                <Switch
                                    checked={prefs.notificationSound}
                                    onCheckedChange={(v) => {
                                        update({ notificationSound: v });
                                        if (v) playNotificationSound();
                                    }}
                                />
                            </Row>
                        </section>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
