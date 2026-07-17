/**
 * settings/notifications — which channels each automatic message may use.
 *
 * Resolved at DELIVERY time (not when a message is queued), so flipping a channel
 * takes effect on already-queued messages and there is exactly one place to look.
 *
 * SMS defaults to OFF everywhere on purpose: it costs real money per message, so a
 * class of 50 must never silently spend 50 credits because a default was left on.
 * In-app and email are free and default ON.
 */

export interface ChannelFlags {
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
}

/** Message types that read their channels from settings. */
export type NotificationEvent =
    | 'guardianAttendance'
    | 'payment'
    | 'classReminder'
    | 'teacherMessage';

export interface ClassReminderSettings extends ChannelFlags {
    /** false disables class reminders entirely. */
    enabled?: boolean;
    /** Minutes before start for the early reminder. 0 disables just the early one. */
    leadMinutes?: number;
    /** Also send a "starting now" message at the start time itself. */
    alsoAtStart?: boolean;
}

export interface NotificationSettings {
    /** Attendance alerts to guardians (the pre-existing flow). */
    guardianAttendance?: ChannelFlags;
    /** Receipt when a sale settles — student, plus guardian when on file. */
    payment?: ChannelFlags;
    classReminder?: ClassReminderSettings;
    /** Teacher → their own enrolled students. */
    teacherMessage?: ChannelFlags;
    updatedAt?: string;
    updatedBy?: string;
}

/**
 * Shipped defaults. Merged under the stored doc, so a field nobody has touched
 * follows these and new fields light up without a migration.
 */
export const DEFAULT_NOTIFICATION_SETTINGS: Required<
    Pick<NotificationSettings, 'guardianAttendance' | 'payment' | 'classReminder' | 'teacherMessage'>
> = {
    guardianAttendance: { inApp: false, email: true, sms: true }, // pre-existing behaviour: guardians got SMS+email
    payment: { inApp: true, email: true, sms: false },
    classReminder: { enabled: true, leadMinutes: 30, alsoAtStart: true, inApp: true, email: true, sms: false },
    teacherMessage: { inApp: true, email: true, sms: false },
};

/** The channels an event may use right now. */
export function channelsFor(settings: NotificationSettings | undefined, event: NotificationEvent): ChannelFlags {
    const stored = settings?.[event] ?? {};
    const fallback = DEFAULT_NOTIFICATION_SETTINGS[event];
    return {
        inApp: stored.inApp ?? fallback.inApp ?? false,
        email: stored.email ?? fallback.email ?? false,
        sms: stored.sms ?? fallback.sms ?? false,
    };
}

/** Class-reminder schedule, defaults applied. */
export function classReminderConfig(settings: NotificationSettings | undefined): Required<ClassReminderSettings> {
    const s = settings?.classReminder ?? {};
    const d = DEFAULT_NOTIFICATION_SETTINGS.classReminder;
    return {
        enabled: s.enabled ?? d.enabled ?? true,
        leadMinutes: s.leadMinutes ?? d.leadMinutes ?? 30,
        alsoAtStart: s.alsoAtStart ?? d.alsoAtStart ?? true,
        inApp: s.inApp ?? d.inApp ?? true,
        email: s.email ?? d.email ?? true,
        sms: s.sms ?? d.sms ?? false,
    };
}
