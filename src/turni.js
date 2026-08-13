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
