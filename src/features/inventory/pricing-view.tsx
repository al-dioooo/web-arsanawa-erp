"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, SelectField } from "@/components/ui/field"
import { StatusPill } from "@/components/ui/status-pill"
import { Icon } from "@/components/ui/icon"
import { useSession } from "@/features/auth/session-provider"
import {
  createPriceList,
  loadInventory,
  setPrice,
} from "@/features/inventory/inventory-api"
import type {
  PriceList,
  ProductVariant,
} from "@/features/inventory/inventory-types"
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PricingView() {
  const { token, activeCompanyId, organizationContext } = useSession()
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [variants, setVariants] = useState<Array<ProductVariant & { product_name: string }>>([])
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Forms
  const [priceListForm, setPriceListForm] = useState({
    name: "",
    branch_id: "",
    is_default: false,
  })

  const [priceForm, setPriceForm] = useState({
    product_variant_id: "",
    price: "",
    effective_from: today(),
  })

  const requestOptions = useMemo(() => {
    if (!token || !activeCompanyId) {
      return null
    }
    return { token, companyId: activeCompanyId }
  }, [activeCompanyId, token])

  const branches = organizationContext?.branches ?? []

  const refreshData = useCallback(async () => {
    if (!requestOptions) return

    setIsLoading(true)
    setError(null)

    try {
      const loaded = await loadInventory(requestOptions)
      setPriceLists(loaded.priceLists)
      
      const list = loaded.products.flatMap((product) =>
        product.variants.map((variant) => ({
          ...variant,
          product_name: product.name,
        }))
      )
      setVariants(list)

      // Set default selected price list if none is selected
      if (selectedPriceListId === null && loaded.priceLists.length > 0) {
        setSelectedPriceListId(loaded.priceLists[0].id)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load pricing data.")
    } finally {
      setIsLoading(false)
    }
  }, [requestOptions, selectedPriceListId])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) {
        void refreshData()
      }
    })
    return () => {
      active = false
    }
  }, [refreshData])

  async function handleCreatePriceList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requestOptions) return

    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      await createPriceList(requestOptions, {
        name: priceListForm.name,
        branch_id: priceListForm.branch_id ? Number(priceListForm.branch_id) : null,
        is_default: priceListForm.is_default,
      })
      setMessage("Price list created successfully.")
      setPriceListForm({ name: "", branch_id: "", is_default: false })
      await refreshData()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create price list.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requestOptions || !selectedPriceListId) return

    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      await setPrice(requestOptions, selectedPriceListId, {
        product_variant_id: Number(priceForm.product_variant_id),
        price: Number(priceForm.price),
        effective_from: priceForm.effective_from,
      })
      setMessage("Variant price set successfully.")
      setPriceForm((current) => ({ ...current, price: "" }))
      await refreshData()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to set price.")
    } finally {
      setIsLoading(false)
    }
  }

  const activePriceList = useMemo(() => {
    return priceLists.find((pl) => pl.id === selectedPriceListId) ?? null
  }, [priceLists, selectedPriceListId])

  return (
    <div className="grid gap-6">
      {/* Header section */}
      <section className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700 font-display">
              Inventory
            </p>
            <h1 className="mt-2 text-2xl font-brand font-bold text-navy-900">
              Pricing Management
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy-500 font-body">
              Configure price lists scoped by company or branch, and set custom effective-dated pricing for product variants.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={activeCompanyId ? "green" : "amber"}>
              {activeCompanyId ? "Company scoped" : "No company"}
            </StatusPill>
            <StatusPill tone={isLoading ? "amber" : "neutral"}>
              {isLoading ? "Syncing" : "Ready"}
            </StatusPill>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-250 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-850">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-250 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-850">
            {error}
          </div>
        )}
      </section>

      {/* Main Layout Grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left Side: Price Lists Grid & Selected Price List details */}
        <div className="grid gap-6">
          {/* Price Lists Overview Card */}
          <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card flex flex-col gap-4">
            <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-3">
              <Icon name="sell" className="text-teal-700" />
              <span>Available Price Lists ({priceLists.length})</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {priceLists.map((priceList) => {
                const isSelected = priceList.id === selectedPriceListId
                return (
                  <article
                    key={priceList.id}
                    onClick={() => setSelectedPriceListId(priceList.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "border-teal-700 bg-teal-50/10 ring-2 ring-teal-700/15"
                        : "border-navy-100 bg-navy-50/10 hover:bg-navy-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-navy-900 truncate">
                        {priceList.name}
                      </h3>
                      <StatusPill tone={priceList.is_active ? "green" : "neutral"}>
                        {priceList.is_active ? "Active" : "Inactive"}
                      </StatusPill>
                    </div>
                    
                    <p className="mt-3 text-xs text-navy-550 font-semibold">
                      {priceList.branch_id
                        ? `Branch ID: ${priceList.branch_id}`
                        : "Company-wide"}
                    </p>

                    {priceList.is_default && (
                      <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1">
                        <Icon name="check_circle" size={12} />
                        <span>Default List</span>
                      </p>
                    )}
                  </article>
                )
              })}
              {priceLists.length === 0 && (
                <div className="col-span-full py-8 text-center text-navy-400 font-medium">
                  No price lists available. Please create one using the sidebar form.
                </div>
              )}
            </div>
          </div>

          {/* Selected Price List details & Variant prices */}
          {activePriceList && (
            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-navy-50 pb-3 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-navy-900 font-display flex items-center gap-2">
                    <Icon name="list_alt" className="text-teal-700" />
                    <span>Manage Prices for: {activePriceList.name}</span>
                  </h2>
                  <p className="text-xs text-navy-500 font-medium mt-1">
                    Select a variant in the list below to update its price on this price list.
                  </p>
                </div>
                <div className="flex gap-2">
                  {activePriceList.is_default && <StatusPill tone="green">Default</StatusPill>}
                  <StatusPill tone={activePriceList.is_active ? "green" : "neutral"}>
                    {activePriceList.is_active ? "Active" : "Inactive"}
                  </StatusPill>
                </div>
              </div>

              {/* Variant Prices Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wider text-navy-500 bg-navy-50/30">
                      <th className="border-b border-navy-100 py-3 px-4 font-display">Product & SKU</th>
                      <th className="border-b border-navy-100 py-3 px-4 font-display">Variant SKU</th>
                      <th className="border-b border-navy-100 py-3 px-4 font-display">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant) => (
                      <tr key={variant.id} className="hover:bg-navy-50/20 transition-colors">
                        <td className="border-b border-navy-100/50 py-3 px-4">
                          <p className="font-bold text-navy-900">{variant.product_name}</p>
                          {variant.name && (
                            <p className="text-xs text-navy-450 font-semibold">{variant.name}</p>
                          )}
                        </td>
                        <td className="border-b border-navy-100/50 py-3 px-4">
                          <code className="text-xs bg-navy-50 px-1.5 py-0.5 rounded border border-navy-100 text-teal-800 font-semibold font-mono">
                            {variant.sku}
                          </code>
                        </td>
                        <td className="border-b border-navy-100/50 py-3 px-4">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setPriceForm((current) => ({
                                ...current,
                                product_variant_id: String(variant.id),
                              }))
                              // Auto scroll to price form on mobile
                              const priceFormEl = document.getElementById("set-price-form")
                              if (priceFormEl) {
                                priceFormEl.scrollIntoView({ behavior: "smooth" })
                              }
                            }}
                            className="cursor-pointer py-1 h-8 text-xs px-2.5 font-bold"
                          >
                            Set Price
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {variants.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-navy-400 font-medium bg-navy-50/10">
                          No product variants found in catalogue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Side Forms */}
        <div className="grid gap-6 self-start">
          {/* Create Price List Form */}
          <form
            className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card flex flex-col gap-4"
            onSubmit={handleCreatePriceList}
          >
            <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2 border-b border-navy-50 pb-2">
              <Icon name="add" size={20} className="text-teal-700" />
              <span>Create Price List</span>
            </h2>
            
            <div className="grid gap-3">
              <Field
                label="Price List Name"
                value={priceListForm.name}
                onChange={(event) =>
                  setPriceListForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Retail Indonesia"
                required
              />

              <SelectField
                label="Branch context (optional)"
                value={priceListForm.branch_id}
                onChange={(event) =>
                  setPriceListForm((current) => ({ ...current, branch_id: event.target.value }))
                }
              >
                <option value="">Company-wide (All branches)</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </SelectField>

              <label className="flex min-h-11 items-center gap-3 rounded-md border border-navy-100 bg-white px-3 text-sm font-medium text-navy-800 shadow-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={priceListForm.is_default}
                  onChange={(event) =>
                    setPriceListForm((current) => ({ ...current, is_default: event.target.checked }))
                  }
                  className="rounded border-navy-300 text-teal-700 focus:ring-teal-700/15"
                />
                <span>Set as Default list</span>
              </label>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full cursor-pointer bg-teal-700 hover:bg-teal-800 text-white mt-2"
              >
                Create List
              </Button>
            </div>
          </form>

          {/* Set Price Form */}
          {activePriceList && priceForm.product_variant_id && (
            <form
              id="set-price-form"
              className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150"
              onSubmit={handleSetPrice}
            >
              <div className="flex items-center justify-between border-b border-navy-50 pb-2">
                <h2 className="text-base font-bold text-navy-900 font-display flex items-center gap-2">
                  <Icon name="payments" size={20} className="text-orange-500" />
                  <span>Set Price</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setPriceForm((current) => ({ ...current, product_variant_id: "" }))}
                  className="text-navy-400 hover:text-navy-600 transition-colors"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div className="grid gap-3">
                <SelectField
                  label="Selected Variant"
                  value={priceForm.product_variant_id}
                  onChange={(event) =>
                    setPriceForm((current) => ({ ...current, product_variant_id: event.target.value }))
                  }
                  required
                >
                  <option value="">Select Variant</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product_name} ({v.sku})
                    </option>
                  ))}
                </SelectField>

                <Field
                  label="Price (IDR)"
                  type="number"
                  min="0"
                  step="1"
                  value={priceForm.price}
                  onChange={(event) =>
                    setPriceForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="e.g. 50000"
                  required
                />

                <Field
                  label="Effective From"
                  type="date"
                  value={priceForm.effective_from}
                  onChange={(event) =>
                    setPriceForm((current) => ({ ...current, effective_from: event.target.value }))
                  }
                  required
                />

                <div className="text-xs bg-navy-50 border border-navy-100 rounded-lg p-2.5 text-navy-550 font-medium leading-relaxed">
                  Price will be set in price list: <strong className="text-navy-800">{activePriceList.name}</strong>.
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full cursor-pointer bg-teal-700 hover:bg-teal-800 text-white mt-2"
                >
                  Set Price
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
