import { TURNO_PREDEFINITO } from './costanti';
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
