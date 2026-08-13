import type { CooldownData, RecordData, SQLiteRecord } from "../types";
import type { DBEmitter, IDBDriver } from "./driver";
interface ISurrealOptions {
    type: "surrealdb";
    url?: string;
    username?: string;
    password?: string;
    token?: string;
    folder?: string;
    engine?: "surrealkv" | "rocksdb" | "mem";
    namespace?: string;
    database?: string;
}
export declare class SurrealDriver implements IDBDriver {
    private readonly emitter;
    private readonly options;
    private db;
    private Surreal;
    private RecordId;
    private Table;
    private eq;
    private and;
    constructor(emitter: DBEmitter, options: ISurrealOptions);
    init(): Promise<void>;
    /** Best-effort extraction of `createRemoteEngines` from the SDK module. */
    private createRemoteEngines;
    private buildEmbeddedConnectionString;
    private buildAuth;
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
    cdTimeLeft(identifier: string): Promise<CooldownData & {
        left: number;
    }>;
    query(q: string): Promise<unknown>;
    ping(): Promise<unknown>;
}
export {};
//# sourceMappingURL=surrealDriver.d.ts.map