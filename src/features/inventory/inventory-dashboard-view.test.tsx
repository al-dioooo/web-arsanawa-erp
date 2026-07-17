import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSession } from "@/features/auth/session-provider"
import { useInventoryDashboardSummary } from "@/features/inventory/inventory-api"
import { InventoryDashboardView } from "@/features/inventory/inventory-dashboard-view"
import type { InventoryDashboardSummary } from "@/features/inventory/inventory-types"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

// The view only consumes the query hook from the API module.
vi.mock("@/features/inventory/inventory-api", () => ({
    useInventoryDashboardSummary: vi.fn(),
}))

vi.mock("next-intl", () => ({
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "inventory.dashboard.eyebrow": "Inventory",
            "inventory.dashboard.title": "Dashboard Inventory",
            "inventory.dashboard.subtitle":
                "Pantau kesiapan katalog, SKU siap jual, nilai stok, dan pergerakan stok yang masih perlu ditindaklanjuti.",
            "inventory.dashboard.status.scoped": "Terhubung ke perusahaan",
            "inventory.dashboard.status.noCompany": "Belum ada perusahaan",
            "inventory.dashboard.newProduct": "Produk Baru",
            "inventory.dashboard.widgetError": "Data tidak dapat dimuat",
            "inventory.dashboard.statCards.products": "Produk",
            "inventory.dashboard.statCards.sellableSkus": "SKU Siap Jual",
            "inventory.dashboard.statCards.stockValue": "Nilai Stok",
            "inventory.dashboard.statCards.unsettledMovements": "Pergerakan Belum Selesai",
            "inventory.dashboard.statCards.activeCount": "{count} aktif",
            "inventory.dashboard.statCards.activeLots": "{count} lot aktif",
            "inventory.dashboard.statCards.ledgerRows": "{count} baris buku pergerakan",
            "inventory.dashboard.needsAttention.title": "Perlu Tindakan",
            "inventory.dashboard.needsAttention.unsettledMovements": "Pergerakan stok belum selesai",
            "inventory.dashboard.needsAttention.expiringLots": "Lot stok segera kedaluwarsa",
            "inventory.dashboard.needsAttention.allClear": "Semua beres",
            "inventory.dashboard.needsAttention.allClearHint": "Tidak ada yang perlu ditindaklanjuti saat ini.",
            "inventory.dashboard.quickActions.title": "Aksi Cepat",
            "inventory.dashboard.quickActions.openCatalogue": "Buka katalog",
            "inventory.nav.products": "Produk",
            "inventory.nav.categories": "Kategori Produk",
            "inventory.nav.brands": "Merek Produk",
            "inventory.nav.unitsOfMeasure": "Satuan Ukur",
            "inventory.nav.productUnits": "Satuan Produk",
            "inventory.nav.variantGroups": "Daftar Grup Varian",
            "inventory.nav.variantList": "Daftar Varian",
        }

        const template = labels[fullKey] ?? fullKey
        return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values?.[token] ?? ""))
    },
}))

type QueryLike = {
    data: InventoryDashboardSummary | undefined
    isLoading: boolean
    isError: boolean
}

function mockQuery(state: Partial<QueryLike> = {}) {
    vi.mocked(useInventoryDashboardSummary).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        ...state,
    } as unknown as ReturnType<typeof useInventoryDashboardSummary>)
}

function mockSession(activeCompanyId: number | null = 1) {
    vi.mocked(useSession).mockReturnValue({
        token: "token",
        activeCompanyId,
    } as unknown as ReturnType<typeof useSession>)
}

const summary: InventoryDashboardSummary = {
    counters: {
        products: { total: 12, active: 10, inactive: 2 },
        product_units: { total: 20, active: 18 },
        stock_lots: { active: 6, expiring_soon: 2 },
        stock_movements: { total: 40, unsettled: 3 },
        stock_value: "2500000.00",
    },
}

const zeroSummary: InventoryDashboardSummary = {
    counters: {
        products: { total: 0, active: 0, inactive: 0 },
        product_units: { total: 0, active: 0 },
        stock_lots: { active: 0, expiring_soon: 0 },
        stock_movements: { total: 0, unsettled: 0 },
        stock_value: "0.00",
    },
}

describe("InventoryDashboardView", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSession()
        mockQuery({ data: summary })
    })

    it("renders the header, KPI cards, attention rows, and quick actions when loaded", () => {
        render(<InventoryDashboardView />)

        // Title-on-background header with the primary action and scope pill.
        expect(screen.getByRole("heading", { name: "Dashboard Inventory" })).toBeInTheDocument()
        expect(screen.getByText("Terhubung ke perusahaan")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Produk Baru" })).toHaveAttribute(
            "href",
            "/inventory/master/products",
        )

        // KPI cards link into their pages; count-up renders the final value.
        expect(screen.getByRole("link", { name: /Produk 12/ })).toHaveAttribute(
            "href",
            "/inventory/master/products",
        )
        expect(screen.getByText("10 aktif")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: /SKU Siap Jual/ })).toHaveAttribute(
            "href",
            "/inventory/master/product-units",
        )
        expect(screen.getByRole("link", { name: /Nilai Stok/ })).toHaveAttribute("href", "/inventory/stock")
        expect(screen.getByText(/2\.500\.000/)).toBeInTheDocument()
        expect(screen.getByText("6 lot aktif")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: /Pergerakan Belum Selesai/ })).toHaveAttribute(
            "href",
            "/inventory/stock/movements",
        )
        expect(screen.getByText("40 baris buku pergerakan")).toBeInTheDocument()

        // Needs-attention rows for the non-zero counters.
        expect(screen.getByRole("link", { name: /Pergerakan stok belum selesai/ })).toHaveAttribute(
            "href",
            "/inventory/stock/movements",
        )
        expect(screen.getByRole("link", { name: /Lot stok segera kedaluwarsa/ })).toHaveAttribute(
            "href",
            "/inventory/stock/lots",
        )
        expect(screen.queryByText("Semua beres")).not.toBeInTheDocument()

        // Quick actions reuse the nav nouns and link into master data.
        expect(screen.getByRole("link", { name: "Produk" })).toHaveAttribute(
            "href",
            "/inventory/master/products",
        )
        expect(screen.getByRole("link", { name: "Kategori Produk" })).toHaveAttribute(
            "href",
            "/inventory/master/categories",
        )
        expect(screen.getByRole("link", { name: "Daftar Varian" })).toHaveAttribute(
            "href",
            "/inventory/master/variants",
        )
        expect(screen.getByRole("link", { name: "Buka katalog" })).toHaveAttribute(
            "href",
            "/inventory/catalogue",
        )
    })

    it("shows skeleton cards while the summary loads", () => {
        mockQuery({ isLoading: true })

        const { container } = render(<InventoryDashboardView />)

        expect(container.querySelectorAll('[data-slot="skeleton-card"]')).toHaveLength(4)
        expect(screen.getByText("Perlu Tindakan")).toBeInTheDocument()
        expect(screen.queryByText("Semua beres")).not.toBeInTheDocument()
        expect(screen.queryByText(/aktif/)).not.toBeInTheDocument()
    })

    it("shows per-card error states and hides the work queue on error", () => {
        mockQuery({ isError: true })

        render(<InventoryDashboardView />)

        expect(screen.getAllByText("Data tidak dapat dimuat")).toHaveLength(4)
        expect(screen.queryByText("Perlu Tindakan")).not.toBeInTheDocument()

        // The static header and quick actions survive the failure.
        expect(screen.getByRole("heading", { name: "Dashboard Inventory" })).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Kategori Produk" })).toBeInTheDocument()
    })

    it("renders zeros and the all-clear state for an all-zero summary", () => {
        mockQuery({ data: zeroSummary })

        render(<InventoryDashboardView />)

        expect(screen.getByRole("link", { name: /Produk 0/ })).toBeInTheDocument()
        expect(screen.getByText(/Rp\s*0/)).toBeInTheDocument()
        expect(screen.getByText("Semua beres")).toBeInTheDocument()
        expect(screen.queryByText("Pergerakan stok belum selesai")).not.toBeInTheDocument()
        expect(screen.queryByText("Lot stok segera kedaluwarsa")).not.toBeInTheDocument()
    })

    it("flags the missing company scope without firing the query", () => {
        mockSession(null)
        mockQuery()

        render(<InventoryDashboardView />)

        expect(vi.mocked(useInventoryDashboardSummary)).toHaveBeenCalledWith(false)
        expect(screen.getByText("Belum ada perusahaan")).toBeInTheDocument()
    })
})
