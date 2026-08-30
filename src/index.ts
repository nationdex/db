import { Compiler, EventManager, ForgeClient, ForgeExtension, IExtendedCompilationResult } from "@tryforge/forgescript"
import { DataBase, IDataBaseOptions } from "./util"
import { DBCommandManager, IDBEvents } from "./structures"
import { TypedEmitter } from "tiny-typed-emitter"

export type TransformEvents<T> = {
    [P in keyof T]: T[P] extends any[] ? (...args: T[P]) => any : never
}

export class DB extends ForgeExtension {
    public static defaults?: Record<PropertyKey, IExtendedCompilationResult | unknown>

    name: string = "db"
    description: string = "A fast and reliable database extension for ForgeScript."
    version: string = require("../package.json").version

    public commands!: any
    public emitter = new TypedEmitter<TransformEvents<IDBEvents>>()

    public constructor(public readonly options?: IDataBaseOptions) {
        super()
    }

    init(client: ForgeClient): void {
        this.commands = new DBCommandManager(client)

        EventManager.load('DBEvents', __dirname + '/events')
        this.load(__dirname + "/functions")

        new DataBase(this.emitter, this.options).init()
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
export { DataBaseManager } from './util'