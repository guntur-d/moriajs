/**
 * OAuth redirect + callback route registration.
 */

import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthConfig } from './plugin.js';

// Import @fastify/cookie types so FastifyReply.setCookie/clearCookie are visible
import '@fastify/cookie';
import { oauthStateCookieOptions } from './cookies.js';

/**
 * Build the callback URL for an OAuth provider.
 *
 * Uses the configured `appUrl` when available (prevents Host-header
 * poisoning); otherwise falls back to the request's protocol + hostname.
 * The redirect path itself is developer-provided via the provider config.
 */
export function buildCallbackUrl(config: AuthConfig, request: FastifyRequest, callbackPath: string): string {
    if (config.appUrl) {
        const base = config.appUrl.replace(/\/$/, '');
        return `${base}${callbackPath}`;
    }
    const protocol = request.protocol ?? 'http';
    const host = request.hostname;
    return `${protocol}://${host}${callbackPath}`;
}

/**
 * Register OAuth redirect + callback routes for each provider.
 */
export function registerOAuthRoutes(server: FastifyInstance, config: AuthConfig) {
    for (const provider of config.providers ?? []) {
        const authPath = `/auth/${provider.name}`;
        const callbackPath = provider.callbackPath;

        // GET /auth/:provider → Redirect to OAuth consent screen
        server.get(authPath, async (request, reply) => {
            const state = crypto.randomBytes(16).toString('hex');

            // Store state in a short-lived cookie for CSRF protection.
            reply.setCookie('moria_oauth_state', state, oauthStateCookieOptions(config));

            // Get auth URL and inject the full callback URL
            let authUrl = provider.getAuthUrl(state);
            const fullCallbackUrl = buildCallbackUrl(config, request, callbackPath);
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
            const savedState = (request.cookies as Record<string, string | undefined>)['moria_oauth_state'];

            if (!savedState || savedState !== query.state) {
                request.log.warn(`OAuth ${provider.name}: state mismatch`);
                return reply.redirect(failureUrl);
            }

            // Clear state cookie (match same flags used when setting)
            reply.clearCookie('moria_oauth_state', oauthStateCookieOptions(config));

            try {
                // Build full callback URL
                const fullCallbackUrl = buildCallbackUrl(config, request, callbackPath);

                // Exchange code for access token
                const accessToken = await provider.exchangeCode(query.code, fullCallbackUrl);

                // Fetch user profile
                const user = await provider.fetchProfile(accessToken);

                // Sign JWT and set cookie
                await server.signIn(user, reply);

                return reply.redirect(successUrl);
            } catch (err) {
                request.log.error(err, `OAuth ${provider.name} callback failed`);
                return reply.redirect(failureUrl);
            }
        });
    }
}
