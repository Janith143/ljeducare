import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy Policy"
            sections={[
                {
                    heading: 'What we collect',
                    body: `${SITE.name} collects the information you provide when registering — name, email, mobile number, guardian contact details — plus your enrollments, attendance, quiz submissions and exam results.`,
                },
                {
                    heading: 'How we use it',
                    body: 'Your data is used to run your classes: enrollment access, attendance records, guardian notifications, results and certificates, and payment receipts. We do not sell your data or share it outside the institute and its service providers (payment gateways, SMS/email delivery).',
                },
                {
                    heading: 'Payments',
                    body: 'Card payments are processed by our payment gateway partners (PayPal / Marx). We never store your full card number.',
                },
                {
                    heading: 'Your choices',
                    body: 'You can request a copy or deletion of your data at any time via the Request Deletion page or by contacting the institute office.',
                },
            ]}
        />
    );
}
