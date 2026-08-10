import React, { useState, useEffect } from 'react';
import './App.css';
import TurniSection from './components/TurniSection';
import FerieSection from './components/FerieSection';

const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const GIORNI_LABEL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

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

function App() {
  const [dipendenti, setDipendenti] = useState(salvato.dipendenti || []);
  const [turni, setTurni] = useState(salvato.turni || {});
  const [ferie, setFerie] = useState(salvato.ferie || {});
  const [giorniChiusura, setGiorniChiusura] = useState(salvato.giorniChiusura || []);
  const [nuovoDipendente, setNuovoDipendente] = useState('');
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
    setDipendenti([...dipendenti, { id: newId, nome, giorni_ferie: 20 }]);
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
    .filter(Boolean)
    .join(', ');

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1>Pizzeria</h1>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(false)}
            title="Chiudi menu"
          >
            ◀
          </button>
        </div>

        <nav className="sidebar-nav">
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
            className={`nav-item ${showGiorniDrawer ? 'active' : ''}`}
            onClick={() => setShowGiorniDrawer(true)}
          >
            <span className="nav-icon">🚫</span>
            <span className="nav-text">Giorni Chiusi</span>
          </button>
          <button
            className="nav-item add-dipendente-btn"
            onClick={() => setShowAddDrawer(true)}
          >
            <span className="nav-icon">➕</span>
            <span className="nav-text">Aggiungi Dipendente</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <p className="dipendenti-count">
            <span className="icon">👥</span>
            <span className="text">
              {dipendenti.length} {dipendenti.length === 1 ? 'dipendente' : 'dipendenti'}
            </span>
          </p>
        </div>
      </aside>

      {/* Overlay del menu (solo mobile, via CSS) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-wrapper">
        <header className="header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Apri menu"
          >
            ☰
          </button>
          <h1>Gestione Pizzeria</h1>
          <div className="header-spacer" />
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
            />
          )}
        </main>
      </div>

      {/* Pannello Giorni di Chiusura */}
      {showGiorniDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowGiorniDrawer(false)} />
          <div className="drawer-bottom open">
            <div className="drawer-handle" />
            <div className="drawer-content">
              <h2>Giorni di Chiusura</h2>
              <div className="giorni-grid">
                {GIORNI.map((giorno, idx) => (
                  <label key={giorno} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={giorniChiusura.includes(giorno)}
                      onChange={() => toggleGiornoChiusura(giorno)}
                    />
                    <span>{GIORNI_LABEL[idx]}</span>
                  </label>
                ))}
              </div>
              {giorniChiusura.length > 0 && (
                <p className="info">Giorni chiusi: {labelDiChiusura}</p>
              )}
              <button
                className="drawer-close-btn"
                onClick={() => setShowGiorniDrawer(false)}
              >
                Chiudi
              </button>
            </div>
          </div>
        </>
      )}

      {/* Pannello Aggiungi Dipendente */}
      {showAddDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddDrawer(false)} />
          <div className="drawer-bottom open">
            <div className="drawer-handle" />
            <div className="drawer-content">
              <h2>Aggiungi Dipendente</h2>
              <div className="input-group">
                <input
                  type="text"
                  value={nuovoDipendente}
                  onChange={(e) => setNuovoDipendente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aggiungiDipendente()}
                  placeholder="Nome dipendente..."
                  autoFocus
                />
                <button onClick={aggiungiDipendente}>Aggiungi</button>
              </div>
              <p className="info">
                In organico: {dipendenti.length} {dipendenti.length === 1 ? 'persona' : 'persone'}
              </p>
              <button
                className="drawer-close-btn"
                onClick={() => setShowAddDrawer(false)}
              >
                Chiudi
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
