import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import TurniSection from './components/TurniSection';
import FerieSection from './components/FerieSection';
import CalendarioSection from './components/CalendarioSection';
import ResocontoSection from './components/ResocontoSection';
import ImpostazioniSection from './components/ImpostazioniSection';
import {
  GIORNI,
  GIORNI_LABEL,
  LOCALI,
  REPARTI,
  REPARTO_PREDEFINITO,
  repartoDi,
  slugReparto
} from './costanti';
import { carica, salva, ascolta, online, statoVuoto } from './archivio';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

// La pizzeria scelta resta su questo dispositivo: ognuno riapre la sua
const CHIAVE_SCELTA = 'pizzeriaLocaleScelto';

// I dipendenti salvati prima delle mansioni ne ricevono una predefinita
const conReparto = (elenco) => (elenco || []).map(d => ({ ...d, reparto: repartoDi(d) }));

function App() {
  const [locali, setLocali] = useState(() => statoVuoto().locali);
  const [idLocale, setIdLocale] = useState(
    () => localStorage.getItem(CHIAVE_SCELTA) || LOCALI[0].id
  );
  const [caricato, setCaricato] = useState(false);
  const [problemaRete, setProblemaRete] = useState(false);
  const [avviso, setAvviso] = useState('');
  const [nuovoDipendente, setNuovoDipendente] = useState('');
  const [nuovoReparto, setNuovoReparto] = useState(REPARTO_PREDEFINITO);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showGiorniDrawer, setShowGiorniDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [activeSection, setActiveSection] = useState('turni');

  // Ultimo contenuto scritto o ricevuto: evita di rimandare al database
  // dati identici a quelli appena arrivati da un altro dispositivo.
  const ultimoSincronizzato = useRef(null);

  const applica = (dati) => {
    ultimoSincronizzato.current = JSON.stringify(dati);
    setLocali(dati.locali.map(l => ({ ...l, dipendenti: conReparto(l.dipendenti) })));
  };

  // ---- la pizzeria che si sta guardando ----
  const indiceLocale = Math.max(0, locali.findIndex(l => l.id === idLocale));
  const locale = locali[indiceLocale];
  const { dipendenti, turni, settimane, ferie, giorniChiusura } = locale;

  // Ogni modifica tocca solo la pizzeria aperta
  const modificaLocale = (campi) =>
    setLocali(prima => prima.map((l, i) => (i === indiceLocale ? { ...l, ...campi } : l)));

  const setDipendenti = (v) => modificaLocale({ dipendenti: v });
  const setTurni = (v) => modificaLocale({ turni: v });
  const setSettimane = (v) => modificaLocale({ settimane: v });
  const setFerie = (v) => modificaLocale({ ferie: v });
  const setGiorniChiusura = (v) => modificaLocale({ giorniChiusura: v });

  const cambiaPizzeria = (id) => {
    setIdLocale(id);
    localStorage.setItem(CHIAVE_SCELTA, id);
    if (isMobile()) setSidebarOpen(false);
  };

  // Messaggio passeggero in basso (copia riuscita, turni copiati...)
  const avvisa = (testo) => setAvviso(testo);

  useEffect(() => {
    if (!avviso) return;
    const timer = setTimeout(() => setAvviso(''), 4000);
    return () => clearTimeout(timer);
  }, [avviso]);

  // Primo caricamento
  useEffect(() => {
    let annullato = false;

    (async () => {
      try {
        const dati = await carica();
        if (!annullato) applica(dati);
      } catch (e) {
        console.error('Caricamento fallito', e);
        if (!annullato) setProblemaRete(true);
      } finally {
        if (!annullato) setCaricato(true);
      }
    })();

    return () => { annullato = true; };
  }, []);

  // Modifiche fatte da altri dispositivi
  useEffect(() => {
    if (!caricato) return;
    return ascolta(applica);
  }, [caricato]);

  // Salvataggio: parte solo a caricamento concluso, così non sovrascrive
  // i dati appena letti, ed è ritardato per non scrivere a ogni tasto.
  useEffect(() => {
    if (!caricato) return;

    const dati = { locali };
    const serializzato = JSON.stringify(dati);
    if (serializzato === ultimoSincronizzato.current) return;

    const timer = setTimeout(async () => {
      ultimoSincronizzato.current = serializzato;
      try {
        await salva(dati);
        setProblemaRete(false);
      } catch (e) {
        console.error('Salvataggio fallito', e);
        setProblemaRete(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [caricato, locali]);

  // Esc chiude i pannelli aperti
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setShowAddDrawer(false);
      setShowGiorniDrawer(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Aggiungi dipendente
  const aggiungiDipendente = () => {
    const nome = nuovoDipendente.trim();
    if (!nome) return;

    const newId = Date.now().toString();
    setDipendenti([...dipendenti, { id: newId, nome, reparto: nuovoReparto, giorni_ferie: 20 }]);
    setTurni({
      ...turni,
      [newId]: {
        lunedi: 'Mattina',
        martedi: 'Mattina',
        mercoledi: 'Mattina',
        giovedi: 'Mattina',
        venerdi: 'Mattina',
        sabato: 'Sera',
        domenica: 'Riposo'
      }
    });
    setFerie({ ...ferie, [newId]: [] });
    setNuovoDipendente('');
    setShowAddDrawer(false);
  };

  // Elimina dipendente
  const eliminaDipendente = (id) => {
    setDipendenti(dipendenti.filter(d => d.id !== id));
    const newTurni = { ...turni };
    delete newTurni[id];
    setTurni(newTurni);

    // via anche i turni scritti per le singole settimane
    const nuoveSettimane = {};
    Object.entries(settimane).forEach(([lunedi, dellaSettimana]) => {
      const resto = { ...dellaSettimana };
      delete resto[id];
      if (Object.keys(resto).length > 0) nuoveSettimane[lunedi] = resto;
    });
    setSettimane(nuoveSettimane);

    const newFerie = { ...ferie };
    delete newFerie[id];
    setFerie(newFerie);
  };

  const cambiaReparto = (id, reparto) => {
    setDipendenti(dipendenti.map(d => (d.id === id ? { ...d, reparto } : d)));
  };

  const toggleGiornoChiusura = (giorno) => {
    setGiorniChiusura(
      giorniChiusura.includes(giorno)
        ? giorniChiusura.filter(g => g !== giorno)
        : [...giorniChiusura, giorno]
    );
  };

  // Su mobile il menu si richiude dopo la scelta
  const vaiA = (sezione) => {
    setActiveSection(sezione);
    if (isMobile()) setSidebarOpen(false);
  };

  const labelDiChiusura = giorniChiusura
    .map(g => GIORNI_LABEL[GIORNI.indexOf(g)])
    .filter(Boolean);

  // Nel riepilogo del menu compaiono solo le mansioni con qualcuno dentro
  const conteggioReparti = REPARTI
    .map(r => ({ reparto: r, quanti: dipendenti.filter(d => repartoDi(d) === r).length }))
    .filter(r => r.quanti > 0);

  return (
    <div className="app">
      {/* ---------- Menu laterale ---------- */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-head">
          <div className="logo">
            <span className="logo-testo">
              <strong>Personale e ferie</strong>
              <small>Turni, ferie e resoconti</small>
            </span>
          </div>
          <button className="icon-btn chiudi-menu" onClick={() => setSidebarOpen(false)} title="Chiudi menu">
            ✕
          </button>
        </div>

        <div className="scelta-locale">
          <p className="nav-label">Pizzeria</p>
          {locali.map(l => (
            <button
              key={l.id}
              className={`locale-voce ${l.id === locale.id ? 'attivo' : ''}`}
              onClick={() => cambiaPizzeria(l.id)}
              aria-pressed={l.id === locale.id}
            >
              <span className="locale-nome">{l.nome}</span>
              <span className="locale-conta">{l.dipendenti.length}</span>
            </button>
          ))}
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Gestione</p>
          <button
            className={`nav-item ${activeSection === 'turni' ? 'active' : ''}`}
            onClick={() => vaiA('turni')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Turni</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'ferie' ? 'active' : ''}`}
            onClick={() => vaiA('ferie')}
          >
            <span className="nav-icon">🏖️</span>
            <span className="nav-text">Ferie</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'calendario' ? 'active' : ''}`}
            onClick={() => vaiA('calendario')}
          >
            <span className="nav-icon">🗓️</span>
            <span className="nav-text">Calendario</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'resoconto' ? 'active' : ''}`}
            onClick={() => vaiA('resoconto')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Resoconto</span>
          </button>

          <div className="nav-divisore" />

          <button
            className={`nav-item ${activeSection === 'impostazioni' ? 'active' : ''}`}
            onClick={() => vaiA('impostazioni')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Impostazioni</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          {conteggioReparti.length > 0 && (
            <ul className="riepilogo-reparti">
              {conteggioReparti.map(({ reparto, quanti }) => (
                <li key={reparto}>
                  <span className={`punto-reparto rep-${slugReparto(reparto)}`} />
                  <span className="riepilogo-nome">{reparto}</span>
                  <span className="riepilogo-num">{quanti}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Sfondo scuro dietro al menu (solo mobile) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ---------- Contenuto ---------- */}
      <div className="main-wrapper">
        <header className="topbar">
          <button
            className="icon-btn menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Nascondi menu' : 'Mostra menu'}
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
          <h1 className="topbar-titolo">{locale.nome}</h1>
          <div className="topbar-chip-area">
            <span
              className={`chip ${problemaRete ? 'chip-avviso' : online ? 'chip-online' : 'chip-locale'}`}
              title={
                problemaRete
                  ? 'Dati non sincronizzati: al momento salvati solo su questo dispositivo'
                  : online
                    ? 'I dati sono condivisi con chiunque apra il link'
                    : 'I dati restano solo in questo browser'
              }
            >
              <span className="chip-icona">{problemaRete ? '⚠️' : online ? '☁️' : '📱'}</span>
              <span className="chip-testo">
                {problemaRete ? 'Non sincronizzato' : online ? 'Condiviso' : 'Solo qui'}
              </span>
            </span>
            <span className="chip">
              <span className="chip-icona">👥</span>
              {dipendenti.length}
            </span>
            {labelDiChiusura.length > 0 && (
              <span className="chip chip-avviso" title={`Chiuso: ${labelDiChiusura.join(', ')}`}>
                <span className="chip-icona">🚫</span>
                {labelDiChiusura.map(g => g.slice(0, 3)).join(' · ')}
              </span>
            )}
          </div>
        </header>

        <main className="container">
          {!caricato && (
            <section className="card">
              <div className="vuoto">
                <div className="vuoto-icona">⏳</div>
                <p className="vuoto-titolo">Carico i dati…</p>
              </div>
            </section>
          )}

          {caricato && activeSection === 'turni' && (
            <TurniSection
              dipendenti={dipendenti}
              turni={turni}
              settimane={settimane}
              setSettimane={setSettimane}
              ferie={ferie}
              giorni={GIORNI}
              giorniLabel={GIORNI_LABEL}
              giorniChiusura={giorniChiusura}
              nomeLocale={locale.nome}
              avvisa={avvisa}
            />
          )}

          {caricato && activeSection === 'ferie' && (
            <FerieSection
              dipendenti={dipendenti}
              ferie={ferie}
              setFerie={setFerie}
              giorniChiusura={giorniChiusura}
              avvisa={avvisa}
            />
          )}

          {caricato && activeSection === 'calendario' && (
            <CalendarioSection
              dipendenti={dipendenti}
              ferie={ferie}
              giorniChiusura={giorniChiusura}
            />
          )}

          {caricato && activeSection === 'resoconto' && (
            <ResocontoSection
              dipendenti={dipendenti}
              turni={turni}
              settimane={settimane}
              ferie={ferie}
              giorniChiusura={giorniChiusura}
            />
          )}

          {caricato && activeSection === 'impostazioni' && (
            <ImpostazioniSection
              dipendenti={dipendenti}
              setDipendenti={setDipendenti}
              ferie={ferie}
              eliminaDipendente={eliminaDipendente}
              cambiaReparto={cambiaReparto}
              giorniChiusura={giorniChiusura}
              apriAggiungiDipendente={() => setShowAddDrawer(true)}
              apriGiorniChiusura={() => setShowGiorniDrawer(true)}
            />
          )}
        </main>
      </div>

      {/* ---------- Messaggio passeggero ---------- */}
      {avviso && (
        <div className="toast" role="status">
          <span className="toast-icona" aria-hidden="true">✓</span>
          {avviso}
        </div>
      )}

      {/* ---------- Pannello: giorni di chiusura ---------- */}
      {showGiorniDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowGiorniDrawer(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-body">
              <div className="drawer-head">
                <h2>Giorni di chiusura</h2>
                <button className="icon-btn" onClick={() => setShowGiorniDrawer(false)} title="Chiudi">✕</button>
              </div>
              <p className="drawer-sub">Nei giorni selezionati i turni vengono disattivati.</p>

              <div className="giorni-grid">
                {GIORNI.map((giorno, idx) => {
                  const attivo = giorniChiusura.includes(giorno);
                  return (
                    <label key={giorno} className={`giorno-scelta ${attivo ? 'attivo' : ''}`}>
                      <input
                        type="checkbox"
                        checked={attivo}
                        onChange={() => toggleGiornoChiusura(giorno)}
                      />
                      <span className="segno" />
                      <span>{GIORNI_LABEL[idx]}</span>
                    </label>
                  );
                })}
              </div>

              <button className="btn btn-primario btn-blocco" onClick={() => setShowGiorniDrawer(false)}>
                Fatto
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---------- Pannello: aggiungi dipendente ---------- */}
      {showAddDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddDrawer(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-body">
              <div className="drawer-head">
                <h2>Aggiungi dipendente</h2>
                <button className="icon-btn" onClick={() => setShowAddDrawer(false)} title="Chiudi">✕</button>
              </div>
              <p className="drawer-sub">Parte con 20 giorni di ferie, modificabili in seguito.</p>

              <input
                className="campo"
                type="text"
                value={nuovoDipendente}
                onChange={(e) => setNuovoDipendente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungiDipendente()}
                placeholder="Nome e cognome"
                autoFocus
              />

              <div className="scelta-reparto">
                <span className="campo-label">Mansione</span>
                <div className="segmenti">
                  {REPARTI.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`segmento ${nuovoReparto === r ? `attivo rep-${slugReparto(r)}` : ''}`}
                      onClick={() => setNuovoReparto(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primario btn-blocco"
                onClick={aggiungiDipendente}
                disabled={!nuovoDipendente.trim()}
              >
                Aggiungi in {nuovoReparto}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
