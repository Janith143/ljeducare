'use server';

import { headers } from 'next/headers';
import { COLLECTIONS } from '@ljeducare/shared';
import { checkRateLimit } from '@/lib/connector/ratelimit';
import { adminDb } from '@/lib/firebase/admin';

const RATE_COLLECTION = 'landing_rate_limits';

export interface FormResult {
    ok?: true;
    error?: string;
}

/** Best-effort client IP — used only for rate-limiting and triage, never shown publicly. */
async function clientIp(): Promise<string> {
    const h = await headers();
    const fwd = h.get('x-forwarded-for') ?? '';
    return (fwd.split(',')[0] || h.get('x-real-ip') || 'unknown').trim();
}

/** Firestore doc ids can't contain '/', and IPv6 / proxy values sometimes do. */
const safeKey = (s: string) => s.replace(/[^\w.:-]/g, '_').slice(0, 120) || 'unknown';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export interface InquiryInput {
    name: string;
    email: string;
    phone?: string;
    program?: string;
    message: string;
    /** Honeypot — real users never fill this; bots usually do. */
    website?: string;
}

/**
 * Public contact-form submit. Writes landing_inquiries/{id} via the Admin SDK
 * (rules deny all client writes), behind a honeypot + per-IP rate limit.
 */
export async function submitInquiryAction(input: InquiryInput): Promise<FormResult> {
    // Honeypot: pretend success so bots don't learn they were caught.
    if (input.website) return { ok: true };

    const name = (input.name ?? '').trim();
    const email = (input.email ?? '').trim().toLowerCase();
    const message = (input.message ?? '').trim();

    if (!name || !email || !message) return { error: 'Please fill in your name, email and message.' };
    if (name.length > 120) return { error: 'That name is too long.' };
    if (!isEmail(email)) return { error: 'Please enter a valid email address.' };
    if (message.length > 5000) return { error: 'That message is too long.' };

    const ip = await clientIp();
    const allowed = await checkRateLimit(`inquiry_${safeKey(ip)}`, {
        collection: RATE_COLLECTION,
        maxAttempts: 5,
        windowMs: 60 * 60 * 1000,
    });
    if (!allowed) return { error: 'Too many messages sent from this device. Please try again later.' };

    try {
        const ref = adminDb().collection(COLLECTIONS.LANDING_INQUIRIES).doc();
        await ref.set({
            id: ref.id,
            name,
            email,
            phone: (input.phone ?? '').trim().slice(0, 40),
            program: (input.program ?? '').trim().slice(0, 120),
            message,
            status: 'new',
            createdAt: new Date().toISOString(),
            userAgent: ((await headers()).get('user-agent') ?? '').slice(0, 300),
            ip,
        });
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}

/**
 * Newsletter opt-in. The doc id is the email, so re-subscribing is idempotent
 * rather than piling up duplicates.
 */
export async function subscribeNewsletterAction(emailRaw: string, honeypot?: string): Promise<FormResult> {
    if (honeypot) return { ok: true };

    const email = (emailRaw ?? '').trim().toLowerCase();
    if (!isEmail(email)) return { error: 'Please enter a valid email address.' };

    const ip = await clientIp();
    const allowed = await checkRateLimit(`news_${safeKey(ip)}`, {
        collection: RATE_COLLECTION,
        maxAttempts: 10,
        windowMs: 60 * 60 * 1000,
    });
    if (!allowed) return { error: 'Too many attempts. Please try again later.' };

    try {
        await adminDb()
            .collection(COLLECTIONS.NEWSLETTER_SUBSCRIBERS)
            .doc(safeKey(email))
            .set(
                { id: safeKey(email), email, createdAt: new Date().toISOString(), unsubscribedAt: null },
                { merge: true },
            );
        return { ok: true };
    } catch (e: unknown) {
        return { error: (e as Error).message };
    }
}
