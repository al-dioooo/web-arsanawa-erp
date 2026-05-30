"use client";

import { apiRequest, jsonBody } from "@/lib/api-client";
import type {
    Brand,
    Category,
    Discount,
    InventoryProduct,
    PriceList,
    ProductUnit,
    Reward,
    StockLot,
    StockMovement,
    UnitOfMeasure,
    VariantGroup,
    VariantMaster,
} from "@/features/inventory/inventory-types";

type InventoryRequestOptions = {
    token: string;
    companyId: number;
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

export async function loadInventory(options: InventoryRequestOptions) {
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
            apiRequest<{ price_lists: PriceList[] }>("/api/v1/inventory/price-lists", {}, options),
            apiRequest<{ discounts: Discount[] }>("/api/v1/inventory/discounts", {}, options).catch(
                () => ({ data: { discounts: [] }, message: "" }),
            ),
            apiRequest<{ rewards: Reward[] }>("/api/v1/inventory/rewards", {}, options).catch(() => ({
                data: { rewards: [] },
                message: "",
            })),
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

export async function loadStockSnapshot(
    options: InventoryRequestOptions,
    branchId: number | null,
    productVariantId: number | null,
) {
    const [lots, movements, valuation, level] = await Promise.all([
        apiRequest<{ lots: StockLot[] }>(
            `/api/v1/inventory/stock/lots${queryString({ branch_id: branchId })}`,
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
        branchId && productVariantId
            ? apiRequest<{ on_hand: string }>(
                    `/api/v1/inventory/stock/levels${queryString({
                        branch_id: branchId,
                        product_variant_id: productVariantId,
                    })}`,
                    {},
                    options,
                )
            : Promise.resolve({ data: { on_hand: "0.0000" }, message: "" }),
    ]);

    return {
        lots: lots.data.lots,
        movements: movements.data.movements,
        movementTotal: movements.data.pagination.total,
        totalValue: valuation.data.total_value,
        selectedOnHand: level.data.on_hand,
    };
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
        product_variant_id: number;
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
        product_variant_id: number
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
        product_variant_id: number
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
        items: Array<{ product_variant_id: number; quantity: number }>
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
    }
) {
    return apiRequest(
        "/api/v1/inventory/discounts",
        { method: "POST", body: jsonBody(input) },
        options
    )
}

export async function getDiscount(options: InventoryRequestOptions, discountId: number) {
    return apiRequest(
        `/api/v1/inventory/discounts/${discountId}`,
        {},
        options,
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
