export default async function handler(req: any, res: any) {
  const domain = (req.query?.domain as string) ?? ''
  if (!domain) return res.status(400).end()

  // Check if Clearbit has a logo for this domain (HEAD request, no binary data)
  try {
    const check = await fetch(`https://logo.clearbit.com/${domain}`, { method: 'HEAD' })
    if (check.ok) {
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.redirect(302, `https://logo.clearbit.com/${domain}?size=128`)
    }
  } catch {}

  // Fallback: Google Favicon (always resolves, never DNS errors in browser)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.redirect(302, `https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
}
