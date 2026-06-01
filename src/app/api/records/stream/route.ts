import { onRecordChange } from '@/lib/serverEventBus';

// This route streams SSE and must always be dynamic/runtime-handled.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // keep-alive newline every ~15s to prevent proxies closing the connection
      const keepAlive = setInterval(() => controller.enqueue(encoder.encode(':keepalive\n\n')), 15000);

      const onEvent = (msg: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        } catch (e) {
          // ignore
        }
      };

      // Set up a basic cleanup (without event listener removal) immediately
      // in case the stream is cancelled before onRecordChange resolves
      cleanup = () => {
        clearInterval(keepAlive);
        try { controller.close(); } catch (e) {}
      };

      // onRecordChange is async (for Redis init); use .then() to get the real off function
      onRecordChange(onEvent).then((off) => {
        // Replace cleanup with the full version that also removes the event listener
        cleanup = () => {
          clearInterval(keepAlive);
          off();
          try { controller.close(); } catch (e) {}
        };
      });

      // initial connected message
      controller.enqueue(encoder.encode('data: connected\n\n'));
    },
    cancel() {
      if (cleanup) cleanup();
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
