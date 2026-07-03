import type { SaleMoneySnapshot } from '../money/types';

export type SaleItemType = 'class' | 'course' | 'quiz' | 'custom_class';

export type SaleGateway = 'paypal' | 'marx' | 'webxpay' | 'bank_slip' | 'manual';

export type SaleStatus =
    | 'pending_gateway'   // created, awaiting gateway approval/capture
    | 'pending_slip'      // awaiting slip upload / admin approval
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'refunded'
    | 'hold';             // gateway state unclear — reconciler resolves

export type SalePaymentMethod =
    | 'gateway'
    | 'bank_transfer'
    | 'manual_at_venue'   // cash collected at kiosk/front desk
    | 'attendance_mark'   // zero-value access grant from unpaid attendance
    | 'free';

/**
 * sales/{id} — every enrollment/purchase (server-only writes).
 * Money is snapshotted at charge time via SaleMoneySnapshot: currency, amount,
 * baseAmount (LKR) and fxRate never change after the fact.
 * Commission is two-way: teacherCommission + instituteIncome = baseAmount.
 */
export interface Sale extends SaleMoneySnapshot {
    id: string;
    studentId: string;
    teacherId?: string;
    itemId: string;
    itemType: SaleItemType;
    itemName: string;
    saleDate: string;                 // ISO
    status: SaleStatus;
    gateway?: SaleGateway;
    paymentMethod: SalePaymentMethod;

    /** Teacher share of baseAmount (LKR), from staff.commissionRate at sale time. */
    teacherCommission?: number;
    /** Institute share of baseAmount (LKR) — the remainder. */
    instituteIncome?: number;
    /** Snapshot of the commission % used (audit). */
    commissionRateApplied?: number;

    /** Cash collected off-platform at the venue (kiosk). */
    cashAtVenue?: boolean;

    // Bank-slip flow
    slipImageUrl?: string;
    pendingAdminApproval?: boolean;
    rejectionReason?: string;

    // Gateway references
    gatewayOrderId?: string;          // PayPal order id / Marx trId
    gatewayCaptureId?: string;
    gatewayPayload?: Record<string, unknown>;

    /** Free enrollment via "make next session free" — forces single-session access. */
    freeSession?: boolean;

    /** YYYY-MM the payment covers, for per-month weekly classes (access gating). */
    coveredMonth?: string;

    purchaseMetadata?: {
        type: 'full' | 'month' | 'session' | 'installment';
        index?: number;
    };
    studentSnapshot?: {
        name?: string;
        studentId?: string;
        email?: string;
        contactNumber?: string;
    };

    // Refund / cancellation audit (written by sale-handler)
    refundedAt?: string;
    refundedBy?: string;
    refundReason?: string;
    canceledAt?: string;
    canceledBy?: string;
    cancelReason?: string;
}

/** financial_ledger/{id} — double-entry audit row (server-only writes). */
export interface LedgerEntry {
    id: string;
    orderId: string;                  // saleId or teacher_payment id
    type: string;                     // 'sale' | 'refund' | 'teacher_settlement' | ...
    entries: { account: string; amount: number }[]; // LKR, must sum to 0
    currency?: string;                // original charge currency
    fxRate?: number;
    metadata?: { teacherId?: string; studentId?: string; itemId?: string };
    createdAt: string;                // ISO
}
