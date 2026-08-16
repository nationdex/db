"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$getMemberCooldownTime",
    version: "2.0.0",
    description: "Retrieves current cooldown time in ms for a member",
    output: script_1.ArgType.Number,
    brackets: true,
    unwrap: true,
    args: [
        {
            name: "name",
            description: "The name of the command you are trying to check the cooldown",
            rest: false,
            type: script_1.ArgType.String,
            required: true,
        },
        {
            name: "member ID",
            description: "The member id to get its cooldown",
            rest: false,
            type: script_1.ArgType.User,
            required: false,
        },
        {
            name: "guild ID",
            description: "The guild of the identifier",
            rest: false,
            type: script_1.ArgType.Guild,
            required: false,
        },
    ],
    async execute(ctx, [name, id, guild]) {
        return this.success((await util_1.DataBase.cdTimeLeft(util_1.DataBase.make_cdIdentifier({ name: `${name}-${guild?.id ?? ctx.guild?.id}`, id: id?.id ?? ctx.member?.id }))).left);
    },
});
//# sourceMappingURL=getMemberCooldown.js.map