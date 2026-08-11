// Collegamento al database condiviso (Supabase).
//
// Finché questi due valori restano vuoti l'app salva soltanto dentro il
// browser di chi la apre, come ha sempre fatto. Appena vengono compilati,
// i dati diventano gli stessi per tutti quelli che aprono il link.
//
// Si trovano in Supabase: Project Settings -> API
//   URL      -> "Project URL"
//   CHIAVE   -> "anon public"  (NON la chiave "service_role")

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
