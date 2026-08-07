# @moriajs/auth

Authentication plugin for MoriaJS.

## Features

- **JWT-based**: Secure authentication using JSON Web Tokens.
- **OAuth Support**: Easy integration with GitHub, Google, and more.
- **Auth Hooks**: `requireAuth` guard for routes.

## Usage

```ts
import { authPlugin, requireAuth } from '@moriajs/auth';

await app.use(authPlugin({
  secret: 'your-secret'
}));

// Guard a route
server.get('/me', { preHandler: [requireAuth] }, async (req) => {
  return req.user;
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | **required** | JWT signing secret |
| `expiresIn` | `string` | `'7d'` | Token expiration (e.g., `'24h'`, `'7d'`) |
| `cookieName` | `string` | `'moria_token'` | Cookie name for JWT storage |
| `secureCookies` | `boolean` | `true` in production | Use Secure flag on cookies |
| `cookiePath` | `string` | `'/'` | Cookie path |
| `sameSite` | `'strict' \| 'lax' \| 'none'` | `'lax'` | SameSite attribute |
| `appUrl` | `string` | — | **Public base URL** (e.g., `https://example.com`). When set, OAuth callback URLs are built from this value instead of the incoming `Host` header, preventing Host-header poisoning of the OAuth `redirect_uri`. |
| `providers` | `OAuthProvider[]` | `[]` | OAuth providers (Google, GitHub) |
| `successRedirect` | `string` | `'/'` | Redirect after successful OAuth |
| `failureRedirect` | `string` | `'/'` | Redirect after failed OAuth |
| `autoRegister` | `boolean` | `true` | Auto-register plugin when configured in `moria.config.ts` |

## OAuth Providers

```ts
import { createAuthPlugin, googleProvider, githubProvider } from '@moriajs/auth';

await app.use(createAuthPlugin({
  secret: process.env.JWT_SECRET!,
  appUrl: 'https://myapp.com', // Recommended: prevents Host-header poisoning
  providers: [
    googleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    githubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
}));
```

Auto-registers:
- `GET /auth/google` → redirect to Google
- `GET /auth/google/callback` → handle callback, set JWT cookie
- `GET /auth/github` → redirect to GitHub
- `GET /auth/github/callback` → handle callback, set JWT cookie

## `requireAuth` Guard

```ts
import { requireAuth } from '@moriajs/auth';

// Basic authentication required
app.server.get('/api/profile',
  { preHandler: [requireAuth()] },
  async (request) => { return { user: request.user }; }
);

// Role-based protection
app.server.delete('/api/users/:id',
  { preHandler: [requireAuth({ role: 'admin' })] },
  async (request) => { /* only admins */ }
);
```

The `requireAuth` guard now uses a robust duck-type check (`method` + `url` + `headers`) to distinguish direct calls from factory calls, preventing auth bypass edge cases.

## Security Notes

- **Cookie management** uses `@fastify/cookie`'s `setCookie`/`clearCookie` — proper URL-encoding, flag matching, and SameSite handling (v0.4.40+)
- **OAuth state** cookies are set with `SameSite=Strict`, `HttpOnly`, and `Secure` (in production) for CSRF protection
- **Host-header poisoning** prevention: set `appUrl` in config to use a trusted base URL for OAuth redirects instead of the incoming `Host` header
- **Auto-registration**: If `config.auth` is provided but `@moriajs/auth` is not installed, `createApp()` throws an error instead of silently continuing (v0.4.40+)
