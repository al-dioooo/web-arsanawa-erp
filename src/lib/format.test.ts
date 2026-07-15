import { describe, expect, it } from "vitest"
import { formatIDR } from "@/lib/format"

describe("formatIDR", () => {
    it("formats finite amounts as whole-rupiah currency", () => {
        expect(formatIDR(1500)).toContain("1.500")
        expect(formatIDR("2500.0000")).toContain("2.500")
    })

    it("never renders NaN for missing or invalid input", () => {
        expect(formatIDR(Number.NaN)).not.toContain("NaN")
        expect(formatIDR(undefined)).not.toContain("NaN")
        expect(formatIDR(null)).not.toContain("NaN")
    })
})
