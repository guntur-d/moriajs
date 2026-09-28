/**
 * @moriajs/auth - JWT plugin (registration + signIn/signOut decorators).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { OAuthProvider } from './providers/types.js';

// Import @fastify/cookie types so FastifyReply.setCookie/clearCookie are visible
import '@fastify/cookie';
import { authCookieName, authCookieOptions } from './cookies.js';
import { registerOAuthRoutes } from './oauth-routes.js';

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
    /** OAuth providers (Google, GitHub, etc.) */
    providers?: OAuthProvider[];
    /** Default redirect after successful OAuth (default: '/') */
    successRedirect?: string;
    /** Default redirect after failed OAuth (default: '/') */
    failureRedirect?: string;
    /**
     * Public base URL of the app (e.g. 'https://example.com'). When set, OAuth
     * callback URLs are built from this value instead of the incoming Host
     * header, preventing Host-header poisoning of the OAuth redirect_uri.
     */
    appUrl?: string;
}

/**
 * Auth provider interface for pluggable authentication strategies.
 */
export interface AuthProvider {
    /** Provider name (e.g., 'jwt', 'session', 'oauth-google') */
    name: string;
    /** Verify a request and return the authenticated user, or null */
    verify: (request: import('fastify').FastifyRequest) => Promise<AuthUser | null>;
    /** Create a token/session for a user */
    sign: (user: AuthUser, reply: FastifyReply) => Promise<string>;
    /** Invalidate a token/session */
    revoke?: (request: import('fastify').FastifyRequest, reply: FastifyReply) => Promise<void>;
}

/**
 * Create the JWT auth plugin for MoriaJS.
 *
 * @example
 * ```ts
 * import { createApp } from '@moriajs/core';
 * import { createAuthPlugin, googleProvider, githubProvider } from '@moriajs/auth';
 *
 * const app = await createApp();
 * await app.use(createAuthPlugin({
 *   secret: process.env.JWT_SECRET!,
 *   expiresIn: '24h',
 *   providers: [
 *     googleProvider({
 *       clientId: process.env.GOOGLE_CLIENT_ID!,
 *       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *     }),
 *     githubProvider({
 *       clientId: process.env.GITHUB_CLIENT_ID!,
 *       clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *     }),
 *   ],
 * }));
 * ```
 */
export function createAuthPlugin(config: AuthConfig) {
    return {
        name: '@moriajs/auth',
        async register({ server }: { server: FastifyInstance }) {
            const jwt = await import('@fastify/jwt');

            await server.register(jwt.default, {
                secret: config.secret,
                cookie: {
                    cookieName: authCookieName(config),
                    signed: false,
                },
            });

            // Auth utility: sign JWT and set cookie
            if (!server.hasDecorator('signIn')) {
                server.decorate('signIn', async (user: AuthUser, reply: FastifyReply) => {
                    const token = server.jwt.sign(
                        { ...user },
                        { expiresIn: config.expiresIn ?? '7d' }
                    );

                    reply.setCookie(authCookieName(config), token, authCookieOptions(config));

                    return token;
                });
            }

            // Auth utility: sign out (clear cookie)
            if (!server.hasDecorator('signOut')) {
                server.decorate('signOut', async (_request: FastifyRequest, reply: FastifyReply) => {
                    reply.clearCookie(authCookieName(config), authCookieOptions(config));
                });
            }

            // ─── Register OAuth providers ────────────────────
            if (config.providers && config.providers.length > 0) {
                registerOAuthRoutes(server, config);
            }

            server.log.info('@moriajs/auth: JWT auth plugin registered');

            if (config.providers?.length) {
                const names = config.providers.map((p) => p.name).join(', ');
                server.log.info(`@moriajs/auth: OAuth providers registered: ${names}`);
            }
        },
    };
}

// ─── Fastify Type Augmentation ──────────────────────────
declare module 'fastify' {
    interface FastifyInstance {
        signIn(user: AuthUser, reply: FastifyReply): Promise<string>;
        signOut(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    }
}
