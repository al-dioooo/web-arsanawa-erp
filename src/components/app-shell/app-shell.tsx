"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { getModuleByPath } from "@/lib/modules/registry"
import { ModuleLauncher } from "@/components/app-shell/launcher"
import { EntitlementGuard } from "@/components/app-shell/guard"
import { Icon } from "@/components/ui/icon"
import Image from "next/image"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    user,
    companies,
    activeCompanyId,
    activeBranchId,
    organizationContext,
    selectCompany,
    selectBranch,
    logout
  } = useSession()

  const [companyOpen, setCompanyOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const companyRef = useRef<HTMLDivElement>(null)
  const branchRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (companyRef.current && !companyRef.current.contains(target)) {
        setCompanyOpen(false)
      }
      if (branchRef.current && !branchRef.current.contains(target)) {
        setBranchOpen(false)
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) {
        setMobileSidebarOpen(false)
      }
    })
    return () => {
      active = false
    }
  }, [pathname])

  const activeCompany = companies.find((c) => c.company.id === activeCompanyId)?.company
  const activeBranch = organizationContext?.branches.find((b) => b.id === activeBranchId)
  const activeModule = getModuleByPath(pathname)

  // Dynamic sidebar header & links
  const showModuleNav = !!activeModule
  const sidebarTitle = activeModule ? activeModule.label : "Arsanawa ERP"
  const sidebarIcon = activeModule ? activeModule.icon : "grid_view"
  const sidebarAccentColor = activeModule ? activeModule.accentColor : "#0b5c6a"

  // Base navigation when not in a module
  const defaultNavItems = [
    { href: "/", label: "Overview", icon: "dashboard" },
    { href: "/organization/companies", label: "Companies", icon: "business" },
    { href: "/organization/modules", label: "Module Manager", icon: "settings_suggest" }
  ]

  const navItems = activeModule ? activeModule.nav : defaultNavItems

  const handleSignOut = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 290px */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-navy-100 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Logo Section */}
        <div className="flex h-16 items-center justify-between border-b border-navy-100 px-6">
          <Link href="/" className="flex items-center gap-2 select-none outline-none">
            <Image
              src="/brand/logo-teal.svg"
              alt="Arsanawa Logo"
              width={140}
              height={35}
              className="h-8 w-auto"
            />
          </Link>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Workspace Context Display */}
        {activeCompany && (
          <div className="px-6 py-4 border-b border-navy-100/50 bg-navy-50/30">
            <p className="text-[10px] font-bold uppercase tracking-widest text-navy-500 font-display">
              Active Context
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-brand text-lg text-white"
                style={{ backgroundColor: sidebarAccentColor }}
              >
                {activeCompany.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-bold text-navy-900 leading-tight">
                  {activeCompany.name}
                </p>
                <p className="truncate text-xs text-navy-500 font-medium">
                  {activeBranch ? activeBranch.name : "Select Branch"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-4 px-2 flex items-center justify-between">
            <span
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-display"
              style={{ color: sidebarAccentColor }}
            >
              <Icon name={sidebarIcon} className="text-base" />
              {sidebarTitle}
            </span>
            {showModuleNav && (
              <Link
                href="/"
                className="flex h-5 w-5 items-center justify-center rounded bg-navy-100 text-navy-600 hover:bg-navy-200 transition-colors"
                title="Back to Console Home"
              >
                <Icon name="arrow_back" className="text-xs font-bold" />
              </Link>
            )}
          </div>

          <nav className="grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 outline-none select-none cursor-pointer"
                  style={{
                    backgroundColor: active ? `${sidebarAccentColor}15` : "transparent",
                    color: active ? sidebarAccentColor : "var(--color-navy-700)"
                  }}
                >
                  <Icon
                    name={item.icon}
                    className={`text-xl transition-transform duration-150 group-hover:scale-105`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-navy-100 p-4 bg-navy-50/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-navy-900 leading-tight">
                {user?.name}
              </p>
              <p className="truncate text-xs text-navy-500 font-medium">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Layout Wrapper */}
      <div className="flex flex-col min-h-screen lg:pl-[290px]">
        {/* Topbar - Sticky & Glassmorphic */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-navy-100/50 bg-white/80 px-6 backdrop-blur-md">
          {/* Left Elements: Hamburger, Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 lg:hidden cursor-pointer"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Icon name="menu" className="text-2xl" />
            </button>

            {/* Breadcrumb Path */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-navy-500 font-display">
              <Link href="/" className="hover:text-teal-700 transition-colors">
                Console
              </Link>
              {activeModule && (
                <>
                  <Icon name="chevron_right" className="text-xs" />
                  <Link href={activeModule.route} className="hover:text-teal-700 transition-colors">
                    {activeModule.label}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Elements: Switchers, Launcher, Profile */}
          <div className="flex items-center gap-3">
            {/* Company Switcher Dropdown */}
            <div className="relative" ref={companyRef}>
              <button
                onClick={() => setCompanyOpen(!companyOpen)}
                className="flex items-center gap-2 rounded-xl border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-sm hover:bg-navy-50 transition-colors outline-none cursor-pointer"
              >
                <Icon name="business" className="text-sm text-teal-700" />
                <span className="max-w-[120px] truncate">
                  {activeCompany ? activeCompany.name : "Select Company"}
                </span>
                <Icon name="arrow_drop_down" className="text-sm text-navy-400" />
              </button>

              {companyOpen && (
                <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-navy-100 bg-white py-2 shadow-card animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-1.5 border-b border-navy-50 mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400 font-display">
                      Switch Company
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto px-1.5">
                    {companies.map((entry) => (
                      <button
                        key={entry.company.id}
                        onClick={async () => {
                          setCompanyOpen(false)
                          await selectCompany(entry.company.id)
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors outline-none cursor-pointer ${
                          entry.company.id === activeCompanyId
                            ? "bg-teal-50 text-teal-700"
                            : "text-navy-700 hover:bg-navy-50"
                        }`}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-100 text-[10px] font-bold text-navy-600">
                          {entry.company.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{entry.company.name}</span>
                        {entry.company.id === activeCompanyId && (
                          <Icon name="check" className="ml-auto text-sm text-teal-700" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Branch Switcher Dropdown (Scoped to company) */}
            {activeCompany && (
              <div className="relative" ref={branchRef}>
                <button
                  onClick={() => setBranchOpen(!branchOpen)}
                  className="flex items-center gap-2 rounded-xl border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-sm hover:bg-navy-50 transition-colors outline-none cursor-pointer"
                >
                  <Icon name="warehouse" className="text-sm text-orange-500" />
                  <span className="max-w-[120px] truncate">
                    {activeBranch ? activeBranch.name : "Select Branch"}
                  </span>
                  <Icon name="arrow_drop_down" className="text-sm text-navy-400" />
                </button>

                {branchOpen && (
                  <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-navy-100 bg-white py-2 shadow-card animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-1.5 border-b border-navy-50 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-navy-400 font-display">
                        Switch Branch
                      </p>
                    </div>
                    <div className="max-h-60 overflow-y-auto px-1.5">
                      {organizationContext?.branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={async () => {
                            setBranchOpen(false)
                            await selectBranch(branch.id)
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors outline-none cursor-pointer ${
                            branch.id === activeBranchId
                              ? "bg-orange-50 text-orange-700"
                              : "text-navy-700 hover:bg-navy-50"
                          }`}
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-100 text-[10px] font-bold text-navy-600">
                            {branch.code || "B"}
                          </div>
                          <span className="truncate">{branch.name}</span>
                          {branch.id === activeBranchId && (
                            <Icon name="check" className="ml-auto text-sm text-orange-500" />
                          )}
                        </button>
                      ))}
                      {(!organizationContext?.branches || organizationContext.branches.length === 0) && (
                        <div className="px-4 py-3 text-xs text-navy-400 text-center font-medium">
                          No branches available
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Waffle Launcher */}
            <ModuleLauncher />

            {/* User Profile Menu */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center justify-center h-9 w-9 rounded-xl bg-teal-100 text-teal-700 font-bold border border-teal-200 shadow-sm hover:scale-102 active:scale-98 transition-all outline-none cursor-pointer"
              >
                {user?.name.charAt(0).toUpperCase()}
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-2 z-50 w-56 rounded-2xl border border-navy-100 bg-white py-2 shadow-card animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-navy-50 mb-1.5">
                    <p className="truncate text-xs font-bold text-navy-950 leading-tight">
                      {user?.name}
                    </p>
                    <p className="truncate text-[10px] text-navy-450 font-semibold mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors outline-none cursor-pointer"
                  >
                    <Icon name="logout" className="text-sm" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Frame */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <EntitlementGuard>{children}</EntitlementGuard>
        </main>
      </div>
    </div>
  )
}
