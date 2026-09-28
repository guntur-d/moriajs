/**
 * Route-level authentication guards + auth errors.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from './plugin.js';

/**
 * Error thrown when authentication fails.
 */
export class AuthError extends Error {
    constructor(message: string = 'Unauthorized') {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Error thrown when authorization fails (insufficient permissions).
 */
export class ForbiddenError extends Error {
    constructor(message: string = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

/**
 * Auth guard options.
 */
export interface RequireAuthOptions {
    /** Required role for the authenticated user (if any) */
    role?: string;
}

/**
 * Internal auth verification logic.
 */
export async function performAuth(request: FastifyRequest, _reply: FastifyReply, options?: { role?: string }) {
    try {
        await request.jwtVerify();

        if (options?.role) {
            const user = request.user as AuthUser;
            if (user.role !== options.role) {
                throw new ForbiddenError();
            }
        }
    } catch (err) {
        if (err instanceof ForbiddenError) {
            throw err;
        }
        throw new AuthError();
    }
}

function isFastifyRequest(value: unknown): value is FastifyRequest {
    return (
        !!value &&
        typeof value === 'object' &&
        'method' in value &&
        'url' in value &&
        'headers' in value
    );
}

/**
 * Route-level authentication guard.
 * Use as a Fastify preHandler hook.
 *
 * Supports both direct and factory calls:
 * - `preHandler: [requireAuth]`
 * - `preHandler: [requireAuth({ role: 'admin' })]`
 *
 * @example
 * ```ts
 * server.get('/protected', { preHandler: [requireAuth] }, async (req) => {
 *   return { user: req.user };
 * });
 * ```
 */
export function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export function requireAuth(options?: RequireAuthOptions): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export function requireAuth(arg1?: FastifyRequest | RequireAuthOptions, arg2?: FastifyReply): unknown {
    // Direct call: requireAuth(request, reply)
    if (isFastifyRequest(arg1)) {
        return performAuth(arg1, arg2 as FastifyReply);
    }

    // Factory call: requireAuth(options?)
    return async (request: FastifyRequest, reply: FastifyReply) => {
        return performAuth(request, reply, arg1 as RequireAuthOptions | undefined);
    };
}
