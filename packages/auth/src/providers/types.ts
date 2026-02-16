/**
 * OAuth Provider Types
 *
 * Shared types for all OAuth providers in MoriaJS.
 */

import type { AuthUser } from '../index.js';

/**
 * Configuration for an OAuth provider.
 */
export interface OAuthProviderConfig {
    /** OAuth2 client ID */
    clientId: string;
    /** OAuth2 client secret */
    clientSecret: string;
    /** Callback URL path (e.g., '/auth/google/callback') */
    callbackUrl?: string;
    /** OAuth2 scopes to request */
    scopes?: string[];
    /** URL to redirect to after successful auth (default: '/') */
    successRedirect?: string;
    /** URL to redirect to after failed auth (default: '/') */
    failureRedirect?: string;
}

/**
 * An OAuth provider registers redirect + callback routes
 * and maps external profiles to MoriaJS AuthUser.
 */
export interface OAuthProvider {
    /** Provider name (e.g., 'google', 'github') */
    name: string;
    /** Build the authorization redirect URL */
    getAuthUrl(state: string): string;
    /** Exchange auth code for access token */
    exchangeCode(code: string, callbackUrl: string): Promise<string>;
    /** Fetch user profile using access token */
    fetchProfile(accessToken: string): Promise<AuthUser>;
    /** The configured callback URL path */
    callbackPath: string;
    /** Redirect paths */
    successRedirect: string;
    failureRedirect: string;
}
