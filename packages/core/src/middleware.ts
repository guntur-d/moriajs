/**
 * MoriaJS Middleware System
 *
 * Provides file-based middleware via `_middleware.ts` files and
 * a `defineMiddleware` helper for type-safe middleware definition.
 *
 * Middleware files are scoped to sibling and child routes:
 *   src/routes/_middleware.ts         → applies to ALL routes
 *   src/routes/api/_middleware.ts     → applies to /api/* routes
 *   src/routes/pages/_middleware.ts   → applies to page routes
 *
 * Middleware functions run as Fastify preHandler hooks in order:
 *   root → parent → child (outermost first)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { glob } from 'glob';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ViteDevServer } from 'vite';

/**
 * A MoriaJS middleware function.
 *
 * Continue to the next middleware/handler by returning nothing.
 * Short-circuit by calling `reply.send()` / `reply.redirect()` /
 * throwing, or by returning a value (sent as the reply payload).
 */
export type MoriaMiddleware = (
    request: FastifyRequest,
    reply: FastifyReply
) => unknown | Promise<unknown>;

/**
 * A resolved middleware entry from a `_middleware.ts` file.
 */
export interface MiddlewareEntry {
    /** Directory path relative to routes dir (e.g., '', 'api', 'api/admin') */
    scope: string;
    /** Ordered array of middleware functions */
    handlers: MoriaMiddleware[];
}

/**
 * Define a type-safe middleware function.
 *
 * @example
 * ```ts
 * import { defineMiddleware } from '@moriajs/core';
 *
 * export default defineMiddleware(async (request, reply) => {
 *     request.log.info('request received');
 * });
 * ```
 */
export function defineMiddleware(fn: MoriaMiddleware): MoriaMiddleware {
    return fn;
}

/**
 * Load a middleware/route module consistently in dev and prod.
 * Uses Vite SSR loading in development (handles TS + HMR transforms),
 * plain ESM import otherwise. Single owner for module loading so
 * routes and middleware never diverge.
 */
export async function loadRouteModule(
    absolutePath: string,
    vite?: ViteDevServer
): Promise<Record<string, unknown>> {
    if (vite) {
        return (await vite.ssrLoadModule(absolutePath)) as Record<string, unknown>;
    }
    return (await import(pathToFileURL(absolutePath).href)) as Record<string, unknown>;
}

/**
 * Normalize a middleware scope the same way route URLs are normalized:
 * strip a leading `pages/` segment (page routes are root-relative).
 */
export function normalizeScope(scope: string): string {
    if (scope === '') return '';
    if (scope === 'pages') return '';
    if (scope.startsWith('pages/')) return scope.slice('pages/'.length);
    return scope;
}

/**
 * Scan a routes directory for `_middleware.ts` files and return
 * resolved middleware entries, sorted from root → deepest.
 */
export async function scanMiddleware(routesDir: string, vite?: ViteDevServer): Promise<MiddlewareEntry[]> {
    const pattern = '**/_middleware.{ts,js,mts,mjs}';
    const files = await glob(pattern, {
        cwd: routesDir,
        posix: true,
    });

    const entries: MiddlewareEntry[] = [];

    for (const file of files) {
        const dir = path.posix.dirname(file); // e.g., '.', 'api', 'pages/admin'
        const scope = dir === '.' ? '' : dir;

        const absolutePath = path.resolve(routesDir, file);

        let mod: Record<string, unknown>;
        try {
            mod = await loadRouteModule(absolutePath, vite);
        } catch (err) {
            throw new Error(`[moria] Failed to load middleware: ${file}: ${(err as Error).message}`);
        }

        // Resolve handlers from default export
        const exported = mod.default;
        let handlers: MoriaMiddleware[] = [];

        if (Array.isArray(exported)) {
            handlers = exported.filter((fn) => typeof fn === 'function') as MoriaMiddleware[];
        } else if (typeof exported === 'function') {
            handlers = [exported as MoriaMiddleware];
        }

        if (handlers.length === 0) {
            throw new Error(`[moria] Middleware file has no handlers: ${file}`);
        }

        entries.push({ scope, handlers });
    }

    // Sort by scope depth (root first, deeper scopes later)
    entries.sort((a, b) => {
        const depthA = a.scope === '' ? 0 : a.scope.split('/').length;
        const depthB = b.scope === '' ? 0 : b.scope.split('/').length;
        return depthA - depthB;
    });

    return entries;
}

/**
 * Get the ordered middleware chain for a given route file.
 *
 * Matches on normalized scope (pages-stripped) so `pages/_middleware.ts`
 * applies to page routes the same way route URLs resolve.
 * Returns middleware from outermost (root) to innermost (closest parent).
 *
 * @param routeFilePath - File path relative to routes dir (e.g., 'api/hello.ts')
 * @param entries       - Scanned middleware entries
 */
export function getMiddlewareChain(
    routeFilePath: string,
    entries: MiddlewareEntry[]
): MoriaMiddleware[] {
    const routeDir = path.posix.dirname(routeFilePath);
    const normalizedRouteDir = routeDir === '.' ? '' : normalizeScope(routeDir);
    const chain: MoriaMiddleware[] = [];

    for (const entry of entries) {
        // Root middleware (scope '') applies to everything
        if (entry.scope === '') {
            chain.push(...entry.handlers);
            continue;
        }

        const normalizedScope = normalizeScope(entry.scope);
        // A normalized empty scope (e.g. `pages/`) applies to all page routes
        if (normalizedScope === '') {
            if (routeFilePath.startsWith('pages/')) {
                chain.push(...entry.handlers);
            }
            continue;
        }

        // Check if the route is within this middleware's scope
        // (normalized so `pages/admin` middleware matches `pages/admin/*` routes
        // the same way page URLs resolve root-relative).
        if (normalizedRouteDir === normalizedScope || normalizedRouteDir.startsWith(`${normalizedScope}/`)) {
            chain.push(...entry.handlers);
        }
    }

    return chain;
}
