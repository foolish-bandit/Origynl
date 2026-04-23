import React, { useEffect, useState } from 'react';

/**
 * Surfaces browser connectivity state so users know why a chain read or
 * certify just failed. Hashing and capture still work offline — only the
 * network trip is blocked — so the copy reassures users their work isn't lost.
 */
export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--bad, #dc2626)',
        color: '#fff',
        padding: '10px 24px',
        fontSize: 12,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        textAlign: 'center',
        fontFamily: 'inherit',
      }}
    >
      OFFLINE · Local hashing still works. Chain reads &amp; certifications will resume when
      you reconnect.
    </div>
  );
};
