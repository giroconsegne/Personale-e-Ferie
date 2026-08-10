import React, { useState, useEffect } from 'react';
import './App.css';
import TurniSection from './components/TurniSection';
import FerieSection from './components/FerieSection';
import CalendarioSection from './components/CalendarioSection';
import {
  GIORNI,
  GIORNI_LABEL,
  REPARTI,
  REPARTO_PREDEFINITO,
  repartoDi,
  slugReparto
} from './costanti';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

const STORAGE_KEY = 'pizzeriaApp';

// Letto una sola volta al caricamento della pagina: lo stato parte già
// dai dati salvati, così il salvataggio automatico non può sovrascriverli.
const salvato = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
})();

// I dipendenti salvati prima dei reparti ne ricevono uno predefinito
const dipendentiIniziali = (salvato.dipendenti || []).map(d => ({
  ...d,
  reparto: repartoDi(d)
}));

function App() {
  const [dipendenti, setDipendenti] = useState(dipendentiIniziali);
  const [turni, setTurni] = useState(salvato.turni || {});
  const [ferie, setFerie] = useState(salvato.ferie || {});
  const [giorniChiusura, setGiorniChiusura] = useState(salvato.giorniChiusura || []);
  const [nuovoDipendente, setNuovoDipendente] = useState('');
  const [nuovoReparto, setNuovoReparto] = useState(REPARTO_PREDEFINITO);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showGiorniDrawer, setShowGiorniDrawer] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [activeSection, setActiveSection] = useState('turni');

  // Salva i dati a ogni modifica
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dipendenti,
      turni,
      ferie,
      giorniChiusura
    }));
  }, [dipendenti, turni, ferie, giorniChiusura]);

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

  const apriPannello = (setter) => {
    setter(true);
    if (isMobile()) setSidebarOpen(false);
  };

  const labelDiChiusura = giorniChiusura
    .map(g => GIORNI_LABEL[GIORNI.indexOf(g)])
    .filter(Boolean);

  const conteggioReparti = REPARTI.map(r => ({
    reparto: r,
    quanti: dipendenti.filter(d => repartoDi(d) === r).length
  }));

  return (
    <div className="app">
      {/* ---------- Menu laterale ---------- */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-head">
          <div className="logo">
            <span className="logo-mark">🍕</span>
            <span className="logo-testo">
              <strong>Pizzeria</strong>
              <small>Personale e ferie</small>
            </span>
          </div>
          <button className="icon-btn chiudi-menu" onClick={() => setSidebarOpen(false)} title="Chiudi menu">
            ✕
          </button>
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

          <p className="nav-label">Impostazioni</p>
          <button className="nav-item" onClick={() => apriPannello(setShowGiorniDrawer)}>
            <span className="nav-icon">🚫</span>
            <span className="nav-text">Giorni di chiusura</span>
            {giorniChiusura.length > 0 && <span className="nav-conteggio">{giorniChiusura.length}</span>}
          </button>
        </nav>

        <div className="sidebar-foot">
          {dipendenti.length > 0 && (
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

          <button className="btn btn-primario btn-blocco" onClick={() => apriPannello(setShowAddDrawer)}>
            <span>＋</span> Aggiungi dipendente
          </button>
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
          <h1 className="topbar-titolo">Gestione Pizzeria</h1>
          <div className="topbar-chip-area">
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
          {activeSection === 'turni' && (
            <TurniSection
              dipendenti={dipendenti}
              turni={turni}
              setTurni={setTurni}
              giorni={GIORNI}
              giorniLabel={GIORNI_LABEL}
              giorniChiusura={giorniChiusura}
            />
          )}

          {activeSection === 'ferie' && (
            <FerieSection
              dipendenti={dipendenti}
              ferie={ferie}
              setFerie={setFerie}
              setDipendenti={setDipendenti}
              eliminaDipendente={eliminaDipendente}
              cambiaReparto={cambiaReparto}
              giorniChiusura={giorniChiusura}
            />
          )}

          {activeSection === 'calendario' && (
            <CalendarioSection
              dipendenti={dipendenti}
              ferie={ferie}
              giorniChiusura={giorniChiusura}
            />
          )}
        </main>
      </div>

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
                <span className="campo-label">Reparto</span>
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
