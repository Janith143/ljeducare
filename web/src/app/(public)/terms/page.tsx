import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of Service"
            sections={[
                {
                    heading: 'Your account',
                    body: `Accounts on ${SITE.name} are personal. Sharing login credentials or class links with non-enrolled students may result in suspension.`,
                },
                {
                    heading: 'Enrollment & access',
                    body: 'Enrollment in a class, course or quiz grants access for the paid period (per session, per month, or full course as stated at checkout). Recording access may be limited by expiry dates and view caps set by the teacher.',
                },
                {
                    heading: 'Conduct',
                    body: 'Recording, redistributing or reselling class content is prohibited. Respectful behavior toward teachers and other students is required in all live sessions.',
                },
                {
                    heading: 'Changes',
                    body: 'The institute may reschedule sessions when necessary; affected students are notified and access windows are extended accordingly.',
                },
            ]}
        />
    );
}
