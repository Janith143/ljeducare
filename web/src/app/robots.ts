import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/student/', '/teacher/', '/admin/', '/kiosk/', '/checkout/', '/payment/', '/api/'],
        },
        sitemap: `${SITE.url}/sitemap.xml`,
    };
}
