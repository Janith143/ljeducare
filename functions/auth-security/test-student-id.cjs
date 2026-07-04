/**
 * Standalone unit test for the LJE student-id generator (no emulator needed).
 * Run: node test-student-id.cjs   (from functions/auth-security)
 * Exercises: format/padding, increment, and fail-loud on a non-numeric top id.
 */
const assert = require('assert');
const { generateStudentId } = require('./lib/studentId');

// Minimal in-memory Firestore query stub mirroring the chain the generator uses:
//   collection('users').where(field,op,val).where(...).orderBy(field,dir).limit(n).get()
function cmp(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}
function applyOp(v, op, val) {
    if (v === undefined || v === null) return false; // Firestore excludes docs missing the field
    if (op === '>=') return v >= val;
    if (op === '<') return v < val;
    if (op === '==') return v === val;
    throw new Error('unsupported op ' + op);
}
function makeDb(users) {
    return {
        collection() {
            const filters = [];
            let order = null;
            let lim = null;
            const q = {
                where(field, op, val) { filters.push({ field, op, val }); return q; },
                orderBy(field, dir) { order = { field, dir }; return q; },
                limit(n) { lim = n; return q; },
                async get() {
                    let rows = users.filter((u) => filters.every((f) => applyOp(u[f.field], f.op, f.val)));
                    if (order) rows = rows.slice().sort((a, b) => cmp(a[order.field], b[order.field]) * (order.dir === 'desc' ? -1 : 1));
                    if (lim != null) rows = rows.slice(0, lim);
                    return { empty: rows.length === 0, docs: rows.map((r) => ({ get: (k) => r[k], data: () => r })) };
                },
            };
            return q;
        },
    };
}

(async () => {
    // 1. Empty collection → first id is LJE0001XX
    const first = await generateStudentId(makeDb([]), 'LJE');
    assert.match(first, /^LJE0001[A-Z]{2}$/, `first id should be LJE0001XX, got ${first}`);

    // 2. Increment past the highest numeric id (padding preserved)
    const next = await generateStudentId(makeDb([{ studentId: 'LJE0005AB' }, { studentId: 'LJE0003ZZ' }]), 'LJE');
    assert.match(next, /^LJE0006[A-Z]{2}$/, `next id should be LJE0006XX, got ${next}`);

    // 3. Non-numeric demo/import ids (LJEDEMO01) sort ABOVE the digit range and are
    //    excluded — so they never zero the counter.
    const afterDemo = await generateStudentId(makeDb([{ studentId: 'LJE0009QQ' }, { studentId: 'LJEDEMO01' }]), 'LJE');
    assert.match(afterDemo, /^LJE0010[A-Z]{2}$/, `should ignore LJEDEMO and continue to LJE0010XX, got ${afterDemo}`);

    // 4. Fail loud: a top id in the numeric range but malformed (fewer than 4 digits)
    //    must throw rather than silently reset the counter.
    let threw = false;
    try {
        await generateStudentId(makeDb([{ studentId: 'LJE9' }]), 'LJE');
    } catch (e) {
        threw = true;
        assert.match(e.message, /not numeric/i);
    }
    assert.ok(threw, 'malformed top id should throw fail-loud');

    // 5. Prefix is parameterized (institute #2 uses its own).
    const other = await generateStudentId(makeDb([{ studentId: 'ABC0002XY' }]), 'ABC');
    assert.match(other, /^ABC0003[A-Z]{2}$/, `prefix should be honored, got ${other}`);

    console.log('student-id generator: all 5 checks passed');
})().catch((e) => { console.error('TEST FAILED:', e.message); process.exit(1); });
