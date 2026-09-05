import type { TypedEmitter } from "tiny-typed-emitter";
import type { TransformEvents } from "..";
import type { IDBEvents } from "../structures";
import type { DBRecord, IDataBaseOptions, RecordData } from "./types";
/** Marker produced by `Like()` so `DataBase.find` can build a SQL `LIKE` condition instead of an equality check. */
export interface LikeCondition {
    __like: true;
    pattern: string;
}
export declare function Like(pattern: string): LikeCondition;
/**
 * Static facade backed by an embedded PGlite (WASM Postgres) instance.
 *
 * All 70+ function files in `src/functions/` call these statics exclusively.
 */
export declare class DataBase {
    private emitter;
    private options?;
    private static pg;
    private static emitter;
    constructor(emitter: TypedEmitter<TransformEvents<IDBEvents>>, options?: IDataBaseOptions | undefined);
    init(): Promise<void>;
    static make_intetifier(data: RecordData): string;
    static make_cdIdentifier(data: {
        name?: string;
        id?: string;
    }): string;
    static set(data: RecordData): Promise<void>;
    static get(data: RecordData): Promise<DBRecord | null>;
    static getAll(): Promise<DBRecord[]>;
    static find(data?: Record<string, unknown>): Promise<DBRecord[]>;
    static delete(data: RecordData): Promise<void>;
    static wipe(): Promise<void>;
    static cdWipe(): Promise<void>;
    static cdAdd(data: {
        name: string;
        id?: string;
        duration: number;
    }): Promise<void>;
    static cdDelete(identifier: string): Promise<void>;
    static cdTimeLeft(identifier: string): Promise<{
        left: number;
    } | {
        left: number;
        identifier: string;
        name: string;
        id?: string;
        startedAt: string;
        duration: number;
    }>;
    static query(query: string): Promise<import("@electric-sql/pglite").Results<unknown>>;
}
//# sourceMappingURL=database.d.ts.map