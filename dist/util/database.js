"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = void 0;
const drivers_1 = require("./drivers");
function isGuildData(data) {
    return ["member", "channel", "role"].includes(data.type);
}
/**
 * Static facade for all database operations.
 *
 * This class delegates every I/O call to an `IDBDriver` instance selected
 * at construction time based on `IDataBaseOptions.type`. The available
 * drivers are:
 *
 * - `TypeORMDriver` — SQLite, MySQL, PostgreSQL, MongoDB (via TypeORM)
 * - `SurrealDriver` — SurrealDB (via the `surrealdb` SDK, remote or embedded)
 *
 * All 70+ function files in `src/functions/` call `DataBase.*` statics
 * exclusively, so the driver swap is completely transparent to them.
 *
 * The pure helper functions `make_intetifier` and `make_cdIdentifier`
 * remain on this class — they don't touch the database and are shared
 * by every driver.
 */
class DataBase {
    /**
     * The active driver instance.
     *
     * Set once during `init()` and used by all static delegate methods.
     */
    static driver;
    /**
     * The configured backend type.
     *
     * Preserved for backwards compatibility — some external code may
     * inspect `DataBase.type` to determine which database is in use.
     */
    static type;
    /** Emitter instance, stored for `init()` to fire the `connect` event. */
    static emitter;
    constructor(emitter, options) {
        const opts = options ?? { type: "sqlite" };
        DataBase.type = opts.type;
        DataBase.emitter = emitter;
        // The driver receives the emitter so it can emit events.
        DataBase.driver = (0, drivers_1.createDriver)(opts, emitter);
    }
    /** Initialise the underlying driver connection and emit `connect`. */
    async init() {
        await DataBase.driver.init();
        DataBase.emitter.emit("connect");
    }
    /* ------------------------------------------------------------------ *
     * Pure helpers (no I/O) — shared by all drivers
     * ------------------------------------------------------------------ */
    static make_intetifier(data) {
        return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`;
    }
    static make_cdIdentifier(data) {
        return `${data.name}${data.id ? `_${data.id}` : ""}`;
    }
    /**
     * Sanitize a single record for cross-driver portability.
     *
     * - Ensures `value` is always a string (objects are JSON-stringified).
     * - Converts `null` id / guildId to `undefined`.
     * - Computes `identifier` when missing.
     * - Validates that `name` and `type` are present.
     */
    static normalizeRecord(record) {
        const name = record.name ?? undefined;
        const type = record.type ?? undefined;
        // Convert null → undefined for id and guildId.
        const id = record.id ?? undefined;
        const guildId = isGuildData(record) ? (record.guildId ?? undefined) : undefined;
        // Ensure value is always a string.
        let value;
        if (record.value === null || record.value === undefined) {
            value = "";
        }
        else if (typeof record.value === "object") {
            value = JSON.stringify(record.value);
        }
        else {
            value = String(record.value);
        }
        const normalized = { name, id, type, value };
        if (guildId)
            normalized.guildId = guildId;
        // Preserve or compute the identifier.
        normalized.identifier = record.identifier ?? DataBase.make_intetifier(normalized);
        return normalized;
    }
    /**
     * Normalize an array of records for bulk import.
     */
    static normalizeRecords(records) {
        return records.map((r) => DataBase.normalizeRecord(r));
    }
    /* ------------------------------------------------------------------ *
     * Record CRUD — delegates to driver
     * ------------------------------------------------------------------ */
    static async set(data) {
        await DataBase.driver.set(data);
    }
    static async get(data) {
        return await DataBase.driver.get(data);
    }
    static async getAll() {
        return await DataBase.driver.getAll();
    }
    static async find(data) {
        return await DataBase.driver.find(data);
    }
    static async delete(data) {
        await DataBase.driver.delete(data);
    }
    static async wipe() {
        await DataBase.driver.wipe();
    }
    static async importRecords(records) {
        const normalized = DataBase.normalizeRecords(records);
        return await DataBase.driver.importRecords(normalized);
    }
    /* ------------------------------------------------------------------ *
     * Cooldown CRUD — delegates to driver
     * ------------------------------------------------------------------ */
    static async cdWipe() {
        await DataBase.driver.cdWipe();
    }
    static async cdAdd(data) {
        await DataBase.driver.cdAdd(data);
    }
    static async cdDelete(identifier) {
        await DataBase.driver.cdDelete(identifier);
    }
    static async cdTimeLeft(identifier) {
        return await DataBase.driver.cdTimeLeft(identifier);
    }
    /* ------------------------------------------------------------------ *
     * Raw query + ping — delegates to driver
     * ------------------------------------------------------------------ */
    static async query(query) {
        return await DataBase.driver.query(query);
    }
    static async ping() {
        return await DataBase.driver.ping();
    }
}
exports.DataBase = DataBase;
//# sourceMappingURL=database.js.map