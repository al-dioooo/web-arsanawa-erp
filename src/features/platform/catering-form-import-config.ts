export type CateringFormImportConfig = {
    source_url?: string
    field_map?: Record<string, string>
    menu_type_bundle_skus?: Record<string, string>
    default_branch_code?: string
    default_quantity?: number
    fulfilment_date_rule?: string
    payment_method_map?: Record<string, string | null>
    default_import_register_code?: string
    [key: string]: unknown
}

export function isCateringFormImportConfig(value: unknown): value is CateringFormImportConfig {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function normalizeGoogleSheetsCsvUrl(input: string): string {
    const trimmed = input.trim()
    let parsed: URL

    try {
        parsed = new URL(trimmed)
    } catch {
        throw new Error("Enter a Google Sheets URL.")
    }

    if (parsed.hostname !== "docs.google.com") {
        throw new Error("Enter a Google Sheets URL.")
    }

    const match = parsed.pathname.match(/^\/spreadsheets\/d\/([^/]+)/)
    if (!match?.[1]) {
        throw new Error("Enter a Google Sheets URL.")
    }

    const spreadsheetId = match[1]
    const gid = parsed.hash.match(/(?:^#?|&)gid=([^&]+)/)?.[1]
        ?? parsed.searchParams.get("gid")
        ?? "0"
    const params = new URLSearchParams()
    params.set("format", "csv")
    params.set("gid", gid || "0")

    const resourceKey = parsed.searchParams.get("resourcekey")
    if (resourceKey) {
        params.set("resourcekey", resourceKey)
    }

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${params.toString()}`
}
