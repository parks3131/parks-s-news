# Skibidi News

A personal AI-powered news aggregator. Pick your sources, hit a button — an agent fetches, scores, and surfaces your top 10 stories.

Built with Next.js 16, OpenRouter, and a real agentic tool-call loop.

---

## What it does

You select news sources (Anthropic, OpenAI, TechCrunch, NCAA, NYT, etc.) from a categorized picker. The agent calls a `search_source` tool for each selected source, reads the RSS feeds in parallel, reasons across all the articles, and returns the 10 most significant stories ranked by impact, novelty, and recency — with a score and a one-sentence justification for each.

Results stream back live as the agent works, so you see progress instead of a blank spinner.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| LLM | OpenRouter (`openai/gpt-oss-120b` or any model) |
| LLM SDK | `openai` npm package (OpenRouter is API-compatible) |
| RSS parsing | `rss-parser` |
| Tests | Vitest |

---

## Getting started

```bash
# 1. Clone and install
npm install

# 2. Set env vars
cp .env.local.example .env.local
# Add your OPENROUTER_API_KEY and REASONING_MODEL

# 3. Run
npm run dev
```

Open http://localhost:3000, select sources, click **Get Top 10**.

---

## Project structure

```
lib/
  env.ts        # Validates required env vars at startup — fails loud, not silent
  sources.ts    # Registry of all supported sources + RSS URLs
  fetcher.ts    # RSS fetching, 15-min in-memory cache, parallel fetch, graceful errors
  agent.ts      # Agent loop with tool calls, SSE event emitter, JSON parsing

app/
  page.tsx               # Source picker UI + streaming result display
  api/news/route.ts      # HTTP handler: validates input, streams SSE from agent

__tests__/
  fetcher.test.ts        # Unit tests: valid source, unknown source, network failure, parallel fetch
  validation.test.ts     # Unit tests: empty array, too many sources, unknown IDs, bad types
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `REASONING_MODEL` | Yes | Model ID, e.g. `openai/gpt-oss-120b` or `anthropic/claude-sonnet-4-6` |

The server throws at startup if either is missing.

---

## Before and After: What we improved

This project was built in two passes. The first pass got it working in minutes. The second pass made it production-quality. Here's exactly what changed and why.

### 1. Env validation at startup

**Before:** `process.env.OPENROUTER_API_KEY` was read inline inside the API route. A missing key only showed up when someone clicked the button — a confusing 500 error with no clear message.

**After:** `lib/env.ts` checks all required variables when the module first loads. If anything is missing the server throws immediately with a clear message like `Missing required environment variable: OPENROUTER_API_KEY`. You know the problem before a single request comes in.

---

### 2. Separation of concerns

**Before:** `app/api/news/route.ts` was a 145-line file doing everything — RSS fetching, OpenAI client setup, tool definitions, the agent loop, JSON parsing, and HTTP response handling. All tangled together.

**After:** Three focused files:
- `lib/fetcher.ts` — only knows how to get articles from an RSS URL
- `lib/agent.ts` — only knows how to run the LLM loop and emit events
- `app/api/news/route.ts` — only knows how to validate HTTP input and pipe the stream

When something breaks you know exactly which file to look at. When you want to swap the LLM provider you touch only `agent.ts`.

---

### 3. Input validation

**Before:** The API accepted any JSON body. You could send 50 source IDs and burn through your API credits, or send `null` and get a crash.

**After:** The route validates three things before touching the agent:
- Is `selectedSources` a non-empty array?
- Is it 10 sources or fewer?
- Are all IDs in the known source registry?

Any violation returns a 400 with a clear error message. The agent never runs on bad input.

---

### 4. Caching + parallel fetching

**Before:** Every request fetched all RSS feeds fresh. Sequential tool calls meant 5 sources × 3 seconds each = 15 seconds just on fetching.

**After:** Two improvements in `fetcher.ts`:
- **Cache:** Each source is cached for 15 minutes in memory. Second request for the same source is instant.
- **Parallel:** `fetchAllSources` uses `Promise.all` — all sources fetch simultaneously. 5 sources in parallel ≈ 3 seconds total regardless of count.

---

### 5. Graceful failure modes

**Before:** If one RSS feed was down (network error, 404, timeout), the entire request crashed with a 500.

**After:** `fetchSource` catches all errors and returns `{ articles: [], error: "..." }` instead of throwing. The agent sees the error message and skips that source gracefully, continuing with the rest. If 4 of 5 sources work, you still get results.

The agent system prompt also explicitly instructs: *"If a source returns an error or no articles, skip it gracefully and continue."*

---

### 6. Streaming (SSE)

**Before:** The API waited for the entire agent loop to finish — all tool calls done, all articles ranked — then returned one big JSON response. With 5 sources that was 30–45 seconds of blank spinner.

**After:** The API route returns a `text/event-stream` (Server-Sent Events) response. The agent emits events as it works:
- `fetching` — "Fetching anthropic..."
- `fetched` — "Fetched: anthropic, openai"
- `ranking` — "Agent is ranking stories..."
- `done` — stories array

The frontend reads the stream with `ReadableStream.getReader()` and updates the UI live. Users see a live activity log with checkmarks as each source completes, then results appear.

---

### 7. Tests

**Before:** Zero tests. No way to refactor safely or catch regressions.

**After:** 11 tests across 2 files using Vitest:

`fetcher.test.ts` — covers the data layer:
- Returns articles for a valid source
- Returns a clean error for an unknown source ID
- Returns gracefully when the network fails (no crash)
- Fetches multiple sources in parallel
- Continues when one of many sources fails

`validation.test.ts` — covers the HTTP boundary:
- Accepts valid source arrays
- Rejects empty arrays, non-arrays, `null`
- Rejects more than 10 sources
- Rejects unknown source IDs
- Rejects non-string entries in the array

Run with `npm test`.

---

## Available sources

| Category | Sources |
|---|---|
| AI | Anthropic, Anthropic Research, OpenAI, HuggingFace, MIT Tech Review |
| Tech | TechCrunch, The Verge, Ars Technica, MacRumors, Tom's Hardware, Wired |
| General | NYT Technology, BBC Technology, Reuters Tech |
| Sports | ESPN, NCAA |
| Dev | Hacker News, GitHub Blog |

---

## Roadmap

- **Skibidi Newsletter** — daily email digest of your top 10, sent every morning
- Auth — protect the API endpoint
- Persistent source preferences — remember your selections
- More sources — add any RSS feed by URL
