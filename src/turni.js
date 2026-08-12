import { TURNO_PREDEFINITO } from './costanti';
import { chiaveGiorno, lunediDi } from './date';

/**
 * I turni sono organizzati settimana per settimana:
 *
 *   settimane = { "2026-08-10": { "<id dipendente>": { lunedi: 'Mattina', ... } } }
 *
 * dove la chiave è sempre il lunedì della settimana.
 *
 * Una settimana in cui non è stato toccato niente non viene salvata: mostra
 * i turni dell'ultima settimana precedente in cui quella persona ne aveva.
 * Così i turni continuano a ripetersi da soli finché non li si cambia.
 * `base` sono i turni fissi salvati prima di questa suddivisione: valgono
 * per le settimane che non hanno niente prima di sé.
 */
export function turniDellaSettimana(settimane, base, dipId, lunedi) {
  let piuRecente = null;

  for (const chiave of Object.keys(settimane || {})) {
    if (chiave > lunedi) continue;
    if (!settimane[chiave]?.[dipId]) continue;
    if (!piuRecente || chiave > piuRecente) piuRecente = chiave;
  }

  return piuRecente ? settimane[piuRecente][dipId] : (base?.[dipId] || {});
}

export const turnoDelGiorno = (turniSettimana, giorno) =>
  turniSettimana?.[giorno] ?? TURNO_PREDEFINITO;

/** true se la settimana ha turni suoi, cioè è stata modificata a mano. */
export const settimanaPropria = (settimane, lunedi) =>
  Object.keys(settimane?.[lunedi] || {}).length > 0;

/**
 * Lettore del turno di una persona in una data qualsiasi.
 * Tiene in memoria le settimane già risolte: il resoconto chiede
 * centinaia di giorni di fila e ricalcolarle ogni volta è inutile.
 */
export function creaLettoreTurni(settimane, base) {
  const memoria = new Map();

  return (dipId, iso) => {
    const lunedi = lunediDi(iso);
    const chiave = `${dipId}|${lunedi}`;

    if (!memoria.has(chiave)) {
      memoria.set(chiave, turniDellaSettimana(settimane, base, dipId, lunedi));
    }

    return turnoDelGiorno(memoria.get(chiave), chiaveGiorno(iso));
  };
}
