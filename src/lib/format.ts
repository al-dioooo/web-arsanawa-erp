import { formatCurrency } from "@/lib/money"

export function titleCase(value: string): string {
    return value
        .split(/[-_.\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

// Intl formatters are hoisted to module scope; constructing them per call is
// expensive inside list renders.
const compactDateTimeFormatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
});

const dateIDFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

const dateTimeIDFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export function compactDateTime(value: string | null): string {
    if (!value) {
        return "Not set";
    }

    return compactDateTimeFormatter.format(new Date(value));
}

// Thin IDR preset over the guarded shared formatter so amounts never render as
// "Rp NaN" and currency formatting has a single source of truth (see money.ts).
export function formatIDR(value: string | number | null | undefined): string {
    return formatCurrency(value, 'IDR', 'id-ID');
}

export function formatDateID(date: string | Date): string {
    return dateIDFormatter.format(new Date(date));
}

export function formatDateTimeID(date: string | Date): string {
    return dateTimeIDFormatter.format(new Date(date));
}

export function agingBucket(days: number): '0-30' | '31-60' | '61-90' | '>90' {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '>90';
}
