/**
 * studentId — assign a business student id (default prefix 'LJE') to new student
 * users. Ported from the hardened hybridLMS `generateUniqueProfileId` (clazzdb2).
 *
 * The prefix is per-deployment (env STUDENT_ID_PREFIX) so each institute instance
 * namespaces its own id space — e.g. `LJE0012DF`. That lets the clazz.lk studentportal
 * hub route a linked id to the right backend purely by its prefix.
 *
 * Allocation runs SERVER-SIDE (Admin SDK) — the client can't be trusted to compute a
 * unique sequential id, and Firestore rules block listing other users from the client.
 */
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');

const STUDENT_ID_PREFIX = (process.env.STUDENT_ID_PREFIX || 'LJE').toUpperCase();
const RANDOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const randSuffix = () =>
    RANDOM_CHARS[Math.floor(Math.random() * 26)] + RANDOM_CHARS[Math.floor(Math.random() * 26)];

/**
 * Allocate a unique `<PREFIX>####XX` id. Reads the highest existing NUMERIC id for
 * the prefix — the range is bounded to digits (`PREFIX0`..`PREFIX:`) so non-numeric
 * ids (demo/import ids) can't sort above the real ones and zero the counter (the
 * clazz.lk `SIDDEMO` id-generation incident). Increments, adds a random 2-letter
 * suffix, then loops until the id is actually free. FAILS LOUD on a non-numeric top id
 * rather than silently defaulting the counter to 0.
 */
async function generateStudentId(db, prefix = STUDENT_ID_PREFIX) {
    let maxNum = 0;
    const snap = await db.collection('users')
        .where('studentId', '>=', prefix + '0')
        .where('studentId', '<', prefix + ':')
        .orderBy('studentId', 'desc')
        .limit(1)
        .get();
    if (!snap.empty) {
        const topId = String(snap.docs[0].get('studentId') || '');
        const match = topId.match(new RegExp(`^${prefix}(\\d{4})`));
        if (match) maxNum = parseInt(match[1], 10);
        else throw new Error(`Highest ${prefix} studentId "${topId}" is not numeric — aborting id allocation`);
    }

    let num = maxNum + 1;
    // Loop until the generated id is free (guards suffix collisions + concurrent registrations).
    for (let i = 0; i < 50; i++) {
        const candidate = `${prefix}${String(num).padStart(4, '0')}${randSuffix()}`;
        const dup = await db.collection('users').where('studentId', '==', candidate).limit(1).get();
        if (dup.empty) return candidate;
        num++;
    }
    throw new Error('Could not allocate a unique student id.');
}

/**
 * Stamp studentId on a newly-created student user doc that doesn't already have one.
 * Idempotent: skips non-students and docs that already carry a studentId. The doc
 * update re-triggers syncRoleClaims, which carries the studentId into the `sid` claim.
 */
const assignStudentId = onDocumentCreated('users/{uid}', async (event) => {
    const snap = event.data;
    const data = snap?.data();
    if (!data || data.role !== 'student' || data.studentId) return;
    try {
        const db = getFirestore();
        const studentId = await generateStudentId(db);
        await snap.ref.update({ studentId });
        logger.info(`Assigned studentId=${studentId} to uid=${event.params.uid}`);
    } catch (e) {
        logger.error('assignStudentId failed', e?.message);
    }
});

module.exports = { assignStudentId, generateStudentId, STUDENT_ID_PREFIX };
