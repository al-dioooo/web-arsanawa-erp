import { describe, expect, it } from "vitest"
import { normalizeGoogleSheetsCsvUrl } from "@/features/platform/catering-form-import-config"

describe("normalizeGoogleSheetsCsvUrl", () => {
    it("converts a Google Sheets edit URL with gid hash into a CSV export URL", () => {
        expect(
            normalizeGoogleSheetsCsvUrl(
                "https://docs.google.com/spreadsheets/d/1SXmxOwiaxiKpl9r-JmlKV-1-0xIhS0EPaZK7aCkQAEM/edit?resourcekey=&gid=211#gid=2117219189",
            ),
        ).toBe(
            "https://docs.google.com/spreadsheets/d/1SXmxOwiaxiKpl9r-JmlKV-1-0xIhS0EPaZK7aCkQAEM/export?format=csv&gid=2117219189",
        )
    })

    it("keeps an existing Google Sheets CSV export URL normalized", () => {
        expect(
            normalizeGoogleSheetsCsvUrl(
                "https://docs.google.com/spreadsheets/d/sekalori/export?gid=9&format=csv",
            ),
        ).toBe("https://docs.google.com/spreadsheets/d/sekalori/export?format=csv&gid=9")
    })

    it("does not invent a gid when no gid is present", () => {
        expect(
            normalizeGoogleSheetsCsvUrl(
                "https://docs.google.com/spreadsheets/d/sekalori/edit?usp=sharing",
            ),
        ).toBe("https://docs.google.com/spreadsheets/d/sekalori/export?format=csv")
    })

    it("rejects non-Google-Sheets URLs", () => {
        expect(() => normalizeGoogleSheetsCsvUrl("https://example.com/orders.csv")).toThrow(
            "Enter a Google Sheets URL.",
        )
    })
})
