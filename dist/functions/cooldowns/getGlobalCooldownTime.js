"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$getGlobalCooldownTime",
    version: "2.0.0",
    description: "Retrieves current cooldown time in ms for a global",
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
    ],
    async execute(_ctx, [name]) {
        return this.success((await util_1.DataBase.cdTimeLeft(util_1.DataBase.make_cdIdentifier({ name }))).left);
    },
});
//# sourceMappingURL=getGlobalCooldownTime.js.map