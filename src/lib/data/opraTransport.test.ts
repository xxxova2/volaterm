import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchOpraStatus, fetchOpraChainSnapshot } from './opraTransport';

describe('opraTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchOpraStatus returns JSON when /api/opra/status is ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            enabled: false,
            vendor: 'stub',
            mode: 'snapshot-only',
            ready: false,
            note: 'off',
            timestamp: 1,
          }),
          { status: 200 },
        ),
      ),
    );
    const s = await fetchOpraStatus();
    expect(s?.enabled).toBe(false);
    expect(s?.vendor).toBe('stub');
  });

  it('fetchOpraChainSnapshot surfaces 503 body when disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'opra_disabled', symbol: 'SPY' }), { status: 503 }),
      ),
    );
    const r = await fetchOpraChainSnapshot('SPY');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
    expect(r.body && 'error' in r.body && r.body.error).toBe('opra_disabled');
  });
});
