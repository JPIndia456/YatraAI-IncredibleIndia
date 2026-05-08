'use client';

import { useEffect } from 'react';

export default function PwaRegistry() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Avoid stale cached bundles while iterating locally.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key.startsWith('yatra-ai-cache-')) {
              caches.delete(key);
            }
          });
        });
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          registration.update();
          console.log('PWA ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('PWA ServiceWorker registration failed: ', err);
        }
      );
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
