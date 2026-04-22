import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/verify';

type TraceLine = { level: 'info' | 'step' | 'success' | 'warn' | 'error'; msg: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.expectedNonce) {
    return NextResponse.json(
      { error: 'token and expectedNonce required' },
      { status: 400 },
    );
  }

  const trace: TraceLine[] = [];
  const result = await verifyToken(body.token, body.expectedNonce, {
    log: (level, msg) => trace.push({ level, msg }),
  }).catch((e: Error) => {
    trace.push({ level: 'error', msg: `Verify threw: ${e.message}` });
    return { ok: false, reason: e.message } as const;
  });

  return NextResponse.json({ result, trace });
}
