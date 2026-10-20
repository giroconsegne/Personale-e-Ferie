import {
  GIORNI,
  TURNO_PREDEFINITO,
  aperturaDi,
  comprendeIlPranzo,
  comprendeLaCena,
  eLavorativo,
  repartoDi
} from './costanti';
import { chiaveGiorno, lunediDi } from './date';

/**
 * I turni sono organizzati settimana per settimana:
 *
 *   settimane = { "2026-08-10": { "<id dipendente>": { lunedi: 'Sera', ... } } }
 *
 * dove la chiave è sempre il lunedì della settimana.
 *
 * Ogni settimana fa storia a sé: quello che si scrive in una non tocca
 * le altre. Una settimana di cui non è stato deciso niente è tutta
 * "non previsto", e si riempie a mano o con "Copia sulla prossima".
 */
export function turniDellaSettimana(settimane, dipId, lunedi) {
  return settimane?.[lunedi]?.[dipId] || {};
}

export const turnoDelGiorno = (turniSettimana, giorno) =>
  turniSettimana?.[giorno] ?? TURNO_PREDEFINITO;

/**
 * La mansione può cambiare di giorno in giorno: chi sta in pizzeria il
 * venerdì può stare in cassa il sabato. Queste scelte stanno in una
 * struttura a parte, fatta come `settimane`:
 *
 *   mansioniSettimane = { "2026-08-10": { "<id>": { sabato: 'Cassa' } } }
 *
 * Dove non c'è scritto niente vale la mansione fissa della persona,
 * quella delle Impostazioni.
 */
export function mansioniDellaSettimana(mansioniSettimane, dipId, lunedi) {
  return mansioniSettimane?.[lunedi]?.[dipId] || {};
}

export const mansioneDelGiorno = (mansioniPersona, giorno, predefinita) =>
  mansioniPersona?.[giorno] || predefinita;

/** true se la settimana ha dei turni scritti. */
export const settimanaPropria = (settimane, lunedi) =>
  Object.keys(settimane?.[lunedi] || {}).length > 0;

/** Turno di una persona in una data qualsiasi. */
export function creaLettoreTurni(settimane) {
  return (dipId, iso) =>
    turnoDelGiorno(turniDellaSettimana(settimane, dipId, lunediDi(iso)), chiaveGiorno(iso));
}

/** Mansione di una persona in una data qualsiasi, con la sua fissa come ripiego. */
export function creaLettoreMansioni(mansioniSettimane) {
  return (dipId, iso, predefinita) =>
    mansioneDelGiorno(
      mansioniDellaSettimana(mansioniSettimane, dipId, lunediDi(iso)),
      chiaveGiorno(iso),
      predefinita
    );
}

/* ---------- gli orari di entrata e uscita ---------- */

/**
 * Gli orari stanno in una struttura a parte, fatta come `settimane`:
 *
 *   orariSettimane = { "2026-09-21": { "<id>": { martedi: { inizio: '18:00', fine: '00:30' } } } }
 *
 * Dove non c'è scritto niente vale l'orario normale del turno, quello
 * delle Impostazioni: così a mano si scrive solo chi fa diverso.
 */
export function orariDellaSettimana(orariSettimane, dipId, lunedi) {
  return orariSettimane?.[lunedi]?.[dipId] || {};
}

export const orarioDelGiorno = (orariPersona, giorno, turno, predefiniti) =>
  orariPersona?.[giorno] || predefiniti?.[turno] || null;

/** true se su quella casella è stato scritto un orario suo. */
export const orarioSuMisura = (orariPersona, giorno) => Boolean(orariPersona?.[giorno]);

/** I minuti passati da mezzanotte, o null se non è un orario. */
const minutiDa = (hhmm) => {
  const pezzi = /^([0-9]{1,2}):([0-9]{2})$/.exec(String(hhmm ?? '').trim());
  if (!pezzi) return null;
  const ore = Number(pezzi[1]);
  const minuti = Number(pezzi[2]);
  if (ore > 23 || minuti > 59) return null;
  return ore * 60 + minuti;
};

/** La seconda parte di un orario spezzato, se c'è ed è scritta per intero. */
const secondaParte = (orario) =>
  minutiDa(orario?.inizio2) !== null && minutiDa(orario?.fine2) !== null
    ? { inizio: orario.inizio2, fine: orario.fine2 }
    : null;

/**
 * Un orario va bene se la prima parte c'è tutta. La seconda può mancare
 * del tutto (turno unico), ma non può restare a metà.
 */
export const orarioValido = (orario) => {
  if (minutiDa(orario?.inizio) === null || minutiDa(orario?.fine) === null) return false;

  const scritto2 = Boolean(orario?.inizio2) || Boolean(orario?.fine2);
  return !scritto2 || secondaParte(orario) !== null;
};

/** Quanto dura una fetta sola, in minuti. */
const durataParte = (parte) => {
  const inizio = minutiDa(parte?.inizio);
  const fine = minutiDa(parte?.fine);
  if (inizio === null || fine === null) return 0;
  // chi stacca dopo mezzanotte (18:30 → 00:30) ha lavorato sei ore,
  // non meno diciotto
  return fine > inizio ? fine - inizio : fine + 24 * 60 - inizio;
};

/**
 * Quanto dura un turno, in minuti: le due fette dello spezzato si
 * sommano, e la pausa in mezzo non si conta.
 */
export function durataOrario(orario) {
  return durataParte(orario) + durataParte(secondaParte(orario));
}

/** L'orario come si legge: «18:30–23:30», o «12:00–15:00 · 18:30–23:30». */
export function orarioScritto(orario) {
  if (!orario?.inizio || !orario?.fine) return '';
  const prima = `${orario.inizio}–${orario.fine}`;
  const due = secondaParte(orario);
  return due ? `${prima} · ${due.inizio}–${due.fine}` : prima;
}

/** I minuti scritti come li legge una persona: `38h 30`, oppure `38h`. */
export function oreScritte(minuti) {
  if (!minuti) return '0h';
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  return resto ? `${ore}h ${String(resto).padStart(2, '0')}` : `${ore}h`;
}

/** Quanto dura il turno di una persona in una data qualsiasi, in minuti. */
export function creaLettoreMinuti(settimane, orariSettimane, predefiniti) {
  return (dipId, iso, turno) => {
    if (!eLavorativo(turno)) return 0;
    const suoi = orariDellaSettimana(orariSettimane, dipId, lunediDi(iso));
    return durataOrario(orarioDelGiorno(suoi, chiaveGiorno(iso), turno, predefiniti));
  };
}

/* ---------- personale minimo ---------- */

/**
 * I servizi da coprire in un giorno: dove si apre a pranzo e a cena sono
 * due, e vanno guardati separatamente. Un giorno chiuso non ne ha nessuno.
 */
export const serviziDelGiorno = (aperture, giorno) => {
  const apertura = aperturaDi(aperture, giorno);
  if (apertura === 'entrambi') return ['pranzo', 'cena'];
  if (apertura === 'pranzo') return ['pranzo'];
  if (apertura === 'cena') return ['cena'];
  return [];
};

/**
 * Quante persone servono in una mansione, in un certo giorno e per un
 * certo servizio. Zero (o niente) vuol dire che non è stato chiesto
 * un minimo.
 *
 * Prima dei giorni aperti anche a pranzo il minimo era **un numero solo**
 * per giorno. Quel numero resta valido e vale per la cena: era l'unico
 * servizio che c'era, e così chi aveva già i suoi minimi non se li vede
 * cambiare sotto i piedi. Il pranzo parte da zero e lo si imposta a mano.
 */
export const minimoDi = (minimi, mansione, giorno, servizio = 'cena') => {
  const scritto = minimi?.[mansione]?.[giorno];
  const quanti = typeof scritto === 'number'
    ? (servizio === 'cena' ? scritto : 0)
    : scritto?.[servizio];

  return Number.isFinite(quanti) && quanti > 0 ? quanti : 0;
};

/**
 * Chi lavora davvero in quella mansione, in quel giorno della settimana.
 * Con `servizio` si guarda il solo pranzo o la sola cena: chi fa il doppio
 * turno c'è in tutti e due, chi fa solo la cena non copre il pranzo.
 */
export function chiLavora({ dipendenti, settimane, mansioniSettimane, ferie, lunedi, giorno, data, mansione, servizio }) {
  return dipendenti.filter(dip => {
    if ((ferie?.[dip.id] || []).includes(data)) return false;

    const turno = turnoDelGiorno(turniDellaSettimana(settimane, dip.id, lunedi), giorno);
    if (!eLavorativo(turno)) return false;
    if (servizio === 'pranzo' && !comprendeIlPranzo(turno)) return false;
    if (servizio === 'cena' && !comprendeLaCena(turno)) return false;

    const sua = mansioneDelGiorno(
      mansioniDellaSettimana(mansioniSettimane, dip.id, lunedi),
      giorno,
      repartoDi(dip)
    );
    return sua === mansione;
  });
}

/**
 * Dove la settimana mostrata non arriva al personale minimo.
 * Un giorno chiuso non conta: non c'è nessun turno da coprire.
 * Restituisce una riga per ogni mansione scoperta, in ordine di giorno.
 */
export function ammanchiDellaSettimana({
  dipendenti,
  settimane,
  mansioniSettimane,
  ferie,
  aperture,
  minimi,
  mansioni,
  lunedi,
  dateSettimana
}) {
  const ammanchi = [];

  GIORNI.forEach((giorno, i) => {
    const servizi = serviziDelGiorno(aperture, giorno);
    if (servizi.length === 0) return; // chiuso: non c'è niente da coprire

    servizi.forEach(servizio => {
      mansioni.forEach(mansione => {
        const richiesti = minimoDi(minimi, mansione, giorno, servizio);
        if (richiesti === 0) return;

        const presenti = chiLavora({
          dipendenti, settimane, mansioniSettimane, ferie,
          lunedi, giorno, data: dateSettimana[i], mansione, servizio
        }).length;

        if (presenti < richiesti) {
          ammanchi.push({
            giorno, indice: i, data: dateSettimana[i], mansione, servizio,
            richiesti, presenti,
            // nei giorni con due servizi va detto quale, altrimenti è rumore
            dueServizi: servizi.length > 1
          });
        }
      });
    });
  });

  return ammanchi;
}
