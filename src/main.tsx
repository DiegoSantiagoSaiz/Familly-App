import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capture PWA install prompt at the earliest possible moment globally on window
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-prompt-captured', { detail: e }));
  console.log('PWA installation prompt captured globally.');
});

// Register PWA Service Worker only on production outside of iframe
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isInIframe = window.self !== window.top;

    if (isInIframe) {
      // Unregister any active service worker to avoid cached chunk failures inside an iframe Editor
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Unregistered service worker in iframe to prevent cache conflicts.');
            }
          });
        }
      }).catch((err) => console.warn('Failed to scan service workers:', err));
    } else {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully!', reg.scope))
        .catch((err) => console.warn('Service Worker registration failed:', err));
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
