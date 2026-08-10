import React, { useState, useEffect } from 'react';
import './App.css';
import TurniSection from './components/TurniSection';
import GiorniChiusuraSection from './components/GiorniChiusuraSection';
import FerieSection from './components/FerieSection';

function App() {
  const [dipendenti, setDipendenti] = useState([]);
  const [turni, setTurni] = useState({});
  const [ferie, setFerie] = useState({});
  const [giorniChiusura, setGiorniChiusura] = useState([]);
  const [nuovoDipendente, setNuovoDipendente] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showGiorniModal, setShowGiorniModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('turni');

  // Carica dati da localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pizzeriaApp');
    if (saved) {
      const data = JSON.parse(saved);
      setDipendenti(data.dipendenti || []);
      setTurni(data.turni || {});
      setFerie(data.ferie || {});
      setGiorniChiusura(data.giorniChiusura || []);
    }
  }, []);

  // Salva dati su localStorage
  useEffect(() => {
    localStorage.setItem('pizzeriaApp', JSON.stringify({
      dipendenti,
      turni,
      ferie,
      giorniChiusura
    }));
  }, [dipendenti, turni, ferie, giorniChiusura]);

  // Aggiungi dipendente
  const aggiungiDipendente = () => {
    if (nuovoDipendente.trim()) {
      const newId = Date.now().toString();
      setDipendenti([...dipendenti, { id: newId, nome: nuovoDipendente, giorni_ferie: 20 }]);
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
    }
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

  const giorni = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
  const giorniLabel = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1>🍕 Pizzeria</h1>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Chiudi' : 'Apri'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'turni' ? 'active' : ''}`}
            onClick={() => setActiveSection('turni')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Turni</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'ferie' ? 'active' : ''}`}
            onClick={() => setActiveSection('ferie')}
          >
            <span className="nav-icon">🏖️</span>
            <span className="nav-text">Ferie</span>
          </button>
          <button
            className={`nav-item ${showGiorniModal ? 'active' : ''}`}
            onClick={() => setShowGiorniModal(!showGiorniModal)}
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
            <span className="text">{dipendenti.length} dipendenti</span>
          </p>
        </div>

        {/* Giorni Chiusura Dropdown nel Sidebar */}
        {showGiorniModal && (
          <div className="giorni-dropdown sidebar-dropdown">
            <h3>Giorni di Chiusura</h3>
            <div className="dropdown-grid">
              {giorniLabel.map((giorno, idx) => (
                <label key={idx} className="checkbox-label dropdown-item">
                  <input
                    type="checkbox"
                    checked={giorniChiusura.includes(giorno.toLowerCase())}
                    onChange={() => {
                      if (giorniChiusura.includes(giorno.toLowerCase())) {
                        setGiorniChiusura(giorniChiusura.filter(g => g !== giorno.toLowerCase()));
                      } else {
                        setGiorniChiusura([...giorniChiusura, giorno.toLowerCase()]);
                      }
                    }}
                  />
                  <span>{giorno}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="main-wrapper">
        <header className="header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Chiudi menu' : 'Apri menu'}
          >
            ☰
          </button>
          <h1>🍕 Gestione Pizzeria</h1>
          <div style={{ width: '40px' }}></div>
        </header>

        <main className="container">
          {activeSection === 'turni' && (
            <>
              <TurniSection
                dipendenti={dipendenti}
                turni={turni}
                setTurni={setTurni}
                giorni={giorni}
                giorniLabel={giorniLabel}
                giorniChiusura={giorniChiusura}
              />
            </>
          )}

          {activeSection === 'ferie' && (
            <>
              <FerieSection
                dipendenti={dipendenti}
                ferie={ferie}
                setFerie={setFerie}
                setDipendenti={setDipendenti}
                eliminaDipendente={eliminaDipendente}
              />
            </>
          )}
        </main>
      </div>

      {/* Overlay */}
      {showAddDrawer && (
        <div
          className="drawer-overlay"
          onClick={() => setShowAddDrawer(false)}
        />
      )}

      {/* Drawer Bottom */}
      <div className={`drawer-bottom ${showAddDrawer ? 'open' : ''}`}>
        <div className="drawer-handle" />
        <div className="drawer-content">
          <h2>Aggiungi Dipendente</h2>
          <div className="input-group">
            <input
              type="text"
              value={nuovoDipendente}
              onChange={(e) => setNuovoDipendente(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  aggiungiDipendente();
                  setShowAddDrawer(false);
                }
              }}
              placeholder="Nome dipendente..."
              autoFocus
            />
            <button onClick={() => {
              aggiungiDipendente();
              setShowAddDrawer(false);
            }}>Aggiungi</button>
          </div>
          <p className="info">Dipendenti aggiunti: {dipendenti.length}</p>
          <button
            className="drawer-close-btn"
            onClick={() => setShowAddDrawer(false)}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
