/**
 * classReminderTick — queues class-start reminders.
 *
 * Runs every 5 minutes and asks, for each scheduled class: does a session start
 * `leadMinutes` from now, or right now? Session times are naive Sri Lanka local
 * strings, so all the clock work lives in sessions.js (see scripts/check-schedule.mjs).
 *
 * Idempotency is NOT best-effort: each (class, session, kind) is claimed by
 * `.create()`ing a class_reminder_log doc, which fails if it already exists. A
 * retried, overlapping or duplicated tick therefore cannot send twice — which
 * matters when every SMS costs money.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { dueReminders } = require('./sessions');
const { getNotificationSettings, classReminderConfig } = require('./settings');

/** Must match the schedule below: the window is the tick. */
const TICK_MINUTES = 5;
const WINDOW_MS = TICK_MINUTES * 60 * 1000;

async function enrolledStudents(db, classId) {
    const snap = await db
        .collection('users')
        .where('role', '==', 'student')
        .where('enrolledClassIds', 'array-contains', String(classId))
        .get();
    return snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => !u.isDeleted)
        .map((u) => ({
            uid: u.uid,
            name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            email: u.email || null,
            phone: u.contactNumber || null,
        }));
}

const classReminderTick = onSchedule(
    {
        schedule: `every ${TICK_MINUTES} minutes`,
        timeZone: 'Asia/Colombo',
        // No secrets needed: this only QUEUES outbox docs. deliverOutboxMessage sends.
    },
    async () => {
        const db = getFirestore();
        const settings = await getNotificationSettings();
        const cfg = classReminderConfig(settings);
        if (!cfg.enabled) return;
        if (!cfg.inApp && !cfg.email && !cfg.sms) return; // every channel off — nothing to do

        const nowMs = Date.now();
        const snap = await db
            .collection('classes')
            .where('isPublished', '==', true)
            .where('status', '==', 'scheduled')
            .get();

        let queued = 0;
        for (const doc of snap.docs) {
            const cls = { id: doc.id, ...doc.data() };
            const due = dueReminders(cls, nowMs, WINDOW_MS, cfg);
            if (due.length === 0) continue;

            for (const d of due) {
                const logId = `${cls.id}_${d.date}_${d.kind}`;
                try {
                    // Claim it first: create() throws if this reminder already went out.
                    await db.collection('class_reminder_log').doc(logId).create({
                        classId: cls.id,
                        sessionDate: d.date,
                        kind: d.kind,
                        claimedAt: new Date().toISOString(),
                    });
                } catch {
                    continue; // already sent by an earlier/parallel tick
                }

                const recipients = await enrolledStudents(db, cls.id);
                if (recipients.length === 0) continue;

                await db.collection('notifications_outbox').add({
                    type: 'class_reminder',
                    kind: d.kind,
                    classId: cls.id,
                    classTitle: cls.title,
                    sessionDate: d.date,
                    startTime: d.startTime,
                    leadMinutes: cfg.leadMinutes,
                    link: cls.joiningLink || cls.fallbackJoinLink || null,
                    recipients,
                    createdAt: new Date().toISOString(),
                    status: 'queued',
                });
                queued++;
                logger.info(`class_reminder queued: ${cls.title} ${d.date} (${d.kind}) → ${recipients.length} students`);
            }
        }
        if (queued > 0) logger.info(`classReminderTick queued ${queued} reminder(s)`);
    },
);

module.exports = { classReminderTick };
