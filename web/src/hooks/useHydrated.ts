'use client';

import { useEffect, useState } from 'react';

/**
 * False during server render and the first client paint, true once the component
 * has mounted (hydration complete). Use it to gate interactions that only work
 * after hydration — e.g. a submit button whose onSubmit handler isn't attached yet.
 * Gating the submit button also blocks the browser's native form submission (click
 * or Enter), which would otherwise reload the page and clear the fields.
 */
export function useHydrated(): boolean {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return hydrated;
}
