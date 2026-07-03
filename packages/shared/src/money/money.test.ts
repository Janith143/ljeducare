import { describe, expect, it } from 'vitest';
import { convert, getRate, roundMoney, toGatewayValue, toMinorUnits } from './convert';
import { formatCurrency } from './format';
import { buildSaleSnapshot, resolvePrice } from './resolvePrice';
import type { CurrencySettings } from './types';

const settings: CurrencySettings = {
    base: 'LKR',
    enabled: ['LKR', 'USD', 'GBP'],
    rates: {
        // 1 LKR = 0.0031 USD (≈ 322.58 LKR/USD)
        USD: { rate: 0.0031, updatedAt: '2026-07-01T00:00:00Z' },
        GBP: { rate: 0.0024, updatedAt: '2026-07-01T00:00:00Z' },
    },
};

describe('convert', () => {
    it('base → foreign uses the rate', () => {
        const usd = convert({ amount: 10000, currency: 'LKR' }, 'USD', 'LKR', settings.rates);
        expect(usd).toEqual({ amount: 31, currency: 'USD' });
    });

    it('foreign → base inverts the rate', () => {
        const lkr = convert({ amount: 31, currency: 'USD' }, 'LKR', 'LKR', settings.rates);
        expect(lkr.amount).toBeCloseTo(10000, 0);
    });

    it('cross foreign→foreign goes via base', () => {
        const gbp = convert({ amount: 31, currency: 'USD' }, 'GBP', 'LKR', settings.rates);
        expect(gbp.amount).toBeCloseTo(24, 0);
    });

    it('same currency is identity', () => {
        expect(convert({ amount: 5, currency: 'USD' }, 'USD', 'LKR', settings.rates).amount).toBe(5);
    });

    it('throws for unconfigured currency', () => {
        expect(() => getRate('EUR', 'LKR', settings.rates)).toThrow(/No exchange rate/);
    });

    it('rounds to minor units', () => {
        expect(roundMoney(19.999, 'USD')).toBe(20);
        expect(roundMoney(19.994, 'USD')).toBe(19.99);
        expect(roundMoney(1000.5, 'JPY')).toBe(1001);
    });
});

describe('resolvePrice', () => {
    it('free items are 0 in any currency', () => {
        expect(resolvePrice({ basePrice: 5000, isFree: true }, 'USD', settings).amount).toBe(0);
    });

    it('override beats computed rate', () => {
        const price = resolvePrice({ basePrice: 5000, overrides: { USD: 19.99 } }, 'USD', settings);
        expect(price).toEqual({ amount: 19.99, currency: 'USD' });
    });

    it('falls back to converted base price', () => {
        const price = resolvePrice({ basePrice: 5000 }, 'USD', settings);
        expect(price.amount).toBeCloseTo(15.5, 2);
    });

    it('base currency returns base price untouched', () => {
        expect(resolvePrice({ basePrice: 5000 }, 'LKR', settings).amount).toBe(5000);
    });

    it('rejects disabled currencies', () => {
        expect(() => resolvePrice({ basePrice: 5000 }, 'EUR', settings)).toThrow(/not enabled/);
    });
});

describe('buildSaleSnapshot', () => {
    it('snapshots base-currency charges with fxRate 1', () => {
        const snap = buildSaleSnapshot({ amount: 5000, currency: 'LKR' }, settings);
        expect(snap).toEqual({ currency: 'LKR', amount: 5000, baseAmount: 5000, fxRate: 1 });
    });

    it('derives baseAmount from the actual charged (override) amount', () => {
        const snap = buildSaleSnapshot({ amount: 19.99, currency: 'USD' }, settings);
        expect(snap.fxRate).toBe(0.0031);
        expect(snap.baseAmount).toBeCloseTo(6448.39, 2);
    });
});

describe('formatting & gateway values', () => {
    it('formatCurrency renders symbol/code with 2 decimals', () => {
        expect(formatCurrency({ amount: 19.99, currency: 'USD' }, 'en-US')).toBe('$19.99');
    });

    it('toMinorUnits and toGatewayValue', () => {
        expect(toMinorUnits({ amount: 19.99, currency: 'USD' })).toBe(1999);
        expect(toGatewayValue({ amount: 20, currency: 'USD' })).toBe('20.00');
        expect(toGatewayValue({ amount: 200, currency: 'JPY' })).toBe('200');
    });
});
