const TOKEN_KEY = "arsanawa_token"
const EXPIRES_KEY = "arsanawa_expires"
const COMPANY_KEY = "arsanawa_company_id"
const BRANCH_KEY = "arsanawa_branch_id"

export const sessionStore = {
  getToken(): string | null {
    if (typeof window === "undefined") return null
    const expiresAt = window.localStorage.getItem(EXPIRES_KEY)
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      this.clear()
      return null
    }
    return window.localStorage.getItem(TOKEN_KEY)
  },

  getExpiresAt(): string | null {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(EXPIRES_KEY)
  },

  getActiveCompanyId(): number | null {
    if (typeof window === "undefined") return null
    const val = window.localStorage.getItem(COMPANY_KEY)
    return val ? parseInt(val, 10) : null
  },

  getActiveBranchId(): number | null {
    if (typeof window === "undefined") return null
    const val = window.localStorage.getItem(BRANCH_KEY)
    return val ? parseInt(val, 10) : null
  },

  setSession(token: string, expiresAt: string) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(TOKEN_KEY, token)
    window.localStorage.setItem(EXPIRES_KEY, expiresAt)
  },

  setActiveCompanyId(companyId: number | null) {
    if (typeof window === "undefined") return
    if (companyId === null) {
      window.localStorage.removeItem(COMPANY_KEY)
    } else {
      window.localStorage.setItem(COMPANY_KEY, String(companyId))
    }
  },

  setActiveBranchId(branchId: number | null) {
    if (typeof window === "undefined") return
    if (branchId === null) {
      window.localStorage.removeItem(BRANCH_KEY)
    } else {
      window.localStorage.setItem(BRANCH_KEY, String(branchId))
    }
  },

  clear() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(EXPIRES_KEY)
    window.localStorage.removeItem(COMPANY_KEY)
    window.localStorage.removeItem(BRANCH_KEY)
  }
}
