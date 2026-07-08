import { describe, it, expect, vi } from 'vitest';
import handler from './[...slug].js';

const mockProxy = vi.hoisted(() => vi.fn(async (endpoint) => ({ status: 200, body: { ok: true, endpoint } })));

vi.mock('../../_shared.js', () => ({
  FMP_ALLOWED_ENDPOINTS: new Set(['quote']),
  isFmpEndpointAllowed: (e) => e === 'quote',
  proxyFmp: mockProxy,
}));

function res() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => {
    r.statusCode = c;
    return r;
  };
  r.json = (b) => {
    r.body = b;
    return r;
  };
  return r;
}

describe('api/fmp/stable handler', () => {
  it('allows a permitted endpoint and forwards slug+query to proxyFmp', async () => {
    const r = res();
    await handler({ url: '/api/fmp/stable/quote?symbol=SPY' }, r);
    expect(r.statusCode).toBe(200);
    expect(mockProxy).toHaveBeenCalledTimes(1);
    expect(mockProxy.mock.calls[0][0]).toBe('quote?symbol=SPY');
  });

  it('rejects a non-allowed endpoint with 403', async () => {
    const r = res();
    await handler({ url: '/api/fmp/stable/secrets' }, r);
    expect(r.statusCode).toBe(403);
  });

  it('parses the slug from the URL path (works without req.query.slug)', async () => {
    const r = res();
    await handler({ url: '/api/fmp/stable/quote' }, r);
    expect(r.statusCode).toBe(200);
    expect(mockProxy).toHaveBeenCalledTimes(1);
    expect(mockProxy.mock.calls[0][0]).toBe('quote');
  });
});
