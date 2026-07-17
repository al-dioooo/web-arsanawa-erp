import type { Metadata } from "next"
import { Suspense } from "react"
import { Providers } from "@/components/providers"
import { ProgressBar } from "@/components/ui/progress-bar"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import "./globals.css"

export const metadata: Metadata = {
    title: "Arsanawa ERP",
    description: "Company-scoped ERP web console",
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const messages = await getMessages()

    return (
        <html lang="en" className="h-full antialiased" suppressHydrationWarning>
            <body className="flex min-h-full flex-col">
                <NextIntlClientProvider messages={messages}>
                    <Providers>
                        <Suspense fallback={null}>
                            <ProgressBar />
                        </Suspense>
                        {children}
                    </Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    )
}
