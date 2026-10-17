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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInitials } from '@/hooks/use-initials';
import { useIsMobile } from '@/hooks/use-mobile';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type Permission } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { LayoutGrid, LoaderCircle, MailPlus, Rows3, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEventHandler, useEffect, useState } from 'react';

interface Member {
    id: number;
    name: string;
    email: string;
    createdAt: string | null;
    /** Set until the invitation is accepted. */
    invitedAt: string | null;
    isMe: boolean;
    avatar: string | null;
    permissions: Permission[];
}

const LABELS: Record<Permission, { title: string; hint: string }> = {
    projects: { title: 'المشاريع', hint: 'إضافة المشاريع وتعديلها ونشرها' },
    site: { title: 'صفحات الموقع', hint: 'نصوص وصور أقسام الموقع' },
    inbox: { title: 'طلبات التواصل', hint: 'رسائل «تواصل معنا» وتصديرها' },
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

function Identity({ member: u }: { member: Member }) {
    const getInitials = useInitials();
    return (
        <div className="flex min-w-0 items-center gap-3">
            {u.avatar ? (
                <img src={u.avatar} alt="" className="size-10 shrink-0 rounded-full object-cover" />
            ) : (
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {getInitials(u.name)}
                </span>
            )}
            <div className="grid min-w-0">
                <span className="flex items-center gap-2 font-semibold">
                    <span className="truncate">{u.name}</span>
                    {u.isMe && <Badge variant="secondary">أنت</Badge>}
                </span>
                <span className="text-muted-foreground truncate text-sm" dir="ltr" style={{ textAlign: 'right' }}>
                    {u.email}
                </span>
            </div>
        </div>
    );
}

function PermissionChips({ member: u }: { member: Member }) {
    if (u.permissions.length === 0) return <span className="text-muted-foreground text-sm">بدون صلاحيات: يرى الرئيسية فقط</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {u.permissions.map((p) => (
                <span key={p} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">
                    {LABELS[p].title}
                </span>
            ))}
        </div>
    );
}

/** Pending invitation or active, and since when. */
function Status({ member: u }: { member: Member }) {
    return (
        <div className="grid gap-0.5">
            {u.invitedAt ? (
                <Badge variant="outline" className="w-fit border-amber-500/40 text-amber-700 dark:text-amber-400">
                    بانتظار قبول الدعوة
                </Badge>
            ) : (
                <Badge variant="outline" className="w-fit border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                    نشط
                </Badge>
            )}
            <span className="text-muted-foreground text-xs">
                {u.invitedAt ? `دُعي ${timeAgo(u.invitedAt)}` : u.createdAt && `أُضيف ${timeAgo(u.createdAt)}`}
            </span>
        </div>
    );
}

function Actions({ member: u, onEdit, onDelete }: { member: Member; onEdit: (m: Member) => void; onDelete: (m: Member) => void }) {
    return (
        <div className="flex items-center justify-start gap-1">
            {u.invitedAt && (
                <Button variant="ghost" size="sm" onClick={() => router.post(route('users.invite', u.id), {}, { preserveScroll: true })}>
                    <Send /> إعادة إرسال
                </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(u)}>
                <ShieldCheck /> الصلاحيات
            </Button>
            {!u.isMe && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-8"
                    aria-label={u.invitedAt ? `إلغاء دعوة ${u.name}` : `حذف ${u.name}`}
                    onClick={() => onDelete(u)}
                >
                    <Trash2 />
                </Button>
            )}
        </div>
    );
}

type View = 'table' | 'cards';
const VIEW_KEY = 'sekka.users.view';

export default function Users({ users, permissions: all }: { users: Member[]; permissions: Permission[] }) {
    const [savedView, setView] = useState<View>('table');
    // Phones always get cards, like the projects page.
    const isMobile = useIsMobile();
    const view: View = isMobile ? 'cards' : savedView;
    useEffect(() => {
        try {
            if (localStorage.getItem(VIEW_KEY) === 'cards') setView('cards');
        } catch {
            /* private mode */
        }
    }, []);
    const changeView = (v: View) => {
        setView(v);
        try {
            localStorage.setItem(VIEW_KEY, v);
        } catch {
            /* private mode */
        }
    };
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

                <div role="group" aria-label="طريقة العرض" className="ms-auto hidden rounded-md border p-0.5 md:flex">
                    {(
                        [
                            ['table', Rows3, 'جدول'],
                            ['cards', LayoutGrid, 'بطاقات'],
                        ] as const
                    ).map(([v, Icon, label]) => (
                        <button
                            key={v}
                            type="button"
                            aria-pressed={view === v}
                            aria-label={label}
                            title={label}
                            onClick={() => changeView(v)}
                            className={cn(
                                'flex h-8 items-center gap-1.5 rounded px-3 text-sm',
                                view === v ? 'bg-muted font-semibold' : 'text-muted-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                        </button>
                    ))}
                </div>

                {view === 'table' ? (
                    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
                        <Table className="min-w-[860px]">
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>المستخدم</TableHead>
                                    <TableHead>الصلاحيات</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>
                                        <span className="sr-only">إجراءات</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u, i) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                                        <TableCell>
                                            <Identity member={u} />
                                        </TableCell>
                                        <TableCell className="max-w-md whitespace-normal">
                                            <PermissionChips member={u} />
                                        </TableCell>
                                        <TableCell>
                                            <Status member={u} />
                                        </TableCell>
                                        <TableCell>
                                            <Actions member={u} onEdit={setEditing} onDelete={setDeleting} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {users.map((u) => (
                            <article key={u.id} className="bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
                                <Identity member={u} />
                                <PermissionChips member={u} />
                                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                                    <Status member={u} />
                                    <Actions member={u} onEdit={setEditing} onDelete={setDeleting} />
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <InviteDialog open={inviting} onOpenChange={setInviting} all={all} />
            <PermissionsDialog member={editing} onClose={() => setEditing(null)} all={all} />

            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{deleting?.invitedAt ? `إلغاء دعوة «${deleting?.name}»؟` : `حذف «${deleting?.name}»؟`}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleting?.invitedAt ? 'رابط الدعوة يصير غير صالح.' : 'ما يقدر يدخل اللوحة بعدها. التعديلات اللي سوّاها تبقى كما هي.'}
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
