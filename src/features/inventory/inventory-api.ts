"use client";

import { apiRequest, jsonBody } from "@/lib/api-client";
import type {
    Brand,
    Category,
    Discount,
    InventoryProduct,
    PriceList,
    Reward,
    StockLot,
    StockMovement,
    UnitOfMeasure,
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

export async function createCategory(options: InventoryRequestOptions, name: string) {
    return apiRequest(
        "/api/v1/inventory/categories",
        { method: "POST", body: jsonBody({ name }) },
        options,
    );
}

export async function createBrand(options: InventoryRequestOptions, name: string) {
    return apiRequest(
        "/api/v1/inventory/brands",
        { method: "POST", body: jsonBody({ name }) },
        options,
    );
}

export async function createUnit(options: InventoryRequestOptions, input: { name: string; code: string }) {
    return apiRequest(
        "/api/v1/inventory/units-of-measure",
        { method: "POST", body: jsonBody(input) },
        options,
    );
}

export async function createProduct(
    options: InventoryRequestOptions,
    input: {
        name: string;
        category_id?: number;
        brand_id?: number;
        base_uom_id: number;
        variants: Array<{ sku: string; name?: string }>;
    },
) {
    return apiRequest(
        "/api/v1/inventory/products",
        { method: "POST", body: jsonBody(input) },
        options,
    );
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

