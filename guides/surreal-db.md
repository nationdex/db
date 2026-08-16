# Using SurrealDB with ForgeDB

This guide covers how to configure ForgeDB to use [SurrealDB](https://surrealdb.com) as the database backend. SurrealDB is a multi-model database built in Rust that combines document, graph, time-series, relational, and key-value data models into a single engine with a SQL-like query language called SurrealQL.

## Table of Contents

1. [Why SurrealDB?](#why-surrealdb)
2. [Installation](#installation)
3. [Embedded Mode (No Server Required)](#embedded-mode-no-server-required)
4. [Remote Server Mode](#remote-server-mode)
5. [Configuration Options](#configuration-options)
6. [Migrating from SQLite / Better-SQLite3](#migrating-from-sqlite--better-sqlite3)
7. [How It Works Under the Hood](#how-it-works-under-the-hood)
8. [Frequently Asked Questions](#frequently-asked-questions)

---

## Why SurrealDB?

SurrealDB offers several advantages for ForgeScript bot developers:

- **Embedded or remote**: Run it in-process (like better-sqlite3) or connect to a remote server/cloud.
- **Multi-model**: Document, graph, and relational data in one database.
- **Schemaless**: Start without a schema; add strictness later if desired.
- **Performance**: Rust-powered with native ACID transactions.
- **SurrealQL**: Familiar SQL-like syntax for advanced queries via `$dbPing` raw query.

---

## Installation

SurrealDB support is **optional** — the `surrealdb` and `@surrealdb/node` packages are listed as `optionalDependencies` in ForgeDB's `package.json`. This means users who use SQLite, MySQL, PostgreSQL, or MongoDB do not need to install them.

To use SurrealDB, install the SDK packages alongside ForgeDB:

### Embedded Mode (in-process, no server)

```bash
npm install @tryforge/forge.db surrealdb @surrealdb/node
```

The `@surrealdb/node` package provides native embedded engines (SurrealKV, RocksDB, in-memory). It ships prebuilt binaries for Windows (x64), Linux (x64/arm64), and macOS (x64/arm64).

### Remote Server Mode (connect to a SurrealDB server)

```bash
npm install @tryforge/forge.db surrealdb
```

You only need the `surrealdb` package for remote connections. The `@surrealdb/node` package is not required for remote mode.

---

## Embedded Mode (No Server Required)

Embedded mode is the closest equivalent to using `better-sqlite3` — the database runs inside your bot's process with no external server needed. Data is persisted to disk using either SurrealKV (default) or RocksDB.

### Basic Embedded Setup

```typescript
import { ForgeDB, ForgeClient } from "@tryforge/forge.db"
import { Client, GatewayIntentBits } from "discord.js"

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
})

client.extensions.load(
    new ForgeDB({
        type: "surrealdb",
        // No `url` option = embedded mode
        folder: "./database",           // where to store the database file
        engine: "surrealkv",            // "surrealkv" (default) | "rocksdb" | "mem"
        namespace: "forge",             // SurrealDB namespace (default: "forge")
        database: "forge.db",           // SurrealDB database (default: "forge.db")
    }),
)
```

### Engine Options

| Engine | Description | Data Persistence |
| - | - | - |
| `surrealkv` | SurrealDB's native key-value store (default, recommended) | Yes — survives restarts |
| `rocksdb` | RocksDB-backed storage | Yes — survives restarts |
| `mem` | In-memory only | No — data is lost on process exit |

### In-Memory Mode (Testing)

For development or testing where you don't need persistence:

```typescript
new ForgeDB({
    type: "surrealdb",
    engine: "mem",
})
```

---

## Remote Server Mode

Connect to a running SurrealDB server (self-hosted or [SurrealDB Cloud](https://surrealdb.com/cloud)).

### Connecting to a Local SurrealDB Server

Start a SurrealDB server:

```bash
surreal start --user root --pass root
```

Then configure ForgeDB:

```typescript
new ForgeDB({
    type: "surrealdb",
    url: "ws://localhost:8000",
    namespace: "forge",
    database: "forge.db",
    username: "root",
    password: "root",
})
```

### Connecting with a Token

If you have a JWT token (e.g., from SurrealDB Cloud or a record-level auth method):

```typescript
new ForgeDB({
    type: "surrealdb",
    url: "wss://db.example.com:8000",
    namespace: "production",
    database: "mybot",
    token: "eyJhbGciOiJIUzI1NiIs...",
})
```

### Supported Protocols

| Protocol | Use Case |
| - | - |
| `ws://` | Unencrypted WebSocket (local dev) |
| `wss://` | Encrypted WebSocket (production) |
| `http://` | Unencrypted HTTP (stateless) |
| `https://` | Encrypted HTTP (production, stateless) |

WebSocket (`ws://`/`wss://`) is recommended for backend applications because it maintains a persistent connection with automatic reconnection.

---

## Configuration Options

The full set of options for `type: "surrealdb"`:

```typescript
{
    type: "surrealdb"

    // ---- Remote server mode ----
    url?: string              // "ws://host:8000" | "http://host:8000"
    username?: string         // root/namespace/database user
    password?: string
    token?: string            // JWT token (alternative to username/password)

    // ---- Embedded mode (omit `url`) ----
    folder?: string           // storage directory (default: "database")
    engine?: "surrealkv" | "rocksdb" | "mem"  // default: "surrealkv"

    // ---- Shared ----
    namespace?: string         // SurrealDB namespace (default: "forge")
    database?: string          // SurrealDB database (default: "forge.db")
    events?: Array<"variableCreate" | "variableUpdate" | "variableDelete" | "connect">
}
```

**Rule of thumb**: If `url` is provided, ForgeDB connects to a remote server. If `url` is omitted, ForgeDB uses the embedded engine.

---

## Migrating from SQLite / Better-SQLite3

Switching from SQLite or Better-SQLite3 to SurrealDB is a one-line change in your bot's main file:

### Before (SQLite)

```typescript
new ForgeDB({
    type: "sqlite",
    folder: "./database",
})
```

### After (SurrealDB Embedded)

```typescript
new ForgeDB({
    type: "surrealdb",
    folder: "./database",
    engine: "surrealkv",
})
```

No other changes are needed — all ForgeScript functions (`$getUserVar`, `$setUserVar`, `$getUserLeaderboard`, cooldowns, events, etc.) work identically regardless of the backend.

### Data Migration

Existing SQLite data is **not** automatically migrated. To migrate your data without losing variables:

1. **Export** — On your old bot (SQLite), run:

   ```text
   $writeFile[dump.json;$getDB]
   ```

   This saves all records to `dump.json` in the same format `$setDB` expects.

2. **Switch backend** — Change your `ForgeDB` config from `sqlite` to `surrealdb`:

   ```typescript
   new ForgeDB({
       type: "surrealdb",
       folder: "./database",
       engine: "rocksdb",
   })
   ```

3. **Import** — On your new bot (SurrealDB), run:

   ```text
   $setDB[$readFile[dump.json]]
   ```

   This bulk-imports all records in a single call. The `$setDB` function uses chunked batch inserts (1000 records per query) for scalability, so it works efficiently even with thousands of variables.

> **Note:** Cooldowns are not included in `$getDB` output and will not be migrated. Since cooldowns are transient (they expire on their own), this is generally not an issue — they will simply reset on the new database.

---

## How It Works Under the Hood

ForgeDB uses a **driver abstraction pattern**. When you specify `type: "surrealdb"`, a `SurrealDriver` is created instead of the default `TypeORMDriver`. Both implement the same `IDBDriver` interface, so all 70+ ForgeScript functions work without modification.

### Data Model

SurrealDB stores ForgeDB data in two schemaless tables:

- **`record`** — variable records (user vars, guild vars, channel vars, etc.)
- **`cooldown`** — cooldown entries

Each record is identified by its SurrealDB record ID, which is set to the ForgeDB `identifier` string (e.g., `user_myvar_1234567890`). This enables efficient `UPSERT` and direct record-ID lookups without table scans.

### Field Mapping

SurrealDB reserves the `id` field for the record ID. To avoid a collision with ForgeDB's entity `id` field (Discord snowflakes etc.), the SurrealDB driver transparently stores it as `entityId` and maps it back to `id` on retrieval. This is invisible to all function files and event handlers.

### `Like` Operator

The `$searchDB` and `$deleteRecords` functions use TypeORM's `Like()` operator for filtering. The SurrealDB driver detects these operator objects and translates them to exact-match conditions (`eq`), preserving the current behavior. If you need substring search in the future, this can be extended.

### Raw Queries

The `$dbPing` function uses a driver-level `ping()` method (not raw SQL), so it works correctly on all backends. For direct query access via `DataBase.query()`, the query string is passed through as-is — on SurrealDB, this means SurrealQL syntax (e.g., `SELECT * FROM record WHERE type = "user"`).

---

## Frequently Asked Questions

### Do I need to install a SurrealDB server?

No. In embedded mode (`engine: "surrealkv"` or `"rocksdb"`), the database runs inside your bot's process — just like better-sqlite3. You only need a server if you use `url: "ws://..."`.

### Is `@surrealdb/node` required?

Only for embedded mode. If you connect to a remote server via `url`, you only need the `surrealdb` package.

### What platforms are supported for embedded mode?

`@surrealdb/node` ships prebuilt native binaries for:

- Windows x64
- Linux x64 / arm64
- macOS x64 / arm64

If your platform is not listed, use remote server mode instead.

### Can I use multiple databases or namespaces?

Yes. Use the `namespace` and `database` options to isolate data. For example, you could use different databases for development and production on the same SurrealDB server.

### Are events supported?

Yes. The `variableCreate`, `variableUpdate`, and `variableDelete` events are fully supported on SurrealDB, with the same payload shapes as the TypeORM backends.

### Is this slower than better-sqlite3?

SurrealDB embedded mode uses native Rust engines that are competitive with better-sqlite3 for most workloads. The main advantage is the richer query model (SurrealQL) and the ability to seamlessly switch to a remote server without changing your bot code.
