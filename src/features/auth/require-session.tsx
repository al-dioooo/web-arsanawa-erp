"use client";

import { AppShell } from "@/components/app-shell/app-shell";
import { useSession } from "@/features/auth/session-provider";

export function RequireSession({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useSession();

    if (!isAuthenticated) {
        return (
            <main className="grid min-h-dvh place-items-center bg-stone-100 p-6">
                <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6">
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                        Arsanawa ERP
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">
                        Sign in to continue
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                        The web console keeps the access token in memory, so a refresh starts a new
                        session.
                    </p>
                    <a
                        href="/login"
                        className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-medium text-white transition hover:bg-emerald-800"
                    >
                        Go to login
                    </a>
                </section>
            </main>
        );
    }

    return <AppShell>{children}</AppShell>;
}
