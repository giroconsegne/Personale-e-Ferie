export const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

export const GIORNI_LABEL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const GIORNI_SIGLA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/**
 * Le due pizzerie. Ognuna ha il suo personale, i suoi turni, le sue ferie
 * e i suoi giorni di chiusura: nell'app si passa dall'una all'altra dal menu.
 * L'ordine conta: i dati salvati prima di questa divisione finiscono nella prima.
 */
export const LOCALI = [
  // Da Fratelli D'Auria non si lavora di mattina: quel turno non compare
  { id: 'dauria', nome: "Fratelli D'Auria", turni: ['Sera', 'Riposo', ''] },
  { id: 'pomodoro', nome: 'Pomodoro e Mozzarella', turni: ['Mattina', 'Sera', 'Riposo', ''] }
];

/** I turni che si possono scegliere in una pizzeria. */
export const turniDelLocale = (idLocale) =>
  LOCALI.find(l => l.id === idLocale)?.turni || TURNI.map(t => t.valore);

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

// Un giorno di cui non è stato deciso niente è "non previsto"
export const TURNO_PREDEFINITO = '';

export const classeTurno = (valore) =>
  TURNI.find(t => t.valore === valore)?.classe || 'turno-vuoto';

export const etichettaTurno = (valore) =>
  TURNI.find(t => t.valore === valore)?.etichetta || 'Non previsto';

// Un turno vale come giorno di lavoro solo se non è riposo né "non previsto"
export const eLavorativo = (turno) => turno === 'Mattina' || turno === 'Sera';

/**
 * Quando è aperta la pizzeria, giorno per giorno della settimana.
 * A pranzo si lavora di mattina, a cena di sera: nei giorni di solo
 * pranzo (o sola cena) l'altro turno non si può nemmeno scegliere.
 */
export const APERTURE = [
  { valore: 'entrambi', etichetta: 'Pranzo e cena', breve: 'Pranzo e cena', turni: ['Mattina', 'Sera'] },
  { valore: 'pranzo', etichetta: 'Solo pranzo', breve: 'Solo pranzo', turni: ['Mattina'] },
  { valore: 'cena', etichetta: 'Solo cena', breve: 'Solo cena', turni: ['Sera'] },
  { valore: 'chiuso', etichetta: 'Chiuso', breve: 'Chiuso', turni: [] }
];

export const APERTURA_PREDEFINITA = 'entrambi';

export const aperturaDi = (aperture, giorno) =>
  APERTURE.some(a => a.valore === aperture?.[giorno]) ? aperture[giorno] : APERTURA_PREDEFINITA;

export const eChiusoIlGiorno = (aperture, giorno) => aperturaDi(aperture, giorno) === 'chiuso';

/** I giorni della settimana in cui la pizzeria resta chiusa. */
export const giorniChiusuraDa = (aperture) => GIORNI.filter(g => eChiusoIlGiorno(aperture, g));

/** I turni di lavoro possibili in un certo giorno: pizzeria e orario insieme. */
export const turniDelGiorno = (turniLocale, aperture, giorno) =>
  (APERTURE.find(a => a.valore === aperturaDi(aperture, giorno))?.turni || [])
    .filter(t => turniLocale.includes(t));
