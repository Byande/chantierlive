/* ChantierLive — service worker : coque applicative en cache, réseau pour les données */
const CACHE = 'chantierlive-v0.4.1';
const COQUE = ['./', './index.html', './app.css', './app.js', './crud.js', './modules.js', './offline.js', './import.js', './manifest.webmanifest', '../assets/brand/favicon.svg', '../assets/brand/mark.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.endsWith('supabase.co')) return; // données : toujours le réseau (file d'attente gérée par l'application)
  if (u.hostname.includes('fonts.g') || u.hostname.includes('jsdelivr') || u.hostname.includes('cdnjs')) { e.respondWith(caches.open(CACHE).then(async c => { const r = await c.match(e.request); if (r) return r; try { const n = await fetch(e.request); c.put(e.request, n.clone()); return n; } catch { return r || Response.error(); } })); return; }
  if (u.origin === location.origin) { e.respondWith(fetch(e.request).then(n => { if (n.ok) caches.open(CACHE).then(c => c.put(e.request, n.clone())); return n; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))); }
});
