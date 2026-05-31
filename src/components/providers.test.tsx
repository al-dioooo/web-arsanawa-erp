import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { Providers } from "@/components/providers"

const toasterProps: Array<Record<string, unknown>> = []

vi.mock("sonner", () => ({
    Toaster: (props: Record<string, unknown>) => {
        toasterProps.push(props)

        return <div data-testid="sonner-toaster" />
    },
}))

vi.mock("@tanstack/react-query", () => ({
    QueryClient: class QueryClient {
        constructor(options: unknown) {
            void options
        }
    },
    QueryClientProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/features/auth/session-provider", () => ({
    SessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/lib/search/command-palette-context", () => ({
    CommandPaletteProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/command-palette/command-palette", () => ({
    CommandPalette: () => null,
}))

describe("Providers", () => {
    it("pins Sonner to the top z-index layer at the bottom-left corner", () => {
        render(
            <Providers>
                <div>App shell</div>
            </Providers>,
        )

        expect(screen.getByTestId("sonner-toaster")).toBeInTheDocument()
        const latestProps = toasterProps.at(-1)
        expect(latestProps).toMatchObject({
            position: "bottom-left",
            expand: true,
            visibleToasts: 4,
            style: { zIndex: 2147483647 },
        })
    })
})
