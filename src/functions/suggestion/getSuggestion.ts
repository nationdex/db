import { ArgType, NativeFunction } from "@tryforge/forgescript"
import { DataBase } from "../../util"

export default new NativeFunction({
    name: "$getSuggestion",
    version: "1.0.0",
    description: "Retrieves a suggestion by id, including its vote count, as JSON",
    output: ArgType.Unknown,
    unwrap: true,
    args: [{ name: "id", description: "Suggestion id", rest: false, type: ArgType.Number, required: true }],
    brackets: true,
    async execute(_ctx, [id]) {
        const suggestion = await DataBase.getSuggestion(Number(id))
        return this.successJSON(suggestion ?? {})
    },
})
