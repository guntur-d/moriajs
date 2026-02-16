/**
 * Google OAuth2 Provider
 *
 * Implements the Authorization Code flow for Google.
 * Uses Node.js built-in fetch — zero additional dependencies.
 */

import type { AuthUser } from '../index.js';
import type { OAuthProviderConfig, OAuthProvider } from './types.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PROFILE_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const DEFAULT_SCOPES = ['openid', 'email', 'profile'];

/**
 * Create a Google OAuth provider.
 *
 * @example
 * ```ts
 * import { createAuthPlugin, googleProvider } from '@moriajs/auth';
 *
 * await app.use(createAuthPlugin({
 *   secret: process.env.JWT_SECRET!,
 *   providers: [
 *     googleProvider({
 *       clientId: process.env.GOOGLE_CLIENT_ID!,
 *       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *     }),
 *   ],
 * }));
 * ```
 */
export function googleProvider(config: OAuthProviderConfig): OAuthProvider {
    const scopes = config.scopes ?? DEFAULT_SCOPES;
    const callbackPath = config.callbackUrl ?? '/auth/google/callback';

    return {
        name: 'google',
        callbackPath,
        successRedirect: config.successRedirect ?? '/',
        failureRedirect: config.failureRedirect ?? '/',

        getAuthUrl(state: string): string {
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: '', // Will be set at runtime with full URL
                response_type: 'code',
                scope: scopes.join(' '),
                state,
                access_type: 'offline',
                prompt: 'consent',
            });
            return `${GOOGLE_AUTH_URL}?${params.toString()}`;
        },

        async exchangeCode(code: string, callbackUrl: string): Promise<string> {
            const res = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    redirect_uri: callbackUrl,
                    grant_type: 'authorization_code',
                }).toString(),
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(`Google token exchange failed: ${error}`);
            }

            const data = await res.json() as { access_token: string };
            return data.access_token;
        },

        async fetchProfile(accessToken: string): Promise<AuthUser> {
            const res = await fetch(GOOGLE_PROFILE_URL, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) {
                throw new Error('Failed to fetch Google profile');
            }

            const profile = await res.json() as {
                id: string;
                email: string;
                name: string;
                picture?: string;
            };

            return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                avatar: profile.picture,
                provider: 'google',
            };
        },
    };
}
