import { useQuery } from "@tanstack/react-query"

import { useSession } from "@/features/auth/session-provider"
import { loadPosDashboardSummary } from "@/features/pos/pos-api"

/*
 * Home-dashboard query wrappers around the plain module loaders. Finance has
 * no wrapper here — the home view reuses `useFinanceDashboardSummary` from
 * `@/features/finance/api` directly.
 *
 * Each hook is gated by `enabled` (the module entitlement) on top of session
 * readiness, so widgets for disabled modules never fire a request.
 */

// Inventory's hook lives with its module loaders (the inventory dashboard is
// its canonical consumer); re-exported here so home imports stay unchanged.
export { useInventoryDashboardSummary } from "@/features/inventory/inventory-api"

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
