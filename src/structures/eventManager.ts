import { BaseEventHandler, ForgeClient } from "@tryforge/forgescript"
import { DB } from ".."
import { DBRecord } from "../util"

export interface IDBEvents {
    connect: []
    variableCreate: [
        {
            data: DBRecord | null
        },
    ]
    variableDelete: [
        {
            data: DBRecord | null
        },
    ]
    variableUpdate: [
        {
            newData: DBRecord | null
            oldData: DBRecord | null
        },
    ]
}

export class DBEventHandler<T extends keyof IDBEvents> extends BaseEventHandler<IDBEvents, T> {
    register(client: ForgeClient): void {
        //@ts-ignore
        client.getExtension(DB, true)["emitter"].on(this.name, this.listener.bind(client))
    }
}
