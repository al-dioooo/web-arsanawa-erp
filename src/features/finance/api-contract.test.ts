import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const sourceRoot = join(process.cwd(), "src")

describe("frontend API contract", () => {
    it("does not call finance routes that do not exist in Laravel", () => {
        const financeSources = [
            "features/finance/api-invoices.ts",
            "features/finance/api-bills.ts",
            "app/(app)/finance/ar/page.tsx",
            "app/(app)/finance/ap/page.tsx",
        ].map((path) => readFileSync(join(sourceRoot, path), "utf8"))

        expect(financeSources.join("\n")).not.toMatch(/\/api\/v1\/finance\/(?:ar-aging|ap-aging)/)
    })
})
