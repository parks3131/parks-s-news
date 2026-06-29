import { describe, it, expect } from 'vitest';
import { SOURCES } from '../lib/sources';

const MAX_SOURCES = 10;

function validateRequest(selectedSources: unknown): { ok: boolean; error?: string } {
  if (!Array.isArray(selectedSources) || selectedSources.length === 0) {
    return { ok: false, error: 'No sources selected' };
  }
  if (selectedSources.length > MAX_SOURCES) {
    return { ok: false, error: `Maximum ${MAX_SOURCES} sources allowed per request` };
  }
  const validIds = new Set(SOURCES.map((s) => s.id));
  const invalid = selectedSources.filter((id) => typeof id !== 'string' || !validIds.has(id));
  if (invalid.length > 0) {
    return { ok: false, error: `Unknown source IDs: ${invalid.join(', ')}` };
  }
  return { ok: true };
}

describe('request validation', () => {
  it('accepts a valid list of source ids', () => {
    expect(validateRequest(['anthropic', 'openai'])).toEqual({ ok: true });
  });

  it('rejects an empty array', () => {
    const result = validateRequest([]);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No sources/);
  });

  it('rejects a non-array payload', () => {
    expect(validateRequest(null).ok).toBe(false);
    expect(validateRequest('anthropic').ok).toBe(false);
    expect(validateRequest(42).ok).toBe(false);
  });

  it('rejects more than 10 sources', () => {
    const ids = SOURCES.slice(0, 11).map((s) => s.id);
    const result = validateRequest(ids);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Maximum 10/);
  });

  it('rejects unknown source ids', () => {
    const result = validateRequest(['anthropic', 'fake-news-site']);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/fake-news-site/);
  });

  it('rejects non-string entries in the array', () => {
    const result = validateRequest(['anthropic', 42, null]);
    expect(result.ok).toBe(false);
  });
});
