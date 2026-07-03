#!/usr/bin/env node
/**
 * Bootstrap a user's role claim (normally auth-security keeps claims in sync;
 * this is for the FIRST main_admin, or emulator seeding).
 *
 * Usage:
 *   node scripts/set-claims.mjs <uid-or-email> <role> [perm1,perm2,...]
 * Against emulators:
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/set-claims.mjs admin@lj.lk main_admin
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ROLES = ['main_admin', 'manager', 'teacher_admin', 'teacher', 'student', 'kiosk'];

const [, , target, role, permsArg] = process.argv;
if (!target || !ROLES.includes(role)) {
    console.error(`Usage: node scripts/set-claims.mjs <uid-or-email> <${ROLES.join('|')}> [perm1,perm2,...]`);
    process.exit(1);
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

const user = target.includes('@') ? await auth.getUserByEmail(target) : await auth.getUser(target);
const claims = { role };
if (permsArg) claims.perms = permsArg.split(',').map((p) => p.trim()).filter(Boolean);

await auth.setCustomUserClaims(user.uid, claims);
await db.doc(`users/${user.uid}`).set({ role, ...(claims.perms ? { permissions: claims.perms } : {}) }, { merge: true });

console.log(`✔ ${user.email ?? user.uid} → role=${role}${claims.perms ? ` perms=${claims.perms.join(',')}` : ''}`);
console.log('User must sign out/in (or refresh token) for claims to take effect.');
