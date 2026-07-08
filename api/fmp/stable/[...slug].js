import { isFmpEndpointAllowed, FMP_ALLOWED_ENDPOINTS, proxyFmp } from '../../_shared.js';

export default async function handler(req, res) {
  const slug = Array.isArray(req.query.slug)
    ? req.query.slug.join('/')
    : (req.query.slug ?? '');

  if (!isFmpEndpointAllowed(slug)) {
    res.status(403).json({ error: 'Endpoint not allowed', allowed: [...FMP_ALLOWED_ENDPOINTS] });
    return;
  }

  const apiKey = process.env.FMP_API_KEY;
  const query = { ...req.query };
  delete query.slug;
  const qs = new URLSearchParams(query).toString();
  const endpoint = qs ? `${slug}?${qs}` : slug;

  const { status, body } = await proxyFmp(endpoint, apiKey);
  res.status(status).json(body);
}
