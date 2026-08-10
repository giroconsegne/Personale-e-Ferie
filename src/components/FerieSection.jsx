import React, { useState } from 'react';

export default function FerieSection({ dipendenti, ferie, setFerie, setDipendenti, eliminaDipendente }) {
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [editingGiorni, setEditingGiorni] = useState(null);
  const [editingGiorniValue, setEditingGiorniValue] = useState('');

  // Aggiunge un giorno di ferie
  const aggiungiGiornoFerie = () => {
    if (!selectedDipendente || !selectedDate) return;

    const newFerie = [...(ferie[selectedDipendente] || [])];
    if (!newFerie.includes(selectedDate)) {
      newFerie.push(selectedDate);
      newFerie.sort();
      setFerie({
        ...ferie,
        [selectedDipendente]: newFerie
      });
      setSelectedDate('');
    }
  };

  // Rimuove un giorno di ferie
  const rimuoviGiornoFerie = (dipendentiId, data) => {
    setFerie({
      ...ferie,
      [dipendentiId]: ferie[dipendentiId].filter(d => d !== data)
    });
  };

  // Modifica giorni ferie totali
  const startEditGiorni = (dip) => {
    setEditingGiorni(dip.id);
    setEditingGiorniValue(dip.giorni_ferie.toString());
  };

  const saveEditGiorni = () => {
    const newValue = parseInt(editingGiorniValue, 10);
    if (!isNaN(newValue) && newValue > 0) {
      setDipendenti(
        dipendenti.map(d =>
          d.id === editingGiorni ? { ...d, giorni_ferie: newValue } : d
        )
      );
    }
    setEditingGiorni(null);
  };

  // Rimuove il dipendente e chiude il pannello se era quello aperto
  const handleElimina = (id) => {
    if (selectedDipendente === id) setSelectedDipendente(null);
    eliminaDipendente(id);
  };

  const dipSelezionato = dipendenti.find(d => d.id === selectedDipendente);

  return (
    <section className="section ferie-section">
      <h2>🏖️ Gestione Ferie</h2>

      {dipendenti.length === 0 ? (
        <p className="empty">Nessun dipendente. Aggiungine uno per iniziare!</p>
      ) : (
        <>
          {/* Tabella Ferie */}
          <div className="ferie-table-container">
            <table className="ferie-table">
              <thead>
                <tr>
                  <th>Dipendente</th>
                  <th>Tot Ferie</th>
                  <th>Ferie Usate</th>
                  <th>Giorni Rimasti</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dipendenti.map(dip => {
                  const ferieUsate = ferie[dip.id]?.length || 0;
                  const giorniRimasti = Math.max(0, dip.giorni_ferie - ferieUsate);

                  return (
                    <tr key={dip.id}>
                      <td>{dip.nome}</td>
                      <td>
                        {editingGiorni === dip.id ? (
                          <div className="edit-giorni">
                            <input
                              type="number"
                              value={editingGiorniValue}
                              onChange={(e) => setEditingGiorniValue(e.target.value)}
                              min="1"
                            />
                            <button onClick={saveEditGiorni} className="btn-save">✓</button>
                            <button onClick={() => setEditingGiorni(null)} className="btn-cancel">✕</button>
                          </div>
                        ) : (
                          <span onClick={() => startEditGiorni(dip)} className="clickable">
                            {dip.giorni_ferie} <span className="edit-hint">(clicca per modificare)</span>
                          </span>
                        )}
                      </td>
                      <td className={ferieUsate > 0 ? 'used' : ''}>{ferieUsate}</td>
                      <td className={giorniRimasti === 0 ? 'zero' : 'remaining'}>{giorniRimasti}</td>
                      <td>
                        <button
                          onClick={() => setSelectedDipendente(dip.id)}
                          className={selectedDipendente === dip.id ? 'active' : ''}
                        >
                          Gestisci
                        </button>
                        <button
                          onClick={() => handleElimina(dip.id)}
                          className="btn-delete"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dettagli Ferie */}
          {dipSelezionato && (
            <div className="ferie-detail">
              <h3>Ferie di {dipSelezionato.nome}</h3>

              {/* Aggiungi Giorno */}
              <div className="add-ferie">
                <div className="input-group">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <button onClick={aggiungiGiornoFerie}>+ Aggiungi Giorno</button>
                </div>
              </div>

              {/* Lista Giorni Ferie */}
              <div className="ferie-list">
                <h4>Giorni di Ferie</h4>
                {(ferie[selectedDipendente] || []).length === 0 ? (
                  <p className="empty">Nessun giorno di ferie inserito</p>
                ) : (
                  <ul>
                    {(ferie[selectedDipendente] || []).map((data, idx) => (
                      <li key={idx} className="ferie-item">
                        <span>{new Date(data).toLocaleDateString('it-IT')}</span>
                        <button
                          onClick={() => rimuoviGiornoFerie(selectedDipendente, data)}
                          className="btn-remove"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
