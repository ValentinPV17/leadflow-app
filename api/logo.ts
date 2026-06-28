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
      return res.status(200).send(Buffer.from(buf))
    }
  } catch {}

  // Fallback: 1x1 transparent PNG (triggers React onError cleanly)
  const transparent = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(transparent)
}
