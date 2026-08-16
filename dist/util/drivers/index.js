"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeORMDriver = exports.SurrealDriver = void 0;
exports.createDriver = createDriver;
var surrealDriver_1 = require("./surrealDriver");
Object.defineProperty(exports, "SurrealDriver", { enumerable: true, get: function () { return surrealDriver_1.SurrealDriver; } });
var typeormDriver_1 = require("./typeormDriver");
Object.defineProperty(exports, "TypeORMDriver", { enumerable: true, get: function () { return typeormDriver_1.TypeORMDriver; } });
/**
 * Create the appropriate driver based on `IDataBaseOptions.type`.
 *
 * For `type: "surrealdb"`, the SurrealDriver module is loaded lazily via
 * `require()` so that the `surrealdb` SDK is only resolved when a user
 * actually selects SurrealDB. This keeps the package optional — users
 * who only use SQLite / MySQL / PostgreSQL / MongoDB never need to
 * install `surrealdb` or `@surrealdb/node`.
 */
function createDriver(options, emitter) {
    if (options.type === "surrealdb") {
        // Lazy-require so the surreal driver module (and its `require("surrealdb")`)
        // is only loaded when the user actually selects this backend.
        const { SurrealDriver } = require("./surrealDriver");
        return new SurrealDriver(emitter, options);
    }
    const { TypeORMDriver } = require("./typeormDriver");
    return new TypeORMDriver(emitter, options);
}
//# sourceMappingURL=index.js.map