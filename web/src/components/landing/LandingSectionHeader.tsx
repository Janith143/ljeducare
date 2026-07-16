import type { LandingSection } from '@ljeducare/shared';

/** The shared `<h2> + lead` block every content section opens with. */
export default function LandingSectionHeader({
    section,
    children,
}: {
    section: LandingSection;
    children?: React.ReactNode;
}) {
    return (
        <div className="section-header fade-up">
            {section.title && <h2>{section.title}</h2>}
            {section.subtitle && <p>{section.subtitle}</p>}
            {children}
        </div>
    );
}
