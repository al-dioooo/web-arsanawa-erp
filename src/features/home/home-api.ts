import { useQuery } from "@tanstack/react-query"

import { useSession } from "@/features/auth/session-provider"
import { loadInventoryDashboardSummary } from "@/features/inventory/inventory-api"
import { loadPosDashboardSummary } from "@/features/pos/pos-api"

/*
 * Home-dashboard query wrappers around the plain module loaders. Finance has
 * no wrapper here — the home view reuses `useFinanceDashboardSummary` from
 * `@/features/finance/api` directly.
 *
 * Each hook is gated by `enabled` (the module entitlement) on top of session
 * readiness, so widgets for disabled modules never fire a request.
 */

export function useInventoryDashboardSummary(enabled: boolean) {
    const { token, activeCompanyId } = useSession()

    return useQuery({
        queryKey: ["home", "inventory-dashboard", activeCompanyId],
        queryFn: () => {
            if (!token || !activeCompanyId) {
                throw new Error("Missing session context.")
            }
            return loadInventoryDashboardSummary({ token, companyId: activeCompanyId })
        },
        enabled: enabled && Boolean(token) && Boolean(activeCompanyId),
    })
}

export function usePosDashboardSummary(enabled: boolean) {
    const { token, activeCompanyId } = useSession()

    return useQuery({
        queryKey: ["home", "pos-dashboard", activeCompanyId],
        queryFn: () => {
            if (!token || !activeCompanyId) {
                throw new Error("Missing session context.")
            }
            return loadPosDashboardSummary({ token, companyId: activeCompanyId })
        },
        enabled: enabled && Boolean(token) && Boolean(activeCompanyId),
    })
}
