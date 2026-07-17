import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Dark mode lives entirely in the semantic token layer of globals.css.
 * A semantic var defined on :root but missing from .dark silently renders
 * with its light value in dark mode, so every theme-flipping var must have
 * a .dark override.
 *
 * The shadcn aliases (--background, --card, …) are excluded: they reference
 * semantic vars and flip transitively.
 */

const SEMANTIC_PREFIXES = /^--(canvas|surface|surface-raised|surface-muted|overlay|ink|line|brand|status-|sh-|skeleton)/

function extractBlock(css: string, selector: string): string {
    const match = css.match(new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`))
    if (!match) throw new Error(`No ${selector} block found in globals.css`)
    return match[1]
}

function varNames(block: string): Set<string> {
    return new Set([...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
}

describe("dark theme parity", () => {
    const css = readFileSync(join(__dirname, "src/app/globals.css"), "utf8")
    // Skip the print override at the end of the file: match the first blocks.
    const rootVars = varNames(extractBlock(css, ":root"))
    const darkVars = varNames(extractBlock(css, ".dark"))

    it("overrides every :root semantic var in .dark", () => {
        const semantic = [...rootVars].filter((name) => SEMANTIC_PREFIXES.test(name))
        const missing = semantic.filter((name) => !darkVars.has(name)).sort()
        expect(semantic.length).toBeGreaterThan(15)
        expect(missing).toEqual([])
    })

    it("does not invent semantic vars in .dark that :root lacks", () => {
        const extra = [...darkVars].filter((name) => !rootVars.has(name)).sort()
        expect(extra).toEqual([])
    })
})
