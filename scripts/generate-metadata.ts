import { generateMetadata } from "@tryforge/forgescript"
import { resolve } from "node:path"

await generateMetadata(
    resolve("dist/functions"),
    "functions",
    "DBEvents",
    false,
    undefined,
    resolve("dist/events"),
)
