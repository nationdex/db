import type { TypedEmitter } from "tiny-typed-emitter";
import type { TransformEvents } from "../..";
import type { IDBEvents } from "../../structures";
import type { CooldownData, RecordData, SQLiteRecord } from "../types";
/**
 * Abstract driver interface that all database backends must implement.
 *
 * Each driver encapsulates the connection lifecycle and CRUD operations
 * for a specific database engine. The `DataBase` static facade delegates
 * to whichever driver was selected at construction time based on the
 * `IDataBaseOptions.type` field.
 *
 * Drivers are responsible for emitting `variableCreate`, `variableUpdate`,
 * and `variableDelete` events through the provided emitter, matching the
 * payload shapes declared in `IDBEvents`.
 */
export interface IDBDriver {
    /** Establish the underlying connection. Called once during `DataBase.init()`. */
    init(): Promise<void>;
    /**
     * Insert or update a record.
     *
     * Emits `variableCreate` when the record did not previously exist,
     * or `variableUpdate` when an existing record is being overwritten.
     */
    set(data: RecordData): Promise<void>;
    /** Retrieve a single record by its identifier, or `null` if not found. */
    get(data: RecordData): Promise<SQLiteRecord | null>;
    /** Retrieve every record in the `record` table. */
    getAll(): Promise<SQLiteRecord[]>;
    /**
     * Retrieve records matching the given filter criteria.
     *
     * The `data` argument may contain `FindOperator` instances (e.g. `Like`)
     * on the `name` or `value` fields. Drivers that do not use TypeORM must
     * detect and translate these operators themselves.
     */
    find(data?: RecordData): Promise<SQLiteRecord[]>;
    /**
     * Delete a single record by its identifier.
     *
     * Emits `variableDelete` with the record that was removed (or `null`
     * if it did not exist).
     */
    delete(data: RecordData): Promise<void>;
    /** Remove every record from the `record` table. */
    wipe(): Promise<void>;
    /** Remove every record from the `cooldown` table. */
    cdWipe(): Promise<void>;
    /** Insert or update a cooldown entry (upsert semantics). */
    cdAdd(data: {
        name: string;
        id?: string;
        duration: number;
    }): Promise<void>;
    /** Delete a cooldown entry by its identifier. */
    cdDelete(identifier: string): Promise<void>;
    /**
     * Retrieve a cooldown entry by identifier and compute the remaining
     * time in milliseconds.
     *
     * Returns `{ left: 0 }` when no cooldown exists.
     */
    cdTimeLeft(identifier: string): Promise<CooldownData & {
        left: number;
    }>;
    /**
     * Execute a raw query string.
     *
     * The query language depends on the backend:
     * - SQL backends (sqlite, mysql, postgres): raw SQL
     * - MongoDB: not supported (TypeORM limitation)
     * - SurrealDB: SurrealQL
     */
    query(q: string): Promise<unknown>;
    /** Execute a lightweight round-trip query for latency measurement. */
    ping(): Promise<unknown>;
}
/**
 * Emitter type shared by all drivers for event emission.
 */
export type DBEmitter = TypedEmitter<TransformEvents<IDBEvents>>;
//# sourceMappingURL=driver.d.ts.map