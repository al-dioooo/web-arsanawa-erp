"use client"

import { useState } from "react"
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { LazyMotion, MotionConfig, domAnimation } from "motion/react"
import { SessionProvider } from "@/features/auth/session-provider"
import { CommandPaletteProvider } from "@/lib/search/command-palette-context"
import { CommandPalette } from "@/components/command-palette/command-palette"
import { toast, Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                // Safety net: surface a failed mutation as an error toast unless the
                // mutation defines its own onError handler (which shows its own).
                mutationCache: new MutationCache({
                    onError: (error, _variables, _context, mutation) => {
                        if (mutation.options.onError) return
                        const message = error instanceof Error ? error.message : "Something went wrong."
                        toast.error(message)
                    },
                }),
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000,
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    return (
        <ThemeProvider
            attribute="class"
            // Light by default until every page is on semantic tokens —
            // flipped to "system" at the end of the page migration.
            defaultTheme="light"
            enableSystem
            storageKey="arsanawa-theme"
            disableTransitionOnChange
        >
            <LazyMotion features={domAnimation} strict>
                <MotionConfig reducedMotion="user">
                    <QueryClientProvider client={queryClient}>
                        <SessionProvider>
                            <CommandPaletteProvider>
                                {children}
                                <CommandPalette />
                                <Toaster
                                    position="bottom-left"
                                    expand
                                    visibleToasts={4}
                                    duration={4000}
                                    gap={8}
                                    offset={{ left: 24, bottom: 24 }}
                                    mobileOffset={{ left: 16, bottom: 16 }}
                                    style={{ zIndex: 2147483647 }}
                                    toastOptions={{
                                        style: { zIndex: 2147483647 },
                                        classNames: {
                                            toast: "border-none bg-surface-raised text-ink shadow-card-hover",
                                            title: "font-display text-sm font-bold",
                                            description: "font-body text-xs text-ink-muted",
                                            actionButton: "bg-brand text-white",
                                            cancelButton: "bg-surface-muted text-ink-secondary",
                                        },
                                    }}
                                />
                            </CommandPaletteProvider>
                        </SessionProvider>
                    </QueryClientProvider>
                </MotionConfig>
            </LazyMotion>
        </ThemeProvider>
    )
}
