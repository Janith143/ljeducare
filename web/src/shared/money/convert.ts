import type { CurrencyCode, Money, RateTable } from './types';
import { ZERO_DECIMAL_CURRENCIES } from './types';

/** Round to the currency's minor unit (2 decimals for most; 0 for zero-decimal currencies). */
export function roundMoney(amount: number, currency: CurrencyCode): number {
    const factor = ZERO_DECIMAL_CURRENCIES.includes(currency) ? 1 : 100;
    return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Look up the rate for `currency` relative to the base currency.
 * The base currency itself always has rate 1.
 * Throws when the currency has no configured rate — callers must not silently
 * charge in an unconfigured currency.
 */
export function getRate(currency: CurrencyCode, base: CurrencyCode, rates: RateTable): number {
    if (currency === base) return 1;
    const entry = rates[currency];
    if (!entry || !(entry.rate > 0)) {
        throw new Error(`No exchange rate configured for ${currency}`);
    }
    return entry.rate;
}

/**
 * Convert between any two enabled currencies via the base currency.
 * Rates are stored base-relative: 1 base unit = rate[target] target units.
 */
export function convert(
    money: Money,
    to: CurrencyCode,
    base: CurrencyCode,
    rates: RateTable,
): Money {
    if (money.currency === to) return { ...money };
    const fromRate = getRate(money.currency, base, rates);
    const toRate = getRate(to, base, rates);
    const inBase = money.amount / fromRate;
    return { amount: roundMoney(inBase * toRate, to), currency: to };
}

/** Convert MAJOR units to the smallest minor-unit string for gateway payloads (e.g. PayPal "value"). */
export function toMinorUnits(money: Money): number {
    const factor = ZERO_DECIMAL_CURRENCIES.includes(money.currency) ? 1 : 100;
    return Math.round(money.amount * factor);
}

/** Format for PayPal API `amount.value` strings: "20.00" (or "200" for zero-decimal). */
export function toGatewayValue(money: Money): string {
    const digits = ZERO_DECIMAL_CURRENCIES.includes(money.currency) ? 0 : 2;
    return money.amount.toFixed(digits);
}
