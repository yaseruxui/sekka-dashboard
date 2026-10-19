import { PageHeader, timeAgo } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { SITE_PAGES } from '@/features/site/registry';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Permission, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Construction,
    ExternalLink,
    FilePen,
    FolderCheck,
    Globe,
    ImageUp,
    Inbox,
    LayoutTemplate,
    Mail,
    Plus,
    TriangleAlert,
    type LucideIcon,
} from 'lucide-react';

type Message = {
    id: number;
    name: string;
    company: string;
    message: string | null;
    estimated_budget: string | null;
    status: string;
    created_at: string;
};

type MessageStatus = 'new' | 'in_progress' | 'replied' | 'closed';

interface Props {
    stats: { published: number; drafts: number; unread: number };
    recentMessages: Message[];
    messages: {
        days: { date: string; count: number }[];
        last30: number;
        previous30: number;
        byStatus: Record<MessageStatus, number>;
    } | null;
    site: {
        url: string;
        connected: boolean;
        lastRefresh: string | null;
        failedAt: string | null;
        maintenance: boolean;
        lastUpdate: string | null;
    };
    recentEdits: { section: string; by: string; at: string }[];
    content: { services: number; servicesTotal: number; workReel: number; media: number };
}

const STATUS_LABELS: Record<MessageStatus, string> = { new: 'جديدة', in_progress: 'قيد المتابعة', replied: 'تم الرد', closed: 'مغلقة' };

/** "home.hero" → page and section titles from the site editor, and where to edit it. */
function sectionLabel(key: string): { label: string; href: string } {
    const [pageId, sectionId] = key.split('.');
    const page = SITE_PAGES.find((p) => p.id === pageId);
    const section = page?.sections.find((s) => s.id === sectionId);
    return {
        label: page ? (section && section.title !== page.title ? `${page.title} · ${section.title}` : page.title) : key,
        href: page ? `/site/${page.id}` : '/site/home',
    };
}

/** Thirty bars, one per day; the tallest fills the box. */
function DayBars({ days }: { days: { date: string; count: number }[] }) {
    const max = Math.max(1, ...days.map((d) => d.count));
    return (
        <div className="flex h-16 items-end gap-[3px]" dir="ltr" aria-hidden="true">
            {days.map((d) => (
                <span
                    key={d.date}
                    title={`${d.date}: ${d.count}`}
                    className={cn('flex-1 rounded-sm', d.count ? 'bg-sky-500/70' : 'bg-muted')}
                    style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
                />
            ))}
        </div>
    );
}

function Card({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn('bg-card min-w-0 overflow-hidden rounded-xl border shadow-xs', className)}>
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-semibold">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

const tones = {
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
};

function Stat({
    label,
    value,
    hint,
    icon: Icon,
    tone,
    href,
    children,
}: {
    label: string;
    value?: React.ReactNode;
    hint: React.ReactNode;
    icon: LucideIcon;
    tone: keyof typeof tones;
    href?: string;
    children?: React.ReactNode;
}) {
    const body = (
        <>
            <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm font-medium">{label}</span>
                <span className={cn('flex size-9 items-center justify-center rounded-lg', tones[tone])}>
                    <Icon className="size-[18px]" />
                </span>
            </div>
            {children ?? <strong className="text-3xl font-bold tabular-nums">{value}</strong>}
            <span className="text-muted-foreground text-xs">{hint}</span>
        </>
    );
    const cls = 'bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-xs transition';
    return href ? (
        <Link href={href} className={cn(cls, 'hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-sm')}>
            {body}
        </Link>
    ) : (
        <div className={cls}>{body}</div>
    );
}

export default function Dashboard({ stats, recentMessages, messages, site, recentEdits, content }: Props) {
    const { auth } = usePage<SharedData>().props;
    const can = (p: Permission) => auth.permissions.includes(p);
    const newProject = () => router.post(route('projects.store'));
    // Connected, and the last revalidate the site confirmed (none failed since).
    const synced = site.connected && !site.failedAt;

    const actions = (
        [
            { label: 'إضافة مشروع', icon: Plus, onClick: newProject, permission: 'projects' },
            { label: 'التحكم بالموقع', icon: LayoutTemplate, href: '/site/home', permission: 'site' },
            { label: 'رفع صور أو فيديو', icon: ImageUp, href: '/media', permission: 'media' },
        ] satisfies { label: string; icon: LucideIcon; href?: string; onClick?: () => void; permission: Permission }[]
    ).filter((a) => can(a.permission));
    const actionCls = 'group hover:bg-muted/60 flex items-center justify-between rounded-lg border px-3 py-2.5 text-start transition-colors';

    return (
        <AppLayout breadcrumbs={[{ title: 'نظرة عامة', href: '/dashboard' }]}>
            <Head title="نظرة عامة" />
            <div className="max-w-page mx-auto flex w-full flex-col gap-6 p-4 md:p-8">
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
                            {can('projects') && (
                                <Button onClick={newProject}>
                                    <Plus /> مشروع جديد
                                </Button>
                            )}
                        </>
                    }
                />

                {/* Only when the site is not getting updates; nothing to say while it is. */}
                {!synced && (
                    <div
                        role="status"
                        className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
                    >
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <p>
                            {site.connected
                                ? `آخر تعديل ما وصل للموقع${site.failedAt ? ` (${timeAgo(site.failedAt)})` : ''}. التعديلات محفوظة، وتظهر على الموقع خلال 5 دقائق.`
                                : 'ربط الموقع غير مضبوط (SITE_URL و SITE_REVALIDATE_SECRET)، فالتعديلات تظهر على الموقع بعد 5 دقائق بدل فوراً.'}
                        </p>
                    </div>
                )}

                <div
                    className={cn(
                        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm',
                        site.maintenance ? 'border-destructive/40 bg-destructive/10' : 'bg-card',
                    )}
                >
                    <span className="flex items-center gap-2 font-medium">
                        {site.maintenance ? (
                            <Construction className="text-destructive size-4" />
                        ) : (
                            <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {site.maintenance ? 'الموقع تحت الصيانة' : 'الموقع شغّال'}
                    </span>
                    {site.lastUpdate && <span className="text-muted-foreground">آخر تحديث للمحتوى {timeAgo(site.lastUpdate)}</span>}
                    {can('site') && (
                        <Link href="/site/maintenance" className="text-muted-foreground hover:text-foreground ms-auto flex items-center gap-1">
                            وضع الصيانة <ArrowLeft className="size-3.5" />
                        </Link>
                    )}
                </div>

                <div className={cn('grid gap-4 sm:grid-cols-2', can('inbox') ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
                    <Stat
                        label="المشاريع المنشورة"
                        value={stats.published}
                        hint="تظهر الآن في صفحة أعمالنا"
                        icon={FolderCheck}
                        tone="green"
                        href="/projects"
                    />
                    <Stat label="مسودات" value={stats.drafts} hint="مشاريع أو تعديلات لم تُنشر بعد" icon={FilePen} tone="amber" href="/projects" />
                    {can('inbox') && (
                        <Stat
                            label="رسائل جديدة"
                            value={stats.unread}
                            hint="من نموذج تواصل معنا"
                            icon={Mail}
                            tone="sky"
                            href={route('inbox.index')}
                        />
                    )}
                </div>

                {messages && (
                    <Card
                        title="الرسائل آخر 30 يوم"
                        action={
                            <Link href={route('inbox.index')} className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
                                صندوق الرسائل <ArrowLeft className="size-3.5" />
                            </Link>
                        }
                    >
                        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 p-4">
                            <div className="grid gap-1">
                                <strong className="text-3xl font-bold tabular-nums">{messages.last30}</strong>
                                <span className="text-muted-foreground text-xs">
                                    {messages.previous30 === 0
                                        ? 'ما في رسائل بالـ 30 يوم اللي قبلها'
                                        : `${messages.last30 >= messages.previous30 ? '▲' : '▼'} ${Math.abs(
                                              Math.round(((messages.last30 - messages.previous30) / messages.previous30) * 100),
                                          )}% عن الـ 30 يوم اللي قبلها (${messages.previous30})`}
                                </span>
                            </div>
                            <div className="min-w-[220px] flex-1">
                                <DayBars days={messages.days} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                            {(Object.keys(STATUS_LABELS) as MessageStatus[]).map((s) => (
                                <Link
                                    key={s}
                                    href={route('inbox.index', { filter: s })}
                                    className={cn(
                                        'hover:bg-muted flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                                        s === 'new' && messages.byStatus.new > 0 && 'border-sky-500/40',
                                    )}
                                >
                                    {STATUS_LABELS[s]}
                                    <span className="font-semibold tabular-nums">{messages.byStatus[s] ?? 0}</span>
                                </Link>
                            ))}
                        </div>
                    </Card>
                )}

                <div className="flex flex-wrap items-start gap-4">
                    {can('site') && (
                        <Card title="آخر التعديلات" className="flex-[2_1_420px]">
                            {recentEdits.length === 0 ? (
                                <p className="text-muted-foreground p-6 text-center text-sm">ما في تعديلات على الموقع للحين.</p>
                            ) : (
                                recentEdits.map((e) => {
                                    const { label, href } = sectionLabel(e.section);
                                    return (
                                        <Link
                                            key={e.section}
                                            href={href}
                                            className="hover:bg-muted/60 flex items-center gap-3 border-b px-4 py-2.5 text-sm transition-colors last:border-0"
                                        >
                                            <span className="min-w-0 flex-1 truncate">
                                                <span className="font-medium">{e.by || '—'}</span>
                                                <span className="text-muted-foreground"> عدّل </span>
                                                {label}
                                            </span>
                                            <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(e.at)}</span>
                                        </Link>
                                    );
                                })
                            )}
                        </Card>
                    )}
                    <Card title="المحتوى" className="flex-[1_1_260px]">
                        <dl className="grid gap-3 p-4 text-sm">
                            {[
                                ['الخدمات بالرئيسية', `${content.services} من ${content.servicesTotal}`, '/site/home'],
                                ['مشاريع شريط الأعمال', content.workReel, '/site/home'],
                                ['ملفات مكتبة الوسائط', content.media, '/media'],
                            ].map(([label, value, href]) => (
                                <Link key={label as string} href={href as string} className="flex items-center justify-between hover:underline">
                                    <dt className="text-muted-foreground">{label}</dt>
                                    <dd className="font-semibold tabular-nums">{value}</dd>
                                </Link>
                            ))}
                        </dl>
                    </Card>
                </div>

                <div className="flex flex-wrap items-start gap-4">
                    {can('inbox') && (
                        <section className="bg-card min-w-0 flex-[2_1_420px] overflow-hidden rounded-xl border shadow-xs">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <h2 className="font-semibold">آخر الرسائل</h2>
                                <Link
                                    href={route('inbox.index')}
                                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
                                >
                                    عرض الكل <ArrowLeft className="size-3.5" />
                                </Link>
                            </div>
                            {recentMessages.length === 0 ? (
                                <div className="text-muted-foreground flex flex-col items-center gap-2 p-10 text-center text-sm">
                                    <span className="bg-muted flex size-11 items-center justify-center rounded-full">
                                        <Inbox className="size-5" />
                                    </span>
                                    لا توجد رسائل بعد.
                                </div>
                            ) : (
                                recentMessages.map((m) => (
                                    <Link
                                        key={m.id}
                                        href={route('inbox.index', { open: m.id })}
                                        className="hover:bg-muted/60 flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-0"
                                    >
                                        <span className="bg-primary/5 text-foreground/80 flex size-9 shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-black/5 dark:ring-white/10">
                                            {m.name.trim()[0]}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2 font-semibold">
                                                {m.status === 'new' && (
                                                    <span className="bg-brand ring-brand/30 size-2 rounded-full ring-2" aria-label="جديدة" />
                                                )}
                                                {m.name}
                                                {m.company && <span className="text-muted-foreground font-normal">· {m.company}</span>}
                                            </span>
                                            <span className="text-muted-foreground block truncate text-sm">{m.message || '—'}</span>
                                        </span>
                                        {m.estimated_budget && (
                                            <span className="bg-muted hidden rounded-full px-2.5 py-0.5 text-xs sm:inline">{m.estimated_budget}</span>
                                        )}
                                        <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(m.created_at)}</span>
                                    </Link>
                                ))
                            )}
                        </section>
                    )}

                    <section className="bg-card flex flex-[1_1_260px] flex-col gap-2.5 rounded-xl border p-4 shadow-xs">
                        <h2 className="mb-1 font-semibold">إجراءات سريعة</h2>
                        {actions.map((a) => {
                            const inner = (
                                <>
                                    <span className="flex items-center gap-2.5">
                                        <span className="bg-muted text-foreground/70 group-hover:bg-background flex size-8 items-center justify-center rounded-md transition-colors">
                                            <a.icon className="size-4" />
                                        </span>
                                        {a.label}
                                    </span>
                                    <ArrowLeft className="text-muted-foreground size-4 transition-transform group-hover:-translate-x-0.5" />
                                </>
                            );
                            return a.href ? (
                                <Link key={a.label} href={a.href} className={actionCls}>
                                    {inner}
                                </Link>
                            ) : (
                                <button key={a.label} type="button" onClick={a.onClick} className={actionCls}>
                                    {inner}
                                </button>
                            );
                        })}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
