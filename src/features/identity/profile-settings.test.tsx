import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProfileSettings } from "@/features/identity/profile-settings"
import { useSession } from "@/features/auth/session-provider"
import {
    useIdentityProfile,
    useIdentityUserLookup,
    useUpdateIdentityProfile,
} from "@/features/identity/identity-api"

vi.mock("@/features/identity/identity-api", () => ({
    useIdentityProfile: vi.fn(),
    useIdentityUserLookup: vi.fn(),
    useUpdateIdentityProfile: vi.fn(),
}))

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

const updateProfile = vi.fn()
const lookupUser = vi.fn()
const updateCurrentProfile = vi.fn()

describe("ProfileSettings", () => {
    beforeEach(() => {
        updateProfile.mockReset()
        lookupUser.mockReset()
        updateCurrentProfile.mockReset()
        updateProfile.mockResolvedValue({
            id: 1,
            name: "Alice Evergarden",
            username: "aliceevr",
            email: "alice@example.com",
            profile: {
                display_name: "Alice E.",
                avatar: "https://example.com/a.png",
                locale: "id",
                timezone: "Asia/Makassar",
            },
            status: { status: "active" },
        })
        vi.mocked(useSession).mockReturnValue({
            updateCurrentProfile,
        } as unknown as ReturnType<typeof useSession>)
        vi.mocked(useIdentityProfile).mockReturnValue({
            data: {
                id: 1,
                name: "Alice Evergarden",
                username: "aliceevr",
                email: "alice@example.com",
                profile: {
                    display_name: "Alice",
                    avatar: null,
                    locale: "en",
                    timezone: "Asia/Jakarta",
                },
                status: { status: "active" },
            },
            isLoading: false,
        } as ReturnType<typeof useIdentityProfile>)
        vi.mocked(useUpdateIdentityProfile).mockReturnValue({
            mutateAsync: updateProfile,
            isPending: false,
        } as ReturnType<typeof useUpdateIdentityProfile>)
        vi.mocked(useIdentityUserLookup).mockReturnValue({
            mutateAsync: lookupUser,
            data: null,
            error: null,
            isPending: false,
        } as ReturnType<typeof useIdentityUserLookup>)
    })

    it("surfaces profile settings and authenticated user lookup", async () => {
        render(<ProfileSettings />)

        fireEvent.change(screen.getByLabelText("Display name"), {
            target: { value: "Alice E." },
        })
        fireEvent.change(screen.getByLabelText("Avatar URL"), {
            target: { value: "https://example.com/a.png" },
        })
        fireEvent.change(screen.getByLabelText("Locale"), {
            target: { value: "id" },
        })
        fireEvent.change(screen.getByLabelText("Timezone"), {
            target: { value: "Asia/Makassar" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Save profile" }))

        await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({
            display_name: "Alice E.",
            avatar: "https://example.com/a.png",
            locale: "id",
            timezone: "Asia/Makassar",
        }))

        expect(updateCurrentProfile).toHaveBeenCalledWith(expect.objectContaining({
            profile: expect.objectContaining({
                display_name: "Alice E.",
                avatar: "https://example.com/a.png",
                locale: "id",
                timezone: "Asia/Makassar",
            }),
        }))

        fireEvent.change(screen.getByLabelText("User ID"), {
            target: { value: "42" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Look up user" }))

        expect(lookupUser).toHaveBeenCalledWith(42)
    })
})
