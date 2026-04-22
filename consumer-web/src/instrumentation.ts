/**
 * Next.js instrumentation hook. Runs exactly once when the server process starts.
 * Boots the key-refresh broker and the WebSocket terminal stream — both of which
 * live in the Node.js runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startBroker } = await import('./lib/broker');
  const { startWSServer } = await import('./lib/wsServer');
  startBroker();
  startWSServer();
}
