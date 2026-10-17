import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'الملف الشخصي',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'تغيير كلمة المرور',
        url: '/settings/password',
        icon: null,
    },
    {
        title: 'إعدادات اللوحة',
        url: '/settings/dashboard',
        icon: null,
    },
    {
        title: 'ربط البريد الإلكتروني',
        url: '/settings/mail',
        icon: null,
        permission: 'users',
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;
    const { permissions } = usePage<SharedData>().props.auth;
    const navItems = sidebarNavItems.filter((i) => !i.permission || permissions.includes(i.permission));

    return (
        <div className="px-4 py-6">
            <Heading title="الإعدادات" description="ملفك الشخصي وكلمة المرور وإعدادات اللوحة والبريد" />

            <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                <aside className="w-full max-w-xl shrink-0 lg:w-52">
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted font-semibold': currentPath === item.url,
                                })}
                            >
                                <Link href={item.url} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                {/* The page itself in a card, so it reads apart from the menu; its sections split by lines. */}
                <div className="bg-card flex-1 rounded-xl border p-6 shadow-xs md:max-w-2xl">
                    <section className="max-w-xl divide-y [&>*]:py-8 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">{children}</section>
                </div>
            </div>
        </div>
    );
}
