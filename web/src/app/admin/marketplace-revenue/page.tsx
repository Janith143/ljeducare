import Link from 'next/link';
import { formatCurrencyCompact } from '@ljeducare/shared';
import { requirePermission } from '@/lib/auth/session';
import { fetchMarketplaceEarnings, type EarningsBucket } from '@/lib/data/marketplaceEarnings';

export const dynamic = 'force-dynamic';

const lkr = (amount: number) => formatCurrencyCompact({ amount, currency: 'LKR' });
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const monthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

/** Explains a failed pull in the institute's own terms — never leaks key material. */
function NotAvailable({ reason, detail }: { reason: string; detail?: string }) {
    const copy: Record<string, { title: string; body: React.ReactNode }> = {
        not_configured: {
            title: 'Not connected to clazz.lk',
            body: (
                <>
                    Add the connection key in{' '}
                    <Link href="/admin/settings" className="underline">Settings → clazz.lk Marketplace</Link> first.
                </>
            ),
        },
        no_provider_id: {
            title: 'Partner ID missing',
            body: (
                <>
                    We know the connection key but not our own partner ID (e.g. <code>LJE</code>). Add it in{' '}
                    <Link href="/admin/settings" className="underline">Settings → clazz.lk Marketplace</Link> —
                    clazz.lk&apos;s admin can tell you what it is.
                </>
            ),
        },
        unauthorized: {
            title: 'clazz.lk rejected our key',
            body: <>They most likely rotated it. Ask for the new key and paste it in Settings.</>,
        },
        unreachable: {
            title: 'Could not reach clazz.lk',
            body: <>This is usually temporary — try again shortly. {detail ? `(${detail})` : null}</>,
        },
    };
    const c = copy[reason] ?? copy.unreachable;
    return (
        <div className="card space-y-1">
            <p className="font-semibold">{c.title}</p>
            <p className="text-sm text-light-subtle dark:text-dark-subtle">{c.body}</p>
        </div>
    );
}

/** Horizontal bar list — enough to read a trend without pulling in a chart library. */
function BarList({ rows, label }: { rows: EarningsBucket[]; label: (r: EarningsBucket) => string }) {
    const max = Math.max(...rows.map((r) => r.net), 1);
    return (
        <div className="space-y-1.5">
            {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 truncate text-light-subtle dark:text-dark-subtle">{label(r)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, (r.net / max) * 100)}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right font-medium tabular-nums">{lkr(r.net)}</span>
                    <span className="w-14 shrink-0 text-right text-xs text-light-subtle dark:text-dark-subtle">
                        {r.count} sale{r.count === 1 ? '' : 's'}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default async function MarketplaceRevenuePage() {
    await requirePermission('revenue');
    const result = await fetchMarketplaceEarnings();

    if (!result.ok) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">clazz.lk Marketplace Revenue</h1>
                <NotAvailable reason={result.reason} detail={result.detail} />
            </div>
        );
    }

    const r = result.report;
    const s = r.summary;
    const empty = s.salesCount === 0 && s.total === 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">clazz.lk Marketplace Revenue</h1>
                <p className="text-sm text-light-subtle dark:text-dark-subtle">
                    What our content earned on clazz.lk between{' '}
                    {new Date(r.range.from).toLocaleDateString()} and {new Date(r.range.to).toLocaleDateString()}
                    {r.commissionRate != null && <> · their commission {r.commissionRate}%</>}
                    {' · '}figures direct from clazz.lk, {new Date(r.generatedAt).toLocaleString()}
                </p>
            </div>

            {empty ? (
                <div className="card space-y-1">
                    <p className="font-semibold">No marketplace sales yet</p>
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">
                        We&apos;re connected and our catalogue is syncing. This page fills in as soon as clazz.lk
                        makes its first sale of our content.
                    </p>
                </div>
            ) : null}

            {/* Headline: what we earned, what we're owed */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Our earnings (net)</p>
                    <p className="mt-1 text-2xl font-bold text-green-600">{lkr(s.net)}</p>
                    <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                        from {lkr(s.gross)} of sales
                    </p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">clazz.lk commission</p>
                    <p className="mt-1 text-2xl font-bold">{lkr(s.commission)}</p>
                    <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                        {pct(s.commission, s.gross)}% of gross
                    </p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Awaiting payout</p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">{lkr(s.available)}</p>
                    <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                        {lkr(s.withdrawn)} already paid to us
                    </p>
                </div>
                <div className="card">
                    <p className="text-sm text-light-subtle dark:text-dark-subtle">Sales</p>
                    <p className="mt-1 text-2xl font-bold">{s.salesCount}</p>
                    <p className="mt-1 text-xs text-light-subtle dark:text-dark-subtle">
                        {s.uniqueBuyers} student{s.uniqueBuyers === 1 ? '' : 's'}
                        {s.refundedCount > 0 && <> · {s.refundedCount} refunded ({lkr(s.refundedGross)})</>}
                    </p>
                </div>
            </div>

            {r.timeseries.length > 0 && (
                <section className="card space-y-3">
                    <h2 className="font-semibold">Monthly trend</h2>
                    <BarList rows={r.timeseries} label={(x) => monthLabel(x.month ?? '')} />
                </section>
            )}

            {r.topItems.length > 0 && (
                <section className="card space-y-3">
                    <h2 className="font-semibold">Best sellers</h2>
                    <BarList rows={r.topItems} label={(x) => x.itemName || String(x.itemId)} />
                </section>
            )}

            {r.byTeacher.length > 0 && (
                <section className="card space-y-3">
                    <h2 className="font-semibold">By teacher</h2>
                    <BarList rows={r.byTeacher} label={(x) => x.name || String(x.teacherId)} />
                </section>
            )}

            {r.payouts.length > 0 && (
                <section className="card space-y-3">
                    <h2 className="font-semibold">Payouts received</h2>
                    <table className="w-full text-sm">
                        <thead className="text-left text-light-subtle dark:text-dark-subtle">
                            <tr><th className="py-1">Date</th><th>Teachers covered</th><th className="text-right">Amount</th></tr>
                        </thead>
                        <tbody>
                            {r.payouts.map((p, i) => (
                                <tr key={i} className="border-t border-black/5 dark:border-white/10">
                                    <td className="py-1.5">{p.at ? new Date(p.at).toLocaleDateString() : '—'}</td>
                                    <td>{p.teachers}</td>
                                    <td className="text-right font-medium tabular-nums">{lkr(p.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {r.lineItems.length > 0 && (
                <section className="card space-y-3">
                    <div className="flex items-baseline justify-between">
                        <h2 className="font-semibold">Every sale</h2>
                        {r.truncated && (
                            <span className="text-xs text-amber-600">
                                showing the most recent {r.lineItems.length} — narrow the date range to see older sales
                            </span>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[46rem] text-sm">
                            <thead className="text-left text-light-subtle dark:text-dark-subtle">
                                <tr>
                                    <th className="py-1">Date</th><th>Item</th><th>Type</th>
                                    <th className="text-right">Sale</th><th className="text-right">Commission</th>
                                    <th className="text-right">We earn</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {r.lineItems.map((l) => (
                                    <tr key={l.saleId} className="border-t border-black/5 dark:border-white/10">
                                        <td className="py-1.5 whitespace-nowrap">
                                            {l.saleDate ? new Date(l.saleDate).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="max-w-[16rem] truncate">{l.itemName || l.itemId}</td>
                                        <td className="capitalize">{l.itemType}</td>
                                        <td className="text-right tabular-nums">{lkr(l.gross)}</td>
                                        <td className="text-right tabular-nums text-light-subtle dark:text-dark-subtle">
                                            −{lkr(l.commission)}
                                        </td>
                                        <td className="text-right font-medium tabular-nums">{lkr(l.net)}</td>
                                        <td>
                                            <span className={
                                                l.status === 'completed' ? 'text-green-600'
                                                    : l.status === 'refunded' ? 'text-red-600'
                                                        : 'text-light-subtle dark:text-dark-subtle'
                                            }>{l.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-light-subtle dark:text-dark-subtle">
                        Only completed sales count toward earnings. Buyers are clazz.lk&apos;s students, so their
                        details stay with clazz.lk.
                    </p>
                </section>
            )}
        </div>
    );
}
