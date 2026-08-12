export const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

export const GIORNI_LABEL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const GIORNI_SIGLA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/**
 * Le due pizzerie. Ognuna ha il suo personale, i suoi turni, le sue ferie
 * e i suoi giorni di chiusura: nell'app si passa dall'una all'altra dal menu.
 * L'ordine conta: i dati salvati prima di questa divisione finiscono nella prima.
 */
export const LOCALI = [
  { id: 'dauria', nome: "Fratelli D'Auria" },
  { id: 'pomodoro', nome: 'Pomodoro e Mozzarella' }
];

// Le mansioni sono salvate nel campo "reparto" dei dipendenti: il nome della
// chiave resta quello di prima per non perdere i dati già inseriti.
export const REPARTI = ['Pizzeria', 'Cucina', 'Sala', 'Bar', 'Cassa', 'Lavapiatti'];

export const REPARTO_PREDEFINITO = 'Pizzeria';

// Mansione valida per un dipendente, anche se salvato prima dell'introduzione delle mansioni
export const repartoDi = (dip) =>
  REPARTI.includes(dip.reparto) ? dip.reparto : REPARTO_PREDEFINITO;

export const slugReparto = (reparto) => reparto.toLowerCase();

/**
 * Turni possibili. La stringa vuota è il turno "non previsto": la casella
 * resta vuota quando quel giorno la persona non è in organico.
 */
export const TURNI = [
  { valore: 'Mattina', etichetta: 'Mattina', classe: 'turno-mattina' },
  { valore: 'Sera', etichetta: 'Sera', classe: 'turno-sera' },
  { valore: 'Riposo', etichetta: 'Riposo', classe: 'turno-riposo' },
  { valore: '', etichetta: 'Non previsto', breve: '—', classe: 'turno-vuoto' }
];

export const TURNO_PREDEFINITO = 'Riposo';

export const classeTurno = (valore) =>
  TURNI.find(t => t.valore === valore)?.classe || 'turno-riposo';

export const etichettaTurno = (valore) =>
  TURNI.find(t => t.valore === valore)?.etichetta || 'Riposo';

// Un turno vale come giorno di lavoro solo se non è riposo né "non previsto"
export const eLavorativo = (turno) => turno === 'Mattina' || turno === 'Sera';
