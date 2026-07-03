/**
 * Remove ALL mock data seeded by seed-mock-data.mjs.
 * Deletes every Firestore doc tagged `mock: true` and every Auth user with the
 * `mock` custom claim or an `@ljeducare.demo` email. Real data + settings are left intact.
 *
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=<sa-key.json> \
 *         node scripts/remove-mock-data.mjs
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account key path.');
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))), projectId: 'ljeducare' });

const auth = getAuth();
const db = getFirestore();

const COLLECTIONS = [
    'users', 'staff', 'classes', 'courses', 'quizzes', 'sales', 'attendance',
    'certificates', 'submissions', 'notifications', 'financial_ledger', 'teacher_payments', 'customClassRequests',
];

async function purgeCollection(name) {
    const snap = await db.collection(name).where('mock', '==', true).get();
    let n = 0;
    while (n < snap.size) {
        const batch = db.batch();
        snap.docs.slice(n, n + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
        n += 400;
    }
    if (snap.size) console.log(`  ${name}: deleted ${snap.size}`);
    return snap.size;
}

async function purgeAuth() {
    let deleted = 0;
    let pageToken;
    do {
        const res = await auth.listUsers(1000, pageToken);
        const toDelete = res.users
            .filter((u) => u.customClaims?.mock === true || (u.email && u.email.endsWith('@ljeducare.demo')))
            .map((u) => u.uid);
        for (let i = 0; i < toDelete.length; i += 900) {
            await auth.deleteUsers(toDelete.slice(i, i + 900));
        }
        deleted += toDelete.length;
        pageToken = res.pageToken;
    } while (pageToken);
    console.log(`  auth users: deleted ${deleted}`);
    return deleted;
}

async function run() {
    console.log('Removing mock data…');
    let docs = 0;
    for (const c of COLLECTIONS) docs += await purgeCollection(c);
    const users = await purgeAuth();
    console.log(`\n✔ Removed ${docs} mock docs + ${users} mock auth users. Real data and settings untouched.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error('REMOVE FAILED:', e); process.exit(1); });
