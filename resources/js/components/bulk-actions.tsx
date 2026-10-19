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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

/** Ticked rows of a list. Only ids in `ids` (the rows on screen) stay selected. */
export function useSelection(ids: number[]) {
    const [selected, setSelected] = useState<number[]>([]);
    const key = ids.join(',');

    useEffect(() => {
        setSelected((s) => s.filter((id) => ids.includes(id)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const all = ids.length > 0 && ids.every((id) => selected.includes(id));

    return {
        selected,
        count: selected.length,
        has: (id: number) => selected.includes(id),
        toggle: (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
        toggleAll: () => setSelected(all ? [] : ids),
        clear: () => setSelected([]),
        headerState: (all ? true : selected.length > 0 ? 'indeterminate' : false) as boolean | 'indeterminate',
    };
}

export type Selection = ReturnType<typeof useSelection>;

/** Posts a bulk action to `routeName` and clears the selection when it succeeds. */
export function runBulk(routeName: string, selection: Selection, action: string) {
    router.post(route(routeName), { ids: selection.selected, action }, { preserveScroll: true, onSuccess: () => selection.clear() });
}

export function SelectAllCheckbox({ selection, label = 'تحديد الكل' }: { selection: Selection; label?: string }) {
    return <Checkbox checked={selection.headerState} onCheckedChange={selection.toggleAll} aria-label={label} />;
}

export function SelectCheckbox({ selection, id, label, className }: { selection: Selection; id: number; label: string; className?: string }) {
    return (
        <Checkbox
            checked={selection.has(id)}
            onCheckedChange={() => selection.toggle(id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`تحديد ${label}`}
            className={className}
        />
    );
}

/** Shown above a list while rows are ticked: the count, the actions, and a way out. */
export function BulkBar({ selection, children, className }: { selection: Selection; children: ReactNode; className?: string }) {
    if (selection.count === 0) return null;
    return (
        <div
            role="toolbar"
            aria-label="إجراءات على المحدد"
            className={cn('bg-muted/60 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm', className)}
        >
            <span className="font-medium">تم تحديد {selection.count}</span>
            {selection.headerState !== true && (
                <Button size="sm" variant="link" className="px-1" onClick={selection.toggleAll}>
                    تحديد الكل
                </Button>
            )}
            {children}
            <Button size="sm" variant="ghost" className="ms-auto" onClick={selection.clear}>
                <X /> إلغاء التحديد
            </Button>
        </div>
    );
}

/** A destructive bulk action behind a confirmation. */
export function BulkDeleteButton({
    selection,
    title,
    description,
    confirmLabel = 'حذف',
    onConfirm,
    children,
}: {
    selection: Selection;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setOpen(true)} disabled={selection.count === 0}>
                {children}
            </Button>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>{description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
                            {confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
