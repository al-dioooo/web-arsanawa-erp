"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { useSession } from "@/features/auth/session-provider"

export function CompanyCreateForm() {
  const { createCompany, fieldErrors, isLoading } = useSession()
  const [form, setForm] = useState({
    name: "",
    slug: "",
    legal_name: "",
    tax_identifier: "",
    primary_branch_name: "",
  })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await createCompany({
      name: form.name,
      slug: form.slug || undefined,
      legal_name: form.legal_name || undefined,
      tax_identifier: form.tax_identifier || undefined,
      primary_branch_name: form.primary_branch_name || undefined,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Company name"
          value={form.name}
          error={fieldErrors?.name?.[0]}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
        <Field
          label="Slug"
          value={form.slug}
          error={fieldErrors?.slug?.[0]}
          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
          placeholder="sekalori"
        />
        <Field
          label="Legal name"
          value={form.legal_name}
          error={fieldErrors?.legal_name?.[0]}
          onChange={(event) =>
            setForm((current) => ({ ...current, legal_name: event.target.value }))
          }
        />
        <Field
          label="Tax identifier"
          value={form.tax_identifier}
          error={fieldErrors?.tax_identifier?.[0]}
          onChange={(event) =>
            setForm((current) => ({ ...current, tax_identifier: event.target.value }))
          }
        />
        <Field
          label="Primary branch"
          value={form.primary_branch_name}
          error={fieldErrors?.primary_branch_name?.[0]}
          onChange={(event) =>
            setForm((current) => ({ ...current, primary_branch_name: event.target.value }))
          }
          placeholder="Head Office"
        />
      </div>

      <div className="flex justify-end mt-4">
        <Button type="submit" disabled={isLoading} className="cursor-pointer">
          {isLoading ? "Creating..." : "Create company"}
        </Button>
      </div>
    </form>
  )
}
