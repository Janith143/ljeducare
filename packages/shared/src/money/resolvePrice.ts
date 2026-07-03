import type { CurrencyCode, CurrencySettings, Money, Pricing, SaleMoneySnapshot } from './types';
import { convert, getRate, roundMoney } from './convert';

/**
 * Resolve the price of an item in the requested currency.
 * Order: free → explicit per-currency override → converted base price.
 * Throws if `currency` is not enabled or has no rate — the caller decides fallback.
 */
export function resolvePrice(
    pricing: Pricing,
    currency: CurrencyCode,
    settings: CurrencySettings,
): Money {
    if (!settings.enabled.includes(currency)) {
        throw new Error(`Currency ${currency} is not enabled`);
    }
    if (pricing.isFree || pricing.basePrice === 0) {
        return { amount: 0, currency };
    }
    const override = pricing.overrides?.[currency];
    if (typeof override === 'number' && override >= 0) {
        return { amount: roundMoney(override, currency), currency };
    }
    return convert(
        { amount: pricing.basePrice, currency: settings.base },
        currency,
        settings.base,
        settings.rates,
    );
}

/**
 * Build the immutable money snapshot recorded on a sale at charge time.
 * `baseAmount` is derived from the ACTUAL charged amount (override-aware),
 * so revenue reports always sum real value received.
 */
export function buildSaleSnapshot(
    charged: Money,
    settings: CurrencySettings,
): SaleMoneySnapshot {
    const fxRate = getRate(charged.currency, settings.base, settings.rates);
    const baseAmount =
        charged.currency === settings.base
            ? charged.amount
            : roundMoney(charged.amount / fxRate, settings.base);
    return {
        currency: charged.currency,
        amount: charged.amount,
        baseAmount,
        fxRate,
    };
}
