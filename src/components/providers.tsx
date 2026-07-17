"use client"

import { useState } from "react"
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <CommandPaletteProvider>
                    {children}
                    <CommandPalette />
                    <Toaster
                        position="bottom-left"
                        expand
                        visibleToasts={4}
                        offset={{ left: 24, bottom: 24 }}
                        mobileOffset={{ left: 16, bottom: 16 }}
                        style={{ zIndex: 2147483647 }}
                        richColors
                        toastOptions={{
                            style: { zIndex: 2147483647 },
                            classNames: {
                                toast: "border border-navy-100 bg-white text-navy-900 shadow-2xl",
                                title: "font-display text-sm font-bold",
                                description: "font-body text-xs text-navy-500",
                                actionButton: "bg-teal-700 text-white",
                                cancelButton: "bg-navy-100 text-navy-700",
                            },
                        }}
                    />
                </CommandPaletteProvider>
            </SessionProvider>
        </QueryClientProvider>
    )
}
