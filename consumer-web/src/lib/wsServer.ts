import { WebSocketServer, type WebSocket } from 'ws';
import { subscribe } from './broker';
import { WS_PORT } from './config';

/**
 * WebSocket server broadcasting broker events to connected terminals.
 * Runs on its own port so we don't need a custom Next HTTP server.
 * HMR-safe via a globalThis pin.
 */

const g = globalThis as unknown as { __consumerWss?: WebSocketServer };

export function startWSServer() {
  if (g.__consumerWss) return;

  const wss = new WebSocketServer({ port: WS_PORT, path: '/terminal' });
  g.__consumerWss = wss;

  wss.on('connection', (ws: WebSocket) => {
    // No history is replayed — reloading the page intentionally clears the
    // terminal. The browser only sees broker events that fire while its
    // socket is open.
    ws.send(
      JSON.stringify({
        type: 'hello',
        msg: `connected to consumer broker on :${WS_PORT}`,
      }),
    );
  });

  subscribe((entry) => {
    const payload = JSON.stringify({ type: 'log', ...entry });
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`[ws] terminal stream listening on ws://localhost:${WS_PORT}/terminal`);
}
