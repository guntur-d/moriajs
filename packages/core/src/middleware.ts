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

/**
 * A MoriaJS middleware function.
 *
 * - Return nothing to continue to the next middleware / handler
 * - Call `reply.send()` or return a value to short-circuit
 */
export type MoriaMiddleware = (
    request: FastifyRequest,
    reply: FastifyReply
) => void | Promise<void>;

/**
 * A resolved middleware entry from a `_middleware.ts` file.
 */
export interface MiddlewareEntry {
    /** Directory path relative to routes dir (e.g., '', 'api', 'api/admin') */
    scope: string;
    /** URL prefix this middleware applies to */
    urlPrefix: string;
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
 * Scan a routes directory for `_middleware.ts` files and return
 * resolved middleware entries, sorted from root → deepest.
 */
export async function scanMiddleware(routesDir: string): Promise<MiddlewareEntry[]> {
    const pattern = '**/_middleware.{ts,js,mts,mjs}';
    const files = await glob(pattern, {
        cwd: routesDir,
        posix: true,
    });

    const entries: MiddlewareEntry[] = [];

    for (const file of files) {
        const dir = path.posix.dirname(file); // e.g., '.', 'api', 'pages/admin'
        const scope = dir === '.' ? '' : dir;

        // Build URL prefix from scope
        let urlPrefix = '/';
        if (scope) {
            // pages/ prefix is stripped in route URLs
            let adjustedScope = scope;
            if (adjustedScope.startsWith('pages')) {
                adjustedScope = adjustedScope.slice(5); // remove 'pages'
            }
            if (adjustedScope && !adjustedScope.startsWith('/')) {
                adjustedScope = '/' + adjustedScope;
            }
            urlPrefix = adjustedScope || '/';
        }

        const absolutePath = path.resolve(routesDir, file);
        const fileUrl = pathToFileURL(absolutePath).href;

        let mod: Record<string, unknown>;
        try {
            mod = await import(fileUrl);
        } catch (err) {
            console.warn(`[moria] Failed to load middleware: ${file}`, err);
            continue;
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
            console.warn(`[moria] Middleware file has no handlers: ${file}`);
            continue;
        }

        entries.push({ scope, urlPrefix, handlers });
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
 * Get the ordered middleware chain for a given route URL path.
 *
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
    const chain: MoriaMiddleware[] = [];

    for (const entry of entries) {
        // Root middleware (scope '') applies to everything
        if (entry.scope === '') {
            chain.push(...entry.handlers);
            continue;
        }

        // Check if the route file is within this middleware's scope
        if (routeDir === entry.scope || routeDir.startsWith(entry.scope + '/')) {
            chain.push(...entry.handlers);
        }
    }

    return chain;
}
