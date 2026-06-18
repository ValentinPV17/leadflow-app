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
  } | null
  city: string | null
  state: string | null
  country: string | null
}

export interface ApolloSearchParams {
  industries: string[]
  titles: string[]
  countries: string[]
  employees_min: number
  seniorities: string[]
  page?: number
  per_page?: number
}

export interface ApolloSearchResult {
  leads: ApolloLead[]
  total: number
  page: number
  per_page: number
}

// Apollo needs English country names
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

function buildEmployeeRanges(min: number): string[] {
  if (min <= 1)   return ['1,10', '11,20', '21,50', '51,100', '101,200', '201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000']
  if (min <= 10)  return ['11,20', '21,50', '51,100', '101,200', '201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000']
  if (min <= 25)  return ['21,50', '51,100', '101,200', '201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000']
  if (min <= 50)  return ['51,100', '101,200', '201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000']
  if (min <= 100) return ['101,200', '201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000']
  if (min <= 200) return ['201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000']
  if (min <= 500) return ['501,1000', '1001,5000', '5001,10000', '10001,100000']
  return ['1001,5000', '5001,10000', '10001,100000']
}

export async function searchApolloLeads(params: ApolloSearchParams): Promise<ApolloSearchResult> {
  const apiKey = import.meta.env.VITE_APOLLO_API_KEY
  const isDev = import.meta.env.DEV
  const baseUrl = isDev ? '/api/apollo' : 'https://api.apollo.io'

  const mappedCountries = params.countries.map(c => COUNTRY_MAP[c] ?? c)

  // Minimal body — solo lo esencial para maximizar resultados
  const body: Record<string, unknown> = {
    page: params.page ?? 1,
    per_page: 100,
    reveal_personal_emails: true,
  }

  if (params.titles.length > 0) body.person_titles = params.titles
  if (mappedCountries.length > 0) body.person_locations = mappedCountries

  console.log('[Apollo] Request body:', JSON.stringify(body, null, 2))

  const response = await fetch(`${baseUrl}/v1/mixed_people/api_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  console.log('[Apollo] Response status:', response.status)
  console.log('[Apollo] total_entries:', data.pagination?.total_entries)

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Apollo error: ${response.status}`)
  }

  const people: ApolloLead[] = data.people ?? []

  // Reveal full contact details in batches of 10
  const revealed = await revealPeople(people, apiKey, baseUrl)

  return {
    leads: revealed,
    total: data.pagination?.total_entries ?? people.length,
    page: data.pagination?.page ?? 1,
    per_page: data.pagination?.per_page ?? 25,
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

      // Merge revealed data back into original people
      batch.forEach((original, idx) => {
        const match = matches[idx] ?? {}
        results.push({ ...original, ...match })
      })
    } catch {
      // If reveal fails, keep obfuscated data
      results.push(...batch)
    }
  }

  return results
}
