export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: 'Missing pdfBase64' });
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: 'Analiza este documento y extrae el Ideal Customer Profile (ICP). Responde SOLO con un JSON valido, sin texto adicional, sin backticks: {"industries":["industria1"],"titles":["cargo1"],"country":"Chile","employeesMin":50,"seniorities":["director","manager"]}. Industrias y cargos en ingles para Apollo. Seniorities validos: c_suite, vp, director, head, manager, senior, entry.' }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    let icp;
    try { icp = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { return res.status(422).json({ error: 'Could not parse ICP', raw: text }); }
    return res.status(200).json(icp);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
