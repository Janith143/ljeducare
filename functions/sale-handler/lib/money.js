/**
 * CJS mirror of web/src/shared/money — KEEP IN SYNC when editing either.
 * (Functions deploy standalone; workspace imports don't survive `firebase deploy`.)
 */
const ZERO_DECIMAL = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'RWF'];

function roundMoney(amount, currency) {
    const factor = ZERO_DECIMAL.includes(currency) ? 1 : 100;
    return Math.round((amount + Number.EPSILON) * factor) / factor;
}

function getRate(currency, base, rates) {
    if (currency === base) return 1;
    const entry = rates?.[currency];
    if (!entry || !(entry.rate > 0)) throw new Error(`No exchange rate configured for ${currency}`);
    return entry.rate;
}

/** Price of an item in `currency`: free → 0, override beats converted base price. */
function resolvePrice(pricing, currency, settings) {
    if (!settings.enabled.includes(currency)) throw new Error(`Currency ${currency} is not enabled`);
    if (pricing.isFree || !(pricing.basePrice > 0)) return { amount: 0, currency };
    const override = pricing.overrides?.[currency];
    if (typeof override === 'number' && override >= 0) {
        return { amount: roundMoney(override, currency), currency };
    }
    const rate = getRate(currency, settings.base, settings.rates);
    return { amount: roundMoney(pricing.basePrice * rate, currency), currency };
}

/** Immutable {currency, amount, baseAmount, fxRate} snapshot written on every sale. */
function buildSaleSnapshot(charged, settings) {
    const fxRate = getRate(charged.currency, settings.base, settings.rates);
    const baseAmount =
        charged.currency === settings.base
            ? charged.amount
            : roundMoney(charged.amount / fxRate, settings.base);
    return { currency: charged.currency, amount: charged.amount, baseAmount, fxRate };
}

/** Gateway "value" string, e.g. "19.99" (PayPal) — zero-decimal currencies get no decimals. */
function toGatewayValue(money) {
    return money.amount.toFixed(ZERO_DECIMAL.includes(money.currency) ? 0 : 2);
}

module.exports = { roundMoney, getRate, resolvePrice, buildSaleSnapshot, toGatewayValue };
