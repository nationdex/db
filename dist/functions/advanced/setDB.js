"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const forgescript_1 = require("@tryforge/forgescript");
const util_1 = require("../../util");
exports.default = new forgescript_1.NativeFunction({
    name: "$setDB",
    version: "2.1.0",
    aliases: ["$importDB", "$loadDB"],
    description: "Bulk-imports records into the database from a JSON array. Accepts the output of $getDB directly. Returns the number of records imported.",
    output: forgescript_1.ArgType.Number,
    unwrap: true,
    args: [
        {
            name: "records",
            description: "A JSON array of records (same format as $getDB output), or a JSON string.",
            rest: false,
            type: forgescript_1.ArgType.Json,
            required: true,
        },
    ],
    brackets: true,
    async execute(_ctx, [input]) {
        let records = input;
        if (typeof input === "string") {
            try {
                records = JSON.parse(input);
            }
            catch {
                return this.error(new Error("Invalid JSON provided to $setDB"));
            }
        }
        if (!Array.isArray(records)) {
            records = [records];
        }
        if (!Array.isArray(records) || records.length === 0) {
            return this.success(0);
        }
        const count = await util_1.DataBase.importRecords(records);
        return this.success(count);
    },
});
//# sourceMappingURL=setDB.js.map