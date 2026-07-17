import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { beforeEach, describe, expect, it, vi } from "vitest"
import messages from "../../../messages/en.json"
import { ApiKeysView } from "@/features/organization/api-keys-view"
import { useSession } from "@/features/auth/session-provider"
import {
    useCreateExternalApiKey,
    useExternalApiKeys,
    useRevokeExternalApiKey,
    useRotateExternalApiKey,
} from "@/features/organization/organization-api"

vi.mock("@/features/auth/session-provider", () => ({
    useSession: vi.fn(),
}))

vi.mock("@/features/organization/organization-api", () => ({
    useExternalApiKeys: vi.fn(),
    useCreateExternalApiKey: vi.fn(),
    useRotateExternalApiKey: vi.fn(),
    useRevokeExternalApiKey: vi.fn(),
}))

const createKey = vi.fn()
const rotateKey = vi.fn()
const revokeKey = vi.fn()

describe("ApiKeysView", () => {
    beforeEach(() => {
        createKey.mockReset()
        rotateKey.mockReset()
        revokeKey.mockReset()

        vi.mocked(useSession).mockReturnValue({
            activeCompanyId: 7,
            organizationContext: {
                company: {
                    id: 7,
                    name: "SEKALORI Catering",
                    slug: "sekalori",
                    legal_name: null,
                    tax_identifier: null,
                    status: "active",
                },
                membership: {
                    id: 1,
                    company_id: 7,
                    user_id: 1,
                    branch_id: 1,
                    role: "owner",
                    status: "active",
                    joined_at: null,
                },
                branches: [],
            },
            user: {
                id: 1,
                name: "Alice Evergarden",
                username: "aliceevr",
                email: "hello@al.is-a.dev",
                email_verified_at: null,
                is_developer: false,
            },
        } as unknown as ReturnType<typeof useSession>)

        vi.mocked(useExternalApiKeys).mockReturnValue({
            data: [
                {
                    id: 11,
                    company_id: 7,
                    name: "Landing Page",
                    token_prefix: "arse_123456",
                    source_channel: "Landing Page",
                    last_used_at: null,
                    expires_at: null,
                    revoked_at: null,
                    revoked: false,
                    created_at: "2026-05-30T00:00:00.000Z",
                    updated_at: "2026-05-30T00:00:00.000Z",
                },
            ],
            isLoading: false,
        } as ReturnType<typeof useExternalApiKeys>)

        createKey.mockResolvedValue({
            api_key: {
                id: 12,
                company_id: 7,
                name: "SEKALORI Landing Page",
                token_prefix: "arse_abcdef",
                source_channel: "Landing Page",
                last_used_at: null,
                expires_at: null,
                revoked_at: null,
                revoked: false,
                created_at: "2026-05-30T00:00:00.000Z",
                updated_at: "2026-05-30T00:00:00.000Z",
            },
            plain_text_key: "arse_plain_text_key",
        })
        rotateKey.mockResolvedValue({
            api_key: {
                id: 11,
                company_id: 7,
                name: "Landing Page",
                token_prefix: "arse_rotated",
                source_channel: "Landing Page",
                last_used_at: null,
                expires_at: null,
                revoked_at: null,
                revoked: false,
                created_at: "2026-05-30T00:00:00.000Z",
                updated_at: "2026-05-30T00:00:00.000Z",
            },
            plain_text_key: "arse_rotated_plain_text_key",
        })
        revokeKey.mockResolvedValue({
            id: 11,
            company_id: 7,
            name: "Landing Page",
            token_prefix: "arse_123456",
            source_channel: "Landing Page",
            last_used_at: null,
            expires_at: null,
            revoked_at: "2026-05-30T01:00:00.000Z",
            revoked: true,
            created_at: "2026-05-30T00:00:00.000Z",
            updated_at: "2026-05-30T01:00:00.000Z",
        })

        vi.mocked(useCreateExternalApiKey).mockReturnValue({
            mutateAsync: createKey,
            isPending: false,
        } as unknown as ReturnType<typeof useCreateExternalApiKey>)
        vi.mocked(useRotateExternalApiKey).mockReturnValue({
            mutateAsync: rotateKey,
            isPending: false,
        } as unknown as ReturnType<typeof useRotateExternalApiKey>)
        vi.mocked(useRevokeExternalApiKey).mockReturnValue({
            mutateAsync: revokeKey,
            isPending: false,
        } as unknown as ReturnType<typeof useRevokeExternalApiKey>)
    })

    it("creates, rotates, and revokes external API keys", async () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <ApiKeysView />
            </NextIntlClientProvider>,
        )

        expect(screen.getByRole("heading", { name: "API Keys" })).toBeInTheDocument()
        expect(screen.getByText("Landing Page")).toBeInTheDocument()
        expect(screen.getByText("arse_123456")).toBeInTheDocument()

        fireEvent.change(screen.getByLabelText("Key name"), {
            target: { value: "SEKALORI Landing Page" },
        })
        fireEvent.change(screen.getByLabelText("Source channel"), {
            target: { value: "Landing Page" },
        })
        fireEvent.click(screen.getByRole("button", { name: "Create API Key" }))

        await waitFor(() => {
            expect(createKey).toHaveBeenCalledWith({
                name: "SEKALORI Landing Page",
                source_channel: "Landing Page",
                expires_at: null,
            })
        })
        expect(await screen.findByText("arse_plain_text_key")).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Rotate Landing Page" }))
        await waitFor(() => expect(rotateKey).toHaveBeenCalledWith(11))
        expect(await screen.findByText("arse_rotated_plain_text_key")).toBeInTheDocument()

        fireEvent.click(screen.getByRole("button", { name: "Revoke Landing Page" }))
        await waitFor(() => expect(revokeKey).toHaveBeenCalledWith(11))
    })
})
