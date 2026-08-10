import React, { useState } from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import { REPARTI, repartoDi, slugReparto } from '../costanti';
import { giorniDelPeriodo, raggruppaInPeriodi, etichettaPeriodo } from '../date';

const OPZIONI_REPARTO = REPARTI.map(r => ({
  valore: r,
  etichetta: r,
  classe: `rep-${slugReparto(r)}`
}));

export default function FerieSection({
  dipendenti,
  ferie,
  setFerie,
  setDipendenti,
  eliminaDipendente,
  cambiaReparto,
  giorniChiusura
}) {
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [dal, setDal] = useState('');
  const [al, setAl] = useState('');
  const [editingGiorni, setEditingGiorni] = useState(null);
  const [editingGiorniValue, setEditingGiorniValue] = useState('');

  // Il periodo va da "dal" a "al"; se "al" è vuoto vale il solo giorno iniziale
  const fine = al || dal;
  const periodoValido = Boolean(dal) && fine >= dal;

  const anteprima = periodoValido
    ? giorniDelPeriodo(dal, fine, giorniChiusura)
    : { giorni: [], esclusi: 0 };

  const giaPresenti = anteprima.giorni.filter(g =>
    (ferie[selectedDipendente] || []).includes(g)
  ).length;

  const daAggiungere = anteprima.giorni.length - giaPresenti;

  // Aggiunge tutti i giorni del periodo
  const aggiungiPeriodo = () => {
    if (!selectedDipendente || !periodoValido) return;

    const esistenti = ferie[selectedDipendente] || [];
    const uniti = [...new Set([...esistenti, ...anteprima.giorni])].sort();

    setFerie({ ...ferie, [selectedDipendente]: uniti });
    setDal('');
    setAl('');
  };

  // Rimuove un intero periodo
  const rimuoviPeriodo = (dipendenteId, date) => {
    setFerie({
      ...ferie,
      [dipendenteId]: ferie[dipendenteId].filter(d => !date.includes(d))
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
          <ScrollArea>
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
                        <Select
                          valore={reparto}
                          opzioni={OPZIONI_REPARTO}
                          onChange={(v) => cambiaReparto(dip.id, v)}
                          classe={`pillola rep-${slugReparto(reparto)}`}
                          etichettaAria={`Reparto di ${dip.nome}`}
                        />
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
          </ScrollArea>

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

              <div className="periodo-form">
                <label className="campo-data">
                  <span className="campo-label">Dal</span>
                  <input
                    type="date"
                    value={dal}
                    onChange={(e) => setDal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && aggiungiPeriodo()}
                  />
                </label>
                <label className="campo-data">
                  <span className="campo-label">Al <em>(facoltativo)</em></span>
                  <input
                    type="date"
                    value={al}
                    min={dal || undefined}
                    onChange={(e) => setAl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && aggiungiPeriodo()}
                  />
                </label>
                <button
                  className="btn btn-primario"
                  onClick={aggiungiPeriodo}
                  disabled={!periodoValido || daAggiungere === 0}
                >
                  Aggiungi
                </button>
              </div>

              {dal && !periodoValido && (
                <p className="nota nota-errore">La data finale precede quella iniziale.</p>
              )}

              {periodoValido && (
                <p className="nota">
                  {daAggiungere > 0
                    ? `Verranno aggiunti ${daAggiungere} ${daAggiungere === 1 ? 'giorno' : 'giorni'}`
                    : 'Questo periodo è già stato inserito'}
                  {anteprima.esclusi > 0 &&
                    ` · ${anteprima.esclusi} ${anteprima.esclusi === 1 ? 'giorno escluso' : 'giorni esclusi'} per chiusura`}
                  {giaPresenti > 0 && daAggiungere > 0 && ` · ${giaPresenti} già presenti`}
                </p>
              )}

              {giorniSelezionato.length === 0 ? (
                <p className="dettaglio-vuoto">Nessun giorno di ferie inserito.</p>
              ) : (
                <ul className="lista-ferie">
                  {raggruppaInPeriodi(giorniSelezionato, giorniChiusura).map(periodo => (
                    <li key={periodo.inizio} className="ferie-item">
                      <span className="ferie-data">{etichettaPeriodo(periodo)}</span>
                      <span className="ferie-quanti">
                        {periodo.date.length} {periodo.date.length === 1 ? 'giorno' : 'giorni'}
                      </span>
                      <button
                        className="btn-elimina-giorno"
                        onClick={() => rimuoviPeriodo(selectedDipendente, periodo.date)}
                        title="Rimuovi periodo"
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
