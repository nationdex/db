import "reflect-metadata";
import { type IDataBaseOptions, type RecordData, SQLiteRecord } from "../types";
import type { DBEmitter, IDBDriver } from "./driver";
/**
 * TypeORM-backed driver for SQLite, MySQL, PostgreSQL, and MongoDB.
 *
 * This driver preserves the exact behaviour of the original `DataBase` /
 * `DataBaseManager` implementation, including the MongoDB-specific update
 * path (which fires `update()` without awaiting, to match the original
 * non-blocking semantics).
 *
 * The driver holds a single `DataSource` instance. The entity classes are
 * selected based on the configured backend type at construction time.
 */
export declare class TypeORMDriver implements IDBDriver {
    private readonly emitter;
    private readonly type;
    private readonly databaseName;
    private db;
    private dbPromise;
    private static activeDataBases;
    private static config;
    private readonly entities;
    private readonly entityManager;
    constructor(emitter: DBEmitter, options: IDataBaseOptions);
    init(): Promise<void>;
    private getDB;
    private waitForConfig;
    set(data: RecordData): Promise<void>;
    get(data: RecordData): Promise<SQLiteRecord | null>;
    getAll(): Promise<SQLiteRecord[]>;
    find(data?: RecordData): Promise<SQLiteRecord[]>;
    delete(data: RecordData): Promise<void>;
    wipe(): Promise<void>;
    cdWipe(): Promise<void>;
    cdAdd(data: {
        name: string;
        id?: string;
        duration: number;
    }): Promise<void>;
    cdDelete(identifier: string): Promise<void>;
    cdTimeLeft(identifier: string): Promise<{
        left: number;
        identifier: string;
        name: string;
        id?: string | undefined;
        startedAt: number;
        duration: number;
    } | {
        left: number;
    }>;
    query(q: string): Promise<unknown>;
    ping(): Promise<unknown>;
}
//# sourceMappingURL=typeormDriver.d.ts.map