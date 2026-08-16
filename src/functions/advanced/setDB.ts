import { ArgType, NativeFunction } from "@nationdex/script"
import type { RecordData } from "../../util"
import { DataBase } from "../../util"

export default new NativeFunction({
    name: "$setDB",
    version: "2.1.0",
    aliases: ["$importDB", "$loadDB"],
    description: "Bulk-imports records into the database from a JSON array. Accepts the output of $getDB directly. Returns the number of records imported.",
    output: ArgType.Number,
    unwrap: true,
    args: [
        {
            name: "records",
            description: "A JSON array of records (same format as $getDB output), or a JSON string.",
            rest: false,
            type: ArgType.Json,
            required: true,
        },
    ],
    brackets: true,
    async execute(_ctx, [input]) {
        let records: unknown = input

        if (typeof input === "string") {
            try {
                records = JSON.parse(input)
            } catch {
                return this.error(new Error("Invalid JSON provided to $setDB"))
            }
        }

        if (!Array.isArray(records)) {
            records = [records]
        }

        if (!Array.isArray(records) || records.length === 0) {
            return this.success(0)
        }

        const count = await DataBase.importRecords(records as unknown as RecordData[])
        return this.success(count)
    },
})
