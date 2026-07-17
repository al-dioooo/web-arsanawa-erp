import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Tailwind v4 only generates utilities for colors declared in an `@theme`
 * block. A brand shade referenced by a class but missing from `@theme`
 * silently renders as a Tailwind default (off-brand) or as nothing at all
 * (dead class), so every brand shade used in source must be defined.
 */

const BRAND_PALETTES = "navy|teal|cream|orange|yellow"
const UTILITY_PREFIXES =
    "text|bg|border|ring|divide|from|to|via|fill|stroke|outline|decoration|placeholder|accent|caret|shadow"

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) return sourceFiles(path)
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) return []
        return [path]
    })
}

describe("brand color tokens", () => {
    it("defines every brand shade used by a utility class in @theme", () => {
        const css = readFileSync(join(__dirname, "src/app/globals.css"), "utf8")
        const themeBlocks = [...css.matchAll(/@theme[^{]*\{([\s\S]*?)\n\}/g)]
            .map((match) => match[1])
            .join("\n")
        const defined = new Set(
            [...themeBlocks.matchAll(new RegExp(`--color-(${BRAND_PALETTES})-(\\d+)`, "g"))].map(
                (match) => `${match[1]}-${match[2]}`,
            ),
        )

        const used = new Set<string>()
        for (const file of sourceFiles(join(__dirname, "src"))) {
            const content = readFileSync(file, "utf8")
            const pattern = new RegExp(`(?:${UTILITY_PREFIXES})-(${BRAND_PALETTES})-(\\d+)`, "g")
            for (const match of content.matchAll(pattern)) {
                used.add(`${match[1]}-${match[2]}`)
            }
        }

        const missing = [...used].filter((shade) => !defined.has(shade)).sort()
        expect(missing).toEqual([])
    })
})
