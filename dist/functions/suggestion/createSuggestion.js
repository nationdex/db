import { ArgType, NativeFunction } from "@tryforge/forgescript";
import { DataBase } from "../../util";
export default new NativeFunction({
  name: "$createSuggestion",
  version: "1.0.0",
  description: "Creates a new community suggestion and returns its id",
  output: ArgType.Number,
  unwrap: true,
  args: [
    { name: "type", description: "nation | countryball | feature", rest: false, type: ArgType.String, required: true },
    { name: "submitterId", description: "Discord user id of the submitter", rest: false, type: ArgType.String, required: true },
    { name: "fields", description: "JSON string of the suggestion's fields", rest: false, type: ArgType.String, required: true },
    { name: "imageUrl", description: "Primary image URL", rest: false, type: ArgType.String, required: false },
    { name: "altImageUrl", description: "Alt image URL", rest: false, type: ArgType.String, required: false }
  ],
  brackets: true,
  async execute(_ctx, [type, submitterId, fields, imageUrl, altImageUrl]) {
    const suggestion = await DataBase.createSuggestion({
      type,
      submitterId,
      fields: JSON.parse(fields),
      imageUrl: imageUrl ? imageUrl : undefined,
      altImageUrl: altImageUrl ? altImageUrl : undefined
    });
    return this.success(suggestion.id);
  }
});
