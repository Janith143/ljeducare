#!/usr/bin/env node
/**
 * Write settings/notifications — which channels each automatic message may use.
 *
 * Mirrors saveNotificationSettingsAction (web/src/app/admin/settings/actions.ts) exactly:
 * every flag is written explicitly, never partially, so delivery reads one complete doc
 * and the admin form round-trips what it finds. Change these from
 * Admin → Settings → Notification settings in normal use; this script exists for the
 * initial switch-on, where the UI is login-gated.
 *
 * SMS costs real money per message. The shipped default is sms:false everywhere except
 * guardianAttendance, precisely so a class of 50 can never silently spend 50 credits.
 * Turning it on is a deliberate act — hence --apply.
 *
 *   node scripts/set-notification-channels.mjs                 # dry run (shows the diff)
 *   node scripts/set-notification-channels.mjs --apply
 *   node scripts/set-notification-channels.mjs --sms-off --apply   # kill switch
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
const SMS = !process.argv.includes('--sms-off');
initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'ljeducare' });
const db = getFirestore();

const ref = db.collection('settings').doc('notifications');
const before = (await ref.get()).data() ?? null;

const desired = {
    guardianAttendance: { inApp: false, email: true, sms: SMS },
    payment: { inApp: true, email: true, sms: SMS },
    teacherMessage: { inApp: true, email: true, sms: SMS },
    classReminder: {
        inApp: true,
        email: true,
        sms: SMS,
        enabled: true,
        leadMinutes: 30,
        alsoAtStart: true,
    },
};

const show = (label, v) => {
    if (!v) return console.log(`  ${label}: (not set — code defaults applied)`);
    for (const k of ['guardianAttendance', 'payment', 'classReminder', 'teacherMessage']) {
        const f = v[k] ?? {};
        const extra = k === 'classReminder' ? `  enabled=${f.enabled} lead=${f.leadMinutes} atStart=${f.alsoAtStart}` : '';
        console.log(`    ${k.padEnd(20)} inApp=${String(f.inApp).padEnd(5)} email=${String(f.email).padEnd(5)} sms=${String(f.sms).padEnd(5)}${extra}`);
    }
};

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — settings/notifications  (sms: ${SMS ? 'ON' : 'OFF'})\n`);
console.log('  BEFORE:');
show('BEFORE', before);
console.log('\n  AFTER:');
show('AFTER', desired);

if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write.\n');
    process.exit(0);
}

await ref.set(
    { ...desired, updatedAt: new Date().toISOString(), updatedBy: 'script:set-notification-channels' },
    { merge: true },
);
console.log('\nWritten. Change it any time from Admin → Settings → Notification settings.');
if (SMS) console.log('SMS is now ON for every category — each message spends a Notify.lk credit.\n');
