import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export const UNSAVED_MESSAGE = 'عندك تعديلات لم تُحفظ. تبي تطلع من الصفحة وتتركها؟';

/**
 * While `dirty`, warns before leaving: closing / reloading the tab (browser
 * prompt) and navigating to another dashboard page (confirm).
 */
export function useUnsavedGuard(dirty: boolean, message = UNSAVED_MESSAGE) {
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        const off = router.on('before', (event) => {
            const visit = event.detail.visit;
            // Saving (put/post/…) and reloads of this page are fine; leaving is not.
            if (visit.method !== 'get' || visit.url.pathname === window.location.pathname) return;
            if (!window.confirm(message)) event.preventDefault();
        });
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            off();
        };
    }, [dirty, message]);
}
