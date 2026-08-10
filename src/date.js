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
 * e il turno di quel giorno della settimana non è "Riposo".
 * "lavorati" considera solo i giorni già trascorsi, "previsti" tutto il periodo.
 */
export function conteggiaGiorni({ dal, al, turniDip, ferieDip, giorniChiusura, oggi }) {
  const conta = { lavorati: 0, previsti: 0, mattine: 0, sere: 0, ferie: 0, riposi: 0, chiusure: 0 };
  let corrente = dal;

  for (let i = 0; i <= 400 && corrente <= al; i++) {
    const chiave = chiaveGiorno(corrente);

    if (giorniChiusura.includes(chiave)) {
      conta.chiusure++;
    } else if (ferieDip.includes(corrente)) {
      conta.ferie++;
    } else {
      const turno = turniDip?.[chiave] || 'Riposo';
      if (turno === 'Riposo') {
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
