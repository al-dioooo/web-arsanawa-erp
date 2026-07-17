import { render, screen } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { useSession } from "@/features/auth/session-provider"
import { useFinanceDashboardSummary } from "@/features/finance/api"
import { HomeDashboardView } from "@/features/home/home-dashboard-view"
import { useInventoryDashboardSummary, usePosDashboardSummary } from "@/features/home/home-api"

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
beforeAll(() => {
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver
})

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/finance/api", () => ({
    useFinanceDashboardSummary: vi.fn(),
}))

vi.mock("@/features/home/home-api", () => ({
    useInventoryDashboardSummary: vi.fn(),
    usePosDashboardSummary: vi.fn(),
}))

vi.mock("next-intl", () => ({
    useFormatter: () => ({
        // The greeting eyebrow asks for a long weekday date; activity rows don't.
        dateTime: (_date: Date, options?: { weekday?: string }) =>
            options?.weekday ? "Kamis, 17 Juli 2026" : "16 Jul 2026",
    }),
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "home.greeting": "Hi {name},",
            "home.manageModules": "Kelola Modul",
            "home.viewAll": "Lihat semua",
            "home.widgetError": "Data tidak dapat dimuat",
            "home.transactionsCount": "{count} transaksi",
            "home.statCards.arOutstanding": "Piutang Usaha (AR)",
            "home.statCards.apOutstanding": "Hutang Usaha (AP)",
            "home.statCards.todaySales": "Penjualan Hari Ini",
            "home.statCards.stockValue": "Nilai Stok",
            "home.chart.title": "Pemasukan & Pengeluaran",
            "home.chart.subtitle": "Bulan ini",
            "home.chart.income": "Pemasukan",
            "home.chart.expense": "Pengeluaran",
            "home.chart.average": "Rata-rata",
            "home.needsAttention.title": "Perlu Tindakan",
            "home.needsAttention.pendingApprovals": "Persetujuan menunggu",
            "home.needsAttention.draftInvoices": "Faktur draf",
            "home.needsAttention.draftBills": "Tagihan draf",
            "home.needsAttention.unsettledMovements": "Pergerakan stok belum selesai",
            "home.needsAttention.expiringLots": "Lot stok segera kedaluwarsa",
            "home.needsAttention.openShifts": "Shift masih terbuka",
            "home.needsAttention.allClear": "Semua beres",
            "home.needsAttention.allClearHint": "Tidak ada yang perlu ditindaklanjuti saat ini.",
            "home.recentActivity.title": "Aktivitas Terbaru",
            "home.recentActivity.empty": "Belum ada aktivitas",
            "home.recentActivity.emptyHint": "Faktur dan tagihan terbaru akan muncul di sini.",
            "console.managing": "Mengelola operasional untuk {company}.",
            "console.selectOrganization": "Pilih organisasi untuk mengaktifkan ruang kerja.",
            "console.applications": "Aplikasi",
            "console.section": "Konsol",
            "console.activeCount": "{count} aktif",
            "common.open": "Open",
            "common.install": "Install",
            "modules.organization": "Organization",
            "modules.profile": "Profile",
            "modules.partners": "Partners",
            "modules.platformSettings": "Platform Settings",
            "modules.moduleManager": "Module Manager",
            "modules.apiKeys": "API Keys",
        }

        const template = labels[fullKey] ?? fullKey
        return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values?.[token] ?? ""))
    },
}))

type QueryLike<T> = { data: T | undefined; isLoading: boolean; isError: boolean }

function queryResult<T>(data: T | undefined, state: Partial<QueryLike<T>> = {}): QueryLike<T> {
    return { data, isLoading: false, isError: false, ...state }
}

const financeSummary = {
    counters: {
        ar_outstanding: "1500000.00",
        ap_outstanding: "750000.00",
        pending_approvals: 2,
        draft_invoices: 1,
        draft_bills: 0,
    },
    recent_activity: [
        { type: "invoice" as const, id: 11, number: "INV-2026-001", date: "2026-07-16", total: "250000.00", status: "posted" },
        { type: "bill" as const, id: 4, number: "BILL-2026-004", date: "2026-07-15", total: "100000.00", status: "draft" },
    ],
    income_expense_series: [
        { date: "2026-07-14", income: 100000, expense: 50000 },
        { date: "2026-07-15", income: 200000, expense: 80000 },
    ],
}

const inventorySummary = {
    counters: {
        products: { total: 12, active: 10, inactive: 2 },
        product_units: { total: 20, active: 18 },
        stock_lots: { active: 6, expiring_soon: 0 },
        stock_movements: { total: 40, unsettled: 3 },
        stock_value: "2500000.00",
    },
}

const posSummary = {
    counters: {
        registers: { total: 2, active: 1 },
        shifts: { open: 1 },
        sales: { open: 0, today_count: 5, today_total: "750000.00" },
    },
}

function mockSession({
    enabled = ["finance", "inventory", "pos"],
    hasCompany = true,
}: { enabled?: string[]; hasCompany?: boolean } = {}) {
    const company = {
        id: 1,
        name: "SEKALORI Catering",
        slug: "sekalori",
        legal_name: null,
        tax_identifier: null,
        status: "active",
    }
    const membership = {
        id: 1,
        company_id: 1,
        user_id: 1,
        branch_id: 1,
        role: "owner",
        status: "active",
        joined_at: null,
    }

    vi.mocked(useSession).mockReturnValue({
        token: "token",
        user: {
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "hello@al.is-a.dev",
            email_verified_at: null,
            is_developer: false,
        },
        profile: null,
        companies: hasCompany ? [{ company, membership }] : [],
        activeCompanyId: hasCompany ? 1 : null,
        organizationContext: hasCompany
            ? { company, branches: [], membership }
            : { company: null, branches: [], membership: null },
        modules: hasCompany
            ? { enabled, available: ["inventory", "finance", "pos"], company }
            : null,
    } as unknown as ReturnType<typeof useSession>)
}

function mockQueries({
    finance = queryResult(financeSummary),
    inventory = queryResult(inventorySummary),
    pos = queryResult(posSummary),
}: {
    finance?: QueryLike<typeof financeSummary>
    inventory?: QueryLike<typeof inventorySummary>
    pos?: QueryLike<typeof posSummary>
} = {}) {
    vi.mocked(useFinanceDashboardSummary).mockReturnValue(
        finance as unknown as ReturnType<typeof useFinanceDashboardSummary>,
    )
    vi.mocked(useInventoryDashboardSummary).mockReturnValue(
        inventory as unknown as ReturnType<typeof useInventoryDashboardSummary>,
    )
    vi.mocked(usePosDashboardSummary).mockReturnValue(
        pos as unknown as ReturnType<typeof usePosDashboardSummary>,
    )
}

describe("HomeDashboardView", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockSession()
        mockQueries()
    })

    it("renders four stat cards, the chart, and needs-attention rows with every module enabled", () => {
        render(<HomeDashboardView />)

        // Greeting header with the first name only and the admin action.
        expect(screen.getByText("Hi Alice,")).toBeInTheDocument()
        expect(screen.getByText("Kamis, 17 Juli 2026")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Kelola Modul" })).toHaveAttribute(
            "href",
            "/organization/modules",
        )

        // Stat cards link into their modules.
        expect(screen.getByRole("link", { name: /Piutang Usaha \(AR\)/ })).toHaveAttribute("href", "/finance/ar")
        expect(screen.getByRole("link", { name: /Hutang Usaha \(AP\)/ })).toHaveAttribute("href", "/finance/ap")
        expect(screen.getByRole("link", { name: /Penjualan Hari Ini/ })).toHaveAttribute("href", "/pos/sales")
        expect(screen.getByRole("link", { name: /Nilai Stok/ })).toHaveAttribute("href", "/inventory/stock")
        expect(screen.getByText("5 transaksi")).toBeInTheDocument()

        // Chart card.
        expect(screen.getByText("Pemasukan & Pengeluaran")).toBeInTheDocument()

        // Needs-attention rows for non-zero counters only.
        expect(screen.getByRole("link", { name: /Persetujuan menunggu/ })).toHaveAttribute(
            "href",
            "/finance/approval-requests",
        )
        expect(screen.getByRole("link", { name: /Faktur draf/ })).toHaveAttribute("href", "/finance/invoices")
        expect(screen.getByRole("link", { name: /Pergerakan stok belum selesai/ })).toHaveAttribute(
            "href",
            "/inventory/stock/movements",
        )
        expect(screen.getByRole("link", { name: /Shift masih terbuka/ })).toHaveAttribute("href", "/pos/shifts")
        expect(screen.queryByText("Tagihan draf")).not.toBeInTheDocument()
        expect(screen.queryByText("Lot stok segera kedaluwarsa")).not.toBeInTheDocument()
        expect(screen.queryByText("Semua beres")).not.toBeInTheDocument()

        // Recent activity feed.
        expect(screen.getByText("Aktivitas Terbaru")).toBeInTheDocument()
        expect(screen.getByRole("link", { name: /INV-2026-001/ })).toHaveAttribute("href", "/finance/invoices/11")
        expect(screen.getByRole("link", { name: /BILL-2026-004/ })).toHaveAttribute("href", "/finance/bills/4")
        expect(screen.getByRole("link", { name: /Lihat semua/ })).toHaveAttribute("href", "/finance/activity")

        // Launcher still present below the widgets.
        expect(screen.getByRole("heading", { name: "Aplikasi" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Konsol" })).toBeInTheDocument()
    })

    it("hides finance widgets entirely when the finance module is off", () => {
        mockSession({ enabled: ["inventory", "pos"] })
        mockQueries({ finance: queryResult<typeof financeSummary>(undefined) })

        render(<HomeDashboardView />)

        expect(screen.queryByText("Piutang Usaha (AR)")).not.toBeInTheDocument()
        expect(screen.queryByText("Hutang Usaha (AP)")).not.toBeInTheDocument()
        expect(screen.queryByText("Pemasukan & Pengeluaran")).not.toBeInTheDocument()
        expect(screen.queryByText("Aktivitas Terbaru")).not.toBeInTheDocument()

        // Non-finance widgets survive.
        expect(screen.getByText("Penjualan Hari Ini")).toBeInTheDocument()
        expect(screen.getByText("Nilai Stok")).toBeInTheDocument()
        expect(screen.getByText("Perlu Tindakan")).toBeInTheDocument()
    })

    it("renders the greeting and console tiles only without an active company", () => {
        mockSession({ hasCompany: false })
        mockQueries({
            finance: queryResult<typeof financeSummary>(undefined),
            inventory: queryResult<typeof inventorySummary>(undefined),
            pos: queryResult<typeof posSummary>(undefined),
        })

        render(<HomeDashboardView />)

        expect(screen.getByText("Hi Alice,")).toBeInTheDocument()
        expect(screen.getByText("Pilih organisasi untuk mengaktifkan ruang kerja.")).toBeInTheDocument()

        expect(screen.queryByText("Piutang Usaha (AR)")).not.toBeInTheDocument()
        expect(screen.queryByText("Perlu Tindakan")).not.toBeInTheDocument()
        expect(screen.queryByRole("heading", { name: "Aplikasi" })).not.toBeInTheDocument()
        expect(screen.queryByRole("link", { name: "Kelola Modul" })).not.toBeInTheDocument()

        // Console utilities remain reachable.
        expect(screen.getByRole("heading", { name: "Konsol" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Organization" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument()
    })

    it("shows per-widget empty states instead of crashing when a query errors", () => {
        mockQueries({ finance: queryResult<typeof financeSummary>(undefined, { isError: true }) })

        render(<HomeDashboardView />)

        // AR card + AP card + chart card + recent activity card.
        expect(screen.getAllByText("Data tidak dapat dimuat")).toHaveLength(4)

        // The rest of the dashboard still renders.
        expect(screen.getByText("Penjualan Hari Ini")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Aplikasi" })).toBeInTheDocument()
    })

    it("shows the all-clear state when nothing needs attention", () => {
        mockQueries({
            finance: queryResult({
                ...financeSummary,
                counters: {
                    ...financeSummary.counters,
                    pending_approvals: 0,
                    draft_invoices: 0,
                    draft_bills: 0,
                },
            }),
            inventory: queryResult({
                counters: {
                    ...inventorySummary.counters,
                    stock_movements: { total: 40, unsettled: 0 },
                    stock_lots: { active: 6, expiring_soon: 0 },
                },
            }),
            pos: queryResult({
                counters: {
                    ...posSummary.counters,
                    shifts: { open: 0 },
                },
            }),
        })

        render(<HomeDashboardView />)

        expect(screen.getByText("Semua beres")).toBeInTheDocument()
        expect(screen.queryByText("Persetujuan menunggu")).not.toBeInTheDocument()
        expect(screen.queryByText("Faktur draf")).not.toBeInTheDocument()
        expect(screen.queryByText("Shift masih terbuka")).not.toBeInTheDocument()
    })
})
