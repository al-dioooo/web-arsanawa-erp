export type StatusPillTone = "green" | "amber" | "red" | "neutral" | "teal" | "orange";

type StatusPillProps = {
    tone?: StatusPillTone;
    children: React.ReactNode;
};

// Status tones map to the semantic status tokens in globals.css @theme, so status
// colours stay consistent with the brand palette everywhere. Teal and orange use
// sanctioned raw brand shades for non-status brand pills — they do not flip in
// dark mode, but stay readable on dark surfaces.
const tones: Record<StatusPillTone, string> = {
    green: "bg-success-soft text-success-strong",
    amber: "bg-warning-soft text-warning-strong",
    red: "bg-error-soft text-error-strong",
    neutral: "bg-surface-muted text-ink-secondary",
    teal: "bg-teal-100 text-teal-700",
    orange: "bg-orange-100 text-orange-700",
};

export function StatusPill({ tone = "neutral", children }: StatusPillProps) {
    return (
        <span
            className={`inline-flex min-h-6 items-center gap-1 rounded-pill px-2.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}
        >
            {children}
        </span>
    );
}
