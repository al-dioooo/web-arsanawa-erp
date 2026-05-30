export type Category = {
    id: number;
    company_id: number;
    parent_id: number | null;
    name: string;
    path: string;
    depth: number;
    position: number;
    is_active: boolean;
};

export type Brand = {
    id: number;
    company_id: number;
    name: string;
    is_active: boolean;
};

export type UnitOfMeasure = {
    id: number;
    company_id: number;
    name: string;
    code: string;
    is_active: boolean;
};

export type VariantGroup = {
    id: number;
    company_id: number;
    unit_of_measure_id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    unit?: UnitOfMeasure;
    variants?: VariantMaster[];
};

export type VariantMaster = {
    id: number;
    company_id: number;
    variant_group_id: number;
    name: string;
    code: string;
    position: number;
    is_active: boolean;
    group?: VariantGroup;
};

export type ProductUnit = {
    id: number;
    company_id: number;
    product_id: number;
    sku: string;
    barcode: string | null;
    name: string | null;
    is_active: boolean;
    product?: InventoryProduct;
    variants: VariantMaster[];
};

export type ProductVariant = {
    id: number;
    product_id: number;
    company_id: number;
    sku: string;
    barcode: string | null;
    name: string | null;
    attributes: Record<string, unknown> | null;
    purchase_uom_id: number | null;
    purchase_conversion_factor: string;
    is_active: boolean;
};

export type InventoryProduct = {
    id: number;
    company_id: number;
    category_id: number | null;
    brand_id: number | null;
    base_uom_id: number;
    name: string;
    description: string | null;
    track_stock: boolean;
    attributes: Record<string, unknown> | null;
    status: string;
    variants: ProductVariant[];
    product_units?: ProductUnit[];
    tags?: Array<{ id: number; name: string }>;
};

export type StockLot = {
    id: number;
    company_id: number;
    branch_id: number;
    product_variant_id: number;
    product_unit_id: number | null;
    product_unit?: ProductUnit | null;
    lot_number: string | null;
    received_quantity: string;
    remaining_quantity: string;
    unit_cost: string;
    received_at: string | null;
    expiry_date: string | null;
    status: string;
};

export type StockMovement = {
    id: number;
    company_id: number;
    branch_id: number;
    product_variant_id: number;
    product_unit_id: number | null;
    product_unit?: ProductUnit | null;
    stock_lot_id: number | null;
    lot?: StockLot | null;
    type: string;
    quantity: string;
    unit_cost: string | null;
    reference_type: string | null;
    reference_id: number | null;
    notes: string | null;
    occurred_at: string | null;
};

export type PriceList = {
    id: number;
    company_id: number;
    name: string;
    currency_id: number | null;
    branch_id: number | null;
    is_default: boolean;
    is_active: boolean;
};

export type Discount = {
    id: number;
    company_id: number;
    branch_id: number | null;
    name: string;
    calculation_type: "percentage" | "amount";
    value: string;
    min_quantity: number | null;
    starting_item_number: number | null;
    multiply: boolean;
    effective_from: string | null;
    effective_to: string | null;
    is_active: boolean;
};

export type Reward = {
    id: number;
    company_id: number;
    branch_id: number | null;
    name: string;
    calculation_type: "percentage" | "amount";
    value: string;
    min_quantity: number | null;
    effective_from: string | null;
    effective_to: string | null;
    is_active: boolean;
};

export type InventoryDashboardSummary = {
    counters: {
        products: {
            total: number;
            active: number;
            inactive: number;
        };
        product_units: {
            total: number;
            active: number;
        };
        stock_lots: {
            active: number;
            expiring_soon: number;
        };
        stock_movements: {
            total: number;
            unsettled: number;
        };
        stock_value: string;
    };
};
