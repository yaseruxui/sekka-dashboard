import { useEffect, useState } from 'react';

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

const applyTheme = (appearance: Appearance) => {
    document.documentElement.classList.toggle('dark', isDarkAppearance(appearance));
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const handleSystemThemeChange = () => applyTheme(savedAppearance());

export function initializeTheme() {
    applyTheme(savedAppearance());

    // Add the event listener for system theme changes...
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        applyTheme(mode);
    };

    useEffect(() => {
        updateAppearance(savedAppearance());

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    return { appearance, updateAppearance };
}
