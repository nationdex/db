import { performance } from "node:perf_hooks"
import { ArgType, NativeFunction } from "@nationdex/script"
import { DataBase } from "../../util"

export default new NativeFunction({
    name: "$dbPing",
    aliases: ["$dbLatency"],
    version: "2.0.9",
    description: "Returns the database ping.",
    output: ArgType.String,
    unwrap: true,
    brackets: false,
    args: [
        {
            name: "full",
            description: "This will return the max decimals",
            type: ArgType.Boolean,
            required: false,
            rest: false,
        },
    ],
    async execute(_ctx, [full]) {
        const start = performance.now()
        await DataBase.ping()
        const end = performance.now()
        let res = end - start
        if (!full) res = Number(res.toFixed(2))
        return this.success(res)
    },
})
