import InputError from '@/components/input-error';
import { MediaField } from '@/components/media-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, HttpError } from '@/lib/http';
import { cn } from '@/lib/utils';
import { Link2, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import * as z from 'zod/mini';
import { slugify, type WorkingProject } from './model';

/** POST /categories: the added name and the full list after it. */
const categorySchema = z.object({ name: z.string(), categories: z.array(z.string()) });

const ADD = '__add__';

function CategoryPicker({
    value,
    categories,
    onChange,
    onCategories,
    error,
}: {
    value: string;
    categories: string[];
    onChange: (v: string) => void;
    onCategories: (list: string[]) => void;
    error?: string;
}) {
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [addError, setAddError] = useState('');
    const list = value && !categories.includes(value) ? [...categories, value] : categories;

    const add = async () => {
        setBusy(true);
        setAddError('');
        try {
            const res = await api('/categories', { schema: categorySchema, method: 'POST', body: { name } });
            onCategories(res.categories);
            onChange(res.name);
            toast.success(`تمت إضافة المجال «${res.name}».`);
            setAdding(false);
            setName('');
        } catch (e) {
            setAddError(e instanceof HttpError ? e.firstError : 'تعذّر الحفظ.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Select value={value || undefined} onValueChange={(v) => (v === ADD ? setAdding(true) : onChange(v))}>
                <SelectTrigger aria-invalid={!!error}>
                    <SelectValue placeholder="اختر المجال" />
                </SelectTrigger>
                <SelectContent>
                    {list.map((c) => (
                        <SelectItem key={c} value={c}>
                            {c}
                        </SelectItem>
                    ))}
                    {list.length > 0 && <SelectSeparator />}
                    <SelectItem value={ADD}>+ إضافة مجال جديد…</SelectItem>
                </SelectContent>
            </Select>
            <Dialog open={adding} onOpenChange={setAdding}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>مجال جديد</DialogTitle>
                    </DialogHeader>
                    <form
                        className="grid gap-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void add();
                        }}
                    >
                        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="مثل: تصوير منتجات" />
                        <InputError message={addError} />
                        <DialogFooter>
                            <Button type="submit" disabled={busy || !name.trim()}>
                                إضافة
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function DetailsPanel({
    project: p,
    set,
    errors,
    aspects,
    categories,
    onCategories,
    slugLinked,
    onSlugLinked,
}: {
    project: WorkingProject;
    set: (fn: (p: WorkingProject) => WorkingProject, key?: string) => void;
    errors: Record<string, string>;
    aspects: string[];
    categories: string[];
    onCategories: (list: string[]) => void;
    slugLinked: boolean;
    onSlugLinked: (linked: boolean) => void;
}) {
    const field =
        <K extends keyof WorkingProject>(k: K) =>
        (v: WorkingProject[K]) =>
            set((x) => ({ ...x, [k]: v }), k);

    return (
        <div className="grid grid-cols-1 gap-4">
            <h2 className="font-semibold">بيانات المشروع</h2>

            <div className="grid grid-cols-1 gap-1.5">
                <Label htmlFor="p-title">اسم المشروع</Label>
                <Input id="p-title" value={p.title} onChange={(e) => field('title')(e.target.value)} />
                <InputError message={errors.title} />
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                <Label htmlFor="p-title-en">الاسم بالإنجليزي</Label>
                <Input
                    id="p-title-en"
                    dir="ltr"
                    value={p.title_en}
                    onChange={(e) => {
                        const v = e.target.value;
                        set((x) => ({ ...x, title_en: v, ...(slugLinked && slugify(v) ? { slug: slugify(v) } : {}) }), 'title_en');
                    }}
                    placeholder="Chaos Campaign"
                />
                <p className="text-muted-foreground text-xs">لا يظهر في الموقع؛ منه يتكوّن رابط المشروع.</p>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                <Label htmlFor="p-slug">الرابط</Label>
                <div className="flex items-center gap-1">
                    <div
                        className={cn('border-input flex h-10 min-w-0 flex-1 items-center rounded-md border', errors.slug && 'border-destructive')}
                        dir="ltr"
                    >
                        <span className="text-muted-foreground ps-3 text-sm">/work/</span>
                        <input
                            id="p-slug"
                            value={p.slug}
                            onChange={(e) => {
                                onSlugLinked(false);
                                field('slug')(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                            }}
                            className="h-full min-w-0 flex-1 bg-transparent pe-3 text-sm outline-none"
                        />
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        variant={slugLinked ? 'secondary' : 'ghost'}
                        aria-pressed={slugLinked}
                        title={slugLinked ? 'الرابط يتبع الاسم بالإنجليزي' : 'ربط الرابط بالاسم بالإنجليزي'}
                        aria-label={slugLinked ? 'فك ربط الرابط بالاسم' : 'ربط الرابط بالاسم'}
                        onClick={() => {
                            const next = !slugLinked;
                            onSlugLinked(next);
                            if (next && slugify(p.title_en)) field('slug')(slugify(p.title_en));
                        }}
                    >
                        {slugLinked ? <Link2 /> : <Link2Off />}
                    </Button>
                </div>
                <InputError message={errors.slug} />
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                <Label htmlFor="p-summary">الملخص</Label>
                <Textarea id="p-summary" rows={3} value={p.summary} onChange={(e) => field('summary')(e.target.value)} />
                <p className="text-muted-foreground text-xs">يظهر في البطاقة وأعلى صفحة المشروع ونتائج البحث.</p>
                <InputError message={errors.summary} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="grid grid-cols-1 gap-1.5">
                    <Label>المجال</Label>
                    <CategoryPicker
                        value={p.category}
                        categories={categories}
                        onChange={(v) => field('category')(v)}
                        onCategories={onCategories}
                        error={errors.category}
                    />
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                    <Label htmlFor="p-year">السنة</Label>
                    <Input id="p-year" dir="ltr" inputMode="numeric" value={p.year} onChange={(e) => field('year')(e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                <Label>نسبة البطاقة في شبكة الأعمال</Label>
                <div role="group" aria-label="النسبة" dir="ltr" className="grid grid-cols-6 gap-1">
                    {aspects.map((a) => (
                        <button
                            key={a}
                            type="button"
                            aria-pressed={p.aspect === a}
                            onClick={() => set((x) => ({ ...x, aspect: a }))}
                            className={cn(
                                'h-9 rounded-md border text-xs',
                                p.aspect === a ? 'border-foreground bg-muted font-semibold' : 'hover:bg-muted',
                            )}
                        >
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                <Label>صورة الغلاف</Label>
                <MediaField
                    value={p.cover}
                    accept="image"
                    invalid={!!errors.cover}
                    onChange={(item) => item && set((x) => ({ ...x, cover: item.url }))}
                />
                <p className="text-muted-foreground text-xs">للبطاقة، ومشاركة الرابط، وبانر «المشروع التالي».</p>
                <InputError message={errors.cover} />
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                <Label>فيديو المعاينة</Label>
                <MediaField value={p.preview} accept="video" clearable onChange={(item) => set((x) => ({ ...x, preview: item?.url ?? null }))} />
                <p className="text-muted-foreground text-xs">اختياري: يتحرك في البطاقة ويملأ رأس صفحة المشروع.</p>
            </div>
        </div>
    );
}
