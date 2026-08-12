import React, { useMemo, useState } from 'react';
import Avatar from './Avatar';
import DatePicker from './DatePicker';
import ScrollArea from './ScrollArea';
import Conferma from './Conferma';
import { repartoDi, slugReparto } from '../costanti';
import {
  giorniDelPeriodo,
  raggruppaInPeriodi,
  etichettaPeriodo,
  contaFerie,
  ferieDellAnno,
  annoCorrente
} from '../date';

export default function FerieSection({ dipendenti, ferie, setFerie, giorniChiusura, avvisa }) {
  const [selectedDipendente, setSelectedDipendente] = useState(null);
  const [anno, setAnno] = useState(annoCorrente);
  const [dal, setDal] = useState('');
  const [al, setAl] = useState('');
  const [chiediConferma, setChiediConferma] = useState(false);

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

  const dipSelezionato = dipendenti.find(d => d.id === selectedDipendente);

  /**
   * Colleghi della stessa mansione già in ferie in quei giorni: due addetti
   * alla stessa mansione via insieme lasciano scoperto il posto, quindi
   * l'inserimento va confermato a parte.
   */
  const sovrapposizioni = useMemo(() => {
    if (!dipSelezionato || anteprima.giorni.length === 0) return [];
    const mansione = repartoDi(dipSelezionato);

    return dipendenti
      .filter(d => d.id !== dipSelezionato.id && repartoDi(d) === mansione)
      .map(d => ({
        dip: d,
        giorni: anteprima.giorni.filter(g => (ferie[d.id] || []).includes(g))
      }))
      .filter(c => c.giorni.length > 0);
  }, [dipendenti, dipSelezionato, ferie, anteprima.giorni]);

  const inserisci = () => {
    const esistenti = ferie[selectedDipendente] || [];
    const uniti = [...new Set([...esistenti, ...anteprima.giorni])].sort();

    setFerie({ ...ferie, [selectedDipendente]: uniti });
    setDal('');
    setAl('');
  };

  // Aggiunge tutti i giorni del periodo, chiedendo conferma se c'è una sovrapposizione
  const aggiungiPeriodo = () => {
    if (!selectedDipendente || !periodoValido) return;
    if (sovrapposizioni.length > 0) {
      setChiediConferma(true);
      return;
    }
    inserisci();
  };

  // Rimuove un intero periodo
  const rimuoviPeriodo = (dipendenteId, date) => {
    setFerie({
      ...ferie,
      [dipendenteId]: ferie[dipendenteId].filter(d => !date.includes(d))
    });
  };

  const apriChiudi = (id) => {
    setSelectedDipendente(id === selectedDipendente ? null : id);
    setDal('');
    setAl('');
  };

  // Il monte ferie si azzera ogni anno: si guarda un anno alla volta
  const giorniSelezionato = ferieDellAnno(ferie[selectedDipendente] || [], anno);

  const cambiaAnno = (delta) => {
    setAnno(a => a + delta);
    setDal('');
    setAl('');
  };

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Ferie</h2>
          <p className="card-sub">Tocca una persona per inserire o togliere i suoi giorni</p>
        </div>
        <div className="navigazione-mese">
          <button className="icon-btn" onClick={() => cambiaAnno(-1)} title="Anno precedente">‹</button>
          <span className="mese-corrente">Anno {anno}</span>
          <button className="icon-btn" onClick={() => cambiaAnno(1)} title="Anno successivo">›</button>
          {anno !== annoCorrente() && (
            <button className="btn btn-secondario btn-oggi" onClick={() => cambiaAnno(annoCorrente() - anno)}>
              Oggi
            </button>
          )}
        </div>
      </div>

      {dipendenti.length === 0 ? (
        <div className="vuoto">
          <div className="vuoto-icona">🏖️</div>
          <p className="vuoto-titolo">Nessun dipendente</p>
          <p className="vuoto-testo">Aggiungine uno da Impostazioni per iniziare a segnare le ferie.</p>
        </div>
      ) : (
        <>
          <ScrollArea>
            <table className="tabella tabella-ferie">
              <thead>
                <tr>
                  <th className="col-nome">Dipendente</th>
                  <th>Mansione</th>
                  <th>Spettanti</th>
                  <th>Godute</th>
                  <th>Residue</th>
                  <th className="col-freccia" aria-label="Apri" />
                </tr>
              </thead>
              <tbody>
                {dipendenti.map(dip => {
                  const usate = contaFerie(ferieDellAnno(ferie[dip.id] || [], anno), giorniChiusura);
                  const rimaste = Math.max(0, dip.giorni_ferie - usate);
                  const perc = Math.min(100, Math.round((usate / dip.giorni_ferie) * 100));
                  const livello = perc >= 100 ? 'pieno' : perc >= 75 ? 'alto' : 'ok';
                  const attivo = selectedDipendente === dip.id;
                  const reparto = repartoDi(dip);

                  return (
                    <tr
                      key={dip.id}
                      className={`riga-apribile ${attivo ? 'riga-attiva' : ''}`}
                      onClick={() => apriChiudi(dip.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={attivo}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          apriChiudi(dip.id);
                        }
                      }}
                    >
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
                        <span className={`pill-reparto rep-${slugReparto(reparto)}`}>{reparto}</span>
                      </td>

                      <td><span className="num num-neutro">{dip.giorni_ferie}</span></td>
                      <td><span className="num num-usate">{usate}</span></td>
                      <td>
                        <span className={`num ${rimaste === 0 ? 'num-zero' : 'num-ok'}`}>{rimaste}</span>
                      </td>

                      <td className="col-freccia">
                        <span className={`freccia-riga ${attivo ? 'aperta' : ''}`} aria-hidden="true">›</span>
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
                    {repartoDi(dipSelezionato)} · {contaFerie(giorniSelezionato, giorniChiusura)} di {dipSelezionato.giorni_ferie} giorni utilizzati
                  </p>
                </div>
              </div>

              <div className="periodo-form">
                <div className="campo-data">
                  <span className="campo-label">Dal</span>
                  <DatePicker
                    valore={dal}
                    onChange={setDal}
                    min={`${anno}-01-01`}
                    max={`${anno}-12-31`}
                    giorniChiusura={giorniChiusura}
                    ferieEsistenti={giorniSelezionato}
                    placeholder="Scegli il giorno"
                    etichettaAria="Data iniziale del periodo"
                  />
                </div>
                <div className="campo-data">
                  <span className="campo-label">Al <em>(facoltativo)</em></span>
                  <DatePicker
                    valore={al}
                    onChange={setAl}
                    min={dal || `${anno}-01-01`}
                    max={`${anno}-12-31`}
                    giorniChiusura={giorniChiusura}
                    ferieEsistenti={giorniSelezionato}
                    inizioIntervallo={dal || null}
                    placeholder="Un solo giorno"
                    etichettaAria="Data finale del periodo"
                  />
                </div>
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

              {sovrapposizioni.length > 0 && (
                <p className="nota nota-avviso">
                  ⚠️ Stessa mansione già in ferie in questi giorni:{' '}
                  {sovrapposizioni
                    .map(({ dip, giorni }) => `${dip.nome} (${giorni.length} ${giorni.length === 1 ? 'giorno' : 'giorni'})`)
                    .join(', ')}
                </p>
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

      {chiediConferma && dipSelezionato && (
        <Conferma
          titolo="Due persone della stessa mansione in ferie"
          tono="pericolo"
          conferma="Sì, inserisci lo stesso"
          annulla="No, annulla"
          onAnnulla={() => setChiediConferma(false)}
          onConferma={() => {
            inserisci();
            setChiediConferma(false);
            avvisa?.(`Ferie inserite nonostante la sovrapposizione in ${repartoDi(dipSelezionato)}`);
          }}
        >
          <p>
            In questi giorni {dipSelezionato.nome} sarebbe in ferie insieme a chi fa la stessa
            mansione ({repartoDi(dipSelezionato)}):
          </p>
          <ul className="elenco-conflitti">
            {sovrapposizioni.map(({ dip, giorni }) => (
              <li key={dip.id}>
                <strong>{dip.nome}</strong> — {giorni.length} {giorni.length === 1 ? 'giorno' : 'giorni'}{' '}
                <span className="conflitto-periodi">
                  ({raggruppaInPeriodi(giorni, giorniChiusura).map(etichettaPeriodo).join('; ')})
                </span>
              </li>
            ))}
          </ul>
          <p>Sei sicuro di volerle inserire comunque?</p>
        </Conferma>
      )}
    </section>
  );
}
