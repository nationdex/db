export type { DBEmitter, IDBDriver } from "./driver"
export { SurrealDriver } from "./surrealDriver"
export { TypeORMDriver } from "./typeormDriver"

import type { IDataBaseOptions } from "../types"
import type { DBEmitter, IDBDriver } from "./driver"

/**
 * Create the appropriate driver based on `IDataBaseOptions.type`.
 *
 * For `type: "surrealdb"`, the SurrealDriver module is loaded lazily via
 * `require()` so that the `surrealdb` SDK is only resolved when a user
 * actually selects SurrealDB. This keeps the package optional — users
 * who only use SQLite / MySQL / PostgreSQL / MongoDB never need to
 * install `surrealdb` or `@surrealdb/node`.
 */
export function createDriver(options: IDataBaseOptions, emitter: DBEmitter): IDBDriver {
    if (options.type === "surrealdb") {
        // Lazy-require so the surreal driver module (and its `require("surrealdb")`)
        // is only loaded when the user actually selects this backend.
        const { SurrealDriver } = require("./surrealDriver")
        return new SurrealDriver(emitter, options)
    }

    const { TypeORMDriver } = require("./typeormDriver")
    return new TypeORMDriver(emitter, options)
}
