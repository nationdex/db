"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$data",
    version: "2.0.0",
    description: "Retrieves data that has been set or deleted for a record during create and delete events",
    unwrap: true,
    args: [
        {
            name: "type",
            description: "The type of data you want to retrieve",
            rest: false,
            type: script_1.ArgType.Enum,
            enum: util_1.DataType,
            required: true,
        },
    ],
    brackets: true,
    async execute(ctx, [type]) {
        //@ts-expect-error
        return this.success(ctx.runtime.extras.data[util_1.DataType[type].toString()]);
    },
});
//# sourceMappingURL=data.js.map