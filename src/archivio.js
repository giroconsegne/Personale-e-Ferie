import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { LOCALI } from './costanti';

const CHIAVE_LOCALE = 'pizzeriaApp';
const TABELLA = 'stato';
const ID_RIGA = 'pizzeria';

/** true quando il database condiviso è configurato */
export const online = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const client = online ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/** Una pizzeria appena aperta: nome, e tutto il resto vuoto. */
const localeVuoto = ({ id, nome }) => ({
  id,
  nome,
  dipendenti: [],
  settimane: {},
  // la mansione scelta giorno per giorno, dove non vale quella fissa
  mansioniSettimane: {},
  ferie: {},
  aperture: {},
  // quante persone servono come minimo, per mansione e giorno della settimana
  minimi: {},
  // le mansioni aggiunte a mano: quelle di partenza stanno in costanti.js
  mansioni: [],
  // e quelle di partenza che questa pizzeria ha tolto
  mansioniTolte: []
});

/**
 * Gli orari di apertura hanno preso il posto del semplice elenco di giorni
 * di chiusura: i giorni che erano chiusi restano chiusi, gli altri partono
 * aperti a pranzo e a cena.
 */
const conAperture = (locale) => {
  const sistemato = { ...locale };

  // attenzione: una pizzeria appena creata ha già `aperture`, ma vuoto;
  // gli orari vanno ricavati dai vecchi giorni di chiusura anche in quel caso
  if (Object.keys(sistemato.aperture || {}).length === 0) {
    const aperture = {};
    (sistemato.giorniChiusura || []).forEach(g => { aperture[g] = 'chiuso'; });
    sistemato.aperture = aperture;
  }

  delete sistemato.giorniChiusura; // sostituito dagli orari di apertura
  delete sistemato.turni; // i turni fissi: ora ogni settimana ha i suoi
  return sistemato;
};

export const statoVuoto = () => ({ locali: LOCALI.map(localeVuoto) });

/**
 * Riporta i dati letti alla forma attesa, qualunque cosa ci sia salvato.
 * I dati di prima della divisione in due pizzerie (personale e turni tutti
 * insieme) finiscono nella prima, così non si perde niente.
 */
const normalizza = (dati) => {
  if (!dati) return statoVuoto();

  if (Array.isArray(dati.locali)) {
    return {
      locali: LOCALI.map((base, i) =>
        conAperture({ ...localeVuoto(base), ...(dati.locali[i] || {}), id: base.id })
      )
    };
  }

  const stato = statoVuoto();
  stato.locali[0] = conAperture({
    ...stato.locali[0],
    dipendenti: dati.dipendenti || [],
    settimane: dati.settimane || {},
    ferie: dati.ferie || {},
    giorniChiusura: dati.giorniChiusura || []
  });
  return stato;
};

/** Quante persone ci sono in tutto, nelle due pizzerie messe insieme. */
const quantiDipendenti = (stato) =>
  stato.locali.reduce((somma, l) => somma + (l.dipendenti || []).length, 0);

const leggiLocale = () => {
  try {
    return normalizza(JSON.parse(localStorage.getItem(CHIAVE_LOCALE)));
  } catch {
    return statoVuoto();
  }
};

const scriviLocale = (dati) => {
  try {
    localStorage.setItem(CHIAVE_LOCALE, JSON.stringify(dati));
  } catch {
    // spazio esaurito o navigazione privata: la copia locale è solo un extra
  }
};

/**
 * Carica lo stato. Offline legge dal browser; online legge dal database e,
 * la prima volta, ci porta sopra i dati già inseriti su questo dispositivo
 * così non si perde niente nel passaggio.
 */
export async function carica() {
  const locale = leggiLocale();
  if (!online) return locale;

  const { data, error } = await client
    .from(TABELLA)
    .select('dati')
    .eq('id', ID_RIGA)
    .maybeSingle();

  if (error) throw error;

  const remoto = data?.dati;
  const remotoVuoto = !remoto || quantiDipendenti(normalizza(remoto)) === 0;

  if (remotoVuoto && quantiDipendenti(locale) > 0) {
    await salva(locale);
    return locale;
  }

  const risultato = normalizza(remoto);
  scriviLocale(risultato);
  return risultato;
}

/** Salva lo stato: sempre nel browser, e sul database quando configurato. */
export async function salva(dati) {
  scriviLocale(dati);
  if (!online) return;

  const { error } = await client
    .from(TABELLA)
    .upsert({ id: ID_RIGA, dati, aggiornato_il: new Date().toISOString() });

  if (error) throw error;
}

/**
 * Avvisa quando qualcun altro modifica i dati, così le modifiche fatte da
 * un altro telefono compaiono senza ricaricare la pagina.
 * Restituisce la funzione per smettere di ascoltare.
 */
export function ascolta(alCambio) {
  if (!online) return () => {};

  const canale = client
    .channel('stato-pizzeria')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABELLA, filter: `id=eq.${ID_RIGA}` },
      (payload) => {
        if (payload.new?.dati) alCambio(normalizza(payload.new.dati));
      }
    )
    .subscribe();

  return () => client.removeChannel(canale);
}
