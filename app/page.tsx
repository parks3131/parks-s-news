'use client';

import { useState } from 'react';
import { SOURCES, CATEGORY_LABELS, CATEGORY_ORDER, type Category } from '@/lib/sources';
import type { Story, AgentEvent } from '@/lib/agent';

export default function Home() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = (category: Category) => {
    const ids = SOURCES.filter((s) => s.category === category).map((s) => s.id);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const fetchNews = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError('');
    setStories([]);
    setHasSearched(true);
    setStatusLog(['Starting agent...']);

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSources: Array.from(selected) }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Request failed');
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as AgentEvent;

            if (event.type === 'fetching' || event.type === 'fetched') {
              setStatusLog((prev) => [...prev, event.message]);
            } else if (event.type === 'ranking') {
              setStatusLog((prev) => [...prev, 'Agent is ranking stories...']);
            } else if (event.type === 'done' && event.stories) {
              setStatusLog([]);
              const incoming = event.stories;
              incoming.forEach((story, i) => {
                setTimeout(() => {
                  setStories((prev) => [...prev, story]);
                  if (i === incoming.length - 1) setLoading(false);
                }, i * 400);
              });
            } else if (event.type === 'error') {
              setError(event.message);
              setLoading(false);
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch {
      setError('Network error — check console');
      setLoading(false);
    }
  };

  const grouped = CATEGORY_ORDER.reduce<Record<Category, typeof SOURCES>>((acc, cat) => {
    acc[cat] = SOURCES.filter((s) => s.category === cat);
    return acc;
  }, {} as Record<Category, typeof SOURCES>);

  const categoryColors: Record<Category, string> = {
    ai: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    tech: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    general: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    sports: 'bg-green-500/20 text-green-300 border-green-500/40',
    dev: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  };

  const selectedColors: Record<Category, string> = {
    ai: 'bg-violet-600 text-white border-violet-500',
    tech: 'bg-blue-600 text-white border-blue-500',
    general: 'bg-slate-600 text-white border-slate-500',
    sports: 'bg-green-600 text-white border-green-500',
    dev: 'bg-orange-600 text-white border-orange-500',
  };

  const getSourceCategory = (sourceName: string): Category =>
    SOURCES.find((s) => s.name === sourceName)?.category ?? 'tech';

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-1">
            Skibidi <span className="text-violet-400">News</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Select your sources. Agent fetches, scores, and surfaces the top 10.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {CATEGORY_LABELS[cat]}
                </span>
                <button
                  onClick={() => selectAll(cat)}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  select all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {grouped[cat].map((source) => {
                  const isSelected = selected.has(source.id);
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggle(source.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ${
                        isSelected
                          ? selectedColors[cat]
                          : categoryColors[cat] + ' hover:opacity-80'
                      }`}
                    >
                      {source.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={fetchNews}
            disabled={selected.size === 0 || loading}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-colors"
          >
            {loading
              ? 'Agent working...'
              : `Get Top 10 from ${selected.size} source${selected.size !== 1 ? 's' : ''}`}
          </button>
          {selected.size > 0 && !loading && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {loading && statusLog.length > 0 && (
          <div className="mb-8 px-4 py-3 bg-[#13131a] border border-white/5 rounded-lg space-y-1">
            {statusLog.map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                {i === statusLog.length - 1 ? (
                  <span className="inline-block w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span className="text-green-500 flex-shrink-0">✓</span>
                )}
                {msg}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && hasSearched && stories.length === 0 && statusLog.length === 0 && !error && (
          <div className="mb-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
            No stories found — the selected sources may have returned empty feeds. Try adding more sources.
          </div>
        )}

        {stories.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              Top 10 Stories
            </h2>
            {stories.map((story) => {
              const cat = getSourceCategory(story.source);
              return (
                <a
                  key={story.rank}
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="story-card block bg-[#13131a] border border-white/5 rounded-xl p-5 hover:border-violet-500/30 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-600 min-w-[2rem] text-right transition-colors">
                      {story.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[cat]}`}>
                          {story.source}
                        </span>
                        {story.published && (
                          <span className="text-xs text-slate-600">
                            {new Date(story.published).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        {story.score != null && (
                          <span className="text-xs text-slate-600 ml-auto">
                            score {Number(story.score).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors mb-1.5 leading-snug">
                        {story.title}
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2">
                        {story.summary}
                      </p>
                      <p className="text-xs text-slate-600 italic">{story.why}</p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
