# @nationdex/db

Bun database extension for Project Nationdex 2026. It stores persistent data (variables, leaderboards, cooldowns, and suggestions) in an embedded [PGlite](https://pglite.dev) instance — full Postgres compiled to WASM, running in-process. No database server, no native driver package, no extra install step.

[![discord](https://img.shields.io/discord/1321001945738971167?color=5865F2&label=Discord&logo=discord)](https://discord.com/invite/WCdk6CSKKz)
[![License](https://img.shields.io/github/license/nationdex/db)](https://github.com/nationdex/db/blob/main/LICENSE)

---

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Options](#options)
- [Shutdown](#shutdown)
- [How It Works](#how-it-works)
- [License](#license)

---

## Installation

```bash
bun add github:nationdex/db#main
```

Use Bun 1.4.5 or newer with the ForgeScript version supplied by Project Nationdex 2026.

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

## Shutdown

PGlite persists to disk, so an ungraceful exit can lose whatever hasn't been flushed yet. If your process handles its own shutdown (SIGINT/SIGTERM, a PM2/systemd stop, etc.), call `DataBase.close()` from it before exiting:

```ts

process.on("SIGINT", async () => {
    await client.db.close();
    process.exit(0);
});
```

This isn't wired up automatically — installing process-wide signal handlers is the host application's call, not something this extension should do on your behalf.

---

## How It Works

`DataBase` (`src/util/database.ts`) wraps a single `PGlite` instance and stores variables, cooldowns, suggestions, and votes. All ~70 ForgeScript functions in `src/functions/` go through this one static facade, so nothing outside `database.ts` needs to know that Postgres — not a remote server, a WASM build running inside your own process — is what's underneath.

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
