import { ArgType, NativeFunction } from "@tryforge/forgescript"
import { DataBase } from "../../util"

export default new NativeFunction({
    name: "$hasVotedSuggestion",
    version: "1.0.0",
    description: "Whether a user has already upvoted a suggestion",
    output: ArgType.Boolean,
    unwrap: true,
    args: [
        { name: "id", description: "Suggestion id", rest: false, type: ArgType.Number, required: true },
        { name: "userId", description: "Discord user id of the voter", rest: false, type: ArgType.String, required: true },
    ],
    brackets: true,
    async execute(_ctx, [id, userId]) {
        const voted = await DataBase.hasVotedSuggestion(Number(id), userId)
        return this.success(voted)
    },
})
