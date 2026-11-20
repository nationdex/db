import { ArgType, NativeFunction } from "@tryforge/forgescript";
import { DataBase } from "../../util";
export default new NativeFunction({
  name: "$listSuggestions",
  version: "1.0.0",
  description: "Lists suggestions filtered by type and/or status, ordered by vote count, as JSON",
  output: ArgType.Unknown,
  unwrap: true,
  args: [
    { name: "type", description: "nation | countryball | feature", rest: false, type: ArgType.String, required: false },
    { name: "status", description: "pending | approved | denied | changes_requested", rest: false, type: ArgType.String, required: false }
  ],
  brackets: true,
  async execute(_ctx, [type, status]) {
    const suggestions = await DataBase.listSuggestions({ type: type || undefined, status: status || undefined });
    return this.successJSON(suggestions);
  }
});
