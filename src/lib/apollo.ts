export interface ApolloLead extends Record<string, unknown> {
  id: string
  first_name: string
  last_name: string
  last_name_obfuscated?: string
  name?: string
  title: string
  email: string | null
  linkedin_url: string | null
  organization: {
    name: string
    website_url: string | null
    estimated_num_employees: number | null
    primary_domain: string | null
    industry?: string | null
  } | null
  city: string | null
  state: string | null
  country: string | null
  isFromAccount?: boolean  // true = ya guardado en tu cuenta Apollo (sin costo)
}

export interface ApolloSearchParams {
  industries: string[]
  titles: string[]
  countries: string[]
  employee_ranges: string[]
  seniorities: string[]
  page?: number
  per_page?: number
}

export interface ApolloSearchResult {
  leads: ApolloLead[]
  total: number
  page: number
  per_page: number
  savedCount: number  // cuántos vienen de tu cuenta
  newCount: number    // cuántos son nuevos (gastaron créditos)
}

const COUNTRY_MAP: Record<string, string> = {
  'Chile': 'Chile',
  'Argentina': 'Argentina',
  'Colombia': 'Colombia',
  'México': 'Mexico',
  'Mexico': 'Mexico',
  'Perú': 'Peru',
  'Peru': 'Peru',
  'Brasil': 'Brazil',
  'Brazil': 'Brazil',
  'Estados Unidos': 'United States',
  'España': 'Spain',
  'Spain': 'Spain',
  'Uruguay': 'Uruguay',
  'Ecuador': 'Ecuador',
  'Bolivia': 'Bolivia',
  'Paraguay': 'Paraguay',
  'Costa Rica': 'Costa Rica',
  'Panamá': 'Panama',
  'Venezuela': 'Venezuela',
  'Guatemala': 'Guatemala',
}

export async function searchApolloLeads(params: ApolloSearchParams): Promise<ApolloSearchResult> {
  const apiKey = import.meta.env.VITE_APOLLO_API_KEY
  const baseUrl = '/api/apollo'
  const mappedCountries = params.countries.map(c => COUNTRY_MAP[c] ?? c)

  // ── PASO 1: buscar en contactos guardados de tu cuenta (sin costo) ──
  const savedContacts = await searchSavedContacts({
    apiKey, baseUrl, mappedCountries,
    titles: params.titles,
    employee_ranges: params.employee_ranges,
  })
  console.log('[Apollo] Saved contacts found:', savedContacts.length)

  // Índice de IDs y emails ya conocidos para deduplicar
  const knownIds = new Set(savedContacts.map(c => c.id))
  const knownEmails = new Set(
    savedContacts.map(c => c.email?.toLowerCase()).filter(Boolean) as string[]
  )

  // ── PASO 2: búsqueda global (gasta créditos solo en leads nuevos) ──
  const body: Record<string, unknown> = {
    page: params.page ?? 1,
    per_page: 100,
    reveal_personal_emails: true,
  }
  if (params.titles.length > 0) body.person_titles = params.titles
  if (mappedCountries.length > 0) body.person_locations = mappedCountries
  if (params.employee_ranges.length > 0) body.organization_num_employees_ranges = params.employee_ranges

  console.log('[Apollo] Global search body:', JSON.stringify(body, null, 2))

  const response = await fetch(`${baseUrl}/v1/mixed_people/api_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  console.log('[Apollo] Global search status:', response.status)
  console.log('[Apollo] Global total_entries:', data.pagination?.total_entries)

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Apollo error: ${response.status}`)
  }

  const globalPeople: ApolloLead[] = (data.people ?? []) as ApolloLead[]

  // Filtrar los que ya están en tu cuenta
  const newPeople = globalPeople.filter(p => {
    if (knownIds.has(p.id)) return false
    if (p.email && knownEmails.has(p.email.toLowerCase())) return false
    return true
  })

  console.log('[Apollo] New people (will cost credits):', newPeople.length)

  // Revelar emails solo de los verdaderamente nuevos
  const revealedNew = newPeople.length > 0
    ? await revealPeople(newPeople, apiKey, baseUrl)
    : []

  // Merge: primero los guardados, luego los nuevos
  const allLeads: ApolloLead[] = [
    ...savedContacts.map(c => ({ ...c, isFromAccount: true })),
    ...revealedNew.map(c => ({ ...c, isFromAccount: false })),
  ]

  return {
    leads: allLeads,
    total: (data.pagination?.total_entries ?? globalPeople.length) + savedContacts.length,
    page: data.pagination?.page ?? 1,
    per_page: data.pagination?.per_page ?? 25,
    savedCount: savedContacts.length,
    newCount: revealedNew.length,
  }
}

async function searchSavedContacts(opts: {
  apiKey: string
  baseUrl: string
  titles: string[]
  mappedCountries: string[]
  employee_ranges: string[]
}): Promise<ApolloLead[]> {
  try {
    const body: Record<string, unknown> = { page: 1, per_page: 100 }
    if (opts.titles.length > 0) body.person_titles = opts.titles
    if (opts.mappedCountries.length > 0) body.person_locations = opts.mappedCountries
    if (opts.employee_ranges.length > 0) body.organization_num_employees_ranges = opts.employee_ranges

    const res = await fetch(`${opts.baseUrl}/v1/contacts/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': opts.apiKey },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.warn('[Apollo] contacts/search failed:', res.status)
      return []
    }

    const json = await res.json()
    const contacts = (json.contacts ?? []) as ApolloLead[]
    return contacts
  } catch (e) {
    console.warn('[Apollo] contacts/search error:', e)
    return []
  }
}

async function revealPeople(people: ApolloLead[], apiKey: string, baseUrl: string): Promise<ApolloLead[]> {
  const BATCH = 10
  const results: ApolloLead[] = []

  for (let i = 0; i < people.length; i += BATCH) {
    const batch = people.slice(i, i + BATCH)
    try {
      const res = await fetch(`${baseUrl}/v1/people/bulk_match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          details: batch.map(p => ({ id: p.id })),
          reveal_personal_emails: true,
        }),
      })
      const json = await res.json()
      const matches: ApolloLead[] = json.matches ?? []
      batch.forEach((original, idx) => {
        results.push({ ...original, ...(matches[idx] ?? {}) })
      })
    } catch {
      results.push(...batch)
    }
  }

  return results
}
