import { BaseCommandManager } from "@nationdex/script"
import type { IDBEvents } from "./eventManager"

export class DBCommandManager extends BaseCommandManager<keyof IDBEvents> {
    handlerName = "ForgeDBEvents"
}
