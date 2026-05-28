"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "@/features/auth/session-provider"
import { CommandPaletteProvider } from "@/lib/search/command-palette-context"
import { CommandPalette } from "@/components/command-palette/command-palette"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
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
                    <Toaster position="top-right" richColors />
                </CommandPaletteProvider>
            </SessionProvider>
        </QueryClientProvider>
    )
}
