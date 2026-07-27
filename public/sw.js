const CACHE_STATIC = "pp-static-v2";
const CACHE_API = "pp-api-v2";

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/financeiro-pessoal",
  "/offline",
];

// ── Install: pré-cacheia páginas principais ──────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then((c) =>
      Promise.allSettled(PRECACHE_URLS.map((u) => c.add(u)))
    )
  );
  // NÃO chama skipWaiting() aqui — aguarda o usuário confirmar a atualização
});

// ── Activate: remove caches antigos ─────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_API)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Mensagem: permite que a página dispare skipWaiting() ─────────────────────
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Fetch: estratégia por tipo de recurso ────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignora não-GET e protocolos não-http
  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;
  // Ignora requests cross-origin (analytics, fonts externas etc.)
  if (url.origin !== location.origin) return;

  // Assets estáticos do Next.js (_next/static) → CacheFirst (são imutáveis pelo hash)
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Chamadas de API → NetworkFirst (tenta buscar, cai no cache se offline)
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(networkFirstAPI(request));
    return;
  }

  // Páginas e outros → NetworkFirst com fallback para cache e offline.html
  e.respondWith(networkFirstPage(request));
});

// ── Estratégias ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_API);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Sem conexão. Exibindo dados salvos." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback para a página offline
    const offline = await caches.match("/offline");
    return offline || new Response("Offline", { status: 503 });
  }
}
