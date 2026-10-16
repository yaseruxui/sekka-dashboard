import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const APPEARANCES = ['light', 'dark', 'system'] as const;

export type Appearance = (typeof APPEARANCES)[number];

const isAppearance = (v: unknown): v is Appearance => APPEARANCES.some((a) => a === v);

/**
 * The saved choice; 'system' when none, unreadable, or not a known value.
 * (A plain guard, not zod: this runs in the entry chunk before first paint.)
 */
const savedAppearance = (): Appearance => {
    try {
        const v = localStorage.getItem('appearance');
        return isAppearance(v) ? v : 'system';
    } catch {
        return 'system';
    }
};

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Whether `appearance` shows the dark theme right now ('system' follows the OS). */
export const isDarkAppearance = (appearance: Appearance) => appearance === 'dark' || (appearance === 'system' && prefersDark());

/**
 * Flips the theme class with every CSS transition switched off, so all colors
 * change in the same frame (otherwise `transition-colors` elements fade while
 * the rest snap, and the page flickers half-and-half).
 */
const applyTheme = (appearance: Appearance) => {
    const freeze = document.createElement('style');
    freeze.textContent = '*,*::before,*::after{transition:none!important}';
    document.head.appendChild(freeze);
    document.documentElement.classList.toggle('dark', isDarkAppearance(appearance));
    void window.getComputedStyle(document.body).color; // settle the new colors before transitions return
    setTimeout(() => freeze.remove(), 1);
};

/** A user's switch: one crossfade of the whole page where supported, else an instant flip. */
const switchTheme = (appearance: Appearance, updateUi: () => void) => {
    const run = () => {
        flushSync(updateUi); // the toggle's own icon belongs in the new snapshot
        applyTheme(appearance);
    };
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return run();
    document.startViewTransition(run);
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const handleSystemThemeChange = () => applyTheme(savedAppearance());

/** Once, before first paint; the system listener lives as long as the page. */
export function initializeTheme() {
    applyTheme(savedAppearance());
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    // The theme is already on the page (initializeTheme); only sync this toggle's state.
    useEffect(() => setAppearance(savedAppearance()), []);

    const updateAppearance = (mode: Appearance) => {
        try {
            localStorage.setItem('appearance', mode);
        } catch {
            /* private mode: applies for this page only */
        }
        switchTheme(mode, () => setAppearance(mode));
    };

    return { appearance, updateAppearance };
}
