# @nationdex/db

Database extension for ForgeScript apps and bots. It lets you store and manage persistent data (variables, leaderboards, cooldowns) across multiple database backends with TypeORM.

[![discord](https://img.shields.io/discord/1321001945738971167?color=5865F2&label=Discord&logo=discord)](https://discord.com/invite/WCdk6CSKKz)
[![License](https://img.shields.io/github/license/nationdex/db)](https://github.com/nationdex/db/blob/main/LICENSE)

---

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Database Types & Options](#database-types--options)
   - [SQLite (Default)](#sqlite-default)
   - [MongoDB](#mongodb)
   - [MySQL](#mysql)
   - [PostgreSQL](#postgresql)
   - [Better-SQLite3](#better-sqlite3)
- [License](#license)

---

## Installation

Install the package:

```bash
npm install github:nationdex/db
```

You also need the driver package for the database you plan to use:

```bash
# For SQLite (default)
npm install sqlite3

# For MongoDB
npm install mongodb

# For MySQL
npm install mysql2 # or mysql

# For PostgreSQL
npm install pg

# For Better-SQLite3
npm install better-sqlite3
```

---

## Quick Start

Import `DB` from `@nationdex/db` and add it to your `ForgeClient` extensions:

---


```ts
import { ForgeClient } from "@tryforge/forgescript";
import { DB } from "@nationdex/db";

const db = new DB({
    type: "sqlite",
    events: ["connect", "variableCreate", "variableUpdate", "variableDelete"]
});

const client = new ForgeClient({
    events: ["clientReady"]
    extensions: [db]
});

client.login("YOUR_BOT_TOKEN");
```

---

## Database Types & Options

The `DB` constructor takes an options object. Here is how to configure each supported database:

### SQLite (Default)

Stores data in a local file.

```js
new DB({
    type: "sqlite",
    folder: "database" // folder where the database file will be saved
})
```

### MongoDB

Connects to a MongoDB database using a connection string.

```js
new DB({
    type: "mongodb",
    url: "mongodb+srv://user:password@cluster.mongodb.net/dbname"
})
```

### MySQL

Connects using credentials or a connection URL.

```js
new DB({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "password",
    database: "my_database"
})
```

### PostgreSQL

Connects using credentials or a connection URL.

```js
new DB({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "password",
    database: "my_database"
})
```

### Better-SQLite3

Uses `better-sqlite3` as the SQLite backend.

```js
new DB({
    type: "better-sqlite3",
    folder: "database"
})
```

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
