import { Compiler, EventManager, ForgeClient, ForgeExtension, IExtendedCompilationResult } from "@tryforge/forgescript"
import { DataBase, IDataBaseOptions } from "./util"
import { DBCommandManager, IDBEvents } from "./structures"
import { EventEmitter } from "node:events"
import { version } from "../package.json"

export type TransformEvents<T> = {
    [P in keyof T]: T[P] extends any[] ? (...args: T[P]) => any : never
}

export class DB extends ForgeExtension {
    public static defaults?: Record<PropertyKey, IExtendedCompilationResult | unknown>

    name: string = "db"
    description: string = "A fast and reliable database extension for ForgeScript."
    version: string = version

    public commands!: any
    public emitter = new EventEmitter<IDBEvents>()

    public constructor(public readonly options?: IDataBaseOptions) {
        super()
    }

    init(client: ForgeClient): void {
        this.commands = new DBCommandManager(client)

        EventManager.load('DBEvents', import.meta.dir + '/events')
        this.load(import.meta.dir + "/functions")

        new DataBase(this.emitter, this.options).init().catch((err) => console.error("[db] Failed to initialize database:", err))
        client.db = DataBase

        if (this.options?.events?.length)
            client.events.load("DBEvents", this.options.events)
    }

    public variables(rec: Record<PropertyKey, unknown>) {
        DB.variables(rec)
    }

    public static variables(rec: Record<PropertyKey, unknown>) {
        DB.defaults = DB.compileVariables(rec)
    }

    private static compileVariables(rec: Record<PropertyKey, unknown>) {
        const obj = {} as Record<PropertyKey, IExtendedCompilationResult | unknown>
        for (const [key, value] of Object.entries(rec)) {
            if (typeof value === "string") {
                obj[key] = Compiler.compile(value)
            } else {
                obj[key] = value
            }
        }
        return obj
    }
}
