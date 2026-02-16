/**
 * GitHub OAuth2 Provider
 *
 * Implements the Authorization Code flow for GitHub.
 * Uses Node.js built-in fetch — zero additional dependencies.
 */

import type { AuthUser } from '../index.js';
import type { OAuthProviderConfig, OAuthProvider } from './types.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_PROFILE_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

const DEFAULT_SCOPES = ['read:user', 'user:email'];

/**
 * Create a GitHub OAuth provider.
 *
 * @example
 * ```ts
 * import { createAuthPlugin, githubProvider } from '@moriajs/auth';
 *
 * await app.use(createAuthPlugin({
 *   secret: process.env.JWT_SECRET!,
 *   providers: [
 *     githubProvider({
 *       clientId: process.env.GITHUB_CLIENT_ID!,
 *       clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *     }),
 *   ],
 * }));
 * ```
 */
export function githubProvider(config: OAuthProviderConfig): OAuthProvider {
    const scopes = config.scopes ?? DEFAULT_SCOPES;
    const callbackPath = config.callbackUrl ?? '/auth/github/callback';

    return {
        name: 'github',
        callbackPath,
        successRedirect: config.successRedirect ?? '/',
        failureRedirect: config.failureRedirect ?? '/',

        getAuthUrl(state: string): string {
            const params = new URLSearchParams({
                client_id: config.clientId,
                redirect_uri: '', // Will be set at runtime with full URL
                scope: scopes.join(' '),
                state,
            });
            return `${GITHUB_AUTH_URL}?${params.toString()}`;
        },

        async exchangeCode(code: string, callbackUrl: string): Promise<string> {
            const res = await fetch(GITHUB_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    code,
                    redirect_uri: callbackUrl,
                }),
            });

            if (!res.ok) {
                const error = await res.text();
                throw new Error(`GitHub token exchange failed: ${error}`);
            }

            const data = await res.json() as { access_token: string; error?: string };
            if (data.error) {
                throw new Error(`GitHub OAuth error: ${data.error}`);
            }
            return data.access_token;
        },

        async fetchProfile(accessToken: string): Promise<AuthUser> {
            // Fetch profile
            const profileRes = await fetch(GITHUB_PROFILE_URL, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'MoriaJS',
                },
            });

            if (!profileRes.ok) {
                throw new Error('Failed to fetch GitHub profile');
            }

            const profile = await profileRes.json() as {
                id: number;
                login: string;
                name: string | null;
                email: string | null;
                avatar_url: string;
            };

            // If email is not public, fetch from /user/emails
            let email = profile.email;
            if (!email) {
                try {
                    const emailsRes = await fetch(GITHUB_EMAILS_URL, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: 'application/vnd.github+json',
                            'User-Agent': 'MoriaJS',
                        },
                    });
                    if (emailsRes.ok) {
                        const emails = await emailsRes.json() as Array<{
                            email: string;
                            primary: boolean;
                            verified: boolean;
                        }>;
                        const primary = emails.find((e) => e.primary && e.verified);
                        email = primary?.email ?? emails[0]?.email ?? null;
                    }
                } catch {
                    // Email fetch failed, continue without
                }
            }

            return {
                id: profile.id,
                email: email ?? undefined,
                name: profile.name ?? profile.login,
                avatar: profile.avatar_url,
                provider: 'github',
            };
        },
    };
}
