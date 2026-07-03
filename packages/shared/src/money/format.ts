import type { Money } from './types';
import { ZERO_DECIMAL_CURRENCIES } from './types';

const DEFAULT_LOCALE = 'en-LK';

/**
 * Format a Money value for display, e.g. "LKR 4,500.00", "$20.00".
 * The single sanctioned way to render prices — do NOT use `.toFixed()` in UI code.
 */
export function formatCurrency(money: Money, locale: string = DEFAULT_LOCALE): string {
    const digits = ZERO_DECIMAL_CURRENCIES.includes(money.currency) ? 0 : 2;
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: money.currency,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(money.amount);
    } catch {
        // Unknown/invalid currency code — fall back to plain formatting.
        return `${money.currency} ${money.amount.toLocaleString(locale, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        })}`;
    }
}

/** Compact display without decimals when whole, e.g. "LKR 4,500" / "LKR 4,500.50". */
export function formatCurrencyCompact(money: Money, locale: string = DEFAULT_LOCALE): string {
    if (Number.isInteger(money.amount)) {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: money.currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(money.amount);
        } catch {
            return `${money.currency} ${money.amount.toLocaleString(locale)}`;
        }
    }
    return formatCurrency(money, locale);
}
