import { GIORNI } from './costanti';

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
