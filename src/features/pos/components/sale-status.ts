import { statusTone, type StatusTone } from "@/components/ui/status-badge"
import type { SaleStatus } from "@/features/pos/pos-types"

// Delegate to the shared status→tone map so a sale status renders the same tone
// as the equivalent status elsewhere (e.g. a voided document is neutral, not red).
export function saleStatusTone(status: SaleStatus): StatusTone {
    return statusTone(status)
}
