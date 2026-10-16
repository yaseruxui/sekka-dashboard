import { PageHeader, timeAgo } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type Message = { id: number; name: string; company: string; message: string | null; estimated_budget: string | null; read_at: string | null; created_at: string };

interface Props {
    stats: { published: number; drafts: number; unread: number };
    recentMessages: Message[];
    site: { url: string; connected: boolean; lastRefresh: string | null };
}

function Stat({ label, value, hint, children }: { label: string; value?: React.ReactNode; hint: React.ReactNode; children?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border p-4">
            <span className="text-muted-foreground text-sm">{label}</span>
            {children ?? <strong className="text-3xl font-bold">{value}</strong>}
            <span className="text-muted-foreground text-xs">{hint}</span>
        </div>
    );
}

export default function Dashboard({ stats, recentMessages, site }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [refreshing, setRefreshing] = useState(false);
    const newProject = () => router.post(route('projects.store'));

    return (
        <AppLayout breadcrumbs={[{ title: 'الرئيسية', href: '/dashboard' }]}>
            <Head title="الرئيسية" />
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
                <PageHeader
                    title={`أهلاً ${auth.user.name.split(' ')[0]}`}
                    description="نظرة سريعة على الموقع والمشاريع والرسائل."
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <a href={site.url} target="_blank" rel="noreferrer">
                                    عرض الموقع <ExternalLink />
                                </a>
                            </Button>
                            <Button onClick={newProject}>
                                <Plus /> مشروع جديد
                            </Button>
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat label="المشاريع المنشورة" value={stats.published} hint="تظهر الآن في صفحة أعمالنا" />
                    <Stat label="مسودات" value={stats.drafts} hint="مشاريع أو تعديلات لم تُنشر بعد" />
                    <Stat label="رسائل جديدة" value={stats.unread} hint="من نموذج تواصل معنا" />
                    <Stat label="حالة الموقع" hint={site.lastRefresh ? `آخر تحديث ${timeAgo(site.lastRefresh)}` : 'لم يُحدَّث من اللوحة بعد'}>
                        <strong className="flex items-center gap-2 text-lg">
                            <span className={cn('size-2.5 rounded-full', site.connected ? 'bg-green-700' : 'bg-amber-600')} />
                            {site.connected ? 'متصل' : 'الربط غير مضبوط'}
                        </strong>
                    </Stat>
                </div>

                <div className="flex flex-wrap items-start gap-4">
                    <section className="min-w-0 flex-[2_1_420px] overflow-hidden rounded-xl border">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <h2 className="font-semibold">آخر الرسائل</h2>
                            <Link href={route('inbox.index')} className="text-muted-foreground text-sm hover:underline">
                                عرض الكل
                            </Link>
                        </div>
                        {recentMessages.length === 0 ? (
                            <p className="text-muted-foreground p-6 text-center text-sm">لا توجد رسائل بعد.</p>
                        ) : (
                            recentMessages.map((m) => (
                                <Link
                                    key={m.id}
                                    href={route('inbox.index', { open: m.id })}
                                    className="hover:bg-muted/50 flex items-center gap-3 border-b px-4 py-3 last:border-0"
                                >
                                    <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full font-semibold">{m.name.trim()[0]}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2 font-semibold">
                                            {!m.read_at && <span className="bg-primary size-2 rounded-full" aria-label="جديدة" />}
                                            {m.name}
                                            {m.company && <span className="text-muted-foreground font-normal">· {m.company}</span>}
                                        </span>
                                        <span className="text-muted-foreground block truncate text-sm">{m.message || '—'}</span>
                                    </span>
                                    {m.estimated_budget && <span className="bg-muted hidden rounded-full px-2.5 py-0.5 text-xs sm:inline">{m.estimated_budget}</span>}
                                    <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(m.created_at)}</span>
                                </Link>
                            ))
                        )}
                    </section>

                    <section className="flex flex-[1_1_260px] flex-col gap-2.5 rounded-xl border p-4">
                        <h2 className="mb-1 font-semibold">إجراءات سريعة</h2>
                        {[
                            { label: 'إضافة مشروع', onClick: newProject },
                            { label: 'التحكم بالموقع', href: '/site/home' },
                            { label: 'رفع صور أو فيديو', href: '/media' },
                        ].map((a) =>
                            a.href ? (
                                <Link key={a.label} href={a.href} className="hover:bg-muted/50 flex items-center justify-between rounded-lg border px-3.5 py-3">
                                    {a.label} <ArrowLeft className="size-4" />
                                </Link>
                            ) : (
                                <button key={a.label} type="button" onClick={a.onClick} className="hover:bg-muted/50 flex items-center justify-between rounded-lg border px-3.5 py-3 text-start">
                                    {a.label} <ArrowLeft className="size-4" />
                                </button>
                            ),
                        )}
                        <Button
                            variant="secondary"
                            className="mt-1 h-11"
                            disabled={refreshing}
                            onClick={() => router.post(route('site.refresh'), {}, { preserveScroll: true, onStart: () => setRefreshing(true), onFinish: () => setRefreshing(false) })}
                        >
                            <RefreshCw className={cn(refreshing && 'animate-spin')} /> تحديث الموقع الآن
                        </Button>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
