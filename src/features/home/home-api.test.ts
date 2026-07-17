import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSession } from "@/features/auth/session-provider"
import { useInventoryDashboardSummary, usePosDashboardSummary } from "@/features/home/home-api"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    })

    return createElement(QueryClientProvider, { client: queryClient }, children)
}

function mockSession(overrides: { token?: string | null; activeCompanyId?: number | null } = {}) {
    vi.mocked(useSession).mockReturnValue({
        token: "token-1",
        activeCompanyId: 7,
        ...overrides,
    } as unknown as ReturnType<typeof useSession>)
}

describe("home dashboard summary hooks", () => {
    beforeEach(() => {
        mockSession()
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ message: "OK", data: { counters: {} } }),
            }),
        )
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.clearAllMocks()
    })

    it("stays idle and fires no request while disabled", async () => {
        const { result } = renderHook(() => useInventoryDashboardSummary(false), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
        expect(fetch).not.toHaveBeenCalled()
    })

    it("loads the inventory dashboard summary when enabled", async () => {
        const { result } = renderHook(() => useInventoryDashboardSummary(true), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        const [url, init] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/inventory/dashboard")
        expect((init?.headers as Headers).get("X-Company-Id")).toBe("7")
        expect((init?.headers as Headers).get("Authorization")).toBe("Bearer token-1")
    })

    it("loads the POS dashboard summary when enabled", async () => {
        const { result } = renderHook(() => usePosDashboardSummary(true), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        const [url] = vi.mocked(fetch).mock.calls[0]
        expect(String(url)).toContain("/api/v1/pos/dashboard")
    })

    it("stays idle without an active company even when enabled", async () => {
        mockSession({ activeCompanyId: null })

        const { result } = renderHook(() => usePosDashboardSummary(true), { wrapper })

        await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
        expect(fetch).not.toHaveBeenCalled()
    })
})
