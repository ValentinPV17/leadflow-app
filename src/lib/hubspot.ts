const baseUrl = (isDev: boolean) => isDev ? '/api/hubspot' : 'https://api.hubapi.com'

export async function testHubSpotConnection(apiKey: string): Promise<boolean> {
  const isDev = import.meta.env.DEV
  try {
    const res = await fetch(`${baseUrl(isDev)}/crm/v3/objects/contacts?limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function getHubSpotExistingEmails(apiKey: string, emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()
  const isDev = import.meta.env.DEV
  const existing = new Set<string>()

  // HubSpot search allows max 100 filter values per request
  const BATCH = 100
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH)
    try {
      const res = await fetch(`${baseUrl(isDev)}/crm/v3/objects/contacts/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'IN',
              values: batch,
            }],
          }],
          properties: ['email'],
          limit: 100,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        for (const result of data.results ?? []) {
          const email = result.properties?.email
          if (email) existing.add(email.toLowerCase())
        }
      }
    } catch {
      // If HubSpot check fails, don't block the results
    }
  }

  return existing
}
