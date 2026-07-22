#!/usr/bin/env node
/**
 * One-off: give categories clean, readable slugs.
 *
 * `saveCategoryAction` used to call slugify() with its default random suffix, so every
 * category created through the admin got a permanent URL like /categories/cosmatics-020n
 * instead of /categories/cosmatics. The action is fixed going forward; this repairs the
 * rows already written.
 *
 * A category slug is referenced by content via `categorySlug`, so re-slugging one that is
 * in use would orphan that content. This script therefore only touches categories with
 * ZERO referencing items, and reports anything it refuses to touch.
 *
 *   node scripts/fix-category-slugs.mjs                 # dry run (default)
 *   node scripts/fix-category-slugs.mjs --apply         # re-slug the safe ones
 *   node scripts/fix-category-slugs.mjs --apply --delete-empty-duplicates
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const DELETE_DUPES = process.argv.includes('--delete-empty-duplicates');
const projectId = process.env.GCLOUD_PROJECT ?? 'ljeducare';
initializeApp({ projectId });
const db = getFirestore();

/** Mirrors slugify(name, false) in shared/utils/slug.ts — no random suffix. */
const clean = (name) =>
    String(name ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60) || 'category';

const CONTENT = ['classes', 'courses', 'quizzes'];

const [catSnap, ...contentSnaps] = await Promise.all([
    db.collection('categories').get(),
    ...CONTENT.map((c) => db.collection(c).get()),
]);

// How many content items point at each slug (including soft-deleted — restoring one
// must not land on a slug we removed).
const usage = new Map();
contentSnaps.forEach((snap) =>
    snap.docs.forEach((d) => {
        const s = d.data().categorySlug;
        if (s) usage.set(s, (usage.get(s) ?? 0) + 1);
    }),
);

const cats = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const takenSlugs = new Set(cats.map((c) => c.slug));
const byName = new Map();
cats.forEach((c) => byName.set(clean(c.name), [...(byName.get(clean(c.name)) ?? []), c]));

const reslug = [];
const dupes = [];
const blocked = [];
const ok = [];

for (const c of cats) {
    const want = clean(c.name);
    const used = usage.get(c.slug) ?? 0;

    if (c.slug === want) {
        ok.push(c);
        continue;
    }
    if (used > 0) {
        blocked.push({ ...c, used });
        continue;
    }
    // Another category already owns the clean slug → this row is a duplicate name.
    if (takenSlugs.has(want)) {
        dupes.push({ ...c, want, twin: byName.get(want)?.find((o) => o.slug === want)?.slug });
        continue;
    }
    reslug.push({ ...c, want });
    takenSlugs.add(want);
}

const line = (c, extra = '') => `  ${String(c.name).padEnd(18)} ${String(c.slug).padEnd(24)} ${extra}`;

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — ${cats.length} categories\n`);
if (ok.length) {
    console.log(`already clean (${ok.length}):`);
    ok.forEach((c) => console.log(line(c)));
}
if (reslug.length) {
    console.log(`\nre-slug (${reslug.length}) — no content references these:`);
    reslug.forEach((c) => console.log(line(c, `-> ${c.want}`)));
}
if (dupes.length) {
    console.log(`\nduplicate names, 0 content (${dupes.length}) — "${'--delete-empty-duplicates'}" removes these:`);
    dupes.forEach((c) => console.log(line(c, `duplicate of "${c.want}"`)));
}
if (blocked.length) {
    console.log(`\nLEFT ALONE (${blocked.length}) — slug is in use, re-slugging would orphan content:`);
    blocked.forEach((c) => console.log(line(c, `${c.used} item(s) -> would want ${clean(c.name)}`)));
}

if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write.\n');
    process.exit(0);
}

let wrote = 0;
for (const c of reslug) {
    await db.collection('categories').doc(c.id).update({ slug: c.want });
    wrote += 1;
}
let removed = 0;
if (DELETE_DUPES) {
    for (const c of dupes) {
        await db.collection('categories').doc(c.id).delete();
        removed += 1;
    }
}
console.log(`\nre-slugged ${wrote}${DELETE_DUPES ? `, deleted ${removed} duplicate(s)` : ''}.`);
console.log('Revalidate the storefront so the new URLs are served:');
console.log('  curl -X POST -d "" "https://ljeducare.com/api/revalidate?secret=$REVALIDATE_SECRET&tag=categories"\n');
