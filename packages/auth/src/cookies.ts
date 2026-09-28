/**
 * Shared auth cookie helpers — single owner for cookie option construction.
 */

import type { AuthConfig } from './plugin.js';

export interface CookieOptions {
    httpOnly: boolean;
    path: string;
    sameSite: 'strict' | 'lax' | 'none';
    secure: boolean;
    maxAge?: number;
}

export function isSecureCookies(config: Pick<AuthConfig, 'secureCookies'>): boolean {
    return config.secureCookies ?? process.env.NODE_ENV === 'production';
}

export function authCookieName(config: Pick<AuthConfig, 'cookieName'>): string {
    return config.cookieName ?? 'moria_token';
}

export function authCookieOptions(config: AuthConfig): CookieOptions {
    return {
        httpOnly: true,
        path: config.cookiePath ?? '/',
        sameSite: (config.sameSite ?? 'lax') as CookieOptions['sameSite'],
        secure: isSecureCookies(config),
    };
}

export function oauthStateCookieOptions(config: AuthConfig): CookieOptions {
    return {
        httpOnly: true,
        path: '/',
        maxAge: 600,
        sameSite: 'strict',
        secure: isSecureCookies(config),
    };
}
