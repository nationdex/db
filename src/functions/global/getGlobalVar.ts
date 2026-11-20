import { ArgType, IExtendedCompilationResult, Interpreter, NativeFunction } from "@tryforge/forgescript"
import { DataBase } from "../../util"
import { DB } from "../.."

export default new NativeFunction({
    name: "$getGlobalVar",
    version: "2.0.0",
    description: "Retrieves a global variable or a value at a dotted JSON path.",
    output: ArgType.Unknown,
    unwrap: true,
    args: [
        {
            name: "name",
            description: "The name of the variable to query",
            rest: false,
            type: ArgType.String,
            required: true,
        },
        {
            name: "default",
            description: "Fallback when the variable or JSON path is missing",
            rest: false,
            required: false,
            type: ArgType.String,
        },
        {
            name: "path",
            description: "Optional dotted JSON path, such as author.name or items.0",
            rest: false,
            type: ArgType.String,
            required: false,
        },
    ],
    brackets: true,
    async execute(ctx, [name, def, path]) {
        let value: unknown = (await DataBase.get({ name, type: "custom" }))?.value
        if (value === undefined) {
            if (def && !path?.trim()) return this.successJSON(def)
            if (DB.defaults && Object.hasOwn(DB.defaults, name)) {
                value = DB.defaults[name]
                if (typeof value === "object" && value !== null && "functions" in value) {
                    value = await Interpreter.run(ctx.clone({
                        data: value as IExtendedCompilationResult,
                        allowTopLevelReturn: true,
                        doNotSend: true,
                        redirectErrorsToConsole: true,
                    }))
                    if (value === null && !path?.trim()) return this.stop()
                }
            }
        }

        if (!path?.trim()) return this.successJSON(value)
        if (typeof value === "string") {
            try {
                value = JSON.parse(value)
            } catch {
                return this.successJSON(def ?? "")
            }
        }

        for (const key of path.trim().split(".")) {
            if (typeof value !== "object" || value === null || !Object.hasOwn(value, key)) {
                return this.successJSON(def ?? "")
            }
            value = Reflect.get(value, key)
        }

        return this.successJSON(value ?? def ?? "")
    },
})
