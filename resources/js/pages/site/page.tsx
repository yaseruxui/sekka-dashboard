import { Button } from '@/components/ui/button';
import { SITE_PAGES } from '@/features/site/registry';
import { type CardStatus, type Messages, SectionCard, type SiteContentProps } from '@/features/site/section-card';
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Briefcase, ExternalLink, Home, Mail, Menu, ShieldCheck } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const ICONS = { home: Home, work: Briefcase, contact: Mail, policy: ShieldCheck, menu: Menu };
const DOT: Record<CardStatus, string> = { saved: 'bg-green-700', dirty: 'bg-orange-600', error: 'bg-red-600' };

interface Props {
    page: keyof typeof ICONS;
    content: SiteContentProps;
    defaults: { messages: Messages };
    meta: Record<string, { at: string; by: string }>;
}

export default function SitePage({ page, content, defaults, meta }: Props) {
    const { siteUrl, errors } = usePage<SharedData & { errors: Record<string, string> }>().props;
    const def = SITE_PAGES.find((p) => p.id === page)!;
    const Icon = ICONS[page];
    const [open, setOpen] = useState<Set<string>>(() => new Set([def.sections[0].id]));
    const [status, setStatus] = useState<Record<string, CardStatus>>({});
    const [submitted, setSubmitted] = useState<string | null>(null);
    const anyDirty = Object.values(status).some((s) => s !== 'saved');
    useUnsavedGuard(anyDirty);

    const onStatus = useMemo(
        () => Object.fromEntries(def.sections.map((s) => [s.id, (st: CardStatus) => setStatus((prev) => (prev[s.id] === st ? prev : { ...prev, [s.id]: st }))])),
        [def.sections],
    );

    const go = useCallback((id: string) => {
        setOpen((o) => new Set([...o, id]));
        requestAnimationFrame(() => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, []);

    return (
        <AppLayout breadcrumbs={[{ title: 'التحكم بالموقع', href: '/site/home' }, { title: def.title, href: `/site/${page}` }]}>
            <Head title={def.title} />
            <div className="bg-muted/30 flex-1">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-8">
                    <div className="bg-background flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 sm:p-5">
                        <div className="flex items-center gap-3.5">
                            <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-lg">
                                <Icon className="size-5" />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold">{def.title}</h1>
                                <p className="text-muted-foreground mt-0.5 text-sm">{def.description}</p>
                            </div>
                        </div>
                        <Button variant="outline" asChild>
                            <a href={siteUrl + def.path} target="_blank" rel="noreferrer">
                                معاينة الصفحة <ExternalLink />
                            </a>
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-start gap-5">
                        <nav aria-label="أقسام الصفحة" className="bg-background w-full overflow-hidden rounded-xl border md:sticky md:top-4 md:w-60">
                            <div className="border-b px-4 py-3">
                                <strong className="text-sm">أقسام الصفحة</strong>
                                <div className="text-muted-foreground text-xs">{def.sections.length} أقسام بترتيب ظهورها</div>
                            </div>
                            <ol>
                                {def.sections.map((s, i) => {
                                    const st = submitted === s.id && Object.keys(errors).length ? 'error' : (status[s.id] ?? 'saved');
                                    return (
                                        <li key={s.id}>
                                            <button type="button" onClick={() => go(s.id)} className={cn('hover:bg-muted/60 flex w-full items-center gap-2.5 border-b px-4 py-2.5 text-start text-sm last:border-0', open.has(s.id) && 'font-semibold')}>
                                                <span className="text-muted-foreground w-4 text-xs">{i + 1}</span>
                                                <span className="flex-1">{s.title}</span>
                                                <span className={cn('size-2 rounded-full', DOT[st])} aria-label={{ saved: 'محفوظ', dirty: 'غير محفوظ', error: 'به أخطاء' }[st]} />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                            <div className="text-muted-foreground flex flex-wrap gap-3 border-t px-4 py-2.5 text-xs">
                                {(['saved', 'dirty', 'error'] as const).map((k) => (
                                    <span key={k} className="flex items-center gap-1.5">
                                        <span className={cn('size-2 rounded-full', DOT[k])} />
                                        {{ saved: 'محفوظ', dirty: 'غير محفوظ', error: 'به أخطاء' }[k]}
                                    </span>
                                ))}
                            </div>
                        </nav>

                        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
                            {def.sections.map((s, i) => (
                                <SectionCard
                                    key={`${page}-${s.id}`}
                                    page={page}
                                    section={s}
                                    index={i}
                                    content={content}
                                    defaults={defaults.messages}
                                    meta={meta[`${page}.${s.id}`]}
                                    errors={submitted === s.id ? errors : {}}
                                    open={open.has(s.id)}
                                    onOpenChange={(o) => setOpen((prev) => (o ? new Set([...prev, s.id]) : new Set([...prev].filter((x) => x !== s.id))))}
                                    onStatus={onStatus[s.id]}
                                    onSubmit={() => setSubmitted(s.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
