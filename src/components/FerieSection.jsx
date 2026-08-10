import React, { useState } from 'react';
import Avatar from './Avatar';
import { REPARTI, repartoDi, slugReparto } from '../costanti';

const formattaData = (iso) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

export default function FerieSection({
  dipendenti,
  ferie,
  setFerie,
  setDipendenti,
  eliminaDipendente,
  cambiaReparto
}) {
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [editingGiorni, setEditingGiorni] = useState(null);
  const [editingGiorniValue, setEditingGiorniValue] = useState('');

  // Aggiunge un giorno di ferie
  const aggiungiGiornoFerie = () => {
    if (!selectedDipendente || !selectedDate) return;

    const giorni = [...(ferie[selectedDipendente] || [])];
    if (!giorni.includes(selectedDate)) {
      giorni.push(selectedDate);
      giorni.sort();
      setFerie({ ...ferie, [selectedDipendente]: giorni });
      setSelectedDate('');
    }
  };

  // Rimuove un giorno di ferie
  const rimuoviGiornoFerie = (dipendenteId, data) => {
    setFerie({
      ...ferie,
      [dipendenteId]: ferie[dipendenteId].filter(d => d !== data)
    });
  };

  // Modifica dei giorni di ferie spettanti
  const startEditGiorni = (dip) => {
    setEditingGiorni(dip.id);
    setEditingGiorniValue(dip.giorni_ferie.toString());
  };

  const saveEditGiorni = () => {
    const nuovo = parseInt(editingGiorniValue, 10);
    if (!isNaN(nuovo) && nuovo > 0) {
      setDipendenti(
        dipendenti.map(d => (d.id === editingGiorni ? { ...d, giorni_ferie: nuovo } : d))
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
  const giorniSelezionato = ferie[selectedDipendente] || [];

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Ferie</h2>
          <p className="card-sub">Giorni spettanti, goduti e residui per ogni persona</p>
        </div>
      </div>

      {dipendenti.length === 0 ? (
        <div className="vuoto">
          <div className="vuoto-icona">🏖️</div>
          <p className="vuoto-titolo">Nessun dipendente</p>
          <p className="vuoto-testo">Aggiungine uno dal menu per iniziare a segnare le ferie.</p>
        </div>
      ) : (
        <>
          <div className="tabella-scroll">
            <table className="tabella tabella-ferie">
              <thead>
                <tr>
                  <th className="col-nome">Dipendente</th>
                  <th>Reparto</th>
                  <th>Spettanti</th>
                  <th>Godute</th>
                  <th>Residue</th>
                  <th className="col-azioni">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dipendenti.map(dip => {
                  const usate = (ferie[dip.id] || []).length;
                  const rimaste = Math.max(0, dip.giorni_ferie - usate);
                  const perc = Math.min(100, Math.round((usate / dip.giorni_ferie) * 100));
                  const livello = perc >= 100 ? 'pieno' : perc >= 75 ? 'alto' : 'ok';
                  const attivo = selectedDipendente === dip.id;
                  const reparto = repartoDi(dip);

                  return (
                    <tr key={dip.id} className={attivo ? 'riga-attiva' : ''}>
                      <td className="col-nome">
                        <div className="persona">
                          <Avatar nome={dip.nome} />
                          <div className="persona-testo">
                            <span className="persona-nome">{dip.nome}</span>
                            <span className={`meter meter-${livello}`}>
                              <span className="meter-fill" style={{ width: `${perc}%` }} />
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <select
                          className={`sel-reparto rep-${slugReparto(reparto)}`}
                          value={reparto}
                          onChange={(e) => cambiaReparto(dip.id, e.target.value)}
                          aria-label={`Reparto di ${dip.nome}`}
                        >
                          {REPARTI.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>

                      <td>
                        {editingGiorni === dip.id ? (
                          <div className="edit-giorni">
                            <input
                              type="number"
                              value={editingGiorniValue}
                              onChange={(e) => setEditingGiorniValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditGiorni();
                                if (e.key === 'Escape') setEditingGiorni(null);
                              }}
                              min="1"
                              autoFocus
                            />
                            <button className="btn btn-ok btn-icona" onClick={saveEditGiorni} title="Salva">✓</button>
                            <button className="btn btn-muto btn-icona" onClick={() => setEditingGiorni(null)} title="Annulla">✕</button>
                          </div>
                        ) : (
                          <button className="valore-modificabile" onClick={() => startEditGiorni(dip)} title="Clicca per modificare">
                            {dip.giorni_ferie}
                            <span className="matita">✎</span>
                          </button>
                        )}
                      </td>

                      <td><span className="num num-usate">{usate}</span></td>
                      <td>
                        <span className={`num ${rimaste === 0 ? 'num-zero' : 'num-ok'}`}>{rimaste}</span>
                      </td>

                      <td className="col-azioni">
                        <div className="azioni">
                          <button
                            className={`btn ${attivo ? 'btn-ok' : 'btn-secondario'}`}
                            onClick={() => setSelectedDipendente(attivo ? null : dip.id)}
                          >
                            {attivo ? 'Chiudi' : 'Gestisci'}
                          </button>
                          <button className="btn btn-fantasma-rosso" onClick={() => handleElimina(dip.id)}>
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {dipSelezionato && (
            <div className="dettaglio">
              <div className="dettaglio-head">
                <Avatar nome={dipSelezionato.nome} size="lg" />
                <div>
                  <h3>{dipSelezionato.nome}</h3>
                  <p className="dettaglio-sub">
                    {repartoDi(dipSelezionato)} · {giorniSelezionato.length} di {dipSelezionato.giorni_ferie} giorni utilizzati
                  </p>
                </div>
              </div>

              <div className="dettaglio-form">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aggiungiGiornoFerie()}
                />
                <button className="btn btn-primario" onClick={aggiungiGiornoFerie} disabled={!selectedDate}>
                  Aggiungi giorno
                </button>
              </div>

              {giorniSelezionato.length === 0 ? (
                <p className="dettaglio-vuoto">Nessun giorno di ferie inserito.</p>
              ) : (
                <ul className="lista-ferie">
                  {giorniSelezionato.map(data => (
                    <li key={data} className="ferie-item">
                      <span className="ferie-data">{formattaData(data)}</span>
                      <button
                        className="btn-elimina-giorno"
                        onClick={() => rimuoviGiornoFerie(selectedDipendente, data)}
                        title="Rimuovi giorno"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
