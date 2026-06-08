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
                  const response = await fetch('https://api.openai.com/v1/chat/completions', {
                              method: 'POST',
                              headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                              },
                              body: JSON.stringify({
                                            model: 'gpt-4o',
                                            max_tokens: 1000,
                                            messages: [{
                                                            role: 'user',
                                                            content: `Analiza este texto y extrae el Ideal Customer Profile (ICP). Responde SOLO con un JSON valido, sin texto adicional, sin backticks: {"industries":["industria1"],"titles":["cargo1"],"country":"Chile","employeesMin":50,"seniorities":["director","manager"]}. Industrias y cargos en ingles para Apollo. Seniorities validos: c_suite, vp, director, head, manager, senior, entry. Texto:\n\n${pdfText}`
                                            }]
                              })
                  });
                  const data = await response.json();
                  if (!response.ok) return res.status(422).json({ error: data.error?.message || 'OpenAI error' });
                  const text = data.choices?.[0]?.message?.content || '';
                  let icp;
                  try { icp = JSON.parse(text.replace(/```json|```/g, '').trim()); }
                  catch { return res.status(422).json({ error: 'Could not parse ICP', raw: text }); }
                  return res.status(200).json(icp);
        } catch (error) {
                  return res.status(500).json({ error: error.message });
        }
}
