export type { DBEmitter, IDBDriver } from "./driver";
export { SurrealDriver } from "./surrealDriver";
export { TypeORMDriver } from "./typeormDriver";
import type { IDataBaseOptions } from "../types";
import type { DBEmitter, IDBDriver } from "./driver";
/**
 * Create the appropriate driver based on `IDataBaseOptions.type`.
 *
 * For `type: "surrealdb"`, the SurrealDriver module is loaded lazily via
 * `require()` so that the `surrealdb` SDK is only resolved when a user
 * actually selects SurrealDB. This keeps the package optional — users
 * who only use SQLite / MySQL / PostgreSQL / MongoDB never need to
 * install `surrealdb` or `@surrealdb/node`.
 */
export declare function createDriver(options: IDataBaseOptions, emitter: DBEmitter): IDBDriver;
//# sourceMappingURL=index.d.ts.map