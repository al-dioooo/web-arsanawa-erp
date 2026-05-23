"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { ApiError, apiRequest, jsonBody } from "@/lib/api-client"
import { sessionStore } from "@/features/auth/session-store"
import type {
  AuthenticatedUser,
  Branch,
  CompanyMembership,
  LoginResponse,
  ModuleEntitlement,
  ModuleRegistry,
  OrganizationContext,
  Profile,
} from "@/lib/types"

type LoginInput = {
  login: string
  password: string
  device_name?: string
}

type CreateCompanyInput = {
  name: string
  slug?: string
  legal_name?: string
  tax_identifier?: string
  primary_branch_name?: string
}

type CreateBranchInput = {
  name: string
  code?: string
}

type AddMembershipInput = {
  user_id: number
  branch_id?: number | null
  role?: "admin" | "member"
}

type UpdateEntitlementsInput = {
  modules: Array<{
    module: string
    is_enabled: boolean
    expires_at?: string | null
  }>
}

type SessionState = {
  token: string | null
  expiresAt: string | null
  user: AuthenticatedUser | null
  profile: Profile | null
  companies: CompanyMembership[]
  activeCompanyId: number | null
  activeBranchId: number | null
  organizationContext: OrganizationContext | null
  modules: ModuleRegistry | null
  entitlements: ModuleEntitlement[]
  isLoading: boolean
  error: string | null
  fieldErrors: Record<string, string[]> | null
}

type SessionContextValue = SessionState & {
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<boolean>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (input: {
    email: string
    token: string
    password: string
    password_confirmation: string
  }) => Promise<string>
  refreshWorkspace: (companyId?: number | null) => Promise<void>
  selectCompany: (companyId: number) => Promise<void>
  selectBranch: (branchId: number | null) => Promise<void>
  createCompany: (input: CreateCompanyInput) => Promise<void>
  createBranch: (companyId: number, input: CreateBranchInput) => Promise<void>
  addMembership: (companyId: number, input: AddMembershipInput) => Promise<void>
  updateEntitlements: (companyId: number, input: UpdateEntitlementsInput) => Promise<void>
  clearError: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

const initialState: SessionState = {
  token: null,
  expiresAt: null,
  user: null,
  profile: null,
  companies: [],
  activeCompanyId: null,
  activeBranchId: null,
  organizationContext: null,
  modules: null,
  entitlements: [],
  isLoading: true,
  error: null,
  fieldErrors: null,
}

function errorState(error: unknown): Pick<SessionState, "error" | "fieldErrors"> {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      fieldErrors: error.errors ?? null,
    }
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      fieldErrors: null,
    }
  }

  return {
    error: "Something went wrong.",
    fieldErrors: null,
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(initialState)

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null, fieldErrors: null }))
  }, [])

  const loadWorkspace = useCallback(
    async (token: string, requestedCompanyId?: number | null, requestedBranchId?: number | null) => {
      const companiesResponse = await apiRequest<{ companies: CompanyMembership[] }>(
        "/api/v1/organization/companies",
        {},
        { token }
      )

      const companies = companiesResponse.data.companies
      const activeCompanyId =
        requestedCompanyId ??
        companies.find((entry) => entry.membership.status === "active")?.company.id ??
        null

      sessionStore.setActiveCompanyId(activeCompanyId)

      const [profileResponse, contextResponse, modulesResponse, entitlementsResponse] =
        await Promise.all([
          apiRequest<Profile>("/api/v1/identity/profile", {}, { token, companyId: activeCompanyId }),
          apiRequest<OrganizationContext>(
            "/api/v1/organization/context",
            {},
            { token, companyId: activeCompanyId }
          ),
          apiRequest<ModuleRegistry>("/api/v1/modules", {}, { token, companyId: activeCompanyId }),
          activeCompanyId
            ? apiRequest<{ entitlements: ModuleEntitlement[] }>(
                `/api/v1/organization/companies/${activeCompanyId}/entitlements`,
                {},
                { token, companyId: activeCompanyId }
              ).catch(() => ({ data: { entitlements: [] }, message: "" }))
            : Promise.resolve({ data: { entitlements: [] }, message: "" }),
        ])

      const branches = contextResponse.data.branches || []
      let activeBranchId: number | null = null
      if (activeCompanyId) {
        const candidateBranchId =
          requestedBranchId ??
          sessionStore.getActiveBranchId() ??
          contextResponse.data.membership?.branch_id ??
          branches.find((b) => b.is_primary)?.id ??
          branches[0]?.id ??
          null

        if (candidateBranchId && branches.some((b) => b.id === candidateBranchId)) {
          activeBranchId = candidateBranchId
        } else {
          activeBranchId = branches.find((b) => b.is_primary)?.id ?? branches[0]?.id ?? null
        }
      }

      sessionStore.setActiveBranchId(activeBranchId)

      return {
        companies,
        activeCompanyId,
        activeBranchId,
        profile: profileResponse.data,
        organizationContext: contextResponse.data,
        modules: modulesResponse.data,
        entitlements: entitlementsResponse.data.entitlements,
      }
    },
    []
  )

  const refreshWorkspace = useCallback(
    async (companyId?: number | null) => {
      if (!state.token) {
        return
      }

      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))

      try {
        const workspace = await loadWorkspace(
          state.token,
          companyId ?? state.activeCompanyId,
          state.activeBranchId
        )
        setState((current) => ({ ...current, ...workspace, isLoading: false }))
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [loadWorkspace, state.activeCompanyId, state.activeBranchId, state.token]
  )

  // Rehydration on mount
  useEffect(() => {
    let active = true
    async function rehydrate() {
      const token = sessionStore.getToken()
      const activeCompanyId = sessionStore.getActiveCompanyId()
      const activeBranchId = sessionStore.getActiveBranchId()

      if (!token) {
        if (active) {
          setState((current) => ({ ...current, isLoading: false }))
        }
        return
      }

      try {
        const userResponse = await apiRequest<AuthenticatedUser>(
          "/api/v1/auth/me",
          {},
          { token }
        )
        const user = userResponse.data

        const workspace = await loadWorkspace(token, activeCompanyId, activeBranchId)

        if (active) {
          setState({
            token,
            expiresAt: sessionStore.getExpiresAt(),
            user,
            ...workspace,
            isLoading: false,
            error: null,
            fieldErrors: null,
          })
        }
      } catch {
        sessionStore.clear()
        if (active) {
          setState({
            ...initialState,
            isLoading: false,
          })
        }
      }
    }

    rehydrate()

    return () => {
      active = false
    }
  }, [loadWorkspace])

  const login = useCallback(
    async (input: LoginInput): Promise<boolean> => {
      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))

      try {
        const response = await apiRequest<LoginResponse>("/api/v1/auth/login", {
          method: "POST",
          body: jsonBody({ ...input, device_name: input.device_name || "web-arsanawa-erp" }),
        })

        sessionStore.setSession(response.data.access_token, response.data.expires_at ?? "")

        const workspace = await loadWorkspace(response.data.access_token)

        setState({
          token: response.data.access_token,
          expiresAt: response.data.expires_at,
          user: response.data.user,
          ...workspace,
          isLoading: false,
          error: null,
          fieldErrors: null,
        })

        return true
      } catch (error) {
        sessionStore.clear()
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))

        return false
      }
    },
    [loadWorkspace]
  )

  const logout = useCallback(async () => {
    const token = state.token
    sessionStore.clear()
    setState({
      ...initialState,
      isLoading: false,
    })

    if (token) {
      await apiRequest("/api/v1/auth/logout", { method: "POST" }, { token }).catch(() => null)
    }
  }, [state.token])

  const forgotPassword = useCallback(async (email: string) => {
    const response = await apiRequest<null>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: jsonBody({ email }),
    })

    return response.message
  }, [])

  const resetPassword = useCallback(
    async (input: {
      email: string
      token: string
      password: string
      password_confirmation: string
    }) => {
      const response = await apiRequest<null>("/api/v1/auth/reset-password", {
        method: "POST",
        body: jsonBody(input),
      })

      return response.message
    },
    []
  )

  const selectCompany = useCallback(
    async (companyId: number) => {
      if (!state.token) return
      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))
      try {
        const workspace = await loadWorkspace(state.token, companyId, null)
        setState((current) => ({ ...current, ...workspace, isLoading: false }))
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [loadWorkspace, state.token]
  )

  const selectBranch = useCallback(
    async (branchId: number | null) => {
      if (!state.token || !state.activeCompanyId) return
      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))
      try {
        const workspace = await loadWorkspace(state.token, state.activeCompanyId, branchId)
        setState((current) => ({ ...current, ...workspace, isLoading: false }))
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [loadWorkspace, state.token, state.activeCompanyId]
  )

  const createCompany = useCallback(
    async (input: CreateCompanyInput) => {
      if (!state.token) {
        return
      }

      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))

      try {
        const response = await apiRequest<{ company: { id: number } }>(
          "/api/v1/organization/companies",
          {
            method: "POST",
            body: jsonBody(input),
          },
          { token: state.token }
        )
        const workspace = await loadWorkspace(state.token, response.data.company.id)
        setState((current) => ({ ...current, ...workspace, isLoading: false }))
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [loadWorkspace, state.token]
  )

  const createBranch = useCallback(
    async (companyId: number, input: CreateBranchInput) => {
      if (!state.token) {
        return
      }

      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))

      try {
        await apiRequest<{ branch: Branch }>(
          `/api/v1/organization/companies/${companyId}/branches`,
          {
            method: "POST",
            body: jsonBody(input),
          },
          { token: state.token, companyId }
        )
        await refreshWorkspace(companyId)
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [refreshWorkspace, state.token]
  )

  const addMembership = useCallback(
    async (companyId: number, input: AddMembershipInput) => {
      if (!state.token) {
        return
      }

      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))

      try {
        await apiRequest(
          `/api/v1/organization/companies/${companyId}/memberships`,
          {
            method: "POST",
            body: jsonBody(input),
          },
          { token: state.token, companyId }
        )
        await refreshWorkspace(companyId)
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [refreshWorkspace, state.token]
  )

  const updateEntitlements = useCallback(
    async (companyId: number, input: UpdateEntitlementsInput) => {
      if (!state.token) {
        return
      }

      setState((current) => ({ ...current, isLoading: true, error: null, fieldErrors: null }))

      try {
        await apiRequest<{ entitlements: ModuleEntitlement[] }>(
          `/api/v1/organization/companies/${companyId}/entitlements`,
          {
            method: "PUT",
            body: jsonBody(input),
          },
          { token: state.token, companyId }
        )
        await refreshWorkspace(companyId)
      } catch (error) {
        setState((current) => ({ ...current, ...errorState(error), isLoading: false }))
      }
    },
    [refreshWorkspace, state.token]
  )

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.token && state.user),
      login,
      logout,
      forgotPassword,
      resetPassword,
      refreshWorkspace,
      selectCompany,
      selectBranch,
      createCompany,
      createBranch,
      addMembership,
      updateEntitlements,
      clearError,
    }),
    [
      addMembership,
      clearError,
      createBranch,
      createCompany,
      forgotPassword,
      login,
      logout,
      refreshWorkspace,
      resetPassword,
      selectCompany,
      selectBranch,
      state,
      updateEntitlements,
    ]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.")
  }

  return context
}
