import Parser from 'rss-parser';
import { SOURCES } from './sources';

export interface Article {
  title: string;
  url: string;
  published: string;
  summary: string;
  source: string;
}

export interface FetchResult {
  sourceId: string;
  sourceName: string;
  articles: Article[];
  error?: string;
}

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Parks-News/1.0' },
});

const cache = new Map<string, { data: FetchResult; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function fetchSource(sourceId: string): Promise<FetchResult> {
  const source = SOURCES.find((s) => s.id === sourceId);
  if (!source) {
    return { sourceId, sourceName: sourceId, articles: [], error: `Unknown source: ${sourceId}` };
  }

  const cached = cache.get(sourceId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const feed = await parser.parseURL(source.rssUrl);
    const articles: Article[] = feed.items.slice(0, 20).map((item) => ({
      title: item.title ?? '',
      url: item.link ?? '',
      published: item.pubDate ?? item.isoDate ?? '',
      summary: item.contentSnippet?.substring(0, 400) ?? '',
      source: source.name,
    }));

    const result: FetchResult = { sourceId, sourceName: source.name, articles };
    cache.set(sourceId, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    const result: FetchResult = {
      sourceId,
      sourceName: source.name,
      articles: [],
      error: `Failed to fetch ${source.name}: ${String(err)}`,
    };
    return result;
  }
}

export async function fetchAllSources(sourceIds: string[]): Promise<FetchResult[]> {
  return Promise.all(sourceIds.map(fetchSource));
}
