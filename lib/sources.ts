export type Category = 'ai' | 'tech' | 'general' | 'sports' | 'dev';

export interface Source {
  id: string;
  name: string;
  category: Category;
  rssUrl: string;
  authority: number;
}

export const SOURCES: Source[] = [
  // AI
  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'ai',
    rssUrl: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
    authority: 5,
  },
  {
    id: 'anthropic-research',
    name: 'Anthropic Research',
    category: 'ai',
    rssUrl: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_research.xml',
    authority: 5,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    rssUrl: 'https://openai.com/news/rss.xml',
    authority: 5,
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    category: 'ai',
    rssUrl: 'https://huggingface.co/blog/feed.xml',
    authority: 4,
  },
  {
    id: 'mit-tech-review',
    name: 'MIT Tech Review',
    category: 'ai',
    rssUrl: 'https://www.technologyreview.com/feed/',
    authority: 5,
  },
  // Tech
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    category: 'tech',
    rssUrl: 'https://techcrunch.com/feed/',
    authority: 4,
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    category: 'tech',
    rssUrl: 'https://www.theverge.com/rss/index.xml',
    authority: 4,
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    category: 'tech',
    rssUrl: 'https://feeds.arstechnica.com/arstechnica/index',
    authority: 4,
  },
  {
    id: 'macrumors',
    name: 'MacRumors',
    category: 'tech',
    rssUrl: 'https://feeds.macrumors.com/MacRumors-All',
    authority: 3,
  },
  {
    id: 'toms-hardware',
    name: "Tom's Hardware",
    category: 'tech',
    rssUrl: 'https://www.tomshardware.com/feeds/all',
    authority: 3,
  },
  {
    id: 'wired',
    name: 'Wired',
    category: 'tech',
    rssUrl: 'https://www.wired.com/feed/rss',
    authority: 4,
  },
  // General
  {
    id: 'nyt-tech',
    name: 'NYT Technology',
    category: 'general',
    rssUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    authority: 5,
  },
  {
    id: 'bbc-tech',
    name: 'BBC Technology',
    category: 'general',
    rssUrl: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    authority: 5,
  },
  {
    id: 'reuters-tech',
    name: 'Reuters Tech',
    category: 'general',
    rssUrl: 'https://feeds.reuters.com/reuters/technologyNews',
    authority: 5,
  },
  // Sports
  {
    id: 'espn',
    name: 'ESPN',
    category: 'sports',
    rssUrl: 'https://www.espn.com/espn/rss/news',
    authority: 4,
  },
  {
    id: 'ncaa',
    name: 'NCAA',
    category: 'sports',
    rssUrl: 'https://www.espn.com/espn/rss/ncaa/news',
    authority: 4,
  },
  // Dev
  {
    id: 'hacker-news',
    name: 'Hacker News',
    category: 'dev',
    rssUrl: 'https://hnrss.org/frontpage',
    authority: 4,
  },
  {
    id: 'github-blog',
    name: 'GitHub Blog',
    category: 'dev',
    rssUrl: 'https://github.blog/feed/',
    authority: 4,
  },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  ai: 'AI',
  tech: 'Tech',
  general: 'General',
  sports: 'Sports',
  dev: 'Dev',
};

export const CATEGORY_ORDER: Category[] = ['ai', 'tech', 'general', 'sports', 'dev'];
