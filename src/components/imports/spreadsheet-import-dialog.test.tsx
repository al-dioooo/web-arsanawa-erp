import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SpreadsheetImportDialog } from "@/components/imports/spreadsheet-import-dialog"
import type { SpreadsheetImportResult } from "@/features/inventory/inventory-types"

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
    },
}))

const previewResult: SpreadsheetImportResult = {
    import: {
        id: 88,
        kind: "pos_catering_orders",
        source: "url",
        status: "previewed",
        row_count: 1,
        error_count: 0,
    },
    rows: [
        {
            id: 501,
            row_number: 2,
            normalized: {
                customer_name: "Budi Santoso",
                sku: "SKL-BND-IDN",
            },
            errors: {},
        },
    ],
    sheets: [],
}

const configuredPreviewWithSheetsResult: SpreadsheetImportResult = {
    ...previewResult,
    sheets: [
        {
            name: "google-sheet.csv",
            supported: true,
            row_count: 1,
            reason: null,
        },
    ],
}

describe("SpreadsheetImportDialog", () => {
    it("previews configured Google Form imports and commits the returned batch", async () => {
        const previewConfigured = vi.fn().mockResolvedValue(previewResult)
        const commit = vi.fn().mockResolvedValue({
            ...previewResult,
            import: { ...previewResult.import, status: "completed" },
        })
        const onCommitted = vi.fn()

        render(
            <SpreadsheetImportDialog
                open
                onClose={vi.fn()}
                title="Import Catering Orders"
                description="Preview configured orders."
                operations={{
                    downloadTemplate: vi.fn(),
                    inspect: vi.fn(),
                    preview: vi.fn(),
                    previewConfigured,
                    commit,
                }}
                configuredImportSettingsHref="/platform/settings"
                onCommitted={onCommitted}
            />,
        )

        expect(screen.getByRole("link", { name: "Configure sheet URL" })).toHaveAttribute(
            "href",
            "/platform/settings",
        )

        fireEvent.click(screen.getByRole("button", { name: "Use Configured Google Form" }))

        await waitFor(() => expect(previewConfigured).toHaveBeenCalledTimes(1))
        expect(screen.getByText("previewed")).toBeInTheDocument()
        expect(screen.getByText("1 rows · 0 errors")).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Queue import" }))

        await waitFor(() => expect(commit).toHaveBeenCalledWith(88))
        expect(onCommitted).toHaveBeenCalledTimes(1)
    })

    it("does not show the generic sheet preview action after configured Google Form preview", async () => {
        render(
            <SpreadsheetImportDialog
                open
                onClose={vi.fn()}
                title="Import Catering Orders"
                description="Preview configured orders."
                operations={{
                    downloadTemplate: vi.fn(),
                    inspect: vi.fn(),
                    preview: vi.fn(),
                    previewConfigured: vi.fn().mockResolvedValue(configuredPreviewWithSheetsResult),
                    commit: vi.fn(),
                }}
            />,
        )

        fireEvent.click(screen.getByRole("button", { name: "Use Configured Google Form" }))

        await waitFor(() => expect(screen.getByText("previewed")).toBeInTheDocument())
        expect(screen.queryByRole("button", { name: "Preview import" })).not.toBeInTheDocument()
        expect(screen.queryByLabelText("Sheet page")).not.toBeInTheDocument()
    })
})
