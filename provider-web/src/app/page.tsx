import { Suspense } from 'react';
import ProviderClient from './ProviderClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="page"><div className="card">Loading…</div></div>}>
      <ProviderClient />
    </Suspense>
  );
}
