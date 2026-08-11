import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const CHIAVE_LOCALE = 'pizzeriaApp';
const TABELLA = 'stato';
const ID_RIGA = 'pizzeria';

/** true quando il database condiviso è configurato */
export const online = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const client = online ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const STATO_VUOTO = { dipendenti: [], turni: {}, ferie: {}, giorniChiusura: [] };

const normalizza = (dati) => ({ ...STATO_VUOTO, ...(dati || {}) });

const leggiLocale = () => {
  try {
    return normalizza(JSON.parse(localStorage.getItem(CHIAVE_LOCALE)));
  } catch {
    return { ...STATO_VUOTO };
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
  const remotoVuoto = !remoto || (remoto.dipendenti || []).length === 0;

  if (remotoVuoto && locale.dipendenti.length > 0) {
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
