import { render } from "@testing-library/react"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"
import { Icon } from "@/components/ui/icon"
import { isNavGroup, moduleRegistry } from "@/lib/modules/registry"

const sourceRoot = join(process.cwd(), "src")
const blockedClassPrefix = ["lucide", ""].join("-")
const blockedImport = ["lucide", "react"].join("-")
const blockedGeneratedImports = [
    ["outline", "jsx"].join("."),
    ["filled", "jsx"].join("."),
]

const inventoryMenuIconNames = moduleRegistry
    .find((module) => module.key === "inventory")
    ?.nav.flatMap((item) => (isNavGroup(item) ? item.items : [item]))
    .map((item) => item.icon) ?? []

function sourceFiles(dir = sourceRoot): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        const relativePath = relative(sourceRoot, path)
        const stat = statSync(path)

        if (stat.isDirectory()) {
            if (relativePath.startsWith("components/icons")) return []
            return sourceFiles(path)
        }

        if (!/\.(ts|tsx)$/.test(entry)) return []
        if (/\.test\.(ts|tsx)$/.test(entry)) return []

        return [path]
    })
}

function sourceText(path: string) {
    return readFileSync(path, "utf8")
}

function staticIconAliases() {
    const aliases = new Set<string>()
    const aliasPattern = /^[a-z][a-z0-9_]*$/

    for (const file of sourceFiles()) {
        const text = sourceText(file)

        for (const match of text.matchAll(/icon:\s*["']([^"']+)["']/g)) {
            const alias = match[1]
            if (aliasPattern.test(alias)) aliases.add(alias)
        }

        for (const match of text.matchAll(/<Icon\b[^>]*>/g)) {
            const tag = match[0]
            const directName = tag.match(/\bname=["']([^"']+)["']/)
            if (directName?.[1] && aliasPattern.test(directName[1])) aliases.add(directName[1])

            const expressionName = tag.match(/\bname=\{([^}]*)\}/)
            if (!expressionName) continue

            for (const expressionAlias of expressionName[1].matchAll(/[?:]\s*["']([^"']+)["']/g)) {
                const alias = expressionAlias[1]
                if (aliasPattern.test(alias)) aliases.add(alias)
            }
        }
    }

    return [...aliases].sort()
}

function svgSignature(svg: SVGSVGElement | null) {
    return svg?.innerHTML.replace(/\s+/g, " ").trim() ?? ""
}

describe("Icon", () => {
    it("falls back safely for unknown aliases with a Tabler icon", () => {
        const { container } = render(<Icon name="unknown-icon-alias" />)
        const svg = container.querySelector("svg")

        expect(svg).toBeInTheDocument()
        expect(svg?.getAttribute("class") ?? "").not.toContain(blockedClassPrefix)
    })

    it("renders every Inventory module menu alias as a Tabler icon", () => {
        expect(inventoryMenuIconNames).not.toHaveLength(0)

        for (const iconName of inventoryMenuIconNames) {
            const { container, unmount } = render(<Icon name={iconName} />)
            const svg = container.querySelector("svg")

            expect(svg, iconName).toBeInTheDocument()
            expect(svg?.getAttribute("class") ?? "", iconName).not.toContain(blockedClassPrefix)

            unmount()
        }
    })

    it("renders every static app icon alias as a concrete Tabler icon", () => {
        const aliases = staticIconAliases()
        const fallback = render(<Icon name="unknown-icon-alias" />)
        const fallbackSignature = svgSignature(fallback.container.querySelector("svg"))
        fallback.unmount()

        expect(aliases.length).toBeGreaterThan(40)

        for (const iconName of aliases) {
            const { container, unmount } = render(<Icon name={iconName} />)
            const svg = container.querySelector("svg")

            expect(svg, iconName).toBeInTheDocument()
            expect(svgSignature(svg), iconName).not.toBe(fallbackSignature)
            expect(svg?.getAttribute("class") ?? "", iconName).not.toContain(blockedClassPrefix)

            unmount()
        }
    })

    it("preserves svg sizing, classes, accessibility, and passthrough props", () => {
        const { container } = render(
            <Icon name="search" size={18} className="text-navy-400" data-testid="search-icon" strokeWidth={2} />,
        )
        const svg = container.querySelector("svg")

        expect(svg).toHaveAttribute("width", "18")
        expect(svg).toHaveAttribute("height", "18")
        expect(svg).toHaveClass("inline-block")
        expect(svg).toHaveClass("text-navy-400")
        expect(svg).toHaveAttribute("aria-hidden", "true")
        expect(svg).toHaveAttribute("data-testid", "search-icon")
        expect(svg).toHaveAttribute("stroke-width", "2")
    })

    it("keeps app source free of Lucide imports and generated JSX icon references", () => {
        const violations = sourceFiles().flatMap((file) => {
            const text = sourceText(file)
            const markers = [blockedImport, ...blockedGeneratedImports]
            return markers
                .filter((marker) => text.includes(marker))
                .map((marker) => `${relative(process.cwd(), file)} contains ${marker}`)
        })

        expect(violations).toEqual([])
    })
})
