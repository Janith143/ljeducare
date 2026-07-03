/**
 * Server-side item resolution — the ONLY source of truth for what an item
 * costs. Client-provided amounts are never trusted.
 */
const { getFirestore } = require('firebase-admin/firestore');

const ITEM_COLLECTIONS = { class: 'classes', course: 'courses', quiz: 'quizzes' };

/** currency settings doc (settings/currencies) with safe fallback. */
async function loadCurrencySettings() {
    const doc = await getFirestore().doc('settings/currencies').get();
    const data = doc.exists ? doc.data() : {};
    return {
        base: data.base || 'LKR',
        enabled: Array.isArray(data.enabled) && data.enabled.length ? data.enabled : ['LKR'],
        rates: data.rates || {},
    };
}

/**
 * Load a sellable item and derive its effective pricing.
 * Returns { item, pricing, itemName, teacherId, enrollField, freeSession }.
 * Throws on unknown/unpublished items.
 */
async function loadItem(itemType, itemId) {
    const collection = ITEM_COLLECTIONS[itemType];
    if (!collection) throw new Error(`Unsupported itemType: ${itemType}`);

    const doc = await getFirestore().collection(collection).doc(String(itemId)).get();
    if (!doc.exists) throw new Error('Item not found.');
    const item = { ...doc.data(), id: doc.id };
    if (item.isDeleted || item.isPublished !== true) throw new Error('Item is not available.');

    let pricing = item.pricing || { basePrice: 0, isFree: true };
    let freeSession = false;

    // "Make next session free" toggle — while freeUntil is in the future the class
    // enrolls free, but grants ONLY that single session (ported from source).
    if (itemType === 'class' && item.freeUntil && Date.parse(item.freeUntil) > Date.now()) {
        pricing = { basePrice: 0, isFree: true };
        freeSession = true;
    }

    const enrollField = { class: 'enrolledClassIds', course: 'enrolledCourseIds', quiz: 'enrolledQuizIds' }[itemType];

    return {
        item,
        pricing,
        itemName: item.title || `${itemType} enrollment`,
        teacherId: item.teacherId || null,
        enrollField,
        freeSession,
    };
}

module.exports = { loadItem, loadCurrencySettings, ITEM_COLLECTIONS };
