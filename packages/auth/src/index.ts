/**
 * @moriajs/auth
 *
 * Pluggable authentication system for MoriaJS.
 * Default: JWT + httpOnly cookies.
 * Providers: Google OAuth, GitHub OAuth (built-in).
 */

import '@fastify/cookie';

export { createAuthPlugin } from './plugin.js';
export type { AuthUser, AuthConfig, AuthProvider } from './plugin.js';
export { AuthError, ForbiddenError, requireAuth, performAuth } from './guards.js';
export type { RequireAuthOptions } from './guards.js';
export { registerOAuthRoutes, buildCallbackUrl } from './oauth-routes.js';
export { authCookieName, authCookieOptions, oauthStateCookieOptions, isSecureCookies } from './cookies.js';
export type { CookieOptions } from './cookies.js';

// ─── Re-exports ──────────────────────────────────────
export { googleProvider } from './providers/google.js';
export { githubProvider } from './providers/github.js';
export type { OAuthProviderConfig, OAuthProvider } from './providers/types.js';
