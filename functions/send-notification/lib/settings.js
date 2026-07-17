/**
 * Reads settings/notifications and resolves which channels an event may use.
 *
 * Defaults are duplicated from web/src/shared/types/notifications.ts
 * (DEFAULT_NOTIFICATION_SETTINGS) because functions is a separate package and
 * cannot import the web app's TypeScript. KEEP THEM IN SYNC — and note the
 * safety-critical one: **sms defaults to false**. If these ever drift, the worst
 * case must stay "SMS didn't send", never "SMS silently sent to everyone".
 */
const { getFirestore } = require('firebase-admin/firestore');

const DEFAULTS = {
    guardianAttendance: { inApp: false, email: true, sms: true }, // pre-existing behaviour
    payment: { inApp: true, email: true, sms: false },
    classReminder: { enabled: true, leadMinutes: 30, alsoAtStart: true, inApp: true, email: true, sms: false },
    teacherMessage: { inApp: true, email: true, sms: false },
};

async function getNotificationSettings() {
    try {
        const doc = await getFirestore().collection('settings').doc('notifications').get();
        return doc.data() || {};
    } catch {
        return {}; // fall back to defaults rather than blocking delivery
    }
}

/** Channels for an event, defaults applied. */
function channelsFor(settings, event) {
    const stored = (settings && settings[event]) || {};
    const d = DEFAULTS[event] || {};
    return {
        inApp: stored.inApp ?? d.inApp ?? false,
        email: stored.email ?? d.email ?? false,
        sms: stored.sms ?? d.sms ?? false,
    };
}

/** Class-reminder schedule + channels, defaults applied. */
function classReminderConfig(settings) {
    const s = (settings && settings.classReminder) || {};
    const d = DEFAULTS.classReminder;
    return {
        enabled: s.enabled ?? d.enabled,
        leadMinutes: Number(s.leadMinutes ?? d.leadMinutes) || 0,
        alsoAtStart: s.alsoAtStart ?? d.alsoAtStart,
        inApp: s.inApp ?? d.inApp,
        email: s.email ?? d.email,
        sms: s.sms ?? d.sms,
    };
}

module.exports = { getNotificationSettings, channelsFor, classReminderConfig, DEFAULTS };
