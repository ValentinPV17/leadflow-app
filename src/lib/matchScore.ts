import type { ApolloLead } from './apollo'

interface ICP {
  titles: string[]
  industries: string[]
  countries: string[]
  employee_ranges: string[]
  seniorities: string[]
}

// Keywords that indicate seniority level
const SENIORITY_KEYWORDS: Record<string, string[]> = {
  c_suite: ['ceo', 'cto', 'cmo', 'cfo', 'coo', 'cpo', 'chief'],
  vp: ['vp', 'vice president', 'vicepresidente'],
  director: ['director', 'directora'],
  head: ['head of', 'head'],
  manager: ['manager', 'gerente', 'jefe', 'lead'],
  senior: ['senior', 'sr.', 'sr '],
  entry: ['junior', 'jr.', 'associate', 'analyst', 'analista'],
}

function titleScore(leadTitle: string, icpTitles: string[]): number {
  const t = leadTitle.toLowerCase()

  // Exact or strong match
  for (const icpTitle of icpTitles) {
    const icp = icpTitle.toLowerCase()
    if (t.includes(icp) || icp.includes(t)) return 40
  }

  // Word-level overlap
  const leadWords = t.split(/\s+/).filter(w => w.length > 3)
  const icpWords = icpTitles.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const overlap = leadWords.filter(w => icpWords.includes(w)).length
  return Math.min(28, overlap * 10)
}

function seniorityScore(leadTitle: string, icpSeniorities: string[]): number {
  const t = leadTitle.toLowerCase()
  for (const seniority of icpSeniorities) {
    const keywords = SENIORITY_KEYWORDS[seniority] ?? []
    if (keywords.some(k => t.includes(k))) return 15
  }
  return 0
}

function countryScore(leadCountry: string | null, icpCountries: string[]): number {
  if (!leadCountry) return 0
  const c = leadCountry.toLowerCase()
  const match = icpCountries.some(ic => {
    const icc = ic.toLowerCase()
    return c.includes(icc) || icc.includes(c)
  })
  return match ? 20 : 0
}

function employeeScore(empCount: number | null, icpRanges: string[]): number {
  if (!empCount || empCount === 0) return 5
  for (const range of icpRanges) {
    const [min, max] = range.split(',').map(Number)
    if (empCount >= min && empCount <= max) return 20
  }
  // Partial credit if close to a range
  return 5
}

function emailScore(email: string | null): number {
  return email ? 5 : 0
}

export function calculateMatchScore(lead: ApolloLead & { organization?: { industry?: string | null } | null }, icp: ICP): number {
  const title = lead.title ?? ''
  const empCount = lead.organization?.estimated_num_employees ?? null
  const country = lead.country ?? null
  const email = lead.email ?? null

  const ts = titleScore(title, icp.titles)
  const ss = seniorityScore(title, icp.seniorities)
  const cs = countryScore(country, icp.countries)
  const es = employeeScore(empCount, icp.employee_ranges)
  const ms = emailScore(email)

  const raw = ts + ss + cs + es + ms  // max = 40+15+20+20+5 = 100
  return Math.min(100, Math.max(1, Math.round(raw)))
}

export function formatEmployeeCount(n: number | null): string {
  if (!n) return 'N/A'
  if (n >= 10000) return '10,001+'
  if (n >= 5000) return '5,001-10,000'
  if (n >= 1000) return '1,001-5,000'
  if (n >= 500) return '501-1,000'
  if (n >= 200) return '201-500'
  if (n >= 100) return '101-200'
  if (n >= 50) return '51-100'
  if (n >= 20) return '21-50'
  if (n >= 10) return '11-20'
  return '1-10'
}
