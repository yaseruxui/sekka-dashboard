import { Toaster } from '@/components/ui/sonner';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/** The toaster, plus the server's flash messages (->with('success' | 'error', …)) as toasts. */
export function FlashToasts() {
    const { flash } = usePage<SharedData>().props;
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error, { duration: 8000 });
    }, [flash]);
    return <Toaster richColors position="bottom-left" dir="rtl" />;
}
