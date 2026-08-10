export const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

export const GIORNI_LABEL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export const REPARTI = ['Pizzeria', 'Cucina', 'Sala'];

export const REPARTO_PREDEFINITO = 'Pizzeria';

// Reparto valido per un dipendente, anche se salvato prima dell'introduzione dei reparti
export const repartoDi = (dip) =>
  REPARTI.includes(dip.reparto) ? dip.reparto : REPARTO_PREDEFINITO;

export const slugReparto = (reparto) => reparto.toLowerCase();
