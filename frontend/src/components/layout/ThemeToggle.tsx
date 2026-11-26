/**
 * ThemeToggle.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A specialized interactive component to toggle between Light and Dark themes. 
 * Synchronizes state with localStorage for persistence and applies the 'dark' 
 * class to the document root for Tailwind-driven CSS overrides.
 *
 * Requirements:
 * - Persistent theme selection via localStorage.
 * - Smooth transition effects for premium UI feel.
 * - Dynamic Sun/Moon icons with Lucide.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useLayoutEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
    // 1. Determine initial theme (system-preference aware)
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('fp-theme');
            if (stored) return stored === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // 2. Synchronize DOM and persistence whenever state changes
    useLayoutEffect(() => {
        const root = window.document.documentElement;
        root.classList.toggle('dark', isDark);
        localStorage.setItem('fp-theme', isDark ? 'dark' : 'light');
        document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
            'content',
            isDark ? '#171b17' : '#f5f2ea',
        );
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);

    return (
        <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 shadow-sm active:scale-95 transition-all duration-300"
        >
            <div className="relative overflow-hidden overflow-hidden h-5 w-5">
                {/* Transition sun/moon stacking */}
                <Sun 
                    className={`absolute inset-0 w-5 h-5 transition-transform duration-500 ease-in-out ${
                        isDark ? 'translate-y-10 rotate-90 scale-0' : 'translate-y-0 rotate-0 scale-100'
                    }`}
                />
                <Moon 
                    className={`absolute inset-0 w-5 h-5 transition-transform duration-500 ease-in-out ${
                        isDark ? 'translate-y-0 rotate-0 scale-100' : '-translate-y-10 -rotate-90 scale-0'
                    }`}
                />
            </div>
            
            {/* Pulsing indicator for active state */}
            <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></span>
        </button>
    );
};

export default ThemeToggle;
