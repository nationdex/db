import { ArgType, NativeFunction } from "@tryforge/forgescript";
import { DataBase } from "../../util";
export default new NativeFunction({
  name: "$getSuggestionStats",
  version: "1.1.0",
  description: "Returns a submitter's open suggestion count and latest submission timestamp in milliseconds as JSON.",
  output: ArgType.Json,
  unwrap: true,
  args: [
    { name: "submitterId", description: "Discord user ID of the submitter", rest: false, type: ArgType.String, required: true }
  ],
  brackets: true,
  async execute(_ctx, [submitterId]) {
    return this.successJSON(await DataBase.getSuggestionStats(submitterId));
  }
});
