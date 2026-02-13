/**
 * @moriajs/auth
 *
 * Pluggable authentication system for MoriaJS.
 * Default: JWT + httpOnly cookies.
 * Architecture: Provider-based for future OAuth, sessions, etc.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * User payload stored in JWT token.
 * Extend this via TypeScript module augmentation in your app.
 */
export interface AuthUser {
    id: string | number;
    email?: string;
    role?: string;
    [key: string]: unknown;
}

/**
 * Configuration for the auth plugin.
 */
export interface AuthConfig {
    /** JWT secret key (required) */
    secret: string;
    /** Token expiration (default: '7d') */
    expiresIn?: string;
    /** Cookie name for JWT storage (default: 'moria_token') */
    cookieName?: string;
    /** Use secure cookies (default: true in production) */
    secureCookies?: boolean;
    /** Cookie path (default: '/') */
    cookiePath?: string;
    /** SameSite cookie attribute (default: 'lax') */
    sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Auth provider interface for pluggable authentication strategies.
 */
export interface AuthProvider {
    /** Provider name (e.g., 'jwt', 'session', 'oauth-google') */
    name: string;
    /** Verify a request and return the authenticated user, or null */
    verify: (request: FastifyRequest) => Promise<AuthUser | null>;
    /** Create a token/session for a user */
    sign: (user: AuthUser, reply: FastifyReply) => Promise<string>;
    /** Invalidate a token/session */
    revoke?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

/**
 * Create the JWT auth plugin for MoriaJS.
 *
 * @example
 * ```ts
 * import { createApp } from '@moriajs/core';
 * import { createAuthPlugin } from '@moriajs/auth';
 *
 * const app = await createApp();
 * await app.use(createAuthPlugin({
 *   secret: process.env.JWT_SECRET!,
 *   expiresIn: '24h',
 * }));
 * ```
 */
export function createAuthPlugin(config: AuthConfig) {
    return {
        name: '@moriajs/auth',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async register({ server }: { server: any }) {
            const jwt = await import('@fastify/jwt');

            await (server as FastifyInstance).register(jwt.default, {
                secret: config.secret,
                cookie: {
                    cookieName: config.cookieName ?? 'moria_token',
                    signed: false,
                },
            });

            // Auth utility: sign JWT and set cookie
            server.decorate('signIn', async (user: AuthUser, reply: FastifyReply) => {
                const token = server.jwt.sign(
                    { ...user },
                    { expiresIn: config.expiresIn ?? '7d' }
                );

                reply.header('Set-Cookie',
                    `${config.cookieName ?? 'moria_token'}=${token}; HttpOnly; Path=${config.cookiePath ?? '/'}; SameSite=${config.sameSite ?? 'Lax'}${(config.secureCookies ?? process.env.NODE_ENV === 'production') ? '; Secure' : ''
                    }`
                );

                return token;
            });

            // Auth utility: sign out (clear cookie)
            server.decorate('signOut', async (_request: FastifyRequest, reply: FastifyReply) => {
                reply.header('Set-Cookie',
                    `${config.cookieName ?? 'moria_token'}=; HttpOnly; Path=${config.cookiePath ?? '/'}; Max-Age=0`
                );
            });

            (server as FastifyInstance).log.info('@moriajs/auth: JWT auth plugin registered');
        },
    };
}

/**
 * Route-level authentication guard.
 * Use as a Fastify preHandler hook.
 *
 * @example
 * ```ts
 * server.get('/protected', { preHandler: [requireAuth()] }, async (req) => {
 *   return { user: req.user };
 * });
 * ```
 */
export function requireAuth(options?: { role?: string }) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (request as any).jwtVerify();

            if (options?.role) {
                const user = request.user as AuthUser;
                if (user.role !== options.role) {
                    return reply.status(403).send({ error: 'Forbidden' });
                }
            }
        } catch {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    };
}
