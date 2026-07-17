/**
 * Verify which settled sales earn a payment receipt.
 *
 *   node scripts/check-receipts.mjs
 *
 * finalizeSale is the choke point for EVERY money path, including bookkeeping sales
 * that aren't really payments. Getting this wrong means a "payment received" SMS on
 * every kiosk attendance scan — real money, at scale.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isReceiptWorthy, splitCommission } = require('../functions/sale-handler/lib/finalize.js');

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

const realSale = {
    studentId: 'stu1',
    baseAmount: 2500,
    paymentMethod: 'card',
    itemName: 'Physics Theory',
};

console.log('isReceiptWorthy — should send:');
check('a real paid enrollment', () => assert.equal(isReceiptWorthy(realSale), true));
check('a bank-slip enrollment', () =>
    assert.equal(isReceiptWorthy({ ...realSale, paymentMethod: 'bank_slip' }), true));
check('cash collected at the venue', () =>
    assert.equal(isReceiptWorthy({ ...realSale, paymentMethod: 'cash', cashAtVenue: true }), true));

console.log('\nisReceiptWorthy — must NOT send:');
check('the Rs.5 attendance-marking fee (every kiosk scan!)', () =>
    assert.equal(isReceiptWorthy({ ...realSale, baseAmount: 5, paymentMethod: 'attendance_mark' }), false));
check('a free-session grant', () =>
    assert.equal(isReceiptWorthy({ ...realSale, freeSession: true }), false));
check('a free enrollment (zero value)', () =>
    assert.equal(isReceiptWorthy({ ...realSale, baseAmount: 0 }), false));
check('a sale with no student', () =>
    assert.equal(isReceiptWorthy({ ...realSale, studentId: undefined }), false));
check('a null/undefined sale', () => {
    assert.equal(isReceiptWorthy(null), false);
    assert.equal(isReceiptWorthy(undefined), false);
});
check('a non-numeric amount', () =>
    assert.equal(isReceiptWorthy({ ...realSale, baseAmount: 'abc' }), false));
check('a negative amount (refund/adjustment)', () =>
    assert.equal(isReceiptWorthy({ ...realSale, baseAmount: -500 }), false));

console.log('\nsplitCommission (unchanged behaviour — guard against regressions):');
check('60% of 1000 → teacher 600 / institute 400', () => {
    const s = splitCommission(1000, 60);
    assert.equal(s.teacherCommission, 600);
    assert.equal(s.instituteIncome, 400);
});
check('shares always sum to baseAmount', () => {
    for (const [amt, rate] of [[999, 33], [1234.56, 17], [1, 50]]) {
        const s = splitCommission(amt, rate);
        assert.ok(Math.abs(s.teacherCommission + s.instituteIncome - amt) < 0.01, `${amt}@${rate}%`);
    }
});
check('clamps a nonsense rate', () => {
    assert.equal(splitCommission(1000, 250).teacherCommission, 1000);
    assert.equal(splitCommission(1000, -10).teacherCommission, 0);
});

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
