import { GIORNI, TURNO_PREDEFINITO, eLavorativo } from './costanti';

// Le date sono stringhe "AAAA-MM-GG": niente fusi orari di mezzo.
export const aData = (iso) => new Date(`${iso}T00:00:00`);

// Attenzione: toISOString() passa per UTC e con l'ora legale riporta
// al giorno precedente. La stringa va costruita dai componenti locali.
export const aIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const giornoSuccessivo = (iso) => {
  const d = aData(iso);
  d.setDate(d.getDate() + 1);
  return aIso(d);
};

// Chiave del giorno della settimana ('lunedi', 'martedi', ...)
export const chiaveGiorno = (iso) => GIORNI[(aData(iso).getDay() + 6) % 7];

export const eChiuso = (iso, giorniChiusura) => giorniChiusura.includes(chiaveGiorno(iso));

const MAX_GIORNI = 366;

/**
 * Giorni di ferie che consumano davvero il monte ferie: quelli caduti
 * in un giorno di chiusura non contano. Serve perché una chiusura può
 * essere impostata dopo che le ferie erano già state inserite.
 */
export const contaFerie = (date, giorniChiusura) =>
  date.filter(d => !eChiuso(d, giorniChiusura)).length;

// Il monte ferie è annuale: i giorni vanno sempre filtrati per anno
export const ferieDellAnno = (date, anno) =>
  date.filter(d => d.startsWith(`${anno}-`));

export const annoCorrente = () => new Date().getFullYear();

/* ---------- settimane ---------- */

/** Il lunedì della settimana in cui cade la data: è la chiave di ogni settimana. */
export const lunediDi = (iso) => {
  const d = aData(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return aIso(d);
};

export const lunediDiOggi = () => lunediDi(aIso(new Date()));

/** Sposta di N settimane avanti (o indietro, con delta negativo). */
export const spostaSettimana = (lunedi, delta) => {
  const d = aData(lunedi);
  d.setDate(d.getDate() + 7 * delta);
  return aIso(d);
};

/** Le sette date della settimana, da lunedì a domenica. */
export const giorniDellaSettimana = (lunedi) => {
  const date = [lunedi];
  for (let i = 1; i < 7; i++) date.push(giornoSuccessivo(date[i - 1]));
  return date;
};

/**
 * Tutti i giorni del mese in cui cade una data, dal primo all'ultimo.
 * Il mese è il mese: niente giorni presi in prestito dalle settimane
 * che lo attraversano.
 */
export function giorniDelMese(iso) {
  const d = aData(iso);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

  const giorni = [];
  for (let g = 1; g <= ultimo; g++) {
    giorni.push(aIso(new Date(d.getFullYear(), d.getMonth(), g)));
  }

  return giorni;
}

/** I lunedì delle settimane che toccano il mese di una certa data. */
export function settimaneDelMese(iso) {
  const d = aData(iso);
  const ultimo = aIso(new Date(d.getFullYear(), d.getMonth() + 1, 0));

  const settimane = [];
  let corrente = lunediDi(aIso(new Date(d.getFullYear(), d.getMonth(), 1)));

  while (corrente <= ultimo) {
    settimane.push(corrente);
    corrente = spostaSettimana(corrente, 1);
  }

  return settimane;
}

/**
 * Espande un periodo in singole date, saltando i giorni di chiusura
 * (in pizzeria chiusa non si consuma un giorno di ferie).
 */
export function giorniDelPeriodo(dal, al, giorniChiusura) {
  const giorni = [];
  let esclusi = 0;
  let corrente = dal;

  for (let i = 0; i <= MAX_GIORNI && corrente <= al; i++) {
    if (eChiuso(corrente, giorniChiusura)) esclusi++;
    else giorni.push(corrente);
    corrente = giornoSuccessivo(corrente);
  }

  return { giorni, esclusi };
}

/**
 * Conta i giorni di un intervallo per un singolo dipendente.
 * Un giorno è lavorato se la pizzeria è aperta, la persona non è in ferie
 * e quel giorno ha un turno di lavoro (né riposo né "non previsto").
 * "lavorati" considera solo i giorni già trascorsi, "previsti" tutto il periodo.
 * `turnoDelGiorno(iso)` restituisce il turno valido in quella data settimana.
 */
export function conteggiaGiorni({ dal, al, turnoDelGiorno, ferieDip, giorniChiusura, oggi }) {
  const conta = { lavorati: 0, previsti: 0, mattine: 0, sere: 0, ferie: 0, riposi: 0, chiusure: 0 };
  let corrente = dal;

  for (let i = 0; i <= 400 && corrente <= al; i++) {
    if (giorniChiusura.includes(chiaveGiorno(corrente))) {
      conta.chiusure++;
    } else if (ferieDip.includes(corrente)) {
      conta.ferie++;
    } else {
      const turno = turnoDelGiorno(corrente) ?? TURNO_PREDEFINITO;
      if (!eLavorativo(turno)) {
        conta.riposi++;
      } else {
        conta.previsti++;
        if (corrente <= oggi) {
          conta.lavorati++;
          if (turno === 'Mattina') conta.mattine++;
          else conta.sere++;
        }
      }
    }

    corrente = giornoSuccessivo(corrente);
  }

  return conta;
}

// Due date fanno parte dello stesso periodo se in mezzo c'è solo chiusura
function siCollegano(fine, prossima, giorniChiusura) {
  let corrente = giornoSuccessivo(fine);
  for (let i = 0; i <= MAX_GIORNI && corrente < prossima; i++) {
    if (!eChiuso(corrente, giorniChiusura)) return false;
    corrente = giornoSuccessivo(corrente);
  }
  return corrente === prossima;
}

/** Raggruppa un elenco di date ordinate in periodi continui. */
export function raggruppaInPeriodi(date, giorniChiusura) {
  const periodi = [];

  for (const data of [...date].sort()) {
    const ultimo = periodi[periodi.length - 1];
    if (ultimo && siCollegano(ultimo.fine, data, giorniChiusura)) {
      ultimo.fine = data;
      ultimo.date.push(data);
    } else {
      periodi.push({ inizio: data, fine: data, date: [data] });
    }
  }

  return periodi;
}

const fmtGiorno = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtGiornoCorto = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });

export function etichettaPeriodo({ inizio, fine }) {
  if (inizio === fine) return fmtGiorno.format(aData(inizio));

  const a = aData(inizio);
  const b = aData(fine);
  const stessoAnno = a.getFullYear() === b.getFullYear();

  return `${stessoAnno ? fmtGiornoCorto.format(a) : fmtGiorno.format(a)} – ${fmtGiorno.format(b)}`;
}

/** "10 agosto – 16 agosto 2026": intestazione di una settimana di turni. */
export const etichettaSettimana = (lunedi) =>
  etichettaPeriodo({ inizio: lunedi, fine: giorniDellaSettimana(lunedi)[6] });

const fmtMese = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });

/** "agosto 2026": il mese in cui cade una data. */
export const etichettaMese = (iso) => fmtMese.format(aData(iso));

const fmtGiornoBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'numeric' });

/** "10/8": data compatta per i messaggi ai collaboratori. */
export const dataBreve = (iso) => fmtGiornoBreve.format(aData(iso));
