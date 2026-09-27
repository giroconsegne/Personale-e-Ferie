import { GIORNI, TURNO_PREDEFINITO, eChiusoIlGiorno, eLavorativo, repartoDi } from './costanti';
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

export const orarioValido = (orario) =>
  minutiDa(orario?.inizio) !== null && minutiDa(orario?.fine) !== null;

/**
 * Quanto dura un turno, in minuti. Chi stacca dopo mezzanotte
 * (18:30 → 00:30) ha lavorato sei ore, non meno diciotto.
 */
export function durataOrario(orario) {
  const inizio = minutiDa(orario?.inizio);
  const fine = minutiDa(orario?.fine);
  if (inizio === null || fine === null) return 0;
  return fine > inizio ? fine - inizio : fine + 24 * 60 - inizio;
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
 * Quante persone servono in una mansione in un certo giorno della
 * settimana. Zero (o niente) vuol dire che non è stato chiesto un minimo.
 */
export const minimoDi = (minimi, mansione, giorno) => {
  const quanti = minimi?.[mansione]?.[giorno];
  return Number.isFinite(quanti) && quanti > 0 ? quanti : 0;
};

/** Chi lavora davvero in quella mansione, in quel giorno della settimana. */
export function chiLavora({ dipendenti, settimane, mansioniSettimane, ferie, lunedi, giorno, data, mansione }) {
  return dipendenti.filter(dip => {
    if ((ferie?.[dip.id] || []).includes(data)) return false;
    if (!eLavorativo(turnoDelGiorno(turniDellaSettimana(settimane, dip.id, lunedi), giorno))) return false;

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
    if (eChiusoIlGiorno(aperture, giorno)) return;

    mansioni.forEach(mansione => {
      const richiesti = minimoDi(minimi, mansione, giorno);
      if (richiesti === 0) return;

      const presenti = chiLavora({
        dipendenti, settimane, mansioniSettimane, ferie,
        lunedi, giorno, data: dateSettimana[i], mansione
      }).length;

      if (presenti < richiesti) {
        ammanchi.push({ giorno, indice: i, data: dateSettimana[i], mansione, richiesti, presenti });
      }
    });
  });

  return ammanchi;
}
