import { ArgType, NativeFunction } from "@tryforge/forgescript";
import { DataBase } from "../../util";
export default new NativeFunction({
  name: "$deleteSuggestion",
  version: "1.0.0",
  description: "Deletes a suggestion and its votes",
  unwrap: true,
  args: [{ name: "id", description: "Suggestion id", rest: false, type: ArgType.Number, required: true }],
  brackets: true,
  async execute(_ctx, [id]) {
    await DataBase.deleteSuggestion(Number(id));
    return this.success();
  }
});
