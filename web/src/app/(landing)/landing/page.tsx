import type { Metadata } from 'next';
import LandingBehaviors from '@/components/landing/LandingBehaviors';
import LandingContact from '@/components/landing/LandingContact';
import LandingEvents from '@/components/landing/LandingEvents';
import LandingFaculty from '@/components/landing/LandingFaculty';
import LandingFaq from '@/components/landing/LandingFaq';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingFooter from '@/components/landing/LandingFooter';
import LandingFounder from '@/components/landing/LandingFounder';
import LandingGallery from '@/components/landing/LandingGallery';
import LandingHero from '@/components/landing/LandingHero';
import LandingNav from '@/components/landing/LandingNav';
import LandingPrograms from '@/components/landing/LandingPrograms';
import LandingRecognition from '@/components/landing/LandingRecognition';
import LandingResults from '@/components/landing/LandingResults';
import LandingSubjects from '@/components/landing/LandingSubjects';
import LandingTestimonials from '@/components/landing/LandingTestimonials';
import LandingTrust from '@/components/landing/LandingTrust';
import { getLandingSettings } from '@/lib/data/landing';
import { LANDING_PATH, SITE } from '@/lib/site';

// Dynamic for the same reason as the rest of the storefront: App Hosting runs
// multiple instances, so a cached copy would leave admin edits invisible on
// whichever instance didn't handle the revalidation.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    const { seo } = await getLandingSettings();
    const title = seo?.title?.trim() || SITE.name;
    const description = seo?.description?.trim() || SITE.description;
    return {
        // `absolute` opts out of the root layout's "%s | LJ Educare" template —
        // the landing page owns its full title.
        title: { absolute: title },
        description,
        openGraph: {
            title,
            description,
            url: new URL(LANDING_PATH, SITE.url).toString(),
            images: seo?.shareImage ? [{ url: seo.shareImage }] : undefined,
        },
    };
}

/** The public marketing landing page. Every section is admin-editable at /admin/landing-page. */
export default async function LandingPage() {
    const s = await getLandingSettings();
    const on = (section?: { enabled?: boolean }) => section?.enabled !== false;

    return (
        <div className="lp">
            <LandingNav brand={s.brand ?? {}} />

            {on(s.hero) && <LandingHero hero={s.hero ?? {}} />}
            {on(s.trust) && <LandingTrust trust={s.trust ?? {}} />}
            {on(s.founder) && <LandingFounder founder={s.founder ?? {}} />}
            {on(s.features) && <LandingFeatures features={s.features ?? {}} />}
            {on(s.programs) && <LandingPrograms programs={s.programs ?? {}} />}
            {on(s.subjects) && <LandingSubjects subjects={s.subjects ?? {}} />}
            {on(s.faculty) && <LandingFaculty faculty={s.faculty ?? {}} />}
            {on(s.testimonials) && <LandingTestimonials testimonials={s.testimonials ?? {}} />}
            {on(s.results) && <LandingResults results={s.results ?? {}} />}
            {on(s.gallery) && <LandingGallery gallery={s.gallery ?? {}} />}
            {on(s.recognition) && <LandingRecognition recognition={s.recognition ?? {}} />}
            {on(s.events) && <LandingEvents events={s.events ?? {}} />}
            {on(s.faq) && <LandingFaq faq={s.faq ?? {}} />}
            {on(s.contact) && <LandingContact contact={s.contact ?? {}} />}

            <LandingFooter footer={s.footer ?? {}} brand={s.brand ?? {}} />

            <LandingBehaviors />
        </div>
    );
}
