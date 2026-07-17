import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        exclude: ["**/node_modules/**", "**/node_modules_old/**", "**/.next/**", "**/dist/**"],
        // Heavy jsdom suites time out under full-suite parallel load with the
        // 5s default even though they pass in isolation.
        testTimeout: 15000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
