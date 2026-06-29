import OpenAI from 'openai';
import { env } from './env';
import { fetchSource } from './fetcher';

export interface Story {
  rank: number;
  title: string;
  source: string;
  url: string;
  published: string;
  summary: string;
  score: number;
  why: string;
}

export interface AgentEvent {
  type: 'fetching' | 'fetched' | 'ranking' | 'done' | 'error';
  message: string;
  stories?: Story[];
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: env.openRouterApiKey,
});

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_source',
      description: 'Fetch the latest articles from a news source by its ID. Call this for every selected source.',
      parameters: {
        type: 'object',
        properties: {
          source_id: {
            type: 'string',
            description: 'The source ID (e.g. "anthropic", "openai", "techcrunch")',
          },
        },
        required: ['source_id'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Parks News — a personal news curator agent.

Your job:
1. Call search_source for EVERY source in the selected list. Do not skip any.
2. After fetching all sources, pick the TOP 10 most significant stories across all of them.

Scoring criteria:
- Significance: Is this a major announcement, breakthrough, or event? (landmark = 9-10, very relevant = 7-8, moderate = 5-6)
- Novelty: New information, not rehashed commentary.
- Breadth of impact: Affects many people or the industry.
- Recency: More recent = higher weight.

If a source returns an error or no articles, skip it gracefully and continue with the rest.

After collecting all articles, respond ONLY with a valid JSON object — no markdown, no explanation, just raw JSON:
{
  "top_stories": [
    {
      "rank": 1,
      "title": "...",
      "source": "...",
      "url": "...",
      "published": "...",
      "summary": "2-3 sentences on what happened and why it matters",
      "score": 9.2,
      "why": "One sentence on why this made the top 10"
    }
  ]
}`;

export async function* runAgent(
  selectedSources: string[]
): AsyncGenerator<AgentEvent> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Selected sources: ${selectedSources.join(', ')}. Fetch all of them and return the top 10 stories.`,
    },
  ];

  const MAX_ITERATIONS = 30;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const toolResultCount = messages.filter((m) => m.role === 'tool').length;
    const allFetched = toolResultCount > 0 && toolResultCount >= selectedSources.length;

    if (allFetched) {
      yield { type: 'ranking', message: 'Analyzing articles and finding top 10...' };

      const stream = await client.chat.completions.create({
        model: env.reasoningModel,
        messages,
        stream: true,
      });

      let content = '';
      let rankFound = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        content += delta;
        const newCount = (content.match(/"rank"\s*:/g) ?? []).length;
        if (newCount > rankFound) {
          rankFound = newCount;
          yield { type: 'ranking', message: `Finding top 10... (${rankFound}/10 ranked)` };
        }
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as { top_stories: Story[] };
          yield { type: 'done', message: 'Done', stories: parsed.top_stories };
          return;
        } catch {
          yield { type: 'error', message: 'Could not parse agent JSON response' };
          return;
        }
      }
      yield { type: 'error', message: 'Agent returned no structured data' };
      return;
    }

    const response = await client.chat.completions.create({
      model: env.reasoningModel,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;
    messages.push(message);

    if (message.tool_calls?.length) {
      const calls = message.tool_calls.filter(
        (c): c is Extract<OpenAI.Chat.ChatCompletionMessageToolCall, { type: 'function' }> =>
          c.type === 'function' && 'function' in c
      );

      const sourceNames = calls
        .map((c) => (JSON.parse(c.function.arguments) as { source_id: string }).source_id)
        .join(', ');
      yield { type: 'fetching', message: `Fetching: ${sourceNames}...` };

      const toolResults = await Promise.all(
        calls.map(async (call) => {
          const args = JSON.parse(call.function.arguments) as { source_id: string };
          const result = await fetchSource(args.source_id);
          return {
            tool_call_id: call.id,
            role: 'tool' as const,
            content: JSON.stringify(
              result.error
                ? { error: result.error }
                : { source: result.sourceName, count: result.articles.length, articles: result.articles }
            ),
          };
        })
      );

      messages.push(...toolResults);
      yield { type: 'fetched', message: `Fetched: ${sourceNames}` };
    } else {
      yield { type: 'ranking', message: 'Analyzing articles and finding top 10...' };

      const content = message.content ?? '';
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as { top_stories: Story[] };
          yield { type: 'done', message: 'Done', stories: parsed.top_stories };
          return;
        } catch {
          yield { type: 'error', message: 'Could not parse agent JSON response' };
          return;
        }
      }
      yield { type: 'error', message: 'Agent returned no structured data' };
      return;
    }
  }

  yield { type: 'error', message: 'Agent exceeded max iterations' };
}
