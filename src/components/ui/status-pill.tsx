type StatusPillProps = {
    tone?: "green" | "amber" | "red" | "neutral";
    children: React.ReactNode;
};

// Tones map to the semantic status tokens in globals.css @theme, so status
// colours stay consistent with the brand palette everywhere.
const tones = {
    green: "border-success-border bg-success-soft text-success-strong",
    amber: "border-warning-border bg-warning-soft text-warning-strong",
    red: "border-error-border bg-error-soft text-error-strong",
    neutral: "border-navy-200 bg-navy-100 text-navy-700",
};

export function StatusPill({ tone = "neutral", children }: StatusPillProps) {
    return (
        <span
            className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${tones[tone]}`}
        >
            {children}
        </span>
    );
}
