# @moriajs/db

Database abstraction layer for MoriaJS.

## Features

- **Kysely Integration**: Type-safe SQL query builder.
- **Pongo Support**: Document API for PostgreSQL (JSONB).
- **Multi-adapter**: Support for PostgreSQL and SQLite.

## Usage

```ts
import { createDatabase } from '@moriajs/db';

const db = await createDatabase({
  type: 'postgres',
  url: process.env.DATABASE_URL
});
```
