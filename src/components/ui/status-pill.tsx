type StatusPillProps = {
    tone?: "green" | "amber" | "red" | "neutral";
    children: React.ReactNode;
};

const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-rose-200 bg-rose-50 text-rose-800",
    neutral: "border-stone-200 bg-stone-100 text-stone-700",
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
