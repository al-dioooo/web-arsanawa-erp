import type { SaleStatus } from "@/features/pos/pos-types"

export function saleStatusTone(status: SaleStatus): "green" | "amber" | "red" | "neutral" {
    switch (status) {
        case "completed":
            return "green"
        case "confirmed":
            return "amber"
        case "void":
            return "red"
        default:
            return "neutral"
    }
}
