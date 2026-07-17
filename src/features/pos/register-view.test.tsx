import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RegisterView } from "@/features/pos/register-view"
import * as posApi from "@/features/pos/pos-api"
import type { Sale } from "@/features/pos/pos-types"

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams("sale_id=1"),
}))

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: () => ({
        token: "token-1",
        activeCompanyId: 1,
        activeBranchId: 1,
        companies: [
            {
                company: {
                    id: 1,
                    slug: "sekalori",
                    name: "SEKALORI Catering",
                },
            },
        ],
    }),
}))

vi.mock("@/features/pos/pos-api", () => ({
    addSalePayment: vi.fn(),
    applyPromotions: vi.fn(),
    cancelSale: vi.fn(),
    completeSale: vi.fn(),
    confirmOrder: vi.fn(),
    createSale: vi.fn(),
    getCurrentShift: vi.fn(),
    getSale: vi.fn(),
    listRegisters: vi.fn(),
    loadCustomers: vi.fn(),
    loadPosDashboardSummary: vi.fn(),
    loadProductsForSale: vi.fn(),
    openShift: vi.fn(),
    removeSalePayment: vi.fn(),
    resolveCompanyPrices: vi.fn(),
    updateSale: vi.fn(),
}))

const loadedSale: Sale = {
    id: 1,
    company_id: 1,
    branch_id: 1,
    register_id: 9,
    cashier_shift_id: null,
    sale_number: "IMP-001",
    type: "catering",
    partner_id: 5,
    customer_name: "Aldio Lisafron",
    status: "confirmed",
    source: "import",
    source_channel: "google_form",
    external_reference: "GFORM-1",
    external_api_key_id: null,
    order_date: "2026-05-31",
    fulfilment_date: "2026-06-01",
    fulfilment_time_window: "Batch 1 (09:00-11:00)",
    delivery_address: "Buitenzorg City C/4, RT 12/14, Pagelaran 16610",
    currency_id: 1,
    exchange_rate: "1.0000",
    subtotal: "150000.0000",
    discount_total: "0.0000",
    tax_total: "0.0000",
    total: "150000.0000",
    amount_paid: "150000.0000",
    notes: null,
    revenue_journal_entry_id: null,
    cogs_journal_entry_id: null,
    completed_at: null,
    lines: [
        {
            id: 10,
            sale_id: 1,
            product_variant_id: 100,
            description: "Japanese Catering Bundle",
            quantity: "1.0000",
            unit_price: "150000.0000",
            discount: "0.0000",
            line_subtotal: "150000.0000",
            tax_amount: "0.0000",
            line_total: "150000.0000",
            tax_rate_id: null,
            revenue_account_id: null,
            is_giveaway: false,
        },
    ],
    payments: [
        {
            id: 77,
            sale_id: 1,
            method: "transfer",
            amount: "150000.0000",
            reference: "https://drive.google.test/proof",
            paid_at: "2026-05-31",
        },
    ],
    promotions: [],
}

describe("RegisterView catering payments", () => {
    it("opens the payment completion dialog for a loaded SEKALORI catering sale", async () => {
        vi.mocked(posApi.loadProductsForSale).mockResolvedValue({
            categories: [],
            products: [
                {
                    id: 20,
                    company_id: 1,
                    category_id: null,
                    brand_id: null,
                    base_uom_id: 1,
                    name: "Japanese Bundle",
                    description: null,
                    track_stock: true,
                    attributes: null,
                    status: "active",
                    variants: [
                        {
                            id: 100,
                            product_id: 20,
                            company_id: 1,
                            sku: "SKL-BND-JPN",
                            barcode: null,
                            name: "Japanese Catering Bundle",
                            attributes: null,
                            purchase_uom_id: null,
                            purchase_conversion_factor: "1.0000",
                            is_active: true,
                        },
                    ],
                },
            ],
        })
        vi.mocked(posApi.loadCustomers).mockResolvedValue([
            {
                id: 5,
                type: "customer",
                name: "Aldio Lisafron",
                code: null,
                phone: "6285173075151",
                status: "active",
            },
        ])
        vi.mocked(posApi.loadPosDashboardSummary).mockResolvedValue({
            counters: {
                registers: { active: 0, total: 0 },
                shifts: { open: 0 },
                sales: { open: 1, today_total: "150000.0000", today_count: 1 },
            },
        } as Awaited<ReturnType<typeof posApi.loadPosDashboardSummary>>)
        vi.mocked(posApi.resolveCompanyPrices).mockResolvedValue({ 100: "150000.0000" })
        vi.mocked(posApi.getSale).mockResolvedValue(loadedSale)
        vi.mocked(posApi.completeSale).mockResolvedValue({
            ...loadedSale,
            status: "completed",
            completed_at: "2026-06-01T10:00:00Z",
        })

        render(<RegisterView />)

        const completeButton = await screen.findByRole("button", { name: "Complete sale" })
        fireEvent.click(completeButton)

        await waitFor(() => {
            expect(posApi.completeSale).toHaveBeenCalledWith({ token: "token-1", companyId: 1 }, 1)
        })

        // Prices resolve in one batch request per refresh, not one per variant.
        expect(vi.mocked(posApi.resolveCompanyPrices).mock.calls.length).toBe(
            vi.mocked(posApi.loadProductsForSale).mock.calls.length,
        )
    })
})
