import { BaseEventHandler, ForgeClient } from "@tryforge/forgescript";
import { DBRecord } from "../util";
export interface IDBEvents {
    connect: [];
    variableCreate: [
        {
            data: DBRecord | null;
        }
    ];
    variableDelete: [
        {
            data: DBRecord | null;
        }
    ];
    variableUpdate: [
        {
            newData: DBRecord | null;
            oldData: DBRecord | null;
        }
    ];
}
export declare class DBEventHandler<T extends keyof IDBEvents> extends BaseEventHandler<IDBEvents, T> {
    register(client: ForgeClient): void;
}
//# sourceMappingURL=eventManager.d.ts.map