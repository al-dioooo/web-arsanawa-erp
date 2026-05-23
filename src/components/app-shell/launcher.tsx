"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/features/auth/session-provider"
import { moduleRegistry } from "@/lib/modules/registry"
import { Icon } from "@/components/ui/icon"

export function ModuleLauncher() {
  const { modules } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) {
        setIsOpen(false)
      }
    })
    return () => {
      active = false
    }
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const visibleModules = moduleRegistry.filter(
    (m) => !m.entitlementKey || modules?.enabled.includes(m.key)
  )

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-100 hover:text-navy-900 transition-all duration-150 outline-none cursor-pointer"
        title="App Launcher"
        aria-label="App Launcher"
      >
        <Icon name="apps" className="text-2xl" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-navy-100 bg-white p-4 shadow-card animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-3 px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-500 font-display">
              Enabled Applications
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {visibleModules.map((m) => {
              const active = pathname.startsWith(m.route)
              return (
                <Link
                  key={m.key}
                  href={m.route}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-150 group outline-none ${
                    active
                      ? "bg-navy-100/50"
                      : "hover:bg-navy-50"
                  }`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
                    style={{
                      backgroundColor: `${m.accentColor}15`,
                      color: m.accentColor,
                    }}
                  >
                    <Icon name={m.icon} className="text-2xl" />
                  </div>
                  <span className="mt-2 text-xs font-semibold text-navy-700 group-hover:text-navy-900 truncate w-full px-1">
                    {m.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
