import type { User } from '@supabase/supabase-js'
import { Zap, LogOut, X } from 'lucide-react'
import LeadDeck from '../components/LeadDeck'
import type { Lead } from '../components/LeadCard'
import type { ApolloLead } from '../lib/apollo'
import type { CampaignPayload } from '../App'
import { calculateMatchScore, formatEmployeeCount } from '../lib/matchScore'

function apolloToLead(lead: ApolloLead, icp: CampaignPayload['icp']['payload']): Lead {
  const domain = lead.organization?.primary_domain
    || lead.organization?.website_url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    || null
  return {
    id: lead.id,
    companyName: lead.organization?.name ?? 'Empresa desconocida',
    contactName: lead.name ?? `${lead.first_name} ${lead.last_name ?? ''}`.trim(),
    title: lead.title ?? '',
    industry: lead.organization?.industry ?? icp.industries[0] ?? 'N/A',
    employeeCount: formatEmployeeCount(lead.organization?.estimated_num_employees ?? null),
    location: [lead.city, lead.country].filter(Boolean).join(', ') || 'N/A',
    logoUrl: domain ? `/api/logo?domain=${domain}` : undefined,
    matchScore: calculateMatchScore(lead, {
      titles: icp.titles,
      industries: icp.industries,
      countries: icp.countries,
      employee_ranges: icp.employee_ranges,
      seniorities: icp.seniorities,
    }),
  }
}

const DEMO_LEADS: Lead[] = [
  {
    id: '1',
    companyName: 'Falabella',
    contactName: 'Valentina Rojas',
    title: 'CMO',
    industry: 'Retail',
    employeeCount: '10,001+',
    location: 'Santiago, Chile',
    matchScore: 92,
  },
  {
    id: '2',
    companyName: 'Bci',
    contactName: 'Rodrigo Fuentes',
    title: 'Director de Marketing Digital',
    industry: 'Fintech / Banca',
    employeeCount: '5,001-10,000',
    location: 'Santiago, Chile',
    matchScore: 85,
  },
  {
    id: '3',
    companyName: 'Cornershop',
    contactName: 'Camila Vásquez',
    title: 'Head of Growth',
    industry: 'E-commerce / Delivery',
    employeeCount: '501-1,000',
    location: 'Santiago, Chile',
    matchScore: 78,
  },
  {
    id: '4',
    companyName: 'Rappi Chile',
    contactName: 'Diego Morales',
    title: 'VP Marketing',
    industry: 'E-commerce / Delivery',
    employeeCount: '1,001-5,000',
    location: 'Santiago, Chile',
    matchScore: 81,
  },
  {
    id: '5',
    companyName: 'Mercado Libre',
    contactName: 'Sofía Herrera',
    title: 'Marketing Manager',
    industry: 'E-commerce',
    employeeCount: '10,001+',
    location: 'Buenos Aires, Argentina',
    matchScore: 74,
  },
  {
    id: '6',
    companyName: 'Fintual',
    contactName: 'Martín Vargas',
    title: 'Brand Manager',
    industry: 'Fintech',
    employeeCount: '51-200',
    location: 'Santiago, Chile',
    matchScore: 88,
  },
  {
    id: '7',
    companyName: 'NotCo',
    contactName: 'Isidora Pérez',
    title: 'CMO',
    industry: 'FoodTech',
    employeeCount: '201-500',
    location: 'Santiago, Chile',
    matchScore: 69,
  },
  {
    id: '8',
    companyName: 'Betterfly',
    contactName: 'Felipe Soto',
    title: 'Director de Producto',
    industry: 'HR Tech / Salud',
    employeeCount: '201-500',
    location: 'Santiago, Chile',
    matchScore: 76,
  },
  {
    id: '9',
    companyName: 'Loggi',
    contactName: 'Ana Torres',
    title: 'Head of Marketing',
    industry: 'Logística',
    employeeCount: '1,001-5,000',
    location: 'São Paulo, Brasil',
    matchScore: 63,
  },
  {
    id: '10',
    companyName: 'Clínica Bupa',
    contactName: 'Pablo Aguilera',
    title: 'Gerente de Marketing',
    industry: 'Salud',
    employeeCount: '1,001-5,000',
    location: 'Santiago, Chile',
    matchScore: 71,
  },
]

interface Props {
  user: User
  onLogout: () => void
  onBack: () => void
  apolloLeads?: ApolloLead[]
  payload?: CampaignPayload
}

export default function SwipeLeads({ user, onLogout, onBack, apolloLeads, payload }: Props) {
  const leads: Lead[] = apolloLeads && payload && apolloLeads.length > 0
    ? apolloLeads
        .map(l => apolloToLead(l, payload.icp.payload))
        .sort((a, b) => b.matchScore - a.matchScore)
    : DEMO_LEADS
  return (
    <div className="min-h-screen bg-[#0d0d1a]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0d0d1a]/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Zap size={14} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Match<span className="text-emerald-400">:</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="p-1.5 text-white/20 hover:text-white/50 transition-colors rounded-lg hover:bg-white/5"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
            <button
              onClick={onBack}
              className="p-1.5 bg-white/8 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-all rounded-lg"
              title="Salir"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-xl mx-auto px-4 pt-8 pb-16">
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl font-black mb-1">
            Match<span className="text-emerald-400">:</span>
          </h1>
          <p className="text-white/30 text-sm">← Descartar &nbsp;·&nbsp; Aceptar →</p>
        </div>

        <LeadDeck leads={leads} user={user} />
      </main>
    </div>
  )
}
