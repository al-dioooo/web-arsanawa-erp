"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-provider";

export function RequireSession({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useSession();
    const t = useTranslations("auth.requireSession");

    if (!isAuthenticated) {
        return (
            <main className="grid min-h-dvh place-items-center bg-canvas p-6">
                <section className="w-full max-w-md rounded-lg bg-surface p-6 shadow-card">
                    <p className="text-sm font-semibold uppercase tracking-wider text-brand-ink">
                        {t("eyebrow")}
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
                        {t("title")}
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                        {t("description")}
                    </p>
                    <a
                        href="/login"
                        className={cn(buttonVariants({ size: "xl" }), "mt-5 w-full")}
                    >
                        {t("goToLogin")}
                    </a>
                </section>
            </main>
        );
    }

    return <AppShell>{children}</AppShell>;
}
