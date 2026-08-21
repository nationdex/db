"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const forgescript_1 = require("@tryforge/forgescript");
const util_1 = require("../../util");
/**
 * Extract the records array from various input shapes:
 * - Direct array `[...]`
 * - Wrapped object `{ "records": [...] }` or `{ "data": [...] }`
 * - Single record object `{ name, type, ... }`
 */
function extractRecords(parsed) {
    if (Array.isArray(parsed))
        return parsed;
    if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed;
        // Support wrapped shapes like { records: [...] } or { data: [...] }.
        for (const key of ["records", "data"]) {
            if (Array.isArray(obj[key]))
                return obj[key];
        }
        // Single record object with at least `name` and `type`.
        if ("name" in obj && "type" in obj)
            return [obj];
    }
    return null;
}
exports.default = new forgescript_1.NativeFunction({
    name: "$setDB",
    version: "2.2.0",
    aliases: ["$importDB", "$loadDB"],
    description: "Bulk-imports records into the database from a JSON array, file path, or wrapped object. " +
        "Accepts the output of $getDB directly. Returns the number of records imported.",
    output: forgescript_1.ArgType.Number,
    unwrap: true,
    args: [
        {
            name: "records",
            description: "A JSON array of records, a JSON string, a file path to a JSON file, " +
                "or a wrapped object ({ records: [...] } / { data: [...] }).",
            rest: false,
            type: forgescript_1.ArgType.String,
            required: true,
        },
    ],
    brackets: true,
    async execute(_ctx, [input]) {
        let parsed = input;
        if (typeof input === "string") {
            const trimmed = input.trim();
            // Attempt to detect a file path — if the string doesn't look like JSON and exists on disk, read it.
            if (!trimmed.startsWith("[") && !trimmed.startsWith("{") && (0, node_fs_1.existsSync)(trimmed)) {
                try {
                    const content = await node_fs_1.promises.readFile(trimmed, "utf-8");
                    parsed = JSON.parse(content);
                }
                catch {
                    return this.error(new Error(`Failed to read or parse file: ${trimmed}`));
                }
            }
            else {
                // Try to parse as JSON string.
                try {
                    parsed = JSON.parse(input);
                }
                catch {
                    return this.error(new Error("Invalid JSON provided to $setDB"));
                }
            }
        }
        const records = extractRecords(parsed);
        if (!records || records.length === 0) {
            return this.success(0);
        }
        const count = await util_1.DataBase.importRecords(records);
        return this.success(count);
    },
});
//# sourceMappingURL=setDB.js.map