"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$deleteGlobalVar",
    version: "2.0.0",
    description: "Removes a value from a global variable",
    unwrap: true,
    brackets: true,
    args: [
        {
            name: "name",
            description: "The name of the variable from which to remove the value",
            rest: false,
            type: script_1.ArgType.String,
            required: true,
        },
    ],
    async execute(_ctx, [name]) {
        await util_1.DataBase.delete({ name, type: "custom" });
        return this.success();
    },
});
//# sourceMappingURL=deleteGlobalVar.js.map