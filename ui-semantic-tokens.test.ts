import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Ratchet: shared primitives must style with the semantic token layer only
 * (bg-surface, text-ink, border-line, …) so every primitive is dark-mode
 * safe by construction. Raw palette utilities are allowed only for the
 * sanctioned brand-accent exceptions listed below.
 *
 * Scope grows with the migration: today it covers src/components/ui/**;
 * extend SCOPES as pages are migrated (end state: all of src/).
 */

const SCOPES = ["src/components", "src/features", "src/app"]

// Raw shades any file may use on purpose (brand-stable, readable on both
// themes): brand pills, the accent button, and gradient brand moments.
const ALLOWED_RAW = new Set([
    "bg-teal-100",
    "text-teal-700",
    "bg-orange-100",
    "text-orange-700",
    "bg-orange-500",
    "hover:bg-orange-700",
    "to-teal-900",
])

// Deliberate brand moments that keep raw brand shades (marketing-style
// surfaces, not app chrome). Everything else must be semantic.
const ALLOWED_FILES = new Set([
    "src/app/(auth)/login/page.tsx",
    "src/app/(auth)/forgot-password/page.tsx",
    "src/app/(auth)/reset-password/page.tsx",
])

const OFF_BRAND = /(?:^|[\s"'`:])(?:text|bg|border|ring|divide|fill|stroke|outline|placeholder|from|to|via)-(?:rose|amber|emerald|indigo|sky|violet|purple|slate|zinc|gray|stone|neutral|red|green|blue|lime|fuchsia|pink|cyan)-\d+/g
const RAW_BRAND = /(?:^|[\s"'`:])((?:hover:|focus:|active:|group-hover:|dark:)?(?:text|bg|border|ring|divide|fill|stroke|outline|placeholder)-(?:navy|teal|orange|yellow|cream)-\d+(?:\/\d+)?)/g

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) return sourceFiles(path)
        if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) return []
        return [path]
    })
}

describe("semantic token ratchet", () => {
    for (const scope of SCOPES) {
        it(`${scope} uses semantic utilities only`, () => {
            const violations: string[] = []
            for (const file of sourceFiles(join(__dirname, scope))) {
                const relative = file.replace(__dirname + "/", "")
                if (ALLOWED_FILES.has(relative)) continue
                const content = readFileSync(file, "utf8")
                for (const match of content.matchAll(OFF_BRAND)) {
                    violations.push(`${file.replace(__dirname + "/", "")}: ${match[0].trim()}`)
                }
                for (const match of content.matchAll(RAW_BRAND)) {
                    const cls = match[1].replace(/^(hover|focus|active|group-hover|dark):/, "")
                    const full = match[1]
                    if (ALLOWED_RAW.has(cls) || ALLOWED_RAW.has(full)) continue
                    violations.push(`${file.replace(__dirname + "/", "")}: ${full}`)
                }
            }
            expect(violations).toEqual([])
        })
    }
})
