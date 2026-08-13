import { BaseCommandManager } from "@tryforge/forgescript"
import type { IDBEvents } from "./eventManager"

export class DBCommandManager extends BaseCommandManager<keyof IDBEvents> {
    handlerName = "ForgeDBEvents"
}
