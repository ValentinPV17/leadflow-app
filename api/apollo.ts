// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key')
    return res.status(204).end()
  }

  // req.url is something like /api/apollo/v1/mixed_people/api_search
  const apolloPath = (req.url as string)?.replace('/api/apollo', '') ?? ''
  const targetUrl = `https://api.apollo.io${apolloPath}`

  const apolloRes = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.headers['x-api-key'] as string,
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  })

  const data = await apolloRes.json()
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(apolloRes.status).json(data)
}
