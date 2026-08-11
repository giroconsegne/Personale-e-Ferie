// Collegamento al database condiviso (Supabase).
//
// Finché questi due valori restano vuoti l'app salva soltanto dentro il
// browser di chi la apre. Compilati, i dati diventano gli stessi per
// tutti quelli che aprono il link.
//
// La chiave "publishable" è fatta per stare dentro le pagine web: non è
// un segreto. Quella "secret" invece non va mai messa qui.

export const SUPABASE_URL = 'https://yunnfqlrlrbbbnubnlhl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_ce400jVdwQAv7xxAnOxE3w_De4qsfag';
