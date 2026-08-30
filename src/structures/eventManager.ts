import { BaseEventHandler, ForgeClient } from "@tryforge/forgescript"
import { DB } from ".."
import { RecordData, SQLiteRecord } from "../util"

export interface IDBEvents {
    connect: []
    variableCreate: [
        {
            data: RecordData | SQLiteRecord | null
        },
    ]
    variableDelete: [
        {
            data: RecordData | SQLiteRecord | null
        },
    ]
    variableUpdate: [
        {
            newData: RecordData | SQLiteRecord | null
            oldData: RecordData | SQLiteRecord | null
        },
    ]
}

export class DBEventHandler<T extends keyof IDBEvents> extends BaseEventHandler<IDBEvents, T> {
    register(client: ForgeClient): void {
        //@ts-ignore
        client.getExtension(DB, true)["emitter"].on(this.name, this.listener.bind(client))
    }
}
