/**
 * Service worker minimo.
 *
 * Serve a due cose: rendere l'app installabile sul telefono e mostrare
 * qualcosa se si apre senza rete. Di proposito non tiene in memoria né
 * i dati né gli aggiornamenti dell'app: i turni devono essere sempre
 * quelli veri, quindi ogni richiesta va prima alla rete.
 */
const GUSCIO = 'guscio-v1';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(GUSCIO).then(cache => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then(nomi => Promise.all(nomi.filter(n => n !== GUSCIO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  // solo l'apertura della pagina: tutto il resto passa dritto alla rete
  if (evento.request.mode !== 'navigate') return;

  evento.respondWith(
    fetch(evento.request)
      .then(risposta => {
        caches.open(GUSCIO).then(cache => cache.put('/', risposta.clone()));
        return risposta;
      })
      .catch(() => caches.match('/'))
  );
});
