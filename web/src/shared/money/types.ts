/** ISO 4217 currency code, e.g. 'LKR', 'USD'. */
export type CurrencyCode = string;

/** An amount in MAJOR units (rupees, dollars) with its currency. */
export interface Money {
    amount: number;
    currency: CurrencyCode;
}

/**
 * Pricing stored on every sellable item (class, course, quiz).
 * `basePrice` is always in the institute base currency (LKR).
 * `overrides` lets admin pin clean prices per currency (e.g. USD: 19.99),
 * beating the computed exchange-rate conversion.
 */
export interface Pricing {
    basePrice: number;
    overrides?: Record<CurrencyCode, number>;
    isFree?: boolean;
}

/** A single exchange rate relative to the base currency: 1 base unit = `rate` target units. */
export interface ExchangeRate {
    rate: number;
    updatedAt: string; // ISO string
}

/** The settings/currencies document shape. */
export interface CurrencySettings {
    base: CurrencyCode;               // 'LKR'
    enabled: CurrencyCode[];          // ['LKR', 'USD', ...]
    rates: Record<CurrencyCode, ExchangeRate>;
    ratesUpdatedBy?: string;
}

export type RateTable = CurrencySettings['rates'];

/**
 * The immutable money snapshot written on every sale at charge time.
 * Rate changes after the fact never affect recorded sales.
 */
export interface SaleMoneySnapshot {
    currency: CurrencyCode;   // currency the customer was charged in
    amount: number;           // charged amount, in `currency` major units
    baseAmount: number;       // equivalent in base currency (LKR) — all reporting uses this
    fxRate: number;           // 1 base unit = fxRate `currency` units at charge time (1 for base)
}

/** Currencies with zero-decimal minor units (per ISO 4217 / PayPal). */
export const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'RWF'];
