import type { CurrencySettings, Pricing } from '@ljeducare/shared';
import { formatCurrencyCompact, resolvePrice } from '@ljeducare/shared';

/**
 * Server component: renders an item's price in the base currency with an
 * approximate USD hint for foreign visitors (full selector lives at checkout).
 */
export default function PriceTag({
    pricing,
    settings,
    className = '',
}: {
    pricing: Pricing;
    settings: CurrencySettings;
    className?: string;
}) {
    if (pricing.isFree || pricing.basePrice === 0) {
        return <span className={`font-semibold text-green-600 ${className}`}>Free</span>;
    }
    const base = resolvePrice(pricing, settings.base, settings);
    let hint: string | null = null;
    if (settings.enabled.includes('USD') && settings.rates.USD) {
        try {
            hint = formatCurrencyCompact(resolvePrice(pricing, 'USD', settings), 'en-US');
        } catch {
            hint = null;
        }
    }
    return (
        <span className={`font-semibold ${className}`}>
            {formatCurrencyCompact(base)}
            {hint && (
                <span className="ml-1 text-xs font-normal text-light-subtle dark:text-dark-subtle">
                    (≈ {hint})
                </span>
            )}
        </span>
    );
}
