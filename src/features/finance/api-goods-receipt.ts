import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api-client"

// Goods receipts (Penerimaan Bahan Baku / STB) are inventory receiving documents.
// They live in the Inventory module but are surfaced under the Finance nav, so the
// hooks here target /api/v1/inventory/goods-receipts. Each line links back to the
// stock-receipt movement/lot it created.

export type GoodsReceiptLine = {
    id: number
    goods_receipt_id: number
    product_variant_id: number
    product_unit_id: number | null
    product_unit?: { id: number; name?: string; sku?: string } | null
    stock_lot_id: number | null
    stock_movement_id: number | null
    quantity: string
    unit_cost: string
    line_total: string
    lot_number: string | null
    expiry_date: string | null
    notes: string | null
}

export type GoodsReceipt = {
    id: number
    company_id: number
    branch_id: number | null
    receipt_number: string          // No. STB
    delivery_note_number: string | null  // No. SJ (supplier delivery note)
    partner_id: number
    partner?: {
        id: number
        name: string
    }
    receipt_date: string            // Tanggal (Y-m-d)
    status: 'received' | 'completed' | 'void'
    total_cost: string
    item_count: number | null
    notes: string | null
    bill_id: number | null          // forward link to a Finance vendor bill (AP), if matched
    created_by: number | null
    created_at: string | null
    lines?: GoodsReceiptLine[]
}

export type GoodsReceiptFilters = {
    status?: GoodsReceipt['status'] | ''
    partner_id?: number
    branch_id?: number
    start_date?: string
    end_date?: string
    per_page?: number
    page?: number
}

function queryString(filters: Record<string, string | number | null | undefined>): string {
    const params = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value))
        }
    })

    const query = params.toString()
    return query ? `?${query}` : ""
}

export async function fetchGoodsReceipts(filters: GoodsReceiptFilters = {}): Promise<GoodsReceipt[]> {
    const res = await apiRequest<{ goods_receipts: GoodsReceipt[] }>(
        `/api/v1/inventory/goods-receipts${queryString(filters)}`,
    )
    return res.data?.goods_receipts ?? []
}

export async function fetchGoodsReceipt(id: number | string): Promise<GoodsReceipt | null> {
    const res = await apiRequest<{ goods_receipt: GoodsReceipt }>(
        `/api/v1/inventory/goods-receipts/${id}`,
    )
    return res.data?.goods_receipt ?? null
}

export function useGoodsReceipts(companyId: number | null, filters: GoodsReceiptFilters = {}) {
    // Default to the API's max page size so the list isn't silently capped at 15.
    const effective: GoodsReceiptFilters = { per_page: 100, ...filters }
    return useQuery({
        queryKey: ['inventory', 'goods-receipts', companyId, effective],
        queryFn: () => fetchGoodsReceipts(effective),
        enabled: !!companyId,
    })
}

export function useGoodsReceipt(id: number | string | null) {
    return useQuery({
        queryKey: ['inventory', 'goods-receipt', id],
        queryFn: () => fetchGoodsReceipt(id as number | string),
        enabled: !!id,
    })
}
