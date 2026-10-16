import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface ResetPasswordProps {
    token: string;
    email: string;
    /** Accepting an invitation (InvitationController) rather than resetting a password. */
    invitation?: boolean;
}

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function ResetPassword({ token, email, invitation = false }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm<ResetPasswordForm>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route(invitation ? 'invitation.accept' : 'password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title={invitation ? 'أهلاً بك في لوحة سكة' : 'تعيين كلمة مرور جديدة'}
            description={invitation ? 'اختر كلمة مرور لحسابك لتبدأ.' : 'اكتب كلمة المرور الجديدة لحسابك.'}
        >
            <Head title={invitation ? 'قبول الدعوة' : 'تعيين كلمة المرور'} />

            <form onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={data.email}
                            className="mt-1 block w-full"
                            readOnly
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">كلمة المرور الجديدة</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoFocus
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="كلمة المرور الجديدة"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">تأكيد كلمة المرور</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            className="mt-1 block w-full"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            placeholder="أعد كتابة كلمة المرور"
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>

                    <Button type="submit" className="mt-4 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {invitation ? 'تفعيل الحساب' : 'حفظ كلمة المرور'}
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
