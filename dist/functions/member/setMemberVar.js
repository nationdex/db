"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$setMemberVar",
    version: "2.0.0",
    description: "Sets a member's value in a variable",
    unwrap: true,
    args: [
        {
            name: "name",
            description: "The name of the variable",
            rest: false,
            type: script_1.ArgType.String,
            required: true,
        },
        {
            name: "value",
            description: "The value to set",
            rest: false,
            required: true,
            type: script_1.ArgType.String,
        },
        {
            name: "member ID",
            description: "The ID of the member",
            rest: false,
            type: script_1.ArgType.String,
            required: false,
        },
        {
            name: "guild ID",
            description: "The guild ID",
            rest: false,
            type: script_1.ArgType.Guild,
            required: false,
        },
    ],
    brackets: true,
    async execute(ctx, [name, value, member, guild]) {
        await util_1.DataBase.set({ name, id: member ?? ctx.member.id, value, type: "member", guildId: guild?.id ?? ctx.guild.id });
        return this.success();
    },
});
//# sourceMappingURL=setMemberVar.js.map