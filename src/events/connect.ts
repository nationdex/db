import { Interpreter } from "@tryforge/forgescript"
import { DB } from ".."
import { DBEventHandler } from "../structures/eventManager"

export default new DBEventHandler({
    name: "connect",
    version: "2.0.0",
    description: "This event is triggered when db is connected with ForgeScript",
    listener() {
        const commands = this.getExtension(DB, true).commands.get("connect")

        for (const command of commands) {
            Interpreter.run({
                obj: {},
                client: this,
                command,
                data: command.compiled.code,
            })
        }
    },
})
