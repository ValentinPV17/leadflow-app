export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const domain = (req.query?.domain as string) ?? ''
  if (!domain) return res.status(400).end()

  // Try Clearbit first
  try {
    const r = await fetch(`https://logo.clearbit.com/${domain}?size=128`, {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (r.ok) {
      const buf = await r.arrayBuffer()
      const ct = r.headers.get('content-type') || 'image/png'
      res.setHeader('Content-Type', ct)
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.status(200).send(new Uint8Array(buf))
    }
  } catch {}

  // Fallback: redirect to a reliable favicon service (no Buffer needed)
  const domain = (req.query?.domain as string) ?? ''
  return res.redirect(302, `https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
}
