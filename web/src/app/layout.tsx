import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
    metadataBase: new URL(SITE.url),
    title: {
        default: SITE.name,
        template: `%s | ${SITE.name}`,
    },
    description: SITE.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>{children}</body>
        </html>
    );
}
