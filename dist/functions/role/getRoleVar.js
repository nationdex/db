"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const __1 = require("../..");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$getRoleVar",
    version: "2.0.0",
    description: "Returns a variable's value of a role",
    output: script_1.ArgType.Unknown,
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
            name: "role ID",
            description: "The ID of the role",
            rest: false,
            type: script_1.ArgType.Role,
            required: true,
        },
        {
            name: "default",
            description: "The default value if the identifier doesn't exist in the variable",
            rest: false,
            required: false,
            type: script_1.ArgType.String,
        },
    ],
    brackets: true,
    async execute(ctx, [name, role, def]) {
        const data = await util_1.DataBase.get({ name, id: role.id, type: "role", guildId: role.guild.id }).then((x) => x?.value);
        if (data === null || data === undefined) {
            if (def)
                return this.successJSON(def);
            else if (__1.ForgeDB.defaults && name in __1.ForgeDB.defaults) {
                const defData = __1.ForgeDB.defaults[name];
                if (typeof defData === "object" && defData !== null && "functions" in defData) {
                    const d = defData;
                    // Run
                    const result = await script_1.Interpreter.run(ctx.clone({
                        data: d,
                        allowTopLevelReturn: true,
                        doNotSend: true,
                        redirectErrorsToConsole: true,
                    }));
                    return result === null ? this.stop() : this.successJSON(result);
                }
                else
                    return this.successJSON(defData);
            }
        }
        return this.successJSON(data);
    },
});
//# sourceMappingURL=getRoleVar.js.map