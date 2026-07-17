import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"
import messages from "../../../messages/en.json"
import { WhatsAppSettings } from "@/features/platform/whatsapp-settings"
import {
    usePlatformSettings,
    useUpsertPlatformSettings,
    type PlatformSetting,
} from "@/features/platform/platform-api"

vi.mock("@/features/platform/platform-api", () => ({
    usePlatformSettings: vi.fn(),
    useUpsertPlatformSettings: vi.fn(),
    sendWhatsAppTest: vi.fn(),
}))

const mutateAsync = vi.fn().mockResolvedValue(undefined)

function row(key: string, value: unknown, overrides: Partial<PlatformSetting> = {}): PlatformSetting {
    return {
        id: Math.random(),
        company_id: 1,
        branch_id: null,
        module: "whatsapp",
        key,
        value,
        is_secret: false,
        is_set: value !== null && value !== "",
        ...overrides,
    }
}

function renderPanel(settings: PlatformSetting[]) {
    vi.mocked(usePlatformSettings).mockReturnValue({
        data: settings,
    } as ReturnType<typeof usePlatformSettings>)

    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <WhatsAppSettings />
        </NextIntlClientProvider>,
    )
}

describe("WhatsApp settings token handling", () => {
    beforeEach(() => {
        mutateAsync.mockClear()
        vi.mocked(useUpsertPlatformSettings).mockReturnValue({
            mutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useUpsertPlatformSettings>)
    })

    it("leaves the token field empty even when a token is configured", () => {
        renderPanel([row("token", null, { is_secret: true, is_set: true })])

        expect(screen.getByLabelText("Fonnte token")).toHaveValue("")
        expect(screen.getByText(/A token is saved/i)).toBeInTheDocument()
    })

    it("omits the token from the payload when the user did not type one", async () => {
        renderPanel([
            row("token", null, { is_secret: true, is_set: true }),
            row("sender", "628111"),
        ])

        fireEvent.click(screen.getByRole("button", { name: "Save settings" }))

        await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
        const payload = mutateAsync.mock.calls[0][0] as Array<{ key: string }>
        expect(payload.map((entry) => entry.key)).not.toContain("token")
    })

    it("sends the token only when the user typed a new one", async () => {
        renderPanel([row("token", null, { is_secret: true, is_set: true })])

        fireEvent.change(screen.getByLabelText("Fonnte token"), {
            target: { value: "new-token" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save settings" }))

        await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
        expect(mutateAsync.mock.calls[0][0]).toContainEqual({
            module: "whatsapp",
            key: "token",
            value: "new-token",
        })
    })

    it("clears a stored token with an explicit empty string", async () => {
        renderPanel([row("token", null, { is_secret: true, is_set: true })])

        fireEvent.click(screen.getByRole("button", { name: "Clear token" }))

        await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
        expect(mutateAsync.mock.calls[0][0]).toEqual([
            { module: "whatsapp", key: "token", value: "" },
        ])
    })

    it("does not offer a clear action when no token is stored", () => {
        renderPanel([row("token", null, { is_secret: true, is_set: false })])

        expect(screen.queryByRole("button", { name: "Clear token" })).not.toBeInTheDocument()
    })
})
