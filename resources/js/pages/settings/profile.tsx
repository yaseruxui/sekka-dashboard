import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Trash2, Upload } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'الحساب',
        href: '/settings/profile',
    },
];

/** Profile picture: shown in the sidebar and the users list; initials when none. */
function AvatarSection() {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string>();

    const upload = (file: File) => {
        setError(undefined);
        setUploading(true);
        router.post(
            route('avatar.update'),
            { avatar: file },
            { forceFormData: true, preserveScroll: true, onError: (e) => setError(e.avatar), onFinish: () => setUploading(false) },
        );
    };

    return (
        <div className="space-y-4">
            <HeadingSmall title="الصورة الشخصية" description="JPG أو PNG أو WebP، حتى 2 ميغابايت." />
            <div className="flex items-center gap-4">
                <Avatar className="size-16 overflow-hidden rounded-full">
                    <AvatarImage src={auth.user.avatar ?? undefined} alt={auth.user.name} className="object-cover" />
                    <AvatarFallback className="bg-neutral-200 text-lg text-black dark:bg-neutral-700 dark:text-white">
                        {getInitials(auth.user.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={input}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload(f);
                            e.target.value = '';
                        }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
                        <Upload /> {uploading ? 'جارٍ الرفع…' : auth.user.avatar ? 'تغيير الصورة' : 'رفع صورة'}
                    </Button>
                    {auth.user.avatar && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => router.delete(route('avatar.destroy'), { preserveScroll: true })}
                        >
                            <Trash2 /> حذف
                        </Button>
                    )}
                </div>
            </div>
            <InputError message={error} />
        </div>
    );
}

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="الحساب" />

            <SettingsLayout>
                <AvatarSection />

                <div className="space-y-6">
                    <HeadingSmall title="بيانات الحساب" description="الاسم والبريد الإلكتروني" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">الاسم</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="الاسم الكامل"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">البريد الإلكتروني</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="البريد الإلكتروني"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="text-foreground mt-2 text-sm">
                                    Your email address is unverified.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-muted-foreground hover:text-foreground rounded-md text-sm underline focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>حفظ</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-muted-foreground text-sm">تم الحفظ</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
