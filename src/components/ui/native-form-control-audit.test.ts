import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const sourceRoots = ["src/app", "src/features", "src/components"]
const allowedNativeSelectFiles = new Set([
    "src/components/ui/field.tsx",
    "src/components/ui/select-description.tsx",
])

function walkFiles(dir: string): string[] {
    if (!existsSync(dir)) return []

    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        const stat = statSync(path)

        if (stat.isDirectory()) {
            return walkFiles(path)
        }

        return /\.(tsx|ts)$/.test(entry) ? [path] : []
    })
}

describe("native form control audit", () => {
    it("keeps native select elements inside shared select components only", () => {
        const offenders = sourceRoots
            .flatMap(walkFiles)
            .map((file) => relative(process.cwd(), file))
            .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
            .filter((file) => !allowedNativeSelectFiles.has(file))
            .filter((file) => /<select\b/.test(readFileSync(file, "utf8")))

        expect(offenders).toEqual([])
    })
})
