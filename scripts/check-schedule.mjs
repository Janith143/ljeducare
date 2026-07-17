/**
 * Verify the class-reminder scheduling logic (timezone + recurrence + windows).
 *
 *   node scripts/check-schedule.mjs
 *
 * Pure logic — touches no Firestore, sends nothing. Run this after ANY change to
 * functions/send-notification/lib/sessions.js: a timezone slip here silently moves
 * every reminder by 5.5 hours, which is invisible until parents complain.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { slDateKey, slStartMs, addDays, weekdayOf, occurrenceOn, dueReminders } = require(
    '../functions/send-notification/lib/sessions.js',
);

let failures = 0;
function check(name, fn) {
    try {
        fn();
        console.log(`  ok   ${name}`);
    } catch (e) {
        failures++;
        console.error(`  FAIL ${name}\n       ${e.message}`);
    }
}

const MIN = 60 * 1000;
const WINDOW = 5 * MIN; // the scheduler tick

console.log('Sri Lanka timezone (UTC+5:30, no DST):');
check('14:00 SL is 08:30 UTC', () => {
    assert.equal(new Date(slStartMs('2026-07-20', '14:00')).toISOString(), '2026-07-20T08:30:00.000Z');
});
check('00:15 SL is the previous day 18:45 UTC', () => {
    assert.equal(new Date(slStartMs('2026-07-20', '00:15')).toISOString(), '2026-07-19T18:45:00.000Z');
});
check('date key rolls at SL midnight, not UTC midnight', () => {
    // 2026-07-19T19:00Z is already 00:30 on the 20th in Colombo.
    assert.equal(slDateKey(Date.parse('2026-07-19T19:00:00Z')), '2026-07-20');
    assert.equal(slDateKey(Date.parse('2026-07-19T18:00:00Z')), '2026-07-19');
});
check('addDays crosses month end', () => assert.equal(addDays('2026-07-31', 1), '2026-08-01'));
check('addDays goes backwards over month start', () => assert.equal(addDays('2026-08-01', -1), '2026-07-31'));
check('weekdayOf 2026-07-20 is Monday', () => assert.equal(weekdayOf('2026-07-20'), 1));
check('rejects malformed input', () => {
    assert.equal(slStartMs('nonsense', '14:00'), null);
    assert.equal(slStartMs('2026-07-20', ''), null);
});

console.log('\noccurrenceOn (recurrence):');
const base = { status: 'scheduled', isPublished: true, startTime: '14:00' };
const oneOff = { ...base, recurrence: 'none', date: '2026-07-20' };
const weekly = { ...base, recurrence: 'weekly', date: '2026-07-20', endDate: '2026-08-17' };
const flexible = {
    ...base,
    recurrence: 'flexible',
    date: '2026-07-20',
    flexibleDates: [{ date: '2026-07-22', startTime: '09:00' }, { date: '2026-07-29', startTime: '11:00' }],
};

check('one-off matches only its own date', () => {
    assert.ok(occurrenceOn(oneOff, '2026-07-20'));
    assert.equal(occurrenceOn(oneOff, '2026-07-27'), null);
});
check('weekly repeats on the same weekday', () => {
    assert.ok(occurrenceOn(weekly, '2026-07-27')); // next Monday
    assert.ok(occurrenceOn(weekly, '2026-08-17')); // on endDate
});
check('weekly ignores other weekdays', () => assert.equal(occurrenceOn(weekly, '2026-07-28'), null));
check('weekly ignores dates before it starts', () => assert.equal(occurrenceOn(weekly, '2026-07-13'), null));
check('weekly stops after endDate', () => assert.equal(occurrenceOn(weekly, '2026-08-24'), null));
check('flexible uses its own per-date time', () => {
    assert.deepEqual(occurrenceOn(flexible, '2026-07-22'), { date: '2026-07-22', startTime: '09:00' });
    assert.equal(occurrenceOn(flexible, '2026-07-23'), null);
});
check('skips unpublished / cancelled / deleted classes', () => {
    assert.equal(occurrenceOn({ ...oneOff, isPublished: false }, '2026-07-20'), null);
    assert.equal(occurrenceOn({ ...oneOff, status: 'canceled' }, '2026-07-20'), null);
    assert.equal(occurrenceOn({ ...oneOff, status: 'finished' }, '2026-07-20'), null);
    assert.equal(occurrenceOn({ ...oneOff, isDeleted: true }, '2026-07-20'), null);
});

console.log('\ndueReminders (30 min before + at start):');
const cfg = { leadMinutes: 30, alsoAtStart: true };
const startUtc = Date.parse('2026-07-20T08:30:00Z'); // 14:00 SL

check('fires "before" in the tick 30 min ahead', () => {
    const due = dueReminders(oneOff, startUtc - 30 * MIN, WINDOW, cfg);
    assert.equal(due.length, 1);
    assert.equal(due[0].kind, 'before');
});
check('fires "start" in the tick at start time', () => {
    const due = dueReminders(oneOff, startUtc, WINDOW, cfg);
    assert.equal(due.length, 1);
    assert.equal(due[0].kind, 'start');
});
check('silent between the two', () => {
    assert.equal(dueReminders(oneOff, startUtc - 20 * MIN, WINDOW, cfg).length, 0);
});
check('silent long before and after', () => {
    assert.equal(dueReminders(oneOff, startUtc - 3 * 60 * MIN, WINDOW, cfg).length, 0);
    assert.equal(dueReminders(oneOff, startUtc + 60 * MIN, WINDOW, cfg).length, 0);
});
check('leadMinutes 0 disables only the early reminder', () => {
    const due = dueReminders(oneOff, startUtc - 30 * MIN, WINDOW, { leadMinutes: 0, alsoAtStart: true });
    assert.equal(due.length, 0);
    assert.equal(dueReminders(oneOff, startUtc, WINDOW, { leadMinutes: 0, alsoAtStart: true })[0].kind, 'start');
});
check('alsoAtStart false keeps only the early reminder', () => {
    assert.equal(dueReminders(oneOff, startUtc, WINDOW, { leadMinutes: 30, alsoAtStart: false }).length, 0);
    assert.equal(dueReminders(oneOff, startUtc - 30 * MIN, WINDOW, { leadMinutes: 30, alsoAtStart: false }).length, 1);
});
check('a 00:15 class reminds at 23:45 the PREVIOUS SL day', () => {
    const midnightish = { ...base, recurrence: 'none', date: '2026-07-20', startTime: '00:15' };
    const s = slStartMs('2026-07-20', '00:15');
    const due = dueReminders(midnightish, s - 30 * MIN, WINDOW, cfg);
    assert.equal(due.length, 1, 'the reminder must survive the day boundary');
    assert.equal(due[0].kind, 'before');
    assert.equal(slDateKey(s - 30 * MIN), '2026-07-19', 'reminder tick is on the 19th SL');
});
check('weekly fires on a later week too', () => {
    const s = slStartMs('2026-07-27', '14:00');
    assert.equal(dueReminders(weekly, s, WINDOW, cfg)[0].kind, 'start');
});
check('flexible fires at its own time', () => {
    const s = slStartMs('2026-07-22', '09:00');
    assert.equal(dueReminders(flexible, s, WINDOW, cfg)[0].kind, 'start');
});
check('no duplicate fire across consecutive ticks', () => {
    // The same reminder must appear in exactly one 5-minute tick.
    let hits = 0;
    for (let t = startUtc - 60 * MIN; t < startUtc + 60 * MIN; t += WINDOW) {
        hits += dueReminders(oneOff, t, WINDOW, cfg).filter((d) => d.kind === 'before').length;
    }
    assert.equal(hits, 1, `expected exactly one 'before' across the ticks, got ${hits}`);
});

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
