/**
 * Canonical asset-path resolution for MoriaJS (single owner).
 *
 * Owns: client-entry defaults, manifest location, asset prefix,
 * manifest loading, and script-tag generation. Reuse everywhere
 * instead of re-implementing entry/manifest/outDir logic.
 *
 * NOTE (F16 decision): core owns server-side resolution (fs access +
 * script-tag generation). @moriajs/renderer owns the HTML shell and
 * accepts pre-generated `scriptTags` (which registerRoutes supplies
 * from here) or explicit `manifest` for direct callers. The renderer's
 * small fallback template mirrors `buildScriptTags` semantics and is
 * covered by the same unit tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MoriaConfig } from './config.js';

export const ASSET_PREFIX = '/assets/';
export const CLIENT_OUTDIR = 'dist/client';
export const MANIFEST_REL_PATH = 'dist/client/.vite/manifest.json';
export const DEFAULT_CLIENT_ENTRY = '/src/entry-client.ts';
export const FALLBACK_BUNDLE = 'entry-client.js';

export interface ResolvedClientEntry {
    /** URL path with leading slash, e.g. `/src/entry-client.ts` */
    urlPath: string;
    /** Manifest key without leading slash, e.g. `src/entry-client.ts` */
    manifestKey: string;
    /** FS-relative input for Vite build, e.g. `src/entry-client.ts` */
    fsInput: string;
}

/**
 * Resolve the client entry to URL/manifest/fs forms.
 * If no explicit entry is configured, prefers `.ts` when it exists,
 * falling back to `.js` (checked once against rootDir).
 */
export function resolveClientEntry(configured: string | undefined, rootDir: string): ResolvedClientEntry {
    let entry = configured ?? DEFAULT_CLIENT_ENTRY;
    if (!entry.startsWith('/')) entry = `/${entry}`;

    if (!configured) {
        const tsPath = path.join(rootDir, 'src', 'entry-client.ts');
        if (!fs.existsSync(tsPath)) {
            const jsPath = path.join(rootDir, 'src', 'entry-client.js');
            if (fs.existsSync(jsPath)) {
                entry = '/src/entry-client.js';
            }
        }
    }

    return {
        urlPath: entry,
        manifestKey: entry.startsWith('/') ? entry.slice(1) : entry,
        fsInput: entry.startsWith('/') ? entry.slice(1) : entry,
    };
}

export function manifestAbsolutePath(rootDir: string): string {
    return path.resolve(rootDir, MANIFEST_REL_PATH);
}

/**
 * Load and parse the Vite manifest. Returns null when missing/unparsable
 * (caller falls back to the default bundle — never throws for a missing build).
 */
export function loadManifest(rootDir: string): Record<string, { file: string }> | null {
    const fullPath = manifestAbsolutePath(rootDir);
    if (!fs.existsSync(fullPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Record<string, { file: string }>;
    } catch {
        return null;
    }
}

export function cleanBasePath(basePath: string): string {
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

/**
 * Build script tags for dev or production. Pure (except manifest load)
 * and unit-testable — the single canonical implementation.
 */
export function buildScriptTags(
    mode: 'development' | 'production',
    config: Partial<MoriaConfig> = {}
): string {
    const rootDir = config.rootDir ?? process.cwd();
    const resolved = resolveClientEntry(config.vite?.clientEntry, rootDir);

    if (mode === 'development') {
        return [
            `<script type="module" src="/@vite/client"></script>`,
            `<script type="module" src="${resolved.urlPath}"></script>`,
        ].join('\n    ');
    }

    const manifest = loadManifest(rootDir);
    const entry = manifest?.[resolved.manifestKey];
    if (entry?.file) {
        return `<script type="module" src="${ASSET_PREFIX}${entry.file}"></script>`;
    }
    return `<script type="module" src="${ASSET_PREFIX}${FALLBACK_BUNDLE}"></script>`;
}

/**
 * Resolve the Vite build input (fs-absolute path) for the CLI build command.
 */
export function resolveBuildInput(rootDir: string, configured: string | undefined): string {
    const resolved = resolveClientEntry(configured, rootDir);
    return path.resolve(rootDir, resolved.fsInput);
}
