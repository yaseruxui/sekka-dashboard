import { AppearanceToggle } from '@/components/appearance-toggle';
import { BrandLogo } from '@/components/brand-logo';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/** The brand illustration (identity guide, "how to use"): stacked rounded cards rising from the bottom edge, green → blue → black, with blue outline echoes. */
function BrandShapes() {
    return (
        <svg
            aria-hidden
            viewBox="0 -90 1000 610"
            preserveAspectRatio="xMidYMin meet"
            className="absolute bottom-0 left-0 w-[150%] max-w-none -translate-x-[30%] translate-y-[24%] overflow-visible"
            fill="none"
        >
            <rect x="170" y="150" width="680" height="520" rx="190" transform="rotate(-9 510 410)" stroke="#0A55FB" strokeWidth="2" opacity=".6" />
            <rect x="200" y="70" width="560" height="520" rx="220" transform="rotate(14 480 330)" fill="#A5DA79" />
            <rect x="110" y="140" width="720" height="520" rx="210" transform="rotate(-4 470 400)" fill="#0A55FB" />
            <rect x="60" y="210" width="760" height="500" rx="190" transform="rotate(-10 440 460)" fill="#000" />
            <rect x="60" y="210" width="760" height="500" rx="190" transform="rotate(-10 440 460)" stroke="#0A55FB" strokeWidth="2" />
        </svg>
    );
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background grid min-h-svh lg:grid-cols-2 dark:bg-neutral-900">
            <div className="relative flex flex-col items-center justify-center p-6 md:p-10">
                <AppearanceToggle className="absolute start-3 top-3 size-9 md:start-5 md:top-5" />
                <div className="bg-card w-full max-w-sm rounded-2xl border p-6 shadow-sm sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-center gap-4 lg:items-start">
                            <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium lg:hidden">
                                <BrandLogo className="h-14 text-[#0A55FB] dark:text-white" />
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-2 text-center lg:text-start">
                                <h1 className="text-2xl font-bold">{title}</h1>
                                <p className="text-muted-foreground text-sm">{description}</p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </div>

            <aside className="relative hidden overflow-hidden bg-black p-12 text-white lg:flex lg:flex-col dark:border-s dark:border-white/10">
                <BrandShapes />

                <div className="relative flex items-start justify-between">
                    <BrandLogo className="h-12 text-white" />
                    <span className="text-sm text-white/50 tabular-nums">{new Date().getFullYear()}</span>
                </div>

                <div className="relative mt-[15vh] max-w-md space-y-4">
                    <h2 className="text-4xl leading-tight font-bold xl:text-5xl">
                        لوحة تحكم
                        <br />
                        <span className="text-brand">سكة الإبداعية</span>
                    </h2>
                    <p className="text-base leading-7 text-white/60">إدارة الموقع الإلكتروني، المشاريع، الوسائط والرسائل.</p>
                </div>
            </aside>
        </div>
    );
}
