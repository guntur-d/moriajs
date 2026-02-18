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
