/**
 * syncRoleClaims — mirror users/{uid}.role / permissions / business ids into
 * auth custom claims so every backend can trust the JWT alone.
 * Ported from hybridLMS auth-security (clazzdb2) → (default) db + 6-role model.
 */
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { isValidRole, sanitizePerms } = require('./constants');
const { audit } = require('./util');

const arraysEqual = (a, b) =>
    (a ?? []).length === (b ?? []).length && (a ?? []).every((v, i) => v === (b ?? [])[i]);

const syncRoleClaims = onDocumentWritten('users/{uid}', async (event) => {
    const after = event.data?.after?.data();
    if (!after) return; // deletion — claims die with the auth user
    const uid = after.uid || event.params.uid;
    if (!uid || !isValidRole(after.role)) return;

    const before = event.data?.before?.data();
    if (
        before &&
        before.role === after.role &&
        before.id === after.id &&
        before.studentId === after.studentId &&
        before.staffId === after.staffId &&
        arraysEqual(before.permissions, after.permissions)
    ) {
        return;
    }

    try {
        const user = await admin.auth().getUser(uid);
        const existing = user.customClaims || {};
        const bizId = typeof after.id === 'string' ? after.id : null;
        // Students carry their business id (LJE####XX) via `studentId`; fall back to
        // `id` for legacy docs created before studentId assignment existed.
        const studentBizId = typeof after.studentId === 'string' ? after.studentId : bizId;

        const desired = {
            ...existing,
            role: after.role,
            sid: after.role === 'student' ? studentBizId : null,
            tid: after.role === 'teacher' || after.role === 'teacher_admin'
                ? (after.staffId || bizId)
                : null,
            perms: sanitizePerms(after.permissions, after.role),
        };
        // setCustomUserClaims REPLACES claims — drop nulls so stale keys don't linger.
        Object.keys(desired).forEach((k) => desired[k] == null && delete desired[k]);

        const changed =
            desired.role !== existing.role ||
            desired.sid !== existing.sid ||
            desired.tid !== existing.tid ||
            !arraysEqual(desired.perms, existing.perms);
        if (!changed) return;

        await admin.auth().setCustomUserClaims(uid, desired);
        await audit('claims.synced', { uid, role: desired.role, perms: desired.perms || null });
        logger.info(`Synced claims role=${desired.role} for uid=${uid}`);
    } catch (e) {
        logger.warn('syncRoleClaims failed', e?.message);
    }
});

module.exports = { syncRoleClaims };
