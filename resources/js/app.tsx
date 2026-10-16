import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { AppError, ErrorBoundary } from './components/error-boundary';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = 'لوحة سكة';

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ErrorBoundary fallback={AppError}>
                <App {...props} />
            </ErrorBoundary>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

/**
 * Safety net: Radix locks the page (pointer-events: none on body) while a
 * modal layer is open. If a visit swaps the page while one is closing, the
 * lock can outlive it and nothing is clickable. After each visit, with no
 * dialog left open, release any such lock.
 */
router.on('finish', () => {
    requestAnimationFrame(() => {
        if (document.querySelector('[role=dialog][data-state=open], [role=alertdialog][data-state=open], [role=menu][data-state=open]')) return;
        if (document.body.style.pointerEvents === 'none') document.body.style.removeProperty('pointer-events');
    });
});
