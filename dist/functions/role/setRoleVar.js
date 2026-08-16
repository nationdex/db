"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$setRoleVar",
    version: "2.0.0",
    description: "Sets a role's value in a variable",
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
            description: "The value",
            rest: false,
            required: true,
            type: script_1.ArgType.String,
        },
        {
            name: "role ID",
            description: "The ID of the role",
            rest: false,
            type: script_1.ArgType.Role,
            required: true,
        },
    ],
    brackets: true,
    async execute(_ctx, [name, value, role]) {
        await util_1.DataBase.set({ name, id: role.id, value, type: "role", guildId: role.guild.id });
        return this.success();
    },
});
//# sourceMappingURL=setRoleVar.js.map