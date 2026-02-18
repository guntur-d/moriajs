/**
 * @moriajs/auth
 *
 * Pluggable authentication system for MoriaJS.
 * Default: JWT + httpOnly cookies.
 * Providers: Google OAuth, GitHub OAuth (built-in).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { OAuthProvider } from './providers/types.js';
import crypto from 'node:crypto';

// ─── Re-exports ──────────────────────────────────────
export { googleProvider } from './providers/google.js';
export { githubProvider } from './providers/github.js';
export type { OAuthProviderConfig, OAuthProvider } from './providers/types.js';

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

            // ─── Register OAuth providers ────────────────────
            if (config.providers && config.providers.length > 0) {
                registerOAuthRoutes(server as FastifyInstance, config);
            }

            (server as FastifyInstance).log.info('@moriajs/auth: JWT auth plugin registered');

            if (config.providers?.length) {
                const names = config.providers.map((p) => p.name).join(', ');
                (server as FastifyInstance).log.info(`@moriajs/auth: OAuth providers registered: ${names}`);
            }
        },
    };
}

/**
 * Register OAuth redirect + callback routes for each provider.
 */
function registerOAuthRoutes(server: FastifyInstance, config: AuthConfig) {
    for (const provider of config.providers ?? []) {
        const authPath = `/auth/${provider.name}`;
        const callbackPath = provider.callbackPath;

        // GET /auth/:provider → Redirect to OAuth consent screen
        server.get(authPath, async (request, reply) => {
            const state = crypto.randomBytes(16).toString('hex');

            // Store state in a short-lived cookie for CSRF protection
            reply.header('Set-Cookie',
                `moria_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`
            );

            // Build the full callback URL from the request
            const protocol = request.protocol ?? 'http';
            const host = request.hostname;
            const fullCallbackUrl = `${protocol}://${host}${callbackPath}`;

            // Get auth URL and inject the full callback URL
            let authUrl = provider.getAuthUrl(state);
            authUrl = authUrl.replace('redirect_uri=', `redirect_uri=${encodeURIComponent(fullCallbackUrl)}`);

            return reply.redirect(authUrl);
        });

        // GET /auth/:provider/callback → Exchange code, issue JWT
        server.get(callbackPath, async (request, reply) => {
            const query = request.query as { code?: string; state?: string; error?: string };
            const failureUrl = provider.failureRedirect ?? config.failureRedirect ?? '/';
            const successUrl = provider.successRedirect ?? config.successRedirect ?? '/';

            // Check for OAuth errors
            if (query.error || !query.code) {
                request.log.warn(`OAuth ${provider.name} error: ${query.error ?? 'no code'}`);
                return reply.redirect(failureUrl);
            }

            // Validate state (CSRF protection)
            const cookieHeader = request.headers.cookie ?? '';
            const stateCookie = cookieHeader
                .split(';')
                .map((c) => c.trim())
                .find((c) => c.startsWith('moria_oauth_state='));
            const savedState = stateCookie?.split('=')[1];

            if (!savedState || savedState !== query.state) {
                request.log.warn(`OAuth ${provider.name}: state mismatch`);
                return reply.redirect(failureUrl);
            }

            // Clear state cookie
            reply.header('Set-Cookie',
                'moria_oauth_state=; HttpOnly; Path=/; Max-Age=0'
            );

            try {
                // Build full callback URL
                const protocol = request.protocol ?? 'http';
                const host = request.hostname;
                const fullCallbackUrl = `${protocol}://${host}${callbackPath}`;

                // Exchange code for access token
                const accessToken = await provider.exchangeCode(query.code, fullCallbackUrl);

                // Fetch user profile
                const user = await provider.fetchProfile(accessToken);

                // Sign JWT and set cookie
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (server as any).signIn(user, reply);

                return reply.redirect(successUrl);
            } catch (err) {
                request.log.error(err, `OAuth ${provider.name} callback failed`);
                return reply.redirect(failureUrl);
            }
        });
    }
}

/**
 * Internal auth verification logic.
 */
async function performAuth(request: FastifyRequest, reply: FastifyReply, options?: { role?: string }) {
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
export function requireAuth(arg1?: any, arg2?: any): any {
    // If called with (request, reply), it's a direct call
    if (arg1 && typeof arg1 === 'object' && 'raw' in arg1) {
        return performAuth(arg1, arg2);
    }

    // Otherwise, it's a factory call: requireAuth(options)
    return async (request: FastifyRequest, reply: FastifyReply) => {
        return performAuth(request, reply, arg1);
    };
}
