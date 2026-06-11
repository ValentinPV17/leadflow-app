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
    const pdfText = parsed.text ? parsed.text.slice(0, 8000) : '';
    if (!pdfText.trim()) return res.status(422).json({ error: 'PDF has no readable text' });

    const systemMsg = 'Eres un experto en B2B sales. Extraes ICPs de documentos. Respondes SOLO JSON valido sin texto extra.';
    const userMsg = 'Extrae el ICP de este documento para campana B2B.\n\nResponde SOLO con este JSON sin texto extra:\n{"industries":["SaaS"],"excludedIndustries":[],"titles":["Marketing Manager"],"excludedTitles":[],"country":"Chile","employeesMin":50,"seniorities":["director","manager"]}\n\nReglas:\n- industries minimo 1 valor en ingles estandar: SaaS, Marketing & Advertising, Fintech, Healthcare, Technology, E-commerce, Retail, Education, Logistics, Consulting, Financial Services, Manufacturing\n- Si no se menciona industria infiere por contexto\n- titles en ingles como en LinkedIn\n- seniorities solo valores: c_suite, vp, director, head, manager, senior, entry\n- country en ingles\n- employeesMin numero entero\n\nDocumento:\n' + pdfText;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: 'gpt-4o', max_tokens: 800, temperature: 0, messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userMsg }] })
    });

    const data = await response.json();
    if (!response.ok) return res.status(422).json({ error: data.error ? data.error.message : 'OpenAI error' });

    const raw = data.choices && data.choices[0] ? data.choices[0].message.content : '';
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    let icp;
    try { icp = JSON.parse(clean); } catch(e) { return res.status(422).json({ error: 'Parse failed', raw: raw }); }

    if (!icp.industries || !icp.industries.length) icp.industries = ['Technology'];
    if (!icp.excludedIndustries) icp.excludedIndustries = [];
    if (!icp.titles) icp.titles = [];
    if (!icp.excludedTitles) icp.excludedTitles = [];
    if (!icp.seniorities || !icp.seniorities.length) icp.seniorities = ['director', 'manager'];
    if (!icp.employeesMin) icp.employeesMin = 50;
    if (!icp.country) icp.country = 'Chile';

    return res.status(200).json(icp);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
