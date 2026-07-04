import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TAGS = ['classes', 'courses', 'quizzes', 'teachers', 'currencies', 'categories'];

/**
 * On-demand ISR revalidation, called by the database-triggers function
 * (and admin server actions) after content writes.
 * POST /api/revalidate?tag=classes  with  Authorization: Bearer <REVALIDATE_SECRET>
 */
export async function POST(request: NextRequest) {
    const secret = process.env.REVALIDATE_SECRET;
    const header = request.headers.get('authorization') ?? '';
    if (!secret || header !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const tag = request.nextUrl.searchParams.get('tag') ?? '';
    if (!VALID_TAGS.includes(tag)) {
        return NextResponse.json({ error: 'unknown tag' }, { status: 400 });
    }
    revalidateTag(tag);
    return NextResponse.json({ revalidated: tag, at: new Date().toISOString() });
}
