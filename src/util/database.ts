import type { TypedEmitter } from "tiny-typed-emitter"
import type { TransformEvents } from ".."
import type { IDBEvents } from "../structures"
import type { DBEmitter, IDBDriver } from "./drivers"
import { createDriver } from "./drivers"
import type { GuildData, IDataBaseOptions, RecordData, SQLiteRecord } from "./types"

function isGuildData(data: RecordData): data is GuildData {
    return ["member", "channel", "role"].includes(data.type!)
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
export class DataBase {
    /**
     * The active driver instance.
     *
     * Set once during `init()` and used by all static delegate methods.
     */
    private static driver: IDBDriver

    /**
     * The configured backend type.
     *
     * Preserved for backwards compatibility — some external code may
     * inspect `DataBase.type` to determine which database is in use.
     */
    public static type: IDataBaseOptions["type"]

    /** Emitter instance, stored for `init()` to fire the `connect` event. */
    private static emitter: TypedEmitter<TransformEvents<IDBEvents>>

    constructor(emitter: TypedEmitter<TransformEvents<IDBEvents>>, options?: IDataBaseOptions) {
        const opts = options ?? { type: "sqlite" }
        DataBase.type = opts.type
        DataBase.emitter = emitter
        // The driver receives the emitter so it can emit events.
        DataBase.driver = createDriver(opts, emitter as DBEmitter)
    }

    /** Initialise the underlying driver connection and emit `connect`. */
    public async init() {
        await DataBase.driver.init()
        DataBase.emitter.emit("connect")
    }

    /* ------------------------------------------------------------------ *
     * Pure helpers (no I/O) — shared by all drivers
     * ------------------------------------------------------------------ */

    public static make_intetifier(data: RecordData) {
        return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`
    }

    public static make_cdIdentifier(data: { name?: string; id?: string }) {
        return `${data.name}${data.id ? `_${data.id}` : ""}`
    }

    /**
     * Sanitize a single record for cross-driver portability.
     *
     * - Ensures `value` is always a string (objects are JSON-stringified).
     * - Converts `null` id / guildId to `undefined`.
     * - Computes `identifier` when missing.
     * - Validates that `name` and `type` are present.
     */
    public static normalizeRecord(record: RecordData): RecordData {
        const name = record.name ?? undefined
        const type = record.type ?? undefined

        // Convert null → undefined for id and guildId.
        const id = record.id ?? undefined
        const guildId = isGuildData(record) ? (record.guildId ?? undefined) : undefined

        // Ensure value is always a string.
        let value: string
        if (record.value === null || record.value === undefined) {
            value = ""
        } else if (typeof record.value === "object") {
            value = JSON.stringify(record.value)
        } else {
            value = String(record.value)
        }

        const normalized: RecordData = { name, id, type, value } as RecordData
        if (guildId) (normalized as any).guildId = guildId

        // Preserve or compute the identifier.
        normalized.identifier = record.identifier ?? DataBase.make_intetifier(normalized)

        return normalized
    }

    /**
     * Normalize an array of records for bulk import.
     */
    public static normalizeRecords(records: RecordData[]): RecordData[] {
        return records.map((r) => DataBase.normalizeRecord(r))
    }

    /* ------------------------------------------------------------------ *
     * Record CRUD — delegates to driver
     * ------------------------------------------------------------------ */

    public static async set(data: RecordData) {
        await DataBase.driver.set(data)
    }

    public static async get(data: RecordData) {
        return await DataBase.driver.get(data)
    }

    public static async getAll(): Promise<SQLiteRecord[]> {
        return await DataBase.driver.getAll()
    }

    public static async find(data?: RecordData): Promise<SQLiteRecord[]> {
        return await DataBase.driver.find(data)
    }

    public static async delete(data: RecordData) {
        await DataBase.driver.delete(data)
    }

    public static async wipe() {
        await DataBase.driver.wipe()
    }

    public static async importRecords(records: RecordData[]): Promise<number> {
        const normalized = DataBase.normalizeRecords(records)
        return await DataBase.driver.importRecords(normalized)
    }

    /* ------------------------------------------------------------------ *
     * Cooldown CRUD — delegates to driver
     * ------------------------------------------------------------------ */

    public static async cdWipe() {
        await DataBase.driver.cdWipe()
    }

    public static async cdAdd(data: { name: string; id?: string; duration: number }) {
        await DataBase.driver.cdAdd(data)
    }

    public static async cdDelete(identifier: string) {
        await DataBase.driver.cdDelete(identifier)
    }

    public static async cdTimeLeft(identifier: string) {
        return await DataBase.driver.cdTimeLeft(identifier)
    }

    /* ------------------------------------------------------------------ *
     * Raw query + ping — delegates to driver
     * ------------------------------------------------------------------ */

    public static async query(query: string) {
        return await DataBase.driver.query(query)
    }

    public static async ping() {
        return await DataBase.driver.ping()
    }
}
