"use client"

import { apiBaseUrl, apiRequest, jsonBody } from "@/lib/api-client"
import type {
    AddPaymentInput,
    CloseShiftInput,
    CreateRegisterInput,
    CreateSaleInput,
    OpenShiftInput,
    Pagination,
    PosDashboardSummary,
    Register,
    Sale,
    SalesReport,
    Shift,
    ShiftReport,
} from "@/features/pos/pos-types"
import type { Category, InventoryProduct } from "@/features/inventory/inventory-types"
import type { SpreadsheetImportResult } from "@/features/inventory/inventory-types"

export type PosRequestOptions = {
    token: string
    companyId: number
}

export async function loadPosDashboardSummary(options: PosRequestOptions) {
    const res = await apiRequest<PosDashboardSummary>("/api/v1/pos/dashboard", {}, options)
    return res.data
}

export type Customer = {
    id: number
    type: string
    name: string
    code: string | null
    phone: string | null
    status: string
}

export type PostableAccount = {
    id: number
    code: string
    name: string
    is_postable: boolean
}

export type ListSalesFilters = {
    status?: string
    type?: string
    branch_id?: number | null
    fulfilment_from?: string
    fulfilment_to?: string
    page?: number
    per_page?: number
}

function queryString(params: Record<string, string | number | null | undefined>): string {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            search.set(key, String(value))
        }
    })
    const value = search.toString()
    return value ? `?${value}` : ""
}

// --- Sales ----------------------------------------------------------------

export async function listSales(
    options: PosRequestOptions,
    filters: ListSalesFilters = {},
) {
    const res = await apiRequest<{ sales: Sale[]; pagination: Pagination }>(
        `/api/v1/pos/sales${queryString(filters)}`,
        {},
        options,
    )
    return res.data
}

export async function getSale(options: PosRequestOptions, saleId: number) {
    const res = await apiRequest<{ sale: Sale }>(`/api/v1/pos/sales/${saleId}`, {}, options)
    return res.data.sale
}

export async function createSale(options: PosRequestOptions, input: CreateSaleInput) {
    const res = await apiRequest<{ sale: Sale }>(
        "/api/v1/pos/sales",
        { method: "POST", body: jsonBody(input) },
        options,
    )
    return res.data.sale
}

export async function updateSale(
    options: PosRequestOptions,
    saleId: number,
    input: Partial<CreateSaleInput>,
) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
    return res.data.sale
}

export async function applyPromotions(options: PosRequestOptions, saleId: number) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/apply-promotions`,
        { method: "POST", body: jsonBody({}) },
        options,
    )
    return res.data.sale
}

export async function confirmOrder(options: PosRequestOptions, saleId: number) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/confirm`,
        { method: "POST", body: jsonBody({}) },
        options,
    )
    return res.data.sale
}

export async function completeSale(options: PosRequestOptions, saleId: number) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/complete`,
        { method: "POST", body: jsonBody({}) },
        options,
    )
    return res.data.sale
}

export async function voidSale(options: PosRequestOptions, saleId: number) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/void`,
        { method: "POST", body: jsonBody({}) },
        options,
    )
    return res.data.sale
}

export async function cancelSale(options: PosRequestOptions, saleId: number) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/cancel`,
        { method: "POST", body: jsonBody({}) },
        options,
    )
    return res.data.sale
}

export async function addSalePayment(
    options: PosRequestOptions,
    saleId: number,
    input: AddPaymentInput,
) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/payments`,
        { method: "POST", body: jsonBody(input) },
        options,
    )
    return res.data.sale
}

export async function removeSalePayment(
    options: PosRequestOptions,
    saleId: number,
    paymentId: number,
) {
    const res = await apiRequest<{ sale: Sale }>(
        `/api/v1/pos/sales/${saleId}/payments/${paymentId}`,
        { method: "DELETE" },
        options,
    )
    return res.data.sale
}

export type PosImportSourceInput = {
    file?: File
    sourceUrl?: string
}

export async function downloadPosImportTemplate(
    options: PosRequestOptions,
    format: "csv" | "xlsx",
): Promise<Blob> {
    const response = await fetch(`${apiBaseUrl()}/api/v1/pos/sales/imports/template.${format}`, {
        method: "GET",
        headers: {
            Accept: "application/octet-stream",
            Authorization: `Bearer ${options.token}`,
            "X-Company-Id": String(options.companyId),
        },
    })

    if (!response.ok) {
        throw new Error("Unable to download template.")
    }

    return response.blob()
}

export async function inspectPosImport(
    options: PosRequestOptions,
    input: PosImportSourceInput,
): Promise<SpreadsheetImportResult> {
    const form = new FormData()

    if (input.file) {
        form.set("file", input.file)
    } else if (input.sourceUrl) {
        form.set("source_url", input.sourceUrl)
    }

    const response = await apiRequest<SpreadsheetImportResult>(
        "/api/v1/pos/sales/imports/inspect",
        { method: "POST", body: form },
        options,
    )

    return response.data
}

export async function previewPosImport(
    options: PosRequestOptions,
    importId: number,
    sheetName: string,
): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        `/api/v1/pos/sales/imports/${importId}/preview`,
        { method: "POST", body: jsonBody({ sheet_name: sheetName }) },
        options,
    )

    return response.data
}

export async function previewConfiguredPosImport(options: PosRequestOptions): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        "/api/v1/pos/sales/imports/configured/preview",
        { method: "POST", body: jsonBody({}) },
        options,
    )

    return response.data
}

export async function commitPosImport(
    options: PosRequestOptions,
    importId: number,
): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        `/api/v1/pos/sales/imports/${importId}/commit`,
        { method: "POST", body: jsonBody({}) },
        options,
    )

    return response.data
}

export async function getPosImport(
    options: PosRequestOptions,
    importId: number,
): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        `/api/v1/pos/sales/imports/${importId}`,
        {},
        options,
    )

    return response.data
}

// --- Registers ------------------------------------------------------------

export async function listRegisters(options: PosRequestOptions) {
    const res = await apiRequest<{ registers: Register[]; pagination: Pagination }>(
        "/api/v1/pos/registers?per_page=100",
        {},
        options,
    )
    return res.data.registers
}

export async function createRegister(options: PosRequestOptions, input: CreateRegisterInput) {
    const res = await apiRequest<{ register: Register }>(
        "/api/v1/pos/registers",
        { method: "POST", body: jsonBody(input) },
        options,
    )
    return res.data.register
}

export async function updateRegister(
    options: PosRequestOptions,
    registerId: number,
    input: Partial<CreateRegisterInput>,
) {
    const res = await apiRequest<{ register: Register }>(
        `/api/v1/pos/registers/${registerId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
    return res.data.register
}

export async function deleteRegister(options: PosRequestOptions, registerId: number) {
    return apiRequest(`/api/v1/pos/registers/${registerId}`, { method: "DELETE" }, options)
}

// --- Shifts ---------------------------------------------------------------

export async function listShifts(options: PosRequestOptions) {
    const res = await apiRequest<{ shifts: Shift[]; pagination: Pagination }>(
        "/api/v1/pos/shifts?per_page=50",
        {},
        options,
    )
    return res.data.shifts
}

export async function getCurrentShift(options: PosRequestOptions, registerId?: number | null) {
    const res = await apiRequest<{ shift: Shift | null }>(
        `/api/v1/pos/shifts/current${queryString({ register_id: registerId })}`,
        {},
        options,
    )
    return res.data.shift
}

export async function openShift(options: PosRequestOptions, input: OpenShiftInput) {
    const res = await apiRequest<{ shift: Shift }>(
        "/api/v1/pos/shifts/open",
        { method: "POST", body: jsonBody(input) },
        options,
    )
    return res.data.shift
}

export async function closeShift(
    options: PosRequestOptions,
    shiftId: number,
    input: CloseShiftInput,
) {
    const res = await apiRequest<{ shift: Shift }>(
        `/api/v1/pos/shifts/${shiftId}/close`,
        { method: "POST", body: jsonBody(input) },
        options,
    )
    return res.data.shift
}

// --- Reports --------------------------------------------------------------

export async function getSalesReport(
    options: PosRequestOptions,
    filters: { from: string; to: string; branch_id?: number | null },
) {
    const res = await apiRequest<SalesReport>(
        `/api/v1/pos/reports/sales${queryString(filters)}`,
        {},
        options,
    )
    return res.data
}

export async function getShiftReport(options: PosRequestOptions, shiftId: number) {
    const res = await apiRequest<ShiftReport>(
        `/api/v1/pos/reports/shifts/${shiftId}`,
        {},
        options,
    )
    return res.data
}

// --- Cross-module loaders -------------------------------------------------

export async function loadProductsForSale(options: PosRequestOptions) {
    const [products, categories] = await Promise.all([
        apiRequest<{ products: InventoryProduct[]; pagination: Pagination }>(
            "/api/v1/inventory/products?per_page=100",
            {},
            options,
        ),
        apiRequest<{ categories: Category[] }>("/api/v1/inventory/categories", {}, options),
    ])
    return {
        products: products.data.products,
        categories: categories.data.categories,
    }
}

export async function resolveCompanyPrices(
    options: PosRequestOptions,
): Promise<Record<number, string>> {
    const res = await apiRequest<{ prices: { product_variant_id: number; price: string }[] }>(
        "/api/v1/inventory/prices/resolve",
        {},
        options,
    )
    return Object.fromEntries(
        res.data.prices.map((entry) => [entry.product_variant_id, entry.price]),
    )
}

export async function loadCustomers(options: PosRequestOptions): Promise<Customer[]> {
    const res = await apiRequest<{ partners: Customer[]; pagination: Pagination }>(
        "/api/v1/partners?type=customer&status=active&per_page=100",
        {},
        options,
    )
    return res.data.partners
}

export async function loadPostableAccounts(options: PosRequestOptions): Promise<PostableAccount[]> {
    const res = await apiRequest<{ accounts: PostableAccount[] }>(
        "/api/v1/finance/accounts",
        {},
        options,
    )
    // The COA endpoint may return a tree; flatten and keep only postable leaves.
    const flatten = (nodes: (PostableAccount & { children?: PostableAccount[] })[]): PostableAccount[] =>
        nodes.flatMap((node) => [
            node,
            ...(node.children ? flatten(node.children as (PostableAccount & { children?: PostableAccount[] })[]) : []),
        ])
    return flatten(res.data.accounts as (PostableAccount & { children?: PostableAccount[] })[]).filter(
        (account) => account.is_postable,
    )
}
