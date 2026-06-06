import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useInvoices } from "@/features/finance/api-invoices"
import { usePayments } from "@/features/finance/api-payments"

function wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    })

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe("finance list date filters", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "OK",
                    data: { invoices: [], payments: [] },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("loads invoices with invoice date range query parameters", async () => {
        const { result } = renderHook(
            () => useInvoices(1, { start_date: "2026-06-01", end_date: "2026-06-30" }),
            { wrapper },
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/finance/invoices?")
        expect(String(url)).toContain("start_date=2026-06-01")
        expect(String(url)).toContain("end_date=2026-06-30")
    })

    it("loads payments with payment type and date range query parameters", async () => {
        const { result } = renderHook(
            () => usePayments(1, {
                payment_type: "outbound",
                start_date: "2026-06-01",
                end_date: "2026-06-30",
            }),
            { wrapper },
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/finance/payments?")
        expect(String(url)).toContain("payment_type=outbound")
        expect(String(url)).toContain("start_date=2026-06-01")
        expect(String(url)).toContain("end_date=2026-06-30")
    })
})
