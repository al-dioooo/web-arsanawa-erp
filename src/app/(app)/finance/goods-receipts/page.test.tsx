import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import GoodsReceiptsPage from "./page"
import { useGoodsReceipts, type GoodsReceipt } from "@/features/finance/api-goods-receipt"

const push = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        activeCompanyId: 1,
    }),
}))

vi.mock("@/features/finance/api-goods-receipt", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/features/finance/api-goods-receipt")>()
    return { ...actual, useGoodsReceipts: vi.fn() }
})

vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "finance.goodsReceipts.filters.status.label": "Status",
            "finance.goodsReceipts.filters.status.received": "Received",
            "finance.goodsReceipts.pendingApLink": "Pending AP Link",
            "finance.goodsReceipts.billRef": "Bill #{id}",
        }
        const label = labels[fullKey] ?? fullKey
        return values
            ? Object.entries(values).reduce(
                  (text, [name, value]) => text.replace(`{${name}}`, String(value)),
                  label,
              )
            : label
    },
}))

function mockReceipts(receipts: GoodsReceipt[]) {
    vi.mocked(useGoodsReceipts).mockReturnValue({
        data: receipts,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGoodsReceipts>)
}

describe("goods receipts page", () => {
    it("renders real goods-receipt header fields", () => {
        mockReceipts([
            {
                id: 7,
                company_id: 1,
                branch_id: 1,
                receipt_number: "STB-20260710-ABC123",
                delivery_note_number: "SJ-2026-0007",
                partner_id: 3,
                partner: { id: 3, name: "Supplier Inc" },
                receipt_date: "2026-07-10",
                status: "received",
                total_cost: "300000.0000",
                item_count: 2,
                notes: null,
                bill_id: null,
                created_by: 1,
                created_at: null,
            },
        ])

        render(<GoodsReceiptsPage />)

        expect(screen.getByText("STB-20260710-ABC123")).toBeInTheDocument()
        expect(screen.getByText("Supplier Inc")).toBeInTheDocument()
        expect(screen.getByText("SJ-2026-0007")).toBeInTheDocument()
        expect(screen.getByText("2")).toBeInTheDocument() // item count
        // The status badge (a <span>), distinct from the filter's <option>Received.
        expect(screen.getByText("Received", { selector: "span" })).toBeInTheDocument()
        expect(screen.getByText("Pending AP Link")).toBeInTheDocument()
    })

    it("passes the selected status filter to the goods-receipts hook", () => {
        mockReceipts([])

        render(<GoodsReceiptsPage />)

        fireEvent.change(screen.getByLabelText("Status"), {
            target: { value: "void" },
        })

        expect(useGoodsReceipts).toHaveBeenLastCalledWith(1, expect.objectContaining({
            status: "void",
        }))
    })
})
