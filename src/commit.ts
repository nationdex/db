import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline"

export async function prompt(q: string) {
    const itf = createInterface(stdin, stdout)
    return new Promise<string>((r) => {
        itf.question(q, (input) => {
            itf.close()
            r(input)
        })
    })
}

const path = "./metadata"
if (!existsSync(path)) mkdirSync(path)

const version = require("../package.json").version

async function main() {
    let skip = false

    const msg = (await prompt("Please write the commit message: "))
        .replace(/(--?(\w+))/gim, (match) => {
            const name = /(\w+)/.exec(match)![1].toLowerCase()

            switch (name) {
                case "hide": {
                    skip = true
                    break
                }

                default: {
                    throw new Error(`--${name} is not a valid flag.`)
                }
            }

            return ""
        })
        .trim()

    const fileName = join(path, "changelogs.json")
    const json: Record<string, object[]> = existsSync(fileName) ? JSON.parse(readFileSync(fileName, "utf-8")) : {}
    json[version] ??= []
    const author = execSync("git config user.name").toString().trim()
    if (!skip) {
        json[version].unshift({
            message: msg,
            timestamp: new Date(),
            author,
        })
        writeFileSync(fileName, JSON.stringify(json), "utf-8")
    }

    const branch = (await prompt("Write the branch name to push to (defaults to dev): ")) || "dev"
    const escapedMsg = msg.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$")

    execSync(`git branch -M ${branch} && git add . && git commit -m "${escapedMsg}" && git push -u origin ${branch}`, {
        stdio: "inherit",
    })
}

// Nothing
main()
