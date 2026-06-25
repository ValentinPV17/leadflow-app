// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return res.status(204).end()
  }

  const hubspotPath = (req.url as string)?.replace('/api/hubspot', '') ?? ''
  const targetUrl = `https://api.hubapi.com${hubspotPath}`

  const hubspotRes = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: req.headers['authorization'] as string,
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  })

  const data = await hubspotRes.json()
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(hubspotRes.status).json(data)
}
