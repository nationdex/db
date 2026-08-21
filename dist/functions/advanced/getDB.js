"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const forgescript_1 = require("@tryforge/forgescript");
const util_1 = require("../../util");
exports.default = new forgescript_1.NativeFunction({
    name: "$getDB",
    version: "2.2.0",
    aliases: ["$getDataBase", "$getRecords", "$exportDB"],
    description: "Returns stored records in the database. Supports optional filtering by name and type, " +
        "minified or pretty output, and direct file export.",
    output: forgescript_1.ArgType.Unknown,
    unwrap: true,
    args: [
        {
            name: "name",
            description: "Filter records by variable name. Leave empty for all records.",
            rest: false,
            type: forgescript_1.ArgType.String,
            required: false,
        },
        {
            name: "type",
            description: "Filter records by variable type (user, guild, custom, etc.).",
            rest: false,
            type: forgescript_1.ArgType.Enum,
            enum: util_1.VariableType,
            required: false,
        },
        {
            name: "pretty",
            description: "Whether to format the output with indentation (true/false). Defaults to false (minified).",
            rest: false,
            type: forgescript_1.ArgType.Boolean,
            required: false,
        },
        {
            name: "file",
            description: "If provided, writes the JSON output directly to this file path and returns the record count.",
            rest: false,
            type: forgescript_1.ArgType.String,
            required: false,
        },
    ],
    brackets: false,
    async execute(_ctx, [name, type, pretty, file]) {
        const hasFilter = name || type !== null;
        const typeStr = type !== null && type !== undefined ? util_1.VariableType[type]?.toString() : undefined;
        const records = hasFilter ? await util_1.DataBase.find({ name, type: typeStr }) : await util_1.DataBase.getAll();
        const indent = pretty ? 4 : undefined;
        const json = JSON.stringify(records, null, indent);
        if (file) {
            await node_fs_1.promises.writeFile(file, json, "utf-8");
            return this.success(records.length);
        }
        return this.success(json);
    },
});
//# sourceMappingURL=getDB.js.map