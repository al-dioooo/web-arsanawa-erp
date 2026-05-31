// Money fields arrive from the API as decimal strings (e.g. "1500.0000").

export type SaleType = "counter" | "catering"

export type SaleStatus = "draft" | "confirmed" | "completed" | "void"

export type PaymentMethod = "cash" | "card" | "qris" | "transfer"

export type SaleLine = {
    id: number
    sale_id: number
    product_variant_id: number
    description: string | null
    quantity: string
    unit_price: string
    discount: string
    line_subtotal: string
    tax_amount: string
    line_total: string
    tax_rate_id: number | null
    revenue_account_id: number | null
    is_giveaway: boolean
}

export type SalePayment = {
    id: number
    sale_id: number
    method: PaymentMethod
    amount: string
    reference: string | null
    paid_at: string | null
}

export type SalePromotion = {
    id: number
    sale_id: number
    promotion_type: string
    promotion_id: number | null
    description: string | null
    amount: string
}

export type Sale = {
    id: number
    company_id: number
    branch_id: number
    register_id: number | null
    cashier_shift_id: number | null
    sale_number: string | null
    type: SaleType
    partner_id: number | null
    customer_name: string | null
    status: SaleStatus
    source: string | null
    source_channel: string | null
    external_reference: string | null
    external_api_key_id: number | null
    order_date: string | null
    fulfilment_date: string | null
    fulfilment_time_window: string | null
    delivery_address: string | null
    currency_id: number | null
    exchange_rate: string | null
    subtotal: string
    discount_total: string
    tax_total: string
    total: string
    amount_paid: string
    notes: string | null
    revenue_journal_entry_id: number | null
    cogs_journal_entry_id: number | null
    completed_at: string | null
    lines?: SaleLine[]
    payments?: SalePayment[]
    promotions?: SalePromotion[]
}

export type Register = {
    id: number
    company_id: number
    branch_id: number
    name: string
    code: string
    cash_account_id: number | null
    is_active: boolean
}

export type ShiftStatus = "open" | "closed"

export type Shift = {
    id: number
    company_id: number
    branch_id: number
    register_id: number
    user_id: number
    status: ShiftStatus
    opened_at: string | null
    closed_at: string | null
    opening_float: string
    expected_cash: string | null
    counted_cash: string | null
    cash_variance: string | null
    notes: string | null
}

export type Pagination = {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export type SalesReport = {
    from: string
    to: string
    total_sales: string
    sale_count: number
    by_type: Record<string, string>
    by_payment_method: Record<string, string>
}

export type ShiftReport = {
    shift_id: number
    register_id: number
    status: ShiftStatus
    opening_float: string
    cash_sales: string
    non_cash_sales: string
    expected_cash: string
    counted_cash: string | null
    cash_variance: string | null
}

export type PosDashboardSummary = {
    counters: {
        registers: {
            total: number
            active: number
        }
        shifts: {
            open: number
        }
        sales: {
            open: number
            today_count: number
            today_total: string
        }
    }
}

// --- Input payloads -------------------------------------------------------

export type SaleLineInput = {
    product_variant_id: number
    description?: string | null
    quantity: number
    unit_price?: number | null
    discount?: number | null
    tax_rate_id?: number | null
    revenue_account_id?: number | null
}

export type CreateSaleInput = {
    type: SaleType
    branch_id: number
    register_id?: number | null
    cashier_shift_id?: number | null
    sale_number?: string | null
    partner_id?: number | null
    customer_name?: string | null
    order_date?: string
    fulfilment_date?: string | null
    fulfilment_time_window?: string | null
    delivery_address?: string | null
    notes?: string | null
    lines: SaleLineInput[]
}

export type AddPaymentInput = {
    method: PaymentMethod
    amount: number
    reference?: string | null
    paid_at?: string | null
}

export type CreateRegisterInput = {
    name: string
    code: string
    branch_id: number
    cash_account_id?: number | null
    is_active?: boolean
}

export type OpenShiftInput = {
    register_id: number
    opening_float: number
    notes?: string | null
}

export type CloseShiftInput = {
    counted_cash: number
    notes?: string | null
}
