import type { Config } from 'tailwindcss';

/** Theme ported from hybridLMS tailwind.config.js — keeps source components rendering identically. */
const config: Config = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#60a5fa',
                    DEFAULT: '#3b82f6',
                    dark: '#2563eb',
                },
                'light-background': '#f8fafc',
                'light-surface': '#ffffff',
                'light-text': '#0f172a',
                'light-subtle': '#64748b',
                'light-border': '#e2e8f0',
                'dark-background': '#020617',
                'dark-surface': '#0f172a',
                'dark-text': '#e2e8f0',
                'dark-subtle': '#94a3b8',
                'dark-border': '#1e293b',
            },
            animation: {
                fadeIn: 'fadeIn 0.5s ease-in-out',
                slideInUp: 'slideInUp 0.5s ease-in-out',
                marquee: 'marquee 40s linear infinite',
                shake: 'shake 0.6s cubic-bezier(.36,.07,.19,.97) both',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                shake: {
                    '10%, 90%': { transform: 'translateX(-1px)' },
                    '20%, 80%': { transform: 'translateX(2px)' },
                    '30%, 50%, 70%': { transform: 'translateX(-4px)' },
                    '40%, 60%': { transform: 'translateX(4px)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
