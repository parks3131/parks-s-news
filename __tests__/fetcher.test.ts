import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockParseURL = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    items: [
      {
        title: 'Claude 4 Released',
        link: 'https://anthropic.com/news/claude-4',
        pubDate: '2026-06-29T10:00:00Z',
        contentSnippet: 'Anthropic releases Claude 4 with major improvements.',
      },
      {
        title: 'Anthropic Safety Update',
        link: 'https://anthropic.com/research/safety',
        pubDate: '2026-06-28T08:00:00Z',
        contentSnippet: 'New safety benchmarks published.',
      },
    ],
  })
);

vi.mock('rss-parser', () => {
  function MockParser() {
    return { parseURL: mockParseURL };
  }
  return { default: MockParser };
});

import { fetchSource, fetchAllSources } from '../lib/fetcher';

beforeEach(() => {
  vi.clearAllMocks();
  mockParseURL.mockResolvedValue({
    items: [
      {
        title: 'Claude 4 Released',
        link: 'https://anthropic.com/news/claude-4',
        pubDate: '2026-06-29T10:00:00Z',
        contentSnippet: 'Anthropic releases Claude 4 with major improvements.',
      },
    ],
  });
});

describe('fetchSource', () => {
  it('returns articles for a valid source', async () => {
    const result = await fetchSource('anthropic');
    expect(result.error).toBeUndefined();
    expect(result.sourceName).toBe('Anthropic');
    expect(result.articles.length).toBeGreaterThan(0);
    expect(result.articles[0].title).toBe('Claude 4 Released');
  });

  it('returns an error for an unknown source id', async () => {
    const result = await fetchSource('not-a-real-source');
    expect(result.error).toMatch(/Unknown source/);
    expect(result.articles).toHaveLength(0);
  });

  it('returns gracefully when the RSS fetch fails', async () => {
    mockParseURL.mockRejectedValueOnce(new Error('Network timeout'));
    const result = await fetchSource('openai');
    expect(result.error).toMatch(/Failed to fetch/);
    expect(result.articles).toHaveLength(0);
  });
});

describe('fetchAllSources', () => {
  it('fetches multiple sources in parallel and returns all results', async () => {
    const results = await fetchAllSources(['anthropic', 'openai']);
    expect(results).toHaveLength(2);
    expect(results.every((r) => Array.isArray(r.articles))).toBe(true);
  });

  it('continues if one source fails — others still return', async () => {
    const results = await fetchAllSources(['anthropic', 'not-real', 'openai']);
    expect(results).toHaveLength(3);
    expect(results[1].error).toMatch(/Unknown source/);
    expect(results[0].articles.length).toBeGreaterThan(0);
    expect(results[2].articles.length).toBeGreaterThan(0);
  });
});
