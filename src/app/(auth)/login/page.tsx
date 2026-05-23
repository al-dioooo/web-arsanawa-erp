import Logo from "@/components/brands/logo"
import { FlowerDecoration, FlameDecoration } from "@/components/brands/decorations"
import { LoginForm } from "@/features/auth/login-form"

export default function LoginPage() {
    return (
        <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,580px)] xl:grid-cols-[1fr_640px] bg-navy-50">
            {/* Visual panel branding (Teal side panel) */}
            <section className="relative hidden lg:flex flex-col justify-between p-12 bg-teal-900 overflow-hidden select-none">
                {/* Abstract background shapes */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <FlowerDecoration
                        className="absolute -top-40 -left-40 scale-150 rotate-45 w-[800px] h-[800px] text-teal-800"
                    />
                    <FlameDecoration
                        className="absolute -bottom-20 -right-20 scale-110 w-[600px] h-[600px] text-orange-500"
                    />
                </div>

                {/* Top brand header */}
                <div className="relative z-10 flex items-center gap-3">
                    <Logo color="white" className="h-10 w-auto" />
                </div>

                {/* Center message */}
                <div className="relative z-10 max-w-lg mt-auto mb-16">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-teal-700/50 text-teal-100 backdrop-blur-md">
                        Arsanawa ERP Console
                    </span>
                    <h2 className="mt-4 font-brand text-4xl xl:text-5xl leading-tight text-white font-bold">
                        Unified operations backend for modular companies.
                    </h2>
                    <p className="mt-4 text-teal-100 font-body text-sm leading-relaxed">
                        Multi-tenant company scoping, granular permissions, dynamic module entitlement and comprehensive inventory lifecycle management.
                    </p>
                </div>

                {/* Footer features */}
                <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-white/10 text-teal-100">
                    <div>
                        <p className="font-brand text-lg text-white">Modular</p>
                        <p className="mt-1 text-xs text-teal-200">Enable POS, Accounting, Inventory as needed</p>
                    </div>
                    <div>
                        <p className="font-brand text-lg text-white">Scoped</p>
                        <p className="mt-1 text-xs text-teal-200">Strict company and branch-level data boundaries</p>
                    </div>
                    <div>
                        <p className="font-brand text-lg text-white">Durable</p>
                        <p className="mt-1 text-xs text-teal-200">State remains consistent across device sessions</p>
                    </div>
                </div>
            </section>

            {/* Login form panel */}
            <section className="flex flex-col justify-center items-center px-6 py-12 lg:px-16 xl:px-24 bg-white">
                <div className="w-full max-w-sm flex flex-col">
                    {/* Logo visible on mobile/tablet */}
                    <div className="lg:hidden mb-8">
                        <Logo color="teal" className="h-8 w-auto" />
                    </div>

                    <header className="mb-8">
                        <h1 className="text-3xl font-brand font-bold text-navy-900 tracking-tight">
                            Sign in
                        </h1>
                        <p className="mt-2 text-sm text-navy-500 font-body">
                            Welcome back. Enter your credentials to access your console.
                        </p>
                    </header>

                    <LoginForm />
                </div>
            </section>
        </main>
    )
}
