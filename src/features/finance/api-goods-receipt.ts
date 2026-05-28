import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"

// Mock type since this is an Inventory endpoint
export type StockReceipt = {
    id: number
    reference_number: string // No. STB
    received_at: string      // Tanggal
    partner_id: number       // Supplier
    lot_number: string       // No. SJ
    item_count: number
    status: 'received' | 'processed'
    created_at?: string
    partner?: {
        id: number
        name: string
    }
}

export function useGoodsReceipts(companyId: number | null) {
    return useQuery({
        queryKey: ['inventory', 'receipts', companyId],
        queryFn: () => {
            // Using a mock implementation for now until Inventory API is fully connected,
            // or we just call the endpoint assuming the backend has it.
            return apiRequest<{ movements?: StockReceipt[], data?: StockReceipt[] } | StockReceipt[]>('/api/v1/inventory/stock/movements?type=receipt')
                .then(res => {
                    if (Array.isArray(res.data)) return res.data
                    if (res.data && 'movements' in res.data) return res.data.movements || []
                    if (res.data && 'data' in res.data) return res.data.data || []
                    return []
                })
                .catch(() => []) // Fallback if inventory module isn't mounted locally
        },
        enabled: !!companyId,
    })
}
