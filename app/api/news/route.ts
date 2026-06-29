import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent';
import { SOURCES } from '@/lib/sources';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_SOURCES = 10;

export async function POST(req: NextRequest) {
  const body = await req.json() as { selectedSources?: unknown };
  const selectedSources = body.selectedSources;

  if (!Array.isArray(selectedSources) || selectedSources.length === 0) {
    return new Response(JSON.stringify({ error: 'No sources selected' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (selectedSources.length > MAX_SOURCES) {
    return new Response(
      JSON.stringify({ error: `Maximum ${MAX_SOURCES} sources allowed per request` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const validIds = new Set(SOURCES.map((s) => s.id));
  const invalid = selectedSources.filter((id) => typeof id !== 'string' || !validIds.has(id));
  if (invalid.length > 0) {
    return new Response(
      JSON.stringify({ error: `Unknown source IDs: ${invalid.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of runAgent(selectedSources as string[])) {
          send(event);
          if (event.type === 'done' || event.type === 'error') break;
        }
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
