"use client"

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react"

type CommandPaletteContextValue = {
    isOpen: boolean
    open: () => void
    close: () => void
    toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])
    const toggle = useCallback(() => setIsOpen((v) => !v), [])

    // Global Cmd+K / Ctrl+K listener
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                toggle()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggle])

    return (
        <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </CommandPaletteContext.Provider>
    )
}

export function useCommandPalette(): CommandPaletteContextValue {
    const ctx = useContext(CommandPaletteContext)
    if (!ctx) {
        throw new Error("useCommandPalette must be used within CommandPaletteProvider")
    }
    return ctx
}
