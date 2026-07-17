/**
 * Sanity-check the SMS gateway wiring without sending anything.
 *
 *   node scripts/check-sms.mjs                 # logic checks only
 *   node scripts/check-sms.mjs --account       # + verify credentials against Notify.lk
 *
 * With --account it reads NOTIFYLK_USER_ID / NOTIFYLK_API_KEY from the environment and
 * calls Notify.lk's read-only status endpoint — it never sends an SMS or spends credit.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizePhone, configured } = require('../functions/send-notification/lib/channels.js');

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

console.log('normalizePhone (LK -> 94XXXXXXXXX):');
check('local 0771234567', () => assert.equal(normalizePhone('0771234567'), '94771234567'));
check('already 94-prefixed', () => assert.equal(normalizePhone('94771234567'), '94771234567'));
check('bare 9 digits', () => assert.equal(normalizePhone('771234567'), '94771234567'));
check('formatted +94 77 123 4567', () => assert.equal(normalizePhone('+94 77 123 4567'), '94771234567'));
check('dashes 077-123-4567', () => assert.equal(normalizePhone('077-123-4567'), '94771234567'));
check('rejects junk', () => assert.equal(normalizePhone('hello'), null));
check('rejects empty', () => assert.equal(normalizePhone(''), null));
check('rejects too short', () => assert.equal(normalizePhone('12345'), null));

console.log('\nconfigured (placeholder secrets must NOT count as configured):');
check('REPLACE_ME is not configured', () => assert.equal(configured('REPLACE_ME'), false));
check('CHANGE_ME is not configured', () => assert.equal(configured('CHANGE_ME'), false));
check('empty is not configured', () => assert.equal(configured(''), false));
check('whitespace is not configured', () => assert.equal(configured('   '), false));
check('undefined is not configured', () => assert.equal(configured(undefined), false));
check('a real value is configured', () => assert.equal(configured('32295'), true));

if (process.argv.includes('--account')) {
    const userId = process.env.NOTIFYLK_USER_ID;
    const apiKey = process.env.NOTIFYLK_API_KEY;
    console.log('\nNotify.lk account (read-only — sends nothing):');
    if (!configured(userId) || !configured(apiKey)) {
        console.error('  FAIL credentials not in env (NOTIFYLK_USER_ID / NOTIFYLK_API_KEY)');
        failures++;
    } else {
        const res = await fetch(`https://app.notify.lk/api/v1/status?user_id=${userId}&api_key=${apiKey}`);
        const data = await res.json().catch(() => ({}));
        if (data.status === 'success') {
            console.log(`  ok   credentials valid — ${JSON.stringify(data.data ?? data)}`);
        } else {
            console.error(`  FAIL credentials rejected — ${JSON.stringify(data)}`);
            failures++;
        }
    }
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
