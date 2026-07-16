'use client';

import { useEffect } from 'react';

/**
 * The landing page's interaction layer, ported from the standalone site's main.js:
 * sticky navbar, mobile menu, scroll-reveal, counters, FAQ accordion, hero word
 * rotator and pointer parallax.
 *
 * Kept as DOM effects (rather than React state) so the section components stay
 * server-rendered and their markup matches the original design's CSS exactly.
 * Everything registered here is torn down on unmount — the LMS is a SPA, so
 * leaked listeners/observers/timers would outlive the page.
 */
export default function LandingBehaviors() {
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.lp');
        if (!root) return;

        const cleanups: (() => void)[] = [];
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // 1. Sticky navigation
        const navbar = root.querySelector('.navbar');
        if (navbar) {
            const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
            onScroll();
            window.addEventListener('scroll', onScroll, { passive: true });
            cleanups.push(() => window.removeEventListener('scroll', onScroll));
        }

        // 2. Mobile menu toggle
        const menuBtn = root.querySelector('.mobile-menu-btn');
        const navLinks = root.querySelector('.nav-links');
        if (menuBtn && navLinks) {
            const toggle = () => {
                navLinks.classList.toggle('active');
                menuBtn.classList.toggle('active');
            };
            menuBtn.addEventListener('click', toggle);
            cleanups.push(() => menuBtn.removeEventListener('click', toggle));

            // Tapping a link should close the menu behind it.
            const close = () => {
                navLinks.classList.remove('active');
                menuBtn.classList.remove('active');
            };
            navLinks.querySelectorAll('a').forEach((a) => {
                a.addEventListener('click', close);
                cleanups.push(() => a.removeEventListener('click', close));
            });
        }

        // 3. Scroll-reveal
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('visible');
                });
            },
            { root: null, rootMargin: '0px', threshold: 0.15 },
        );
        root.querySelectorAll('.fade-up, .fade-left, .fade-right').forEach((el) => revealObserver.observe(el));
        cleanups.push(() => revealObserver.disconnect());

        // 4. Counters — animate up to data-target once the number scrolls into view.
        const timers: ReturnType<typeof setTimeout>[] = [];
        const counterObservers: IntersectionObserver[] = [];
        root.querySelectorAll<HTMLElement>('.counter-value').forEach((counter) => {
            const target = Number(counter.getAttribute('data-target') ?? 0);
            if (!Number.isFinite(target)) return;

            if (prefersReducedMotion) {
                counter.textContent = String(target);
                return;
            }

            const step = () => {
                const current = Number(counter.textContent ?? 0);
                const inc = target / 200;
                if (current < target) {
                    counter.textContent = String(Math.ceil(current + inc));
                    timers.push(setTimeout(step, 20));
                } else {
                    counter.textContent = String(target);
                }
            };

            const io = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        step();
                        io.unobserve(counter);
                    }
                },
                { threshold: 0.5 },
            );
            io.observe(counter);
            counterObservers.push(io);
        });
        cleanups.push(() => {
            timers.forEach(clearTimeout);
            counterObservers.forEach((io) => io.disconnect());
        });

        // 5. FAQ accordion — one open at a time.
        const faqItems = Array.from(root.querySelectorAll('.faq-item'));
        faqItems.forEach((item) => {
            const header = item.querySelector('.faq-header');
            if (!header) return;
            const onClick = () => {
                const wasActive = item.classList.contains('active');
                faqItems.forEach((i) => i.classList.remove('active'));
                if (!wasActive) item.classList.add('active');
            };
            header.addEventListener('click', onClick);
            cleanups.push(() => header.removeEventListener('click', onClick));
        });

        // 6. Hero rotating word
        const rotator = root.querySelector<HTMLElement>('#rotatorWord');
        if (rotator && !prefersReducedMotion) {
            let words: string[] = [];
            try {
                words = JSON.parse(rotator.dataset.words ?? '[]');
            } catch {
                words = [];
            }
            if (words.length > 1) {
                let idx = 0;
                const interval = setInterval(() => {
                    idx = (idx + 1) % words.length;
                    rotator.style.opacity = '0';
                    rotator.style.transform = 'translateY(0.4em)';
                    const t = setTimeout(() => {
                        rotator.textContent = words[idx];
                        rotator.style.opacity = '1';
                        rotator.style.transform = 'translateY(0)';
                    }, 260);
                    timers.push(t);
                }, 2200);
                cleanups.push(() => clearInterval(interval));
            }
        }

        // 7. Hero pointer parallax (desktop, motion-safe)
        const hero = root.querySelector<HTMLElement>('.hero');
        const heroVisual = root.querySelector<HTMLElement>('.hero-visual');
        const orbs = Array.from(root.querySelectorAll<HTMLElement>('.orb'));
        if (hero && !prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
            const onMove = (e: MouseEvent) => {
                const r = hero.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                if (heroVisual) heroVisual.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
                orbs.forEach((el, i) => {
                    const d = (i + 1) * 16;
                    el.style.marginLeft = `${x * d}px`;
                    el.style.marginTop = `${y * d}px`;
                });
            };
            const onLeave = () => {
                if (heroVisual) heroVisual.style.transform = 'translate(0, 0)';
                orbs.forEach((el) => {
                    el.style.marginLeft = '0';
                    el.style.marginTop = '0';
                });
            };
            hero.addEventListener('mousemove', onMove);
            hero.addEventListener('mouseleave', onLeave);
            cleanups.push(() => {
                hero.removeEventListener('mousemove', onMove);
                hero.removeEventListener('mouseleave', onLeave);
            });
        }

        return () => cleanups.forEach((fn) => fn());
    }, []);

    return null;
}
