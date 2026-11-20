import { ArgType, NativeFunction } from "@tryforge/forgescript"
import { DataBase } from "../../util"

export default new NativeFunction({
    name: "$addSuggestionVote",
    version: "1.0.0",
    description: "Records an upvote from a user on a suggestion (idempotent)",
    unwrap: true,
    args: [
        { name: "id", description: "Suggestion id", rest: false, type: ArgType.Number, required: true },
        { name: "userId", description: "Discord user id of the voter", rest: false, type: ArgType.String, required: true },
    ],
    brackets: true,
    async execute(_ctx, [id, userId]) {
        await DataBase.addSuggestionVote(Number(id), userId)
        return this.success()
    },
})
