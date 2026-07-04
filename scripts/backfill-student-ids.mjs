/**
 * Backfill LJE####XX student ids onto existing student users that predate the
 * assignStudentId trigger (e.g. seeded mock students). Idempotent — skips any
 * student that already has a `studentId`. Mirrors functions/auth-security/lib/studentId.js.
 *
 * Run:  GOOGLE_APPLICATION_CREDENTIALS=<sa-key.json> \
 *         STUDENT_ID_PREFIX=LJE node scripts/backfill-student-ids.mjs
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the service-account key path.');
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))), projectId: 'ljeducare' });

const db = getFirestore();
const PREFIX = (process.env.STUDENT_ID_PREFIX || 'LJE').toUpperCase();
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const suffix = () => CHARS[Math.floor(Math.random() * 26)] + CHARS[Math.floor(Math.random() * 26)];

async function nextId() {
    let maxNum = 0;
    const snap = await db.collection('users')
        .where('studentId', '>=', PREFIX + '0')
        .where('studentId', '<', PREFIX + ':')
        .orderBy('studentId', 'desc').limit(1).get();
    if (!snap.empty) {
        const top = String(snap.docs[0].get('studentId') || '');
        const m = top.match(new RegExp(`^${PREFIX}(\\d{4})`));
        if (m) maxNum = parseInt(m[1], 10);
        else throw new Error(`Highest ${PREFIX} studentId "${top}" is not numeric — aborting`);
    }
    let num = maxNum + 1;
    for (let i = 0; i < 50; i++) {
        const id = `${PREFIX}${String(num).padStart(4, '0')}${suffix()}`;
        const dup = await db.collection('users').where('studentId', '==', id).limit(1).get();
        if (dup.empty) return id;
        num++;
    }
    throw new Error('Could not allocate a unique student id.');
}

const students = await db.collection('users').where('role', '==', 'student').get();
let assigned = 0;
for (const doc of students.docs) {
    if (doc.get('studentId')) continue;
    const id = await nextId(); // sequential; one at a time to keep the counter consistent
    await doc.ref.update({ studentId: id });
    assigned++;
    console.log(`  ${doc.id} → ${id}`);
}
console.log(`Backfill complete: ${assigned} student(s) assigned, ${students.size - assigned} already had ids.`);
