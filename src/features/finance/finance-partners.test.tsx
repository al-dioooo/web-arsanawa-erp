import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { usePartners } from "@/features/finance/api-invoices"

function wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    })

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe("finance partner loading", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    message: "Partners retrieved.",
                    data: {
                        partners: [
                            {
                                id: 9,
                                company_id: 1,
                                type: "customer",
                                name: "SEKALORI Customer",
                                code: "CUST-001",
                                email: null,
                                phone: null,
                                tax_identifier: null,
                                national_id: null,
                                credit_limit: null,
                                transaction_limit: null,
                                status: "active",
                                notes: null,
                            },
                        ],
                        pagination: { current_page: 1, last_page: 1, per_page: 100, total: 1 },
                    },
                }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("loads partners from the Partners API with type and active status filters", async () => {
        const { result } = renderHook(() => usePartners(1, "customer"), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual([
            expect.objectContaining({ id: 9, name: "SEKALORI Customer" }),
        ])
        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/partners?")
        expect(String(url)).toContain("type=customer")
        expect(String(url)).toContain("status=active")
        expect(String(url)).toContain("per_page=100")
    })
})
