/**
 * Money values arrive from the API as decimal strings (e.g. "1500.0000").
 * `formatCurrency` renders them for display; the backend remains the source
 * of truth for all arithmetic, so we only ever format — never compute totals
 * the API has already returned.
 */
export function formatCurrency(
    value: string | number | null | undefined,
    currency = "IDR",
    locale = "id-ID",
): string {
    const amount = typeof value === "string" ? Number(value) : value ?? 0

    if (!Number.isFinite(amount)) {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(0)
    }

    // IDR is conventionally shown without fractional digits.
    const fractionDigits = currency === "IDR" ? 0 : 2

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(amount)
}

/** Parse an API decimal string to a number, defaulting to 0. */
export function toNumber(value: string | number | null | undefined): number {
    const n = typeof value === "string" ? Number(value) : value ?? 0
    return Number.isFinite(n) ? n : 0
}
