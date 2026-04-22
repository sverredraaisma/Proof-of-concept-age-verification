import { NextResponse } from 'next/server';
import { SERVER_URL } from '@/lib/config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.nonce || !body?.dob) {
    return NextResponse.json({ error: 'nonce and dob required' }, { status: 400 });
  }
  const r = await fetch(`${SERVER_URL}/sign`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nonce: body.nonce, dob: body.dob }),
  });
  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
