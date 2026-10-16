import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Settings {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    hasPassword: boolean;
    encryption: 'tls' | 'ssl' | 'none';
    from_address: string;
    from_name: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'البريد الإلكتروني', href: '/settings/mail' }];

/** Settings → Email: the SMTP server for invitations and new-enquiry emails. */
export default function Mail({ settings }: { settings: Settings }) {
    const { data, setData, put, errors, processing, isDirty } = useForm({
        enabled: settings.enabled,
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password: '',
        encryption: settings.encryption,
        from_address: settings.from_address,
        from_name: settings.from_name,
    });
    const [testing, setTesting] = useState(false);

    const save: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('mail.update'), { preserveScroll: true, onSuccess: () => setData('password', '') });
    };

    const field = (id: keyof typeof data, label: string, props: React.ComponentProps<typeof Input> = {}) => (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                value={String(data[id] ?? '')}
                onChange={(e) => setData(id, e.target.value as never)}
                disabled={!data.enabled}
                {...props}
            />
            <InputError message={errors[id]} />
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="البريد الإلكتروني" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="إعدادات البريد (SMTP)"
                        description="السيرفر اللي تنبعث منه الدعوات وإشعارات طلبات التواصل. بياناته من مزوّد بريدك (Gmail، Outlook، بريد الدومين…)."
                    />

                    <form onSubmit={save} className="space-y-6">
                        <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
                            <span className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">إرسال البريد من هذه الإعدادات</span>
                                <span className="text-muted-foreground text-xs">عند الإيقاف تُستخدم إعدادات السيرفر (.env).</span>
                            </span>
                            <Switch checked={data.enabled} onCheckedChange={(v) => setData('enabled', v)} />
                        </label>

                        <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                            {field('host', 'سيرفر SMTP', { placeholder: 'smtp.gmail.com', dir: 'ltr' })}
                            {field('port', 'المنفذ', { type: 'number', dir: 'ltr' })}
                        </div>

                        <div className="grid gap-2">
                            <Label>التشفير</Label>
                            <Select
                                value={data.encryption}
                                onValueChange={(v) => setData('encryption', v as Settings['encryption'])}
                                disabled={!data.enabled}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tls">TLS / STARTTLS (منفذ 587)</SelectItem>
                                    <SelectItem value="ssl">SSL (منفذ 465)</SelectItem>
                                    <SelectItem value="none">بدون</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.encryption} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('username', 'اسم المستخدم', { dir: 'ltr', autoComplete: 'off' })}
                            {field('password', 'كلمة المرور', {
                                type: 'password',
                                dir: 'ltr',
                                autoComplete: 'new-password',
                                placeholder: settings.hasPassword ? '•••••••• (محفوظة)' : '',
                            })}
                        </div>
                        {settings.hasPassword && <p className="text-muted-foreground -mt-4 text-xs">اترك كلمة المرور فارغة للإبقاء على المحفوظة.</p>}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('from_address', 'بريد المرسل', { type: 'email', dir: 'ltr', placeholder: 'hello@seka-sa.com' })}
                            {field('from_name', 'اسم المرسل', { placeholder: 'سكة' })}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button disabled={processing}>حفظ</Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isDirty || testing}
                                title={isDirty ? 'احفظ أولاً' : undefined}
                                onClick={() => {
                                    setTesting(true);
                                    router.post(route('mail.test'), {}, { preserveScroll: true, onFinish: () => setTesting(false) });
                                }}
                            >
                                <Send /> {testing ? 'جارٍ الإرسال…' : 'إرسال رسالة تجريبية'}
                            </Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
