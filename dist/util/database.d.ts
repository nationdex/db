import type { TypedEmitter } from "tiny-typed-emitter";
import type { TransformEvents } from "..";
import type { IDBEvents } from "../structures";
import type { IDataBaseOptions, RecordData, SQLiteRecord } from "./types";
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
export declare class DataBase {
    /**
     * The active driver instance.
     *
     * Set once during `init()` and used by all static delegate methods.
     */
    private static driver;
    /**
     * The configured backend type.
     *
     * Preserved for backwards compatibility — some external code may
     * inspect `DataBase.type` to determine which database is in use.
     */
    static type: IDataBaseOptions["type"];
    /** Emitter instance, stored for `init()` to fire the `connect` event. */
    private static emitter;
    constructor(emitter: TypedEmitter<TransformEvents<IDBEvents>>, options?: IDataBaseOptions);
    /** Initialise the underlying driver connection and emit `connect`. */
    init(): Promise<void>;
    static make_intetifier(data: RecordData): string;
    static make_cdIdentifier(data: {
        name?: string;
        id?: string;
    }): string;
    /**
     * Sanitize a single record for cross-driver portability.
     *
     * - Ensures `value` is always a string (objects are JSON-stringified).
     * - Converts `null` id / guildId to `undefined`.
     * - Computes `identifier` when missing.
     * - Validates that `name` and `type` are present.
     */
    static normalizeRecord(record: RecordData): RecordData;
    /**
     * Normalize an array of records for bulk import.
     */
    static normalizeRecords(records: RecordData[]): RecordData[];
    static set(data: RecordData): Promise<void>;
    static get(data: RecordData): Promise<SQLiteRecord | null>;
    static getAll(): Promise<SQLiteRecord[]>;
    static find(data?: RecordData): Promise<SQLiteRecord[]>;
    static delete(data: RecordData): Promise<void>;
    static wipe(): Promise<void>;
    static importRecords(records: RecordData[]): Promise<number>;
    static cdWipe(): Promise<void>;
    static cdAdd(data: {
        name: string;
        id?: string;
        duration: number;
    }): Promise<void>;
    static cdDelete(identifier: string): Promise<void>;
    static cdTimeLeft(identifier: string): Promise<import("./types").CooldownData & {
        left: number;
    }>;
    static query(query: string): Promise<unknown>;
    static ping(): Promise<unknown>;
}
//# sourceMappingURL=database.d.ts.map