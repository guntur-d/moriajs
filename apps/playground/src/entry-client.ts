/**
 * Client-side entry point for MoriaJS Playground.
 *
 * This file is loaded in the browser after the server-rendered HTML.
 * It hydrates the Mithril component tree, making the page interactive.
 */

import m from 'mithril';
import { getHydrationData, hydrate } from '@moriajs/renderer';

async function main() {
    const root = document.getElementById('app');
    if (!root) {
        console.error('[MoriaJS] #app root element not found');
        return;
    }

    const data = getHydrationData<{ _moria_page?: string }>();
    const pagePath = data?._moria_page;

    if (!pagePath) {
        console.warn('[MoriaJS] No _moria_page found in hydration data, falling back to static mount');
        return;
    }

    // Use Vite dynamic imports to find the component
    // This assumes routes are in ./routes/
    const pages = import.meta.glob('./routes/**/*.{ts,js,tsx,jsx}');
    const importFn = pages[`./routes/${pagePath}`];

    if (importFn) {
        const mod = await importFn() as any;
        const component = mod.default;

        await hydrate(component, root, data);
        console.log(`[MoriaJS] Hydrated: ${pagePath} ✓`);
    } else {
        console.error(`[MoriaJS] Could not find component for: ${pagePath}`);
        console.log('Available pages:', Object.keys(pages));
    }
}

main().catch(console.error);

