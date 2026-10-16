import InputError from '@/components/input-error';
import { PageHeader, timeAgo } from '@/components/page-header';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { type Permission } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { LoaderCircle, MailPlus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

interface Member {
    id: number;
    name: string;
    email: string;
    createdAt: string | null;
    /** Set until the invitation is accepted. */
    invitedAt: string | null;
    isMe: boolean;
    permissions: Permission[];
}

const LABELS: Record<Permission, { title: string; hint: string }> = {
    projects: { title: 'المشاريع', hint: 'إضافة المشاريع وتعديلها ونشرها' },
    site: { title: 'صفحات الموقع', hint: 'نصوص وصور أقسام الموقع' },
    inbox: { title: 'صندوق الوارد', hint: 'رسائل «تواصل معنا» وتصديرها' },
    media: { title: 'مكتبة الوسائط', hint: 'تصفّح كل الملفات وحذفها' },
    users: { title: 'المستخدمون', hint: 'دعوة المستخدمين وتحديد صلاحياتهم' },
};

/** Everything but managing users: what a new teammate usually needs. */
const DEFAULT_PERMISSIONS: Permission[] = ['projects', 'site', 'inbox', 'media'];

function PermissionPicker({ all, value, onChange }: { all: Permission[]; value: Permission[]; onChange: (v: Permission[]) => void }) {
    return (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">الصلاحيات</legend>
            {all.map((p) => (
                <label key={p} className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md border p-3">
                    <Checkbox
                        className="mt-0.5"
                        checked={value.includes(p)}
                        onCheckedChange={(on) => onChange(on ? all.filter((x) => x === p || value.includes(x)) : value.filter((x) => x !== p))}
                    />
                    <span className="grid gap-0.5">
                        <span className="text-sm font-medium">{LABELS[p].title}</span>
                        <span className="text-muted-foreground text-xs">{LABELS[p].hint}</span>
                    </span>
                </label>
            ))}
        </fieldset>
    );
}

function InviteDialog({ open, onOpenChange, all }: { open: boolean; onOpenChange: (o: boolean) => void; all: Permission[] }) {
    const { data, setData, errors, post, reset, processing } = useForm({ name: '', email: '', permissions: DEFAULT_PERMISSIONS });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('users.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>دعوة مستخدم</DialogTitle>
                    <DialogDescription>يوصله بريد فيه رابط يختار منه كلمة المرور. الرابط صالح 7 أيام.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="invite-name">الاسم</Label>
                        <Input id="invite-name" value={data.name} onChange={(e) => setData('name', e.target.value)} required autoComplete="off" />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="invite-email">البريد الإلكتروني</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            dir="ltr"
                            placeholder="name@example.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="off"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <PermissionPicker all={all} value={data.permissions} onChange={(v) => setData('permissions', v)} />
                    <InputError message={errors.permissions} />
                    <DialogFooter>
                        <Button type="submit" disabled={processing}>
                            {processing ? <LoaderCircle className="animate-spin" /> : <Send />}
                            إرسال الدعوة
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PermissionsDialog({ member, onClose, all }: { member: Member | null; onClose: () => void; all: Permission[] }) {
    const [value, setValue] = useState<Permission[]>([]);
    const [saving, setSaving] = useState(false);
    const [opened, setOpened] = useState<number | null>(null);
    // Start from the member's permissions each time the dialog opens on someone.
    if (member && opened !== member.id) {
        setOpened(member.id);
        setValue(member.permissions);
    }

    const save = () =>
        member &&
        router.patch(
            route('users.update', member.id),
            { permissions: value },
            { preserveScroll: true, onStart: () => setSaving(true), onFinish: () => setSaving(false), onSuccess: onClose },
        );

    return (
        <Dialog
            open={!!member}
            onOpenChange={(o) => {
                if (!o) {
                    setOpened(null);
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>صلاحيات {member?.name}</DialogTitle>
                    <DialogDescription>الأقسام اللي يقدر يفتحها في اللوحة. الرئيسية والإعدادات متاحة للجميع.</DialogDescription>
                </DialogHeader>
                <PermissionPicker all={all} value={value} onChange={setValue} />
                <DialogFooter>
                    <Button type="button" onClick={save} disabled={saving}>
                        {saving && <LoaderCircle className="animate-spin" />}
                        حفظ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Users({ users, permissions: all }: { users: Member[]; permissions: Permission[] }) {
    const getInitials = useInitials();
    const [inviting, setInviting] = useState(false);
    const [editing, setEditing] = useState<Member | null>(null);
    const [deleting, setDeleting] = useState<Member | null>(null);

    return (
        <AppLayout breadcrumbs={[{ title: 'المستخدمون', href: '/users' }]}>
            <Head title="المستخدمون" />
            <div className="max-w-page mx-auto flex w-full flex-col gap-5 p-4 md:p-8">
                <PageHeader
                    title="المستخدمون"
                    description="من يقدر يدخل اللوحة، وأي أقسام يفتح."
                    actions={
                        <Button onClick={() => setInviting(true)}>
                            <MailPlus /> دعوة مستخدم
                        </Button>
                    }
                />

                <ul className="bg-card divide-y overflow-hidden rounded-xl border shadow-xs">
                    {users.map((u) => (
                        <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
                            <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                                {getInitials(u.name)}
                            </span>
                            <div className="grid min-w-0 flex-[1_1_200px]">
                                <span className="flex items-center gap-2 font-semibold">
                                    <span className="truncate">{u.name}</span>
                                    {u.isMe && <Badge variant="secondary">أنت</Badge>}
                                    {u.invitedAt && (
                                        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                                            بانتظار قبول الدعوة
                                        </Badge>
                                    )}
                                </span>
                                <span className="text-muted-foreground truncate text-sm" dir="ltr" style={{ textAlign: 'right' }}>
                                    {u.email}
                                </span>
                            </div>

                            <div className="flex flex-[2_1_260px] flex-wrap gap-1.5">
                                {u.permissions.length === 0 ? (
                                    <span className="text-muted-foreground text-sm">بدون صلاحيات: يرى الرئيسية فقط</span>
                                ) : (
                                    u.permissions.map((p) => (
                                        <span key={p} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                                            {LABELS[p].title}
                                        </span>
                                    ))
                                )}
                            </div>

                            <div className="ms-auto flex items-center gap-1">
                                <span className="text-muted-foreground hidden text-xs lg:inline">
                                    {u.invitedAt ? `دُعي ${timeAgo(u.invitedAt)}` : u.createdAt && `أُضيف ${timeAgo(u.createdAt)}`}
                                </span>
                                {u.invitedAt && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.post(route('users.invite', u.id), {}, { preserveScroll: true })}
                                    >
                                        <Send /> إعادة إرسال
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                                    <ShieldCheck /> الصلاحيات
                                </Button>
                                {!u.isMe && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive size-8"
                                        aria-label={u.invitedAt ? `إلغاء دعوة ${u.name}` : `حذف ${u.name}`}
                                        onClick={() => setDeleting(u)}
                                    >
                                        <Trash2 />
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <InviteDialog open={inviting} onOpenChange={setInviting} all={all} />
            <PermissionsDialog member={editing} onClose={() => setEditing(null)} all={all} />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{deleting?.invitedAt ? `إلغاء دعوة «${deleting?.name}»؟` : `حذف «${deleting?.name}»؟`}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleting?.invitedAt ? 'رابط الدعوة ما عاد يشتغل.' : 'ما عاد يقدر يدخل اللوحة. التعديلات اللي عملها تبقى كما هي.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleting && router.delete(route('users.destroy', deleting.id), { preserveScroll: true })}
                        >
                            {deleting?.invitedAt ? 'إلغاء الدعوة' : 'حذف'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
