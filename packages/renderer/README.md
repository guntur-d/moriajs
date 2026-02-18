# @moriajs/renderer

Isomorphic renderer for Mithril.js.

## Features

- **SSR**: Render Mithril components on the server.
- **Hydration**: Seamless hand-off from server to client.
- **Data Fetching**: Support for `getServerData`.

## Usage

```ts
import { render } from '@moriajs/renderer';
const html = await render(MyComponent, initialData);
```
