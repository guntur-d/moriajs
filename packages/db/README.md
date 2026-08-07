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

const users = await db.find('users', { active: true });
```

### Document (Pongo / MongoDB)

```ts
import { createDatabase } from '@moriajs/db';

// Pongo (Document API on Postgres)
const db = await createDatabase({
  adapter: 'pg',
  url: process.env.DATABASE_URL,
  usePongo: true,
});

// MongoDB
const db = await createDatabase({
  adapter: 'mongo',
  url: 'mongodb://localhost:27017',
  dbName: 'my_database',
});
```

## Agnostic CRUD API

All adapters expose the same methods:

```ts
db.find('users', { active: true });
db.findOne('users', { id: '123' });
db.insertOne('users', { name: 'Alice', email: 'alice@example.com' });
db.updateOne('users', { id: '123' }, { name: 'Alice Updated' });
db.deleteOne('users', { id: '123' });
db.raw<Kysely<any>>(); // Access underlying driver
```

## Filter Key Validation (Security)

The Kysely adapter validates filter keys (column names) against a strict regex: `/^[a-zA-Z_][a-zA-Z0-9_.]*$/`. This prevents SQL injection through column-name manipulation in user-supplied filters (v0.4.40+).

```ts
// Safe - standard column names
await db.find('users', { name: 'Alice', active: true });

// Throws - invalid column name
await db.find('users', { '1=1; DROP TABLE users': true });
// Error: @moriajs/db: Invalid column name: "1=1; DROP TABLE users"
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `adapter` | `'pg' \| 'sqlite' \| 'mysql' \| 'mongo'` | Yes | Database adapter |
| `url` | `string` | For pg/mysql/mongo | Connection URL |
| `filename` | `string` | For sqlite | SQLite file path |
| `usePongo` | `boolean` | No | Use Pongo (Document API) instead of Kysely for Postgres |
| `pool` | `{ min?: number, max?: number }` | No | Connection pool size (Kysely) |
| `dbName` | `string` | For mongo | Database name (MongoDB) |
| `autoRegister` | `boolean` | No | Auto-register when configured in `moria.config.ts` (default: `true`) |

**Auto-registration**: If `config.database` is provided but `@moriajs/db` is not installed, `createApp()` throws an error instead of silently continuing (v0.4.40+).
