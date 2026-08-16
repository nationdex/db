"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$deleteGuildCooldown",
    version: "2.0.0",
    description: "Deletes a cooldown of a given guild",
    brackets: true,
    unwrap: true,
    args: [
        {
            name: "name",
            description: "The name of the command you want the cooldown to get deleted",
            rest: false,
            type: script_1.ArgType.String,
            required: true,
        },
        {
            name: "guild ID",
            description: "The guild's id you want to delete the cooldown",
            rest: false,
            type: script_1.ArgType.Guild,
            required: false,
        },
    ],
    async execute(ctx, [name, id]) {
        util_1.DataBase.cdDelete(util_1.DataBase.make_cdIdentifier({ name: name, id: id?.id ?? ctx.guild?.id }));
        return this.success();
    },
});
//# sourceMappingURL=deleteGuildCooldown.js.map