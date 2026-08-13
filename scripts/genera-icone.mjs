/**
 * Genera le icone PNG dell'app installabile.
 *
 *   node scripts/genera-icone.mjs
 *
 * Disegna un quadretto pieno con dentro una griglia bianca, che è poi
 * quello che si vede aprendo l'app: la tabella dei turni. Niente
 * librerie: il PNG viene scritto a mano, servono solo rettangoli.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBBLICA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const ICONE = [
  { nome: 'icona', sfondo: [27, 24, 21], griglia: [253, 251, 249] },
  { nome: 'icona-pomodoro', sfondo: [195, 52, 34], griglia: [255, 248, 246] },
  { nome: 'icona-dauria', sfondo: [20, 122, 81], griglia: [246, 253, 250] }
];

const MISURE = [192, 512];

/* ---------- disegno ---------- */

const riempi = (px, lato, x0, y0, x1, y1, colore) => {
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(lato, Math.round(y1)); y++) {
    for (let x = Math.max(0, Math.round(x0)); x < Math.min(lato, Math.round(x1)); x++) {
      const i = (y * lato + x) * 3;
      px[i] = colore[0];
      px[i + 1] = colore[1];
      px[i + 2] = colore[2];
    }
  }
};

function disegna(lato, { sfondo, griglia }) {
  const px = Buffer.alloc(lato * lato * 3);
  riempi(px, lato, 0, 0, lato, lato, sfondo);

  // la griglia sta nel 56% centrale: così regge anche il ritaglio
  // tondo che Android applica alle icone "maskable"
  const bordo = lato * 0.22;
  const dentro = lato - bordo * 2;
  const spessore = Math.max(2, Math.round(lato * 0.035));
  const passo = dentro / 3;

  for (let r = 0; r < 4; r++) {
    riempi(px, lato, bordo, bordo + r * passo - (r === 3 ? spessore : 0), bordo + dentro, bordo + r * passo + (r === 3 ? 0 : spessore), griglia);
  }
  for (let c = 0; c < 4; c++) {
    riempi(px, lato, bordo + c * passo - (c === 3 ? spessore : 0), bordo, bordo + c * passo + (c === 3 ? 0 : spessore), bordo + dentro, griglia);
  }

  // una casella piena: il turno assegnato
  riempi(px, lato, bordo + passo + spessore, bordo + spessore, bordo + passo * 2, bordo + passo, griglia);

  return px;
}

/* ---------- scrittura del PNG ---------- */

const TABELLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABELLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const pezzo = (tipo, dati) => {
  const testa = Buffer.alloc(8);
  testa.writeUInt32BE(dati.length, 0);
  testa.write(tipo, 4, 'ascii');
  const coda = Buffer.alloc(4);
  coda.writeUInt32BE(crc32(Buffer.concat([Buffer.from(tipo, 'ascii'), dati])), 0);
  return Buffer.concat([testa, dati, coda]);
};

function comePng(px, lato) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8; // bit per canale
  ihdr[9] = 2; // colori RGB
  // riga per riga, ognuna preceduta dal byte del filtro (0 = nessuno)
  const righe = Buffer.alloc(lato * (lato * 3 + 1));
  for (let y = 0; y < lato; y++) {
    righe[y * (lato * 3 + 1)] = 0;
    px.copy(righe, y * (lato * 3 + 1) + 1, y * lato * 3, (y + 1) * lato * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pezzo('IHDR', ihdr),
    pezzo('IDAT', deflateSync(righe, { level: 9 })),
    pezzo('IEND', Buffer.alloc(0))
  ]);
}

for (const icona of ICONE) {
  for (const lato of MISURE) {
    const file = join(PUBBLICA, `${icona.nome}-${lato}.png`);
    writeFileSync(file, comePng(disegna(lato, icona), lato));
    console.log(`scritta ${icona.nome}-${lato}.png`);
  }
}
