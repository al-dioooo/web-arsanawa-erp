"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { progressManager } from "@/lib/progress"

export function ProgressBar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [state, setState] = useState({ loading: false, progress: 0 })

    // Listen to changes in pathname/searchParams to mark navigation complete
    useEffect(() => {
        progressManager.done()
    }, [pathname, searchParams])

    // Listen to global progress state
    useEffect(() => {
        return progressManager.subscribe(setState)
    }, [])

    // Intercept relative link clicks to start progress bar
    useEffect(() => {
        function handleAnchorClick(event: MouseEvent) {
            const anchor = (event.target as Element).closest("a")
            if (!anchor) return

            const href = anchor.getAttribute("href")
            if (!href) return

            // Only intercept relative paths that navigate internally
            if (
                href.startsWith("/") &&
                !href.startsWith("//") &&
                anchor.getAttribute("target") !== "_blank"
            ) {
                // Ignore modifier clicks
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                    return
                }

                // Ignore if it's the exact same pathname and search query
                const targetUrl = new URL(href, window.location.origin)
                if (
                    targetUrl.pathname === window.location.pathname &&
                    targetUrl.search === window.location.search
                ) {
                    return
                }

                progressManager.start()
            }
        }

        document.addEventListener("click", handleAnchorClick)
        return () => {
            document.removeEventListener("click", handleAnchorClick)
        }
    }, [])

    if (!state.loading) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-teal-500/10 pointer-events-none">
            <div
                className="h-full bg-orange-500 transition-all duration-150 ease-out"
                style={{
                    width: `${state.progress}%`,
                    boxShadow: "0 0 10px rgba(244, 123, 80, 0.5)"
                }}
            />
        </div>
    )
}
