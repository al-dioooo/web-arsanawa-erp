import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the custom radius token from globals.css @theme so
// rounded-pill correctly supersedes rounded-sm/md/lg when classes are merged.
const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            radius: ["pill"],
        },
    },
})

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
