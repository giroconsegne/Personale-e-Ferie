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
      <header className="header">
        <h1>🍕 Gestione Pizzeria</h1>
        <p>Turni, Ferie e Giorni di Chiusura</p>
      </header>

      <main className="container">
        {/* Sezione Aggiungi Dipendente */}
        <section className="add-dipendente">
          <h2>Aggiungi Dipendente</h2>
          <div className="input-group">
            <input
              type="text"
              value={nuovoDipendente}
              onChange={(e) => setNuovoDipendente(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && aggiungiDipendente()}
              placeholder="Nome dipendente..."
            />
            <button onClick={aggiungiDipendente}>+ Aggiungi</button>
          </div>
          <p className="info">Dipendenti: {dipendenti.length}</p>
        </section>

        {/* Turni */}
        <TurniSection
          dipendenti={dipendenti}
          turni={turni}
          setTurni={setTurni}
          giorni={giorni}
          giorniLabel={giorniLabel}
          giorniChiusura={giorniChiusura}
        />

        {/* Giorni di Chiusura */}
        <GiorniChiusuraSection
          giorniChiusura={giorniChiusura}
          setGiorniChiusura={setGiorniChiusura}
          giorniLabel={giorniLabel}
        />

        {/* Ferie */}
        <FerieSection
          dipendenti={dipendenti}
          ferie={ferie}
          setFerie={setFerie}
          setDipendenti={setDipendenti}
          eliminaDipendente={eliminaDipendente}
        />
      </main>
    </div>
  );
}

export default App;
