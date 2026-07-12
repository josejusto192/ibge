// Service worker do PWA — escrito à mão (sem Workbox/plugin) de propósito:
// o build usa Vite 8/rolldown, novo demais pra confiar em plugins de PWA, e
// a estratégia necessária é simples:
//   - navegações: rede primeiro, com fallback pro shell cacheado (offline);
//   - /assets/* (nomes com hash, imutáveis): cache primeiro;
//   - QUALQUER outra origem (Supabase, fontes): passa direto, sem cache —
//     dados de questões/progresso nunca podem ficar velhos.
// Ao mudar a estratégia, incremente VERSION pra descartar caches antigos.
const VERSION = 'v1';
const RUNTIME = `foco-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put('/app-shell', fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match('/app-shell');
          return cached ?? Response.error();
        }
      })()
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const resp = await fetch(request);
        if (resp.ok) {
          const cache = await caches.open(RUNTIME);
          cache.put(request, resp.clone());
        }
        return resp;
      })()
    );
  }
});
