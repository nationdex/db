# @nationdex/db

Database extension for ForgeScript apps and bots. It stores persistent data (variables, leaderboards, cooldowns) in an embedded [PGlite](https://pglite.dev) instance — full Postgres compiled to WASM, running in-process. No database server, no native driver package, no extra install step.

[![discord](https://img.shields.io/discord/1321001945738971167?color=5865F2&label=Discord&logo=discord)](https://discord.com/invite/WCdk6CSKKz)
[![License](https://img.shields.io/github/license/nationdex/db)](https://github.com/nationdex/db/blob/main/LICENSE)

---

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Options](#options)
- [How It Works](#how-it-works)
- [License](#license)

---

## Installation

```bash
npm install github:nationdex/db
```

That's it — `@electric-sql/pglite` ships the Postgres engine itself, so there is no separate database driver to install or server to run.

---

## Quick Start

Import `DB` from `@nationdex/db` and add it to your `ForgeClient` extensions:

```ts
import { ForgeClient } from "@tryforge/forgescript";
import { DB } from "@nationdex/db";

const db = new DB({
    folder: "database", // where PGlite persists its data
    events: ["connect", "variableCreate", "variableUpdate", "variableDelete"]
});

const client = new ForgeClient({
    events: ["clientReady"],
    extensions: [db]
});

client.login("YOUR_BOT_TOKEN");
```

---

## Options

```ts
new DB({
    folder?: string   // directory PGlite persists to (default: "database")
    memory?: boolean  // run fully in-memory, no persistence (useful for tests)
    events?: Array<"connect" | "variableCreate" | "variableUpdate" | "variableDelete">
})
```

There is no `type` option anymore — PGlite is the only backend.

---

## How It Works

`DataBase` (`src/util/database.ts`) wraps a single `PGlite` instance and keeps two tables: `record` (every `$setXVar`-style variable) and `cooldown`. All ~70 ForgeScript functions in `src/functions/` go through this one static facade, so nothing outside `database.ts` needs to know that Postgres — not a remote server, a WASM build running inside your own process — is what's underneath.

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
