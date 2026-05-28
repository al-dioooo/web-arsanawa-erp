import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformSettingsView } from "@/features/platform/platform-settings-view"
import {
    usePlatformCurrencies,
    usePlatformSettings,
    useUpsertPlatformSettings,
} from "@/features/platform/platform-api"

vi.mock("@/features/platform/platform-api", () => ({
    usePlatformCurrencies: vi.fn(),
    usePlatformSettings: vi.fn(),
    useUpsertPlatformSettings: vi.fn(),
}))

const upsertSettings = vi.fn()

describe("PlatformSettingsView", () => {
    beforeEach(() => {
        upsertSettings.mockReset()
        vi.mocked(usePlatformCurrencies).mockReturnValue({
            data: [
                {
                    id: 1,
                    code: "IDR",
                    name: "Indonesian Rupiah",
                    symbol: "Rp",
                    decimal_places: 0,
                    is_active: true,
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformCurrencies>)
        vi.mocked(usePlatformSettings).mockReturnValue({
            data: [
                {
                    id: 5,
                    company_id: 1,
                    branch_id: null,
                    module: "finance",
                    key: "default_cash_account_id",
                    value: "1010",
                },
            ],
            isLoading: false,
        } as ReturnType<typeof usePlatformSettings>)
        vi.mocked(useUpsertPlatformSettings).mockReturnValue({
            mutateAsync: upsertSettings,
            isPending: false,
        } as ReturnType<typeof useUpsertPlatformSettings>)
    })

    it("renders currencies and updates module settings through the batch API", async () => {
        render(<PlatformSettingsView />)

        expect(screen.getByText("IDR")).toBeInTheDocument()
        await waitFor(() => expect(screen.getByDisplayValue("1010")).toBeInTheDocument())

        fireEvent.change(screen.getByLabelText("Setting value"), {
            target: { value: "1020" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save setting" }))

        expect(upsertSettings).toHaveBeenCalledWith([
            {
                module: "finance",
                key: "default_cash_account_id",
                value: "1020",
                branch_id: null,
            },
        ])
    })
})
