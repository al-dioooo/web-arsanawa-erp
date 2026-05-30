import { describe, expect, it } from "vitest"
import en from "../../messages/en.json"
import id from "../../messages/id.json"

describe("message dictionaries", () => {
    it("keeps module names in English while translating operational UI to Indonesian", () => {
        expect(id.modules.inventory).toBe("Inventory")
        expect(id.modules.finance).toBe("Finance")
        expect(id.modules.pos).toBe("Point of Sale")

        expect(id.platform.companySettings).toBe("Pengaturan Perusahaan")
        expect(id.platform.activeCurrencies).toBe("Mata Uang Aktif")
        expect(id.platform.moduleSetting).toBe("Pengaturan Modul")
        expect(id.platform.saveSetting).toBe("Simpan pengaturan")
        expect(id.platform.decimalPlaces).toBe("{count} angka desimal")
        expect(id.shell.goToConsole).toBe("Ke Konsol")
        expect(id.launcher.applications).toBe("Aplikasi")
        expect(id.common.companyScoped).toBe("Dalam lingkup perusahaan")
        expect(id.pos.nav.reports).toBe("Laporan")
    })

    it("keeps matching English keys for translated UI surfaces", () => {
        expect(en.platform.companySettings).toBe("Company Settings")
        expect(en.platform.decimalPlaces).toBe("{count} decimal places")
        expect(en.launcher.applications).toBe("Applications")
        expect(en.shell.signOut).toBe("Sign out")
    })
})
