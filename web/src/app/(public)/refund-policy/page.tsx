import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function RefundPolicyPage() {
    return (
        <LegalPage
            title="Refund Policy"
            sections={[
                {
                    heading: 'Live classes',
                    body: 'If a scheduled class is canceled by the institute and not rescheduled, the fee for that session is refunded or credited toward another class.',
                },
                {
                    heading: 'Courses & quizzes',
                    body: 'Recorded course and quiz fees are refundable within 7 days of purchase provided less than 20% of the content has been accessed.',
                },
                {
                    heading: 'How refunds are paid',
                    body: 'Refunds are returned to the original payment method where the gateway supports it (PayPal / card), or by bank transfer for slip payments. Processing takes 5–10 working days.',
                },
                {
                    heading: 'Requesting a refund',
                    body: 'Contact the institute office with your payment reference (visible under Payments in your student dashboard).',
                },
            ]}
        />
    );
}
