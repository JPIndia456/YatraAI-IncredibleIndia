'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#FDFDFB', color: '#000080' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Critical error
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0.5rem 0 1rem' }}>Yatra needs a refresh</h1>
          <p style={{ maxWidth: '28rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.5 }}>
            The app could not render. Reload the page or try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#FF9933',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.65rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
