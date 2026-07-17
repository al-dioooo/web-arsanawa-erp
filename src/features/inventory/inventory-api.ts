"use client";

import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/features/auth/session-provider";
import { ApiError, apiBaseUrl, apiRequest, jsonBody } from "@/lib/api-client";
import type {
    Brand,
    Category,
    Discount,
    InventoryProduct,
    InventoryDashboardSummary,
    Price,
    PriceList,
    ProductUnit,
    ProductImage,
    Reward,
    SpreadsheetImportResult,
    StockLot,
    StockMovement,
    UnitOfMeasure,
    VariantGroup,
    VariantMaster,
} from "@/features/inventory/inventory-types";

export type InventoryRequestOptions = {
    token: string;
    companyId: number;
};

type LoadInventoryOptions = {
    includePriceLists?: boolean;
    includePromotions?: boolean;
};

function queryString(params: Record<string, string | number | null | undefined>): string {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            search.set(key, String(value));
        }
    });

    const value = search.toString();

    return value ? `?${value}` : "";
}

export async function loadInventory(options: InventoryRequestOptions, loadOptions: LoadInventoryOptions = {}) {
    const [categories, brands, units, products, priceLists, discounts, rewards] =
        await Promise.all([
            apiRequest<{ categories: Category[] }>("/api/v1/inventory/categories", {}, options),
            apiRequest<{ brands: Brand[] }>("/api/v1/inventory/brands", {}, options),
            apiRequest<{ units: UnitOfMeasure[] }>("/api/v1/inventory/units-of-measure", {}, options),
            apiRequest<{ products: InventoryProduct[]; pagination: { total: number } }>(
                "/api/v1/inventory/products?per_page=50",
                {},
                options,
            ),
            loadOptions.includePriceLists
                ? optionalForbiddenResponse(
                        apiRequest<{ price_lists: PriceList[] }>("/api/v1/inventory/price-lists", {}, options),
                        { price_lists: [] },
                    )
                : Promise.resolve({ data: { price_lists: [] }, message: "" }),
            loadOptions.includePromotions
                ? optionalForbiddenResponse(
                        apiRequest<{ discounts: Discount[] }>("/api/v1/inventory/discounts", {}, options),
                        { discounts: [] },
                    )
                : Promise.resolve({ data: { discounts: [] }, message: "" }),
            loadOptions.includePromotions
                ? optionalForbiddenResponse(
                        apiRequest<{ rewards: Reward[] }>("/api/v1/inventory/rewards", {}, options),
                        { rewards: [] },
                    )
                : Promise.resolve({ data: { rewards: [] }, message: "" }),
        ]);

    return {
        categories: categories.data.categories,
        brands: brands.data.brands,
        units: units.data.units,
        products: products.data.products,
        productTotal: products.data.pagination.total,
        priceLists: priceLists.data.price_lists,
        discounts: discounts.data.discounts,
        rewards: rewards.data.rewards,
    };
}

// Per-entity loaders so views can fetch just the sets they render instead of
// the whole loadInventory bundle.
export async function listCategories(options: InventoryRequestOptions) {
    const response = await apiRequest<{ categories: Category[] }>("/api/v1/inventory/categories", {}, options);

    return { categories: response.data.categories };
}

export async function listBrands(options: InventoryRequestOptions) {
    const response = await apiRequest<{ brands: Brand[] }>("/api/v1/inventory/brands", {}, options);

    return { brands: response.data.brands };
}

export async function listUnitsOfMeasure(options: InventoryRequestOptions) {
    const response = await apiRequest<{ units: UnitOfMeasure[] }>("/api/v1/inventory/units-of-measure", {}, options);

    return { units: response.data.units };
}

export async function listProducts(options: InventoryRequestOptions) {
    const response = await apiRequest<{ products: InventoryProduct[]; pagination: { total: number } }>(
        "/api/v1/inventory/products?per_page=50",
        {},
        options,
    );

    return { products: response.data.products, productTotal: response.data.pagination.total };
}

async function optionalForbiddenResponse<T>(
    request: Promise<{ data: T; message: string }>,
    fallback: T,
): Promise<{ data: T; message: string }> {
    try {
        return await request
    } catch (caught) {
        if (caught instanceof ApiError && caught.status === 403) {
            return { data: fallback, message: "" }
        }

        throw caught
    }
}

export async function loadInventoryDashboardSummary(options: InventoryRequestOptions) {
    const response = await apiRequest<InventoryDashboardSummary>(
        "/api/v1/inventory/dashboard",
        {},
        options,
    )

    return response.data
}

/**
 * Canonical dashboard-summary query, shared by the inventory dashboard and
 * the home widgets (re-exported from `@/features/home/home-api`). `enabled`
 * layers the module entitlement on top of session readiness so widgets for
 * disabled modules never fire a request.
 */
export function useInventoryDashboardSummary(enabled: boolean) {
    const { token, activeCompanyId } = useSession()

    return useQuery({
        queryKey: ["inventory", "dashboard", activeCompanyId],
        queryFn: () => {
            if (!token || !activeCompanyId) {
                throw new Error("Missing session context.")
            }
            return loadInventoryDashboardSummary({ token, companyId: activeCompanyId })
        },
        enabled: enabled && Boolean(token) && Boolean(activeCompanyId),
    })
}

export async function loadStockSnapshot(
    options: InventoryRequestOptions,
    branchId: number | null,
    productUnitId: number | null,
) {
    const [lots, movements, valuation, level] = await Promise.all([
        apiRequest<{ lots: StockLot[]; pagination: { total: number } }>(
            `/api/v1/inventory/stock/lots${queryString({ branch_id: branchId, per_page: 1 })}`,
            {},
            options,
        ),
        apiRequest<{ movements: StockMovement[]; pagination: { total: number } }>(
            `/api/v1/inventory/stock/movements${queryString({ branch_id: branchId, per_page: 20 })}`,
            {},
            options,
        ),
        apiRequest<{ total_value: string }>(
            `/api/v1/inventory/stock/valuation${queryString({ branch_id: branchId })}`,
            {},
            options,
        ),
        branchId && productUnitId
            ? apiRequest<{ on_hand: string }>(
                    `/api/v1/inventory/stock/levels${queryString({
                        branch_id: branchId,
                        product_unit_id: productUnitId,
                    })}`,
                    {},
                    options,
                )
            : Promise.resolve({ data: { on_hand: "0.0000" }, message: "" }),
    ]);

    return {
        lotTotal: lots.data.pagination.total,
        movements: movements.data.movements,
        movementTotal: movements.data.pagination.total,
        totalValue: valuation.data.total_value,
        selectedOnHand: level.data.on_hand,
    };
}

export async function loadStockLots(
    options: InventoryRequestOptions,
    filters: {
        branch_id?: number | null
        product_unit_id?: number | null
        expiring_before?: string
        page?: number
        per_page?: number
    } = {},
) {
    const response = await apiRequest<{
        lots: StockLot[]
        pagination: { current_page: number; per_page: number; total: number; last_page: number }
    }>(
        `/api/v1/inventory/stock/lots${queryString(filters)}`,
        {},
        options,
    )

    return response.data
}

export async function loadStockMovements(
    options: InventoryRequestOptions,
    filters: { branch_id?: number | null; product_unit_id?: number | null; per_page?: number } = {},
) {
    const response = await apiRequest<{ movements: StockMovement[]; pagination: { total: number } }>(
        `/api/v1/inventory/stock/movements${queryString(filters)}`,
        {},
        options,
    )

    return {
        movements: response.data.movements,
        total: response.data.pagination.total,
    }
}

export async function getStockMovement(options: InventoryRequestOptions, movementId: number) {
    return apiRequest<{ movement: StockMovement }>(
        `/api/v1/inventory/stock/movements/${movementId}`,
        {},
        options,
    )
}

export async function createCategory(
    options: InventoryRequestOptions,
    input: string | { name: string; parent_id?: number | null; position?: number; is_active?: boolean },
) {
    const body = typeof input === "string" ? { name: input } : input

    return apiRequest(
        "/api/v1/inventory/categories",
        { method: "POST", body: jsonBody(body) },
        options,
    );
}

export async function updateCategory(
    options: InventoryRequestOptions,
    categoryId: number,
    input: { name?: string; position?: number; is_active?: boolean },
) {
    return apiRequest(
        `/api/v1/inventory/categories/${categoryId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function moveCategory(
    options: InventoryRequestOptions,
    categoryId: number,
    input: { parent_id: number | null },
) {
    return apiRequest(
        `/api/v1/inventory/categories/${categoryId}/move`,
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

/**
 * Save a category edit. `name`/`is_active` go through the update endpoint, but
 * reparenting is only accepted by the dedicated move endpoint, so call it when
 * (and only when) the parent actually changed.
 */
export async function saveCategoryDetails(
    options: InventoryRequestOptions,
    categoryId: number,
    input: { name?: string; is_active?: boolean; parent_id: number | null },
    originalParentId: number | null,
) {
    const result = await updateCategory(options, categoryId, {
        name: input.name,
        is_active: input.is_active,
    })

    if (input.parent_id !== originalParentId) {
        await moveCategory(options, categoryId, { parent_id: input.parent_id })
    }

    return result
}

export async function deleteCategory(options: InventoryRequestOptions, categoryId: number) {
    return apiRequest(
        `/api/v1/inventory/categories/${categoryId}`,
        { method: "DELETE" },
        options,
    )
}

export async function createBrand(options: InventoryRequestOptions, name: string) {
    return apiRequest(
        "/api/v1/inventory/brands",
        { method: "POST", body: jsonBody({ name }) },
        options,
    );
}

export async function updateBrand(
    options: InventoryRequestOptions,
    brandId: number,
    input: { name?: string; is_active?: boolean },
) {
    return apiRequest(
        `/api/v1/inventory/brands/${brandId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteBrand(options: InventoryRequestOptions, brandId: number) {
    return apiRequest(
        `/api/v1/inventory/brands/${brandId}`,
        { method: "DELETE" },
        options,
    )
}

export async function createUnit(options: InventoryRequestOptions, input: { name: string; code: string }) {
    return apiRequest(
        "/api/v1/inventory/units-of-measure",
        { method: "POST", body: jsonBody(input) },
        options,
    );
}

export async function updateUnit(
    options: InventoryRequestOptions,
    unitId: number,
    input: { name?: string; code?: string; is_active?: boolean },
) {
    return apiRequest(
        `/api/v1/inventory/units-of-measure/${unitId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteUnit(options: InventoryRequestOptions, unitId: number) {
    return apiRequest(
        `/api/v1/inventory/units-of-measure/${unitId}`,
        { method: "DELETE" },
        options,
    )
}

export async function listVariantGroups(options: InventoryRequestOptions) {
    return apiRequest<{ variant_groups: VariantGroup[] }>(
        "/api/v1/inventory/variant-groups",
        {},
        options,
    )
}

export async function createVariantGroup(
    options: InventoryRequestOptions,
    input: {
        name: string
        code: string
        unit_of_measure_id: number
        description?: string | null
        is_active?: boolean
    },
) {
    return apiRequest(
        "/api/v1/inventory/variant-groups",
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function getVariantGroup(options: InventoryRequestOptions, groupId: number) {
    return apiRequest<{ variant_group: VariantGroup }>(
        `/api/v1/inventory/variant-groups/${groupId}`,
        {},
        options,
    )
}

export async function updateVariantGroup(
    options: InventoryRequestOptions,
    groupId: number,
    input: {
        name?: string
        code?: string
        unit_of_measure_id?: number
        description?: string | null
        is_active?: boolean
    },
) {
    return apiRequest(
        `/api/v1/inventory/variant-groups/${groupId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteVariantGroup(options: InventoryRequestOptions, groupId: number) {
    return apiRequest(
        `/api/v1/inventory/variant-groups/${groupId}`,
        { method: "DELETE" },
        options,
    )
}

export async function listVariantMasters(
    options: InventoryRequestOptions,
    filters: { variant_group_id?: number } = {},
) {
    return apiRequest<{ variants: VariantMaster[] }>(
        `/api/v1/inventory/variants${queryString(filters)}`,
        {},
        options,
    )
}

export async function createVariantMaster(
    options: InventoryRequestOptions,
    input: {
        variant_group_id: number
        name: string
        code: string
        position?: number
        is_active?: boolean
    },
) {
    return apiRequest(
        "/api/v1/inventory/variants",
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function getVariantMaster(options: InventoryRequestOptions, variantId: number) {
    return apiRequest<{ variant: VariantMaster }>(
        `/api/v1/inventory/variants/${variantId}`,
        {},
        options,
    )
}

export async function updateVariantMaster(
    options: InventoryRequestOptions,
    variantId: number,
    input: {
        variant_group_id?: number
        name?: string
        code?: string
        position?: number
        is_active?: boolean
    },
) {
    return apiRequest(
        `/api/v1/inventory/variants/${variantId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteVariantMaster(options: InventoryRequestOptions, variantId: number) {
    return apiRequest(
        `/api/v1/inventory/variants/${variantId}`,
        { method: "DELETE" },
        options,
    )
}

export async function listProductUnits(
    options: InventoryRequestOptions,
    filters: {
        product_id?: number
        category_id?: number
        brand_id?: number
        status?: string
        search?: string
        per_page?: number
    } = {},
) {
    return apiRequest<{ product_units: ProductUnit[]; pagination: { total: number } }>(
        `/api/v1/inventory/product-units${queryString(filters)}`,
        {},
        options,
    )
}

export async function createProductUnit(
    options: InventoryRequestOptions,
    input: {
        product_id: number
        sku: string
        barcode?: string | null
        name?: string | null
        variant_ids?: number[]
        is_active?: boolean
    },
) {
    return apiRequest(
        "/api/v1/inventory/product-units",
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function getProductUnit(options: InventoryRequestOptions, productUnitId: number) {
    return apiRequest<{ product_unit: ProductUnit }>(
        `/api/v1/inventory/product-units/${productUnitId}`,
        {},
        options,
    )
}

export async function updateProductUnit(
    options: InventoryRequestOptions,
    productUnitId: number,
    input: {
        product_id?: number
        sku?: string
        barcode?: string | null
        name?: string | null
        variant_ids?: number[]
        is_active?: boolean
    },
) {
    return apiRequest(
        `/api/v1/inventory/product-units/${productUnitId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteProductUnit(options: InventoryRequestOptions, productUnitId: number) {
    return apiRequest(
        `/api/v1/inventory/product-units/${productUnitId}`,
        { method: "DELETE" },
        options,
    )
}

export async function createProduct(
    options: InventoryRequestOptions,
    input: {
        name: string;
        category_id?: number;
        brand_id?: number;
        base_uom_id: number;
        status?: string;
        variants?: Array<{ sku: string; name?: string }>;
    },
) {
    return apiRequest(
        "/api/v1/inventory/products",
        { method: "POST", body: jsonBody(input) },
        options,
    );
}

export async function getProduct(options: InventoryRequestOptions, productId: number) {
    return apiRequest<{ product: InventoryProduct }>(
        `/api/v1/inventory/products/${productId}`,
        {},
        options,
    )
}

export async function updateProduct(
    options: InventoryRequestOptions,
    productId: number,
    input: {
        name?: string
        description?: string | null
        base_uom_id?: number
        category_id?: number | null
        brand_id?: number | null
        track_stock?: boolean
        attributes?: Record<string, unknown> | null
        status?: string
    },
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteProduct(options: InventoryRequestOptions, productId: number) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}`,
        { method: "DELETE" },
        options,
    )
}

export type ImportSourceInput = {
    file?: File
    sourceUrl?: string
}

export async function downloadProductImportTemplate(
    options: InventoryRequestOptions,
    format: "csv" | "xlsx",
): Promise<Blob> {
    return downloadInventoryBlob(`/api/v1/inventory/products/imports/template.${format}`, options)
}

export async function inspectProductImport(
    options: InventoryRequestOptions,
    input: ImportSourceInput,
): Promise<SpreadsheetImportResult> {
    const form = new FormData()

    if (input.file) {
        form.set("file", input.file)
    } else if (input.sourceUrl) {
        form.set("source_url", input.sourceUrl)
    }

    const response = await apiRequest<SpreadsheetImportResult>(
        "/api/v1/inventory/products/imports/inspect",
        { method: "POST", body: form },
        options,
    )

    return response.data
}

export async function previewProductImport(
    options: InventoryRequestOptions,
    importId: number,
    sheetName: string,
): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        `/api/v1/inventory/products/imports/${importId}/preview`,
        { method: "POST", body: jsonBody({ sheet_name: sheetName }) },
        options,
    )

    return response.data
}

export async function commitProductImport(
    options: InventoryRequestOptions,
    importId: number,
): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        `/api/v1/inventory/products/imports/${importId}/commit`,
        { method: "POST", body: jsonBody({}) },
        options,
    )

    return response.data
}

export async function getProductImport(
    options: InventoryRequestOptions,
    importId: number,
): Promise<SpreadsheetImportResult> {
    const response = await apiRequest<SpreadsheetImportResult>(
        `/api/v1/inventory/products/imports/${importId}`,
        {},
        options,
    )

    return response.data
}

export async function uploadProductImage(
    options: InventoryRequestOptions,
    productId: number,
    input: { file?: File; remoteUrl?: string; altText?: string; isPrimary?: boolean },
) {
    const response = await apiRequest<{ image: ProductImage }>(
        `/api/v1/inventory/products/${productId}/images`,
        imageUploadRequest(input),
        options,
    )

    return response.data.image
}

export async function uploadProductUnitImage(
    options: InventoryRequestOptions,
    productUnitId: number,
    input: { file?: File; remoteUrl?: string; altText?: string; isPrimary?: boolean },
) {
    const response = await apiRequest<{ image: ProductImage }>(
        `/api/v1/inventory/product-units/${productUnitId}/images`,
        imageUploadRequest(input),
        options,
    )

    return response.data.image
}

export async function addVariant(
    options: InventoryRequestOptions,
    productId: number,
    input: {
        sku: string
        barcode?: string | null
        name?: string | null
        attributes?: Record<string, unknown> | null
        purchase_uom_id?: number | null
        purchase_conversion_factor?: number
        is_active?: boolean
    },
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}/variants`,
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function updateVariant(
    options: InventoryRequestOptions,
    productId: number,
    variantId: number,
    input: {
        sku?: string
        barcode?: string | null
        name?: string | null
        attributes?: Record<string, unknown> | null
        purchase_uom_id?: number | null
        purchase_conversion_factor?: number
        is_active?: boolean
    },
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}/variants/${variantId}`,
        { method: "PATCH", body: jsonBody(input) },
        options,
    )
}

export async function deleteVariant(
    options: InventoryRequestOptions,
    productId: number,
    variantId: number,
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}/variants/${variantId}`,
        { method: "DELETE" },
        options,
    )
}

export async function syncProductTags(
    options: InventoryRequestOptions,
    productId: number,
    tags: string[],
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}/tags`,
        { method: "PUT", body: jsonBody({ tags }) },
        options,
    )
}

export async function setVariantAvailability(
    options: InventoryRequestOptions,
    productId: number,
    variantId: number,
    input: { branch_id: number; is_available: boolean; is_exclusive?: boolean },
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}/variants/${variantId}/availability`,
        { method: "PUT", body: jsonBody(input) },
        options,
    )
}

export async function recordReceipt(
    options: InventoryRequestOptions,
    input: {
        branch_id: number;
        product_unit_id?: number;
        product_variant_id?: number;
        quantity: number;
        unit_cost: number;
        lot_number?: string;
        received_at: string;
        expiry_date?: string;
    },
) {
    return apiRequest(
        "/api/v1/inventory/stock/receipts",
        { method: "POST", body: jsonBody(input) },
        options,
    );
}

export async function recordIssue(
    options: InventoryRequestOptions,
    input: {
        branch_id: number
        product_unit_id?: number
        product_variant_id?: number
        quantity: number
        notes?: string | null
    },
) {
    return apiRequest(
        "/api/v1/inventory/stock/issues",
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function recordAdjustment(
    options: InventoryRequestOptions,
    input: {
        branch_id: number
        product_unit_id?: number
        product_variant_id?: number
        quantity: number
        unit_cost?: number
        notes?: string | null
    },
) {
    return apiRequest(
        "/api/v1/inventory/stock/adjustments",
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function recordTransfer(
    options: InventoryRequestOptions,
    input: {
        from_branch_id: number
        to_branch_id: number
        items: Array<{ product_unit_id?: number; product_variant_id?: number; quantity: number }>
        notes?: string | null
    },
) {
    return apiRequest(
        "/api/v1/inventory/stock/transfers",
        { method: "POST", body: jsonBody(input) },
        options,
    )
}

export async function createPriceList(
    options: InventoryRequestOptions,
    input: { name: string; branch_id?: number | null; is_default: boolean }
) {
    return apiRequest(
        "/api/v1/inventory/price-lists",
        { method: "POST", body: jsonBody(input) },
        options
    )
}

export async function setPrice(
    options: InventoryRequestOptions,
    priceListId: number,
    input: { product_variant_id: number; price: number; effective_from?: string }
) {
    return apiRequest(
        `/api/v1/inventory/price-lists/${priceListId}/prices`,
        { method: "PUT", body: jsonBody(input) },
        options
    )
}

export async function listPriceListPrices(
    options: InventoryRequestOptions,
    priceListId: number,
    params: { product_variant_id?: number } = {},
) {
    return apiRequest<{ prices: Price[] }>(
        `/api/v1/inventory/price-lists/${priceListId}/prices${queryString(params)}`,
        {},
        options,
    )
}

export async function resolveVariantPrice(
    options: InventoryRequestOptions,
    productId: number,
    variantId: number,
    input: { branch_id?: number | null; quantity?: number | null } = {},
) {
    return apiRequest(
        `/api/v1/inventory/products/${productId}/variants/${variantId}/price${queryString(input)}`,
        {},
        options,
    )
}

export async function createDiscount(
    options: InventoryRequestOptions,
    input: {
        name: string
        calculation_type: "percentage" | "amount"
        value: number
        effective_from: string
        effective_to?: string | null
        branch_id?: number | null
        min_quantity?: number | null
        starting_item_number?: number | null
        multiply?: boolean
        is_active?: boolean
        targets?: Array<{ target_type: "variant" | "product" | "category"; target_id: number }>
        dependencies?: Array<{ product_variant_id: number; required_quantity: number }>
        giveaways?: Array<{ product_variant_id: number; giveaway_quantity: number }>
    }
) {
    return apiRequest(
        "/api/v1/inventory/discounts",
        { method: "POST", body: jsonBody(input) },
        options
    )
}

export async function deleteDiscount(options: InventoryRequestOptions, discountId: number) {
    return apiRequest(
        `/api/v1/inventory/discounts/${discountId}`,
        { method: "DELETE" },
        options,
    )
}

export async function createReward(
    options: InventoryRequestOptions,
    input: {
        name: string
        calculation_type: "percentage" | "amount"
        value: number
        effective_from: string
        effective_to?: string | null
        branch_id?: number | null
        min_quantity?: number | null
        is_active?: boolean
    }
) {
    return apiRequest(
        "/api/v1/inventory/rewards",
        { method: "POST", body: jsonBody(input) },
        options
    )
}

export async function deleteReward(options: InventoryRequestOptions, rewardId: number) {
    return apiRequest(
        `/api/v1/inventory/rewards/${rewardId}`,
        { method: "DELETE" },
        options,
    )
}

function imageUploadRequest(input: {
    file?: File
    remoteUrl?: string
    altText?: string
    isPrimary?: boolean
}): RequestInit {
    if (input.file) {
        const form = new FormData()
        form.set("image", input.file)
        if (input.altText) form.set("alt_text", input.altText)
        if (input.isPrimary !== undefined) form.set("is_primary", input.isPrimary ? "1" : "0")

        return { method: "POST", body: form }
    }

    return {
        method: "POST",
        body: jsonBody({
            remote_url: input.remoteUrl,
            alt_text: input.altText,
            is_primary: input.isPrimary,
        }),
    }
}

async function downloadInventoryBlob(path: string, options: InventoryRequestOptions): Promise<Blob> {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
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
