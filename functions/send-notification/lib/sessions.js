/**
 * Working out when a class session actually starts.
 *
 * Sri Lanka is UTC+5:30 year-round (no DST), and class `date`/`startTime` are stored
 * as NAIVE local strings ("2026-07-20", "14:00") — they carry no timezone. So the
 * server must convert them explicitly: reading them with `new Date(...)` would
 * interpret them in whatever zone the container happens to run in (UTC on Cloud
 * Functions), silently shifting every class by 5.5 hours.
 *
 * Pure functions — no Firestore, no clock. `nowMs` is always injected so the
 * scheduler is deterministic and testable (see scripts/check-schedule.mjs).
 */

const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+05:30, no DST

const pad = (n) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for an instant, in Sri Lanka local time. */
function slDateKey(nowMs) {
    const d = new Date(nowMs + SL_OFFSET_MS);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Day of week (0=Sun) for a `YYYY-MM-DD` calendar date. */
function weekdayOf(dateKey) {
    const [y, m, d] = String(dateKey).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Shift a `YYYY-MM-DD` by whole days. */
function addDays(dateKey, days) {
    const [y, m, d] = String(dateKey).split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    t.setUTCDate(t.getUTCDate() + days);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Epoch ms for a Sri Lanka local date + time.
 * `2026-07-20 14:00` SL → 08:30 UTC.
 */
function slStartMs(dateKey, startTime) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
    const t = /^(\d{1,2}):(\d{2})/.exec(String(startTime || ''));
    if (!m || !t) return null;
    const utcAsIfLocal = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
    return utcAsIfLocal - SL_OFFSET_MS;
}

/**
 * Does this class have a session on `dateKey`? Returns { date, startTime } or null.
 * Mirrors the LiveClass model: recurrence none | weekly | flexible.
 */
function occurrenceOn(cls, dateKey) {
    if (!cls || cls.status !== 'scheduled' || cls.isPublished === false || cls.isDeleted) return null;

    const recurrence = cls.recurrence || 'none';

    if (recurrence === 'flexible') {
        const hit = (cls.flexibleDates || []).find((f) => f && f.date === dateKey);
        return hit ? { date: dateKey, startTime: hit.startTime } : null;
    }

    if (recurrence === 'weekly') {
        if (!cls.date || dateKey < cls.date) return null;              // hasn't started yet
        if (cls.endDate && dateKey > cls.endDate) return null;         // series finished
        if (weekdayOf(dateKey) !== weekdayOf(cls.date)) return null;   // different weekday
        return { date: dateKey, startTime: cls.startTime };
    }

    // one-off
    return cls.date === dateKey ? { date: dateKey, startTime: cls.startTime } : null;
}

/**
 * Which reminders for `cls` fall inside [nowMs, nowMs + windowMs)?
 * Returns [{ kind: 'before'|'start', date, startTime, startMs }].
 *
 * Checks yesterday..tomorrow in SL, not just today: a 30-minute lead on a 00:15
 * class fires at 23:45 the PREVIOUS day, and the tick that catches a 23:50 class
 * may itself run after midnight.
 */
function dueReminders(cls, nowMs, windowMs, config) {
    const { leadMinutes = 30, alsoAtStart = true } = config || {};
    const out = [];
    const today = slDateKey(nowMs);

    for (const dateKey of [addDays(today, -1), today, addDays(today, 1)]) {
        const occ = occurrenceOn(cls, dateKey);
        if (!occ) continue;
        const startMs = slStartMs(occ.date, occ.startTime);
        if (startMs === null) continue;

        const inWindow = (t) => t >= nowMs && t < nowMs + windowMs;

        if (leadMinutes > 0 && inWindow(startMs - leadMinutes * 60 * 1000)) {
            out.push({ kind: 'before', date: occ.date, startTime: occ.startTime, startMs });
        }
        if (alsoAtStart && inWindow(startMs)) {
            out.push({ kind: 'start', date: occ.date, startTime: occ.startTime, startMs });
        }
    }
    return out;
}

module.exports = { slDateKey, weekdayOf, addDays, slStartMs, occurrenceOn, dueReminders, SL_OFFSET_MS };
