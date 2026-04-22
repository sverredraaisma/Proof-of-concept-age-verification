import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><div className="card">Loading…</div></div>}>
      <CallbackClient />
    </Suspense>
  );
}
