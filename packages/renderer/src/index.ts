/**
 * @moriajs/renderer
 *
 * Hybrid SSR/CSR rendering engine for Mithril.js.
 * Provides server-side rendering with mithril-node-render
 * and client-side hydration.
 */

import m from 'mithril';
import render from 'mithril-node-render';

/**
 * HTML-escape a string for safe interpolation into an HTML context.
 */
export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Serialize a value into a JS literal that is safe to inline inside a
 * `<script>` element. Breaks out of the script context via `</script>`,
 * `<!--`, or `-->` and escapes U+2028/U+2029 which can terminate the script.
 */
export function jsonForScript(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

interface SsrPatchable {
    request: unknown;
    redraw: unknown;
}

// Number of SSR renders currently in flight on the shared `mithril` singleton.
// Mirrors of the original functions so we can restore them exactly once.
let ssrRenderCount = 0;
let ssrOriginalRequest: unknown;
let ssrOriginalRedraw: unknown;

/**
 * Enter SSR mode on the shared mithril singleton. Only patches m.request /
 * m.redraw on the first concurrent render and records the originals.
 */
function beginSsr(target: SsrPatchable): void {
    if (ssrRenderCount === 0) {
        ssrOriginalRequest = target.request;
        ssrOriginalRedraw = target.redraw;
        target.request = () => Promise.resolve();
        target.redraw = () => { };
    }
    ssrRenderCount++;
}

/**
 * Leave SSR mode. Restores the original m.request / m.redraw once the last
 * concurrent render completes.
 */
function endSsr(target: SsrPatchable): void {
    ssrRenderCount--;
    if (ssrRenderCount === 0) {
        target.request = ssrOriginalRequest;
        target.redraw = ssrOriginalRedraw;
        ssrOriginalRequest = undefined;
        ssrOriginalRedraw = undefined;
    }
}

/**
 * Options for rendering a page.
 */
export interface RenderOptions {
    /** Page title */
    title?: string;
    /** Meta tags for the page head */
    meta?: Record<string, string>;
    /** Initial data to hydrate on the client */
    initialData?: Record<string, unknown>;
    /** HTML lang attribute */
    lang?: string;
    /** Application mode — affects script injection */
    mode?: 'development' | 'production';
    /** Client entry point for dev mode (default: '/src/entry-client.ts') */
    clientEntry?: string;
    /** CSS stylesheet links to inject in the head */
    cssLinks?: string[];
    /** Pre-generated script tags to inject before </body> (canonical: from @moriajs/core getHtmlScripts) */
    scriptTags?: string;
    /** Parsed Vite manifest for resolving hashed production assets */
    manifest?: Record<string, { file: string }>;
    /** Base URL path for assets (default: '/assets/') */
    basePath?: string;
}

export type MithrilComponent = m.ComponentTypes;

/**
 * Dynamic hyperscript for route components arriving as unknown module shapes.
 * Mithril's typed overloads can't express "user-supplied component + ad-hoc
 * serverData attrs", so the dynamic boundary is isolated here in one helper
 * instead of scattering `any` through the renderer.
 */
function dynamicHyperscript(comp: unknown, attrs?: Record<string, unknown>): m.Vnode {
    const h = m as unknown as (c: unknown, a?: unknown) => m.Vnode;
    return h(comp, attrs);
}

/**
 * Build fallback script tags for direct renderToString callers.
 * Canonical server-side resolution lives in @moriajs/core `./assets.js`
 * (buildScriptTags); this mirrors its semantics for leaf-package callers
 * that don't depend on core. Prefer passing pre-generated `scriptTags`.
 */
export function fallbackScriptTags(options: Pick<RenderOptions, 'mode' | 'clientEntry' | 'manifest' | 'basePath'>): string {
    const mode = options.mode ?? 'production';
    const clientEntry = options.clientEntry ?? '/src/entry-client.ts';
    const basePath = options.basePath ?? '/assets/';
    const cleanBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

    if (mode === 'development') {
        return [
            `<script type="module" src="/@vite/client"></script>`,
            `<script type="module" src="${clientEntry}"></script>`,
        ].join('\n    ');
    }

    // Remove leading slash for manifest lookup if present
    const manifestKey = clientEntry.startsWith('/') ? clientEntry.slice(1) : clientEntry;
    let assetFile = 'entry-client.js'; // Fallback

    if (options.manifest?.[manifestKey]?.file) {
        assetFile = options.manifest[manifestKey].file;
    }

    return `<script type="module" src="${cleanBasePath}${assetFile}"></script>`;
}

/**
 * Render a Mithril component to an HTML string (server-side).
 *
 * Uses mithril-node-render to produce static HTML from Mithril vnodes.
 *
 * @example
 * ```ts
 * import { renderToString } from '@moriajs/renderer';
 * import MyPage from './pages/Home.js';
 *
 * const html = await renderToString(MyPage, {
 *   title: 'Home — My App',
 *   mode: 'development',
 *   initialData: { user: { name: 'Guntur' } },
 * });
 * ```
 */
export async function renderToString(
    component: MithrilComponent,
    options: RenderOptions = {}
): Promise<string> {
    let componentHtml: string;
    try {
        // SSR-safe patching of m.request/m.redraw. These use browser globals
        // (XMLHttpRequest, FormData) or scheduling that are unavailable on the
        // server. Because `m` is a shared singleton and renders run concurrently,
        // patch only when the first render starts and restore only when the last
        // one finishes, so interleaved renders cannot clobber each other's callbacks.
        beginSsr(m as unknown as SsrPatchable);
        componentHtml = await render(dynamicHyperscript(component, { serverData: options.initialData ?? {} }));
    } finally {
        endSsr(m as unknown as SsrPatchable);
    }

    const metaTags = options.meta
        ? Object.entries(options.meta)
            .map(([name, content]) => `<meta name="${escapeHtml(name)}" content="${escapeHtml(String(content))}">`)
            .join('\n    ')
        : '';

    const cssLinkTags = options.cssLinks
        ? options.cssLinks
            .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
            .join('\n    ')
        : '';

    const hydrationScript = options.initialData
        ? `<script>window.__MORIA_DATA__ = ${jsonForScript(options.initialData)};</script>`
        : '';

    // Dev vs production script tags (prefer pre-generated canonical tags)
    const scriptTags = options.scriptTags ?? fallbackScriptTags(options);

    return `<!DOCTYPE html>
<html lang="${escapeHtml(options.lang ?? 'en')}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${metaTags}
    ${cssLinkTags}
    <title>${escapeHtml(options.title ?? 'MoriaJS App')}</title>
  </head>
  <body>
    <div id="app">${componentHtml}</div>
    ${hydrationScript}
    ${scriptTags}
  </body>
</html>`;
}

/**
 * Hydrate a server-rendered Mithril component on the client.
 * Call this in your entry-client.ts.
 *
 * @example
 * ```ts
 * import { hydrate } from '@moriajs/renderer';
 * import App from './App.js';
 *
 * hydrate(App, document.getElementById('app')!);
 * ```
 */
export async function hydrate(
    component: MithrilComponent,
    container: Element,
    data?: Record<string, unknown>
): Promise<void> {
    // Wrap to pass data as attributes
    m.mount(container, {
        view: () => dynamicHyperscript(component, { serverData: data ?? {} })
    });
}

/**
 * Get hydration data injected by the server.
 */
export function getHydrationData<T = Record<string, unknown>>(): T | undefined {
    if (typeof window !== 'undefined') {
        return (window as unknown as { __MORIA_DATA__: T }).__MORIA_DATA__ as T | undefined;
    }
    return undefined;
}

/**
 * Normalize a glob key for page matching (strip leading ./ or /).
 */
export function normalizePageKey(key: string): string {
    return key.replace(/^\.\//, '').replace(/^\//, '');
}

/**
 * Find the glob key for a hydrated page path.
 * Exact normalized match wins; otherwise the longest suffix match wins
 * (most specific first, preventing `index` from hijacking `admin/index`).
 */
export function matchPageKey(pages: Record<string, unknown>, pagePath: string): string | undefined {
    const normalizedPage = normalizePageKey(pagePath);
    const keys = Object.keys(pages);
    const exact = keys.find((key) => normalizePageKey(key) === normalizedPage);
    if (exact) return exact;
    return keys
        .sort((a, b) => b.length - a.length)
        .find((key) => {
            const normalized = normalizePageKey(key);
            return normalized === normalizedPage || normalized.endsWith(`/${normalizedPage}`);
        });
}

/**
 * Automatically boot the MoriaJS application on the client.
 * Discovers the correct component based on hydration data and performs hydration.
 *
 * @param pages A glob import object from `import.meta.glob`
 * (values are lazy loaders resolving to modules with a default export).
 */
export async function bootstrap(pages: Record<string, () => Promise<unknown>>): Promise<void> {
    const root = document.getElementById('app');
    if (!root) {
        console.error('[MoriaJS] #app root element not found');
        return;
    }

    const data = getHydrationData<{ _moria_page?: string }>();
    const pagePath = data?._moria_page;

    if (!pagePath) {
        console.warn('[MoriaJS] No _moria_page found in hydration data');
        return;
    }

    const matchingKey = matchPageKey(pages, pagePath);

    if (matchingKey) {
        try {
            const mod = (await pages[matchingKey]()) as { default?: unknown };
            const component = mod.default as MithrilComponent | undefined;

            if (!component) {
                console.error(`[MoriaJS] Component for ${pagePath} has no default export`);
                return;
            }

            await hydrate(component, root, data);
            console.log(`[MoriaJS] Hydrated: ${pagePath} ✓`);
        } catch (err) {
            console.error(`[MoriaJS] Failed to hydrate ${pagePath}:`, err);
        }
    } else {
        console.error(`[MoriaJS] Could not find component for: ${pagePath}`);
        console.log('Available pages:', Object.keys(pages));
    }
}
