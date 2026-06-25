export interface ParsedICP {
  industries: string[]
  titles: string[]
  countries: string[]
  employee_ranges: string[]
  seniorities: string[]
}

const ALL_RANGES = [
  '1,10', '11,20', '21,50', '51,100', '101,200',
  '201,500', '501,1000', '1001,5000', '5001,10000', '10001,100000',
]

function minToRanges(min: number): string[] {
  const thresholds = [1, 11, 21, 51, 101, 201, 501, 1001, 5001, 10001]
  const idx = thresholds.findLastIndex(t => min >= t)
  return ALL_RANGES.slice(Math.max(0, idx))
}

const SYSTEM_PROMPT = `Eres un asistente experto en ventas B2B y generación de leads.
Tu tarea es extraer parámetros de búsqueda de leads a partir de una descripción en lenguaje natural.

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "industries": ["industria1", "industria2", ...hasta 6],
  "titles": ["cargo1", "cargo2", ...hasta 8],
  "countries": ["país1", "país2"],
  "employees_min": número,
  "seniorities": ["c_suite"|"vp"|"director"|"head"|"manager"|"senior"|"entry"]
}

Reglas para industries (MUY IMPORTANTE - sé amplio):
- Usa nombres en inglés exactos de Apollo.io
- Si mencionan "marketing digital" o "agencia de marketing" → incluye: "Marketing & Advertising", "Advertising Services", "Public Relations & Communications"
- Si mencionan "tecnología" → incluye: "Information Technology & Services", "Computer Software", "Internet"
- Si mencionan "fintech" → incluye: "Financial Services", "Banking", "Fintech"
- Si mencionan "e-commerce" → incluye: "Retail", "Internet", "E-commerce"
- Si mencionan "salud" → incluye: "Hospital & Health Care", "Medical Devices", "Pharmaceuticals"
- Siempre incluye industrias relacionadas y adyacentes al sector mencionado, no solo la principal
- Mínimo 3 industrias, máximo 6

Reglas para titles:
- Mantén en inglés para Apollo.io
- Incluye variantes del cargo (ej: "Marketing Manager", "Digital Marketing Manager", "Marketing Director")
- Mínimo 3 títulos, máximo 8

Reglas generales:
- countries: En español (ej: "Chile", "Argentina"). Si no se menciona, usa ["Chile"]
- employees_min: número entero. Si no se menciona usa 10
- seniorities: infiere desde los títulos. Si no se menciona usa ["manager", "director", "head", "c_suite"]
- Devuelve solo el JSON, sin texto adicional`

export async function parseICPFromText(text: string): Promise<ParsedICP> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Respuesta vacía de OpenAI')

  const raw = JSON.parse(content) as { industries?: string[]; titles?: string[]; countries?: string[]; employees_min?: number; seniorities?: string[] }

  return {
    industries: raw.industries || [],
    titles: raw.titles || [],
    countries: raw.countries?.length ? raw.countries : ['Chile'],
    employee_ranges: minToRanges(raw.employees_min ?? 10),
    seniorities: raw.seniorities || ['manager', 'director'],
  }
}
