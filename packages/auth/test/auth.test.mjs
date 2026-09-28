import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCallbackUrl } from '../dist/oauth-routes.js';
import { authCookieName, authCookieOptions, oauthStateCookieOptions } from '../dist/cookies.js';
import { requireAuth, AuthError } from '../dist/guards.js';

describe('buildCallbackUrl', () => {
    it('prefers appUrl when configured (no Host poisoning)', () => {
        const url = buildCallbackUrl(
            { secret: 's', appUrl: 'https://example.com/' },
            { protocol: 'http', hostname: 'evil.test' },
            '/auth/google/callback'
        );
        assert.equal(url, 'https://example.com/auth/google/callback');
    });
    it('falls back to request protocol + hostname', () => {
        const url = buildCallbackUrl(
            { secret: 's' },
            { protocol: 'https', hostname: 'app.test' },
            '/auth/github/callback'
        );
        assert.equal(url, 'https://app.test/auth/github/callback');
    });
});

describe('cookie helpers', () => {
    it('builds consistent auth cookie options', () => {
        const opts = authCookieOptions({ secret: 's' });
        assert.equal(opts.httpOnly, true);
        assert.equal(opts.path, '/');
        assert.equal(opts.sameSite, 'lax');
    });
    it('respects custom cookie name', () => {
        assert.equal(authCookieName({ secret: 's', cookieName: 'custom' }), 'custom');
        assert.equal(authCookieName({ secret: 's' }), 'moria_token');
    });
    it('hardens oauth state cookie', () => {
        const opts = oauthStateCookieOptions({ secret: 's' });
        assert.equal(opts.sameSite, 'strict');
        assert.equal(opts.maxAge, 600);
    });
});

describe('requireAuth', () => {
    it('factory form returns a function; direct form verifies', async () => {
        const guard = requireAuth({ role: 'admin' });
        assert.equal(typeof guard, 'function');
        // Direct call with unauthenticated mock throws AuthError
        const req = { method: 'GET', url: '/', headers: {}, jwtVerify: async () => { throw new Error('no token'); } };
        await assert.rejects(() => requireAuth(req, {}), AuthError);
    });
});
