import { BaseEventHandler, ForgeClient } from "@tryforge/forgescript";
import { RecordData, SQLiteRecord } from "../util";
export interface IDBEvents {
    connect: [];
    variableCreate: [
        {
            data: RecordData | SQLiteRecord | null;
        }
    ];
    variableDelete: [
        {
            data: RecordData | SQLiteRecord | null;
        }
    ];
    variableUpdate: [
        {
            newData: RecordData | SQLiteRecord | null;
            oldData: RecordData | SQLiteRecord | null;
        }
    ];
}
export declare class DBEventHandler<T extends keyof IDBEvents> extends BaseEventHandler<IDBEvents, T> {
    register(client: ForgeClient): void;
}
//# sourceMappingURL=eventManager.d.ts.map