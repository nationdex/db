import { promises as fs } from "node:fs"
import { ArgType, NativeFunction } from "@tryforge/forgescript"
import { DataBase, VariableType } from "../../util"

export default new NativeFunction({
    name: "$getDB",
    version: "2.2.0",
    aliases: ["$getDataBase", "$getRecords", "$exportDB"],
    description: "Returns stored records in the database. Supports optional filtering by name and type, " + "minified or pretty output, and direct file export.",
    output: ArgType.Unknown,
    unwrap: true,
    args: [
        {
            name: "name",
            description: "Filter records by variable name. Leave empty for all records.",
            rest: false,
            type: ArgType.String,
            required: false,
        },
        {
            name: "type",
            description: "Filter records by variable type (user, guild, custom, etc.).",
            rest: false,
            type: ArgType.Enum,
            enum: VariableType,
            required: false,
        },
        {
            name: "pretty",
            description: "Whether to format the output with indentation (true/false). Defaults to false (minified).",
            rest: false,
            type: ArgType.Boolean,
            required: false,
        },
        {
            name: "file",
            description: "If provided, writes the JSON output directly to this file path and returns the record count.",
            rest: false,
            type: ArgType.String,
            required: false,
        },
    ],
    brackets: false,
    async execute(_ctx, [name, type, pretty, file]) {
        const hasFilter = name || type !== null
        const typeStr = type !== null && type !== undefined ? VariableType[type]?.toString() : undefined
        const records = hasFilter ? await DataBase.find({ name, type: typeStr } as any) : await DataBase.getAll()

        const indent = pretty ? 4 : undefined
        const json = JSON.stringify(records, null, indent)

        if (file) {
            await fs.writeFile(file, json, "utf-8")
            return this.success(records.length)
        }

        return this.success(json)
    },
})
