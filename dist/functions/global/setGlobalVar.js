"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$setGlobalVar",
    version: "2.0.0",
    description: "Assigns a value to a variable associated with a global",
    unwrap: true,
    args: [
        {
            name: "name",
            description: "The name of the variable to set the value in",
            rest: false,
            type: script_1.ArgType.String,
            required: true,
        },
        {
            name: "value",
            description: "The value to be assigned",
            rest: false,
            required: true,
            type: script_1.ArgType.String,
        },
    ],
    brackets: true,
    async execute(_ctx, [name, value]) {
        await util_1.DataBase.set({ name, value, type: "custom" });
        return this.success();
    },
});
//# sourceMappingURL=setGlobalVar.js.map