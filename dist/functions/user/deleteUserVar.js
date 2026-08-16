"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$deleteUserVar",
    version: "2.0.0",
    description: "Deletes a value from a user variable",
    unwrap: true,
    brackets: true,
    args: [
        {
            name: "name",
            description: "The name of the variable",
            rest: false,
            type: script_1.ArgType.String,
            required: true,
        },
        {
            name: "user ID",
            description: "The ID of the user",
            rest: false,
            type: script_1.ArgType.String,
            required: false,
        },
    ],
    async execute(ctx, [name, user]) {
        await util_1.DataBase.delete({ name, id: user ?? ctx.user.id, type: "user" });
        return this.success();
    },
});
//# sourceMappingURL=deleteUserVar.js.map