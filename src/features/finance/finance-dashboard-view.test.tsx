import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { useSession } from "@/features/auth/session-provider"
import { useCOA, useFinanceDashboardSummary, usePeriods } from "@/features/finance/api"
import { useTrialBalance } from "@/features/finance/api-journals"
import { FinanceDashboardView } from "@/features/finance/finance-dashboard-view"
import { formatIDR } from "@/lib/format"

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
    useCOA: vi.fn(),
    useFinanceDashboardSummary: vi.fn(),
    usePeriods: vi.fn(),
}))

vi.mock("@/features/finance/api-journals", () => ({
    useTrialBalance: vi.fn(),
}))

vi.mock("next-intl", () => ({
    useFormatter: () => ({
        dateTime: () => "15 Jun 2026",
    }),
    useTranslations: (namespace?: string) => (key: string) => {
        const fullKey = namespace ? `${namespace}.${key}` : key
        const labels: Record<string, string> = {
            "finance.dashboard.eyebrow": "Finance",
            "finance.dashboard.title": "Dashboard",
            "finance.dashboard.subtitle": "Ringkasan posisi keuangan perusahaan.",
            "finance.dashboard.newInvoice": "Faktur Baru",
            "finance.dashboard.widgetError": "Data tidak dapat dimuat",
            "finance.dashboard.kpis.cashPosition": "Posisi Kas",
            "finance.dashboard.kpis.arOutstanding": "Piutang Usaha (AR)",
            "finance.dashboard.kpis.apOutstanding": "Hutang Usaha (AP)",
            "finance.dashboard.kpis.pendingApprovals": "Persetujuan Menunggu",
            "finance.dashboard.chart.title": "Pemasukan vs Pengeluaran",
            "finance.dashboard.chart.income": "Pemasukan",
            "finance.dashboard.chart.expense": "Pengeluaran",
            "finance.dashboard.chart.net": "Neto",
            "finance.dashboard.chart.average": "Rata-rata",
            "finance.dashboard.chart.from": "Dari",
            "finance.dashboard.chart.to": "Sampai",
            "finance.dashboard.chart.empty": "Tidak ada data pada rentang ini",
            "finance.dashboard.chart.emptyHint":
                "Tidak ada total faktur atau tagihan pada rentang tanggal ini.",
            "finance.dashboard.recentActivity.title": "Aktivitas Terbaru",
            "finance.dashboard.recentActivity.empty": "Belum ada aktivitas",
            "finance.dashboard.recentActivity.emptyHint":
                "Faktur dan tagihan terbaru akan muncul di sini.",
            "finance.dashboard.recentActivity.viewAll": "Lihat semua",
            "finance.dashboard.quickActions.title": "Aksi Cepat",
            "finance.dashboard.quickActions.newInvoice": "Faktur Baru",
            "finance.dashboard.quickActions.newBill": "Tagihan Baru",
            "finance.dashboard.quickActions.recordPayment": "Catat Pembayaran",
            "finance.dashboard.quickActions.recordReceipt": "Catat Penerimaan",
            "finance.dashboard.quickActions.journalEntry": "Entri Jurnal",
            "finance.dashboard.reports.title": "Laporan",
            "finance.dashboard.reports.trialBalance": "Neraca Saldo",
            "finance.dashboard.reports.incomeStatement": "Laporan Laba Rugi",
            "finance.dashboard.reports.taxReturns": "SPT Pajak",
            "common.companyScoped": "Company scoped",
            "common.noCompany": "No company",
        }

        return labels[fullKey] ?? fullKey
    },
}))

// Same shape as the module-level StatCard formatter in the view.
const idrFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
})

/**
 * Intl id-ID currency output uses a non-breaking space; testing-library's
 * default normalizer collapses it to a plain space on the element side only,
 * so expected strings must be normalized the same way to match.
 */
function asText(value: string): string {
    return value.replace(/\s/g, " ")
}

function idr(value: number): string {
    return asText(idrFormatter.format(value))
}

type QueryLike<T> = { data: T | undefined; isLoading: boolean; isError: boolean }

function queryResult<T>(data: T | undefined, state: Partial<QueryLike<T>> = {}): QueryLike<T> {
    return { data, isLoading: false, isError: false, ...state }
}

const accountsTree = [
    {
        id: 1,
        code: "1000",
        type: "asset",
        is_postable: false,
        children: [{ id: 2, code: "1100", type: "asset", is_postable: true }],
    },
    { id: 3, code: "4000", type: "revenue", is_postable: true },
]

const trialBalanceLines = [
    // Cash position = 5,000,000 - 1,000,000 on the postable asset account.
    { account_id: 2, debit: 5_000_000, credit: 1_000_000 },
    // Non-asset line must be excluded from the cash position.
    { account_id: 3, debit: 0, credit: 750_000 },
]

const periods = [
    {
        id: 4,
        company_id: 1,
        name: "June 2026",
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        status: "open",
        closed_at: null,
    },
]

const summaryData = {
    counters: {
        ar_outstanding: "125000.0000",
        ap_outstanding: "45000.0000",
        pending_approvals: 2,
        draft_invoices: 0,
        draft_bills: 0,
    },
    recent_activity: [
        {
            type: "invoice" as const,
            id: 11,
            number: "INV-2026-001",
            date: "2026-06-14",
            total: "250000.00",
            status: "posted",
        },
        {
            type: "bill" as const,
            id: 4,
            number: "BILL-2026-004",
            date: "2026-06-13",
            total: "100000.00",
            status: "draft",
        },
    ],
    income_expense_series: [
        { date: "2026-06-01", income: 100000, expense: 50000 },
        { date: "2026-06-02", income: 200000, expense: 80000 },
    ],
}

function mockQueries({
    coa = queryResult(accountsTree),
    periodsQuery = queryResult(periods),
    trialBalance = queryResult(trialBalanceLines),
    summary = queryResult(summaryData),
}: {
    coa?: QueryLike<typeof accountsTree>
    periodsQuery?: QueryLike<typeof periods>
    trialBalance?: QueryLike<typeof trialBalanceLines>
    summary?: QueryLike<typeof summaryData>
} = {}) {
    vi.mocked(useCOA).mockReturnValue(coa as unknown as ReturnType<typeof useCOA>)
    vi.mocked(usePeriods).mockReturnValue(periodsQuery as unknown as ReturnType<typeof usePeriods>)
    vi.mocked(useTrialBalance).mockReturnValue(
        trialBalance as unknown as ReturnType<typeof useTrialBalance>,
    )
    vi.mocked(useFinanceDashboardSummary).mockReturnValue(
        summary as unknown as ReturnType<typeof useFinanceDashboardSummary>,
    )
}

describe("FinanceDashboardView", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useSession).mockReturnValue({
            activeCompanyId: 1,
        } as unknown as ReturnType<typeof useSession>)
        mockQueries()
    })

    it("renders the header, KPI cards, chart, quick actions, and reports", () => {
        render(<FinanceDashboardView />)

        // Title-on-background header with the primary action and scope pill.
        expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
        expect(screen.getByText("Company scoped")).toBeInTheDocument()
        // Header primary action + the quick-action row both point at the form.
        const newInvoiceLinks = screen.getAllByRole("link", { name: "Faktur Baru" })
        expect(newInvoiceLinks).toHaveLength(2)
        for (const link of newInvoiceLinks) {
            expect(link).toHaveAttribute("href", "/finance/invoices/new")
        }

        // KPI cards link into their module pages and show formatted values.
        const cashCard = screen.getByRole("link", { name: /Posisi Kas/ })
        expect(cashCard).toHaveAttribute("href", "/finance/cash-bank")
        expect(within(cashCard).getByText(idr(4_000_000))).toBeInTheDocument()

        const arCard = screen.getByRole("link", { name: /Piutang Usaha \(AR\)/ })
        expect(arCard).toHaveAttribute("href", "/finance/ar")
        expect(within(arCard).getByText(idr(125_000))).toBeInTheDocument()

        const apCard = screen.getByRole("link", { name: /Hutang Usaha \(AP\)/ })
        expect(apCard).toHaveAttribute("href", "/finance/ap")
        expect(within(apCard).getByText(idr(45_000))).toBeInTheDocument()

        const approvalsCard = screen.getByRole("link", { name: /Persetujuan Menunggu/ })
        expect(approvalsCard).toHaveAttribute("href", "/finance/approval-requests")
        expect(within(approvalsCard).getByText("2")).toBeInTheDocument()

        // Chart card with income/expense/net totals over the visible series.
        const chart = screen.getByRole("region", { name: "Pemasukan vs Pengeluaran" })
        expect(within(chart).getByText(asText(formatIDR(300_000)))).toBeInTheDocument()
        expect(within(chart).getByText(asText(formatIDR(130_000)))).toBeInTheDocument()
        expect(within(chart).getByText(asText(formatIDR(170_000)))).toBeInTheDocument()

        // Recent activity feed.
        expect(screen.getByRole("link", { name: /INV-2026-001/ })).toHaveAttribute(
            "href",
            "/finance/invoices/11",
        )
        expect(screen.getByRole("link", { name: /BILL-2026-004/ })).toHaveAttribute(
            "href",
            "/finance/bills/4",
        )
        expect(screen.getByRole("link", { name: /Lihat semua/ })).toHaveAttribute(
            "href",
            "/finance/activity",
        )

        // Quick actions and report shortcuts.
        expect(screen.getByRole("link", { name: /Tagihan Baru/ })).toHaveAttribute(
            "href",
            "/finance/bills/new",
        )
        expect(screen.getByRole("link", { name: /Catat Pembayaran/ })).toHaveAttribute(
            "href",
            "/finance/payments/new",
        )
        expect(screen.getByRole("link", { name: /Catat Penerimaan/ })).toHaveAttribute(
            "href",
            "/finance/receipts/new",
        )
        expect(screen.getByRole("link", { name: /Entri Jurnal/ })).toHaveAttribute(
            "href",
            "/finance/journals/new",
        )
        expect(screen.getByRole("link", { name: /Neraca Saldo/ })).toHaveAttribute(
            "href",
            "/finance/reports/trial-balance",
        )
        expect(screen.getByRole("link", { name: /Laporan Laba Rugi/ })).toHaveAttribute(
            "href",
            "/finance/reports/profit-loss",
        )
        expect(screen.getByRole("link", { name: /SPT Pajak/ })).toHaveAttribute(
            "href",
            "/finance/tax-returns",
        )
    })

    describe("with a fixed clock", () => {
        beforeEach(() => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date(2026, 5, 15, 9, 0, 0))
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it("defaults the chart range to the current month", () => {
            render(<FinanceDashboardView />)

            expect(screen.getByLabelText("Dari")).toHaveValue("2026-06-01")
            expect(screen.getByLabelText("Sampai")).toHaveValue("2026-06-30")
            expect(useFinanceDashboardSummary).toHaveBeenCalledWith(1, {
                start_date: "2026-06-01",
                end_date: "2026-06-30",
            })
        })

        it("passes changed dashboard dates to the summary hook", () => {
            render(<FinanceDashboardView />)

            fireEvent.change(screen.getByLabelText("Dari"), { target: { value: "2026-06-10" } })
            fireEvent.change(screen.getByLabelText("Sampai"), { target: { value: "2026-06-20" } })

            expect(useFinanceDashboardSummary).toHaveBeenLastCalledWith(1, {
                start_date: "2026-06-10",
                end_date: "2026-06-20",
            })
        })
    })

    it("shows skeletons while the dashboard queries load", () => {
        mockQueries({
            coa: queryResult<typeof accountsTree>(undefined, { isLoading: true }),
            trialBalance: queryResult<typeof trialBalanceLines>(undefined, { isLoading: true }),
            summary: queryResult<typeof summaryData>(undefined, { isLoading: true }),
        })

        const { container } = render(<FinanceDashboardView />)

        // All four KPI tiles render as skeleton cards.
        expect(container.querySelectorAll('[data-slot="skeleton-card"]')).toHaveLength(4)

        // The chart body is a skeleton instead of the Recharts plot.
        const chart = screen.getByRole("region", { name: "Pemasukan vs Pengeluaran" })
        expect(chart.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    })

    it("shows per-widget error states instead of crashing when the summary fails", () => {
        mockQueries({
            summary: queryResult<typeof summaryData>(undefined, { isError: true }),
        })

        render(<FinanceDashboardView />)

        // AR + AP + approvals cards, the chart card, and recent activity.
        expect(screen.getAllByText("Data tidak dapat dimuat")).toHaveLength(5)

        // The cash-position card (separate queries) still renders its value.
        expect(screen.getByText(idr(4_000_000))).toBeInTheDocument()

        // Navigation cards survive.
        expect(screen.getByText("Aksi Cepat")).toBeInTheDocument()
        expect(screen.getByText("Laporan")).toBeInTheDocument()
    })

    it("shows empty states when the range has no data", () => {
        mockQueries({
            summary: queryResult({
                ...summaryData,
                recent_activity: [],
                income_expense_series: [],
            }),
        })

        render(<FinanceDashboardView />)

        expect(screen.getByText("Tidak ada data pada rentang ini")).toBeInTheDocument()
        expect(screen.getByText("Belum ada aktivitas")).toBeInTheDocument()
    })
})
