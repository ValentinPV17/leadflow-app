import pdfParse from 'pdf-parse';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: 'Missing pdfBase64' });

    const buffer = Buffer.from(pdfBase64, 'base64');
    const parsed = await pdfParse(buffer);
    const pdfText = parsed.text?.slice(0, 8000) || '';
    if (!pdfText.trim()) return res.status(422).json({ error: 'PDF has no readable text' });

    const prompt = [
      'Analiza este documento y extrae el Ideal Customer Profile (ICP) para una campana de generacion de leads B2B.',
      '',
      'Debes retornar UNICAMENTE un JSON valido sin texto adicional, sin backticks, sin comentarios.',
      '',
      'Esquema obligatorio:',
      '{',
      '  "industries": ["industry1", "industry2"],',
      '  "excludedIndustries": [],',
      '  "titles": ["Job Title 1", "Job Title 2"],',
      '  "excludedTitles": [],',
      '  "country": "Chile",',
      '  "employeesMin": 50,',
      '  "seniorities": ["director", "manager"]',
      '}',
      '',
      'Reglas estrictas:',
      '- "industries" SIEMPRE debe tener al menos 1 valor. Si el documento no menciona industrias, infiere la mas probable segun los cargos y contexto.',
      '- Industrias en ingles usando nombres estandar de Apollo como: SaaS, Marketing & Advertising, E-commerce, Fintech, Healthcare, Education, Real Estate, Logistics, Manufacturing, Retail, Consulting, Technology, Financial Services, Media, Telecommunications.',
      '- "titles" en ingles, usar nombres exactos de cargos como aparecen en LinkedIn.',
      '- "seniorities" solo valores validos: c_suite, vp, director, head, manager, senior, entry.',
      '- "country" en ingles (Chile, Argentina, Colombia, etc.).',
      '- "employeesMin" como numero entero.',
      '- "excludedIndustries" y "excludedTitles": arrays vacios [] si no se mencionan exclusiones.',
      '',
      'Texto del documento:',
      '',
      pdfText
    ].join('
');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(422).json({ error: data.error?.message || 'OpenAI error' });

    const text = data.choices?.[0]?.message?.content || '';
    let icp;
    try {
      icp = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(422).json({ error: 'Could not parse ICP', raw: text });
    }

    // Garantizar que industries siempre tenga al menos un valor
    if (!icp.industries || icp.industries.length === 0) {
      icp.industries = ['Technology'];
    }

    return res.status(200).json(icp);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
