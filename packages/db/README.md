# @moriajs/db

Database abstraction layer for MoriaJS.

## Features

- **Kysely Integration**: Type-safe SQL query builder.
- **Pongo Support**: Document API for PostgreSQL (JSONB).
- **MongoDB Support**: Native MongoDB integration.
- **Multi-adapter**: Support for PostgreSQL, SQLite, and MongoDB.

## Usage

### SQL (Kysely)
```ts
import { createDatabase } from '@moriajs/db';

const db = await createDatabase({
  adapter: 'pg',
  url: process.env.DATABASE_URL
});
```

### Document (MongoDB)
```ts
import { createDatabase } from '@moriajs/db';

const db = await createDatabase({
  adapter: 'mongo',
  url: 'mongodb://localhost:27017',
  dbName: 'my_database'
});
```
