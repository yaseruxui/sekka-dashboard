import { PageHeader, timeAgo } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Permission, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ExternalLink,
    FilePen,
    FolderCheck,
    ImageUp,
    Inbox,
    LayoutTemplate,
    type LucideIcon,
    Mail,
    Plus,
    TriangleAlert,
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

interface Props {
    stats: { published: number; drafts: number; unread: number };
    recentMessages: Message[];
    site: { url: string; connected: boolean; lastRefresh: string | null; failedAt: string | null };
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

export default function Dashboard({ stats, recentMessages, site }: Props) {
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
