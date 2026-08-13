import React, { useState } from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import {
  APERTURE,
  GIORNI,
  GIORNI_LABEL,
  aperturaDi,
  classeReparto,
  repartoDi,
  stileMansione
} from '../costanti';
import { contaFerie, ferieDellAnno, annoCorrente } from '../date';

export default function ImpostazioniSection({
  dipendenti,
  setDipendenti,
  ferie,
  eliminaDipendente,
  cambiaReparto,
  mansioni,
  giorniChiusura,
  aperture,
  apriAggiungiDipendente,
  apriAggiungiMansione,
  apriGiorniChiusura
}) {
  // le mansioni cambiano da una pizzeria all'altra: l'elenco si costruisce qui
  const opzioniMansione = mansioni.map(m => ({
    valore: m,
    etichetta: m,
    classe: `mansione ${classeReparto(m)}`,
    stile: stileMansione(m)
  }));

  const [inModifica, setInModifica] = useState(null);
  const [valoreGiorni, setValoreGiorni] = useState('');
  const [daEliminare, setDaEliminare] = useState(null);

  const iniziaModifica = (dip) => {
    setInModifica(dip.id);
    setValoreGiorni(dip.giorni_ferie.toString());
  };

  const salvaModifica = () => {
    const nuovo = parseInt(valoreGiorni, 10);
    if (!isNaN(nuovo) && nuovo > 0) {
      setDipendenti(dipendenti.map(d => (d.id === inModifica ? { ...d, giorni_ferie: nuovo } : d)));
    }
    setInModifica(null);
  };

  const confermaEliminazione = (id) => {
    eliminaDipendente(id);
    setDaEliminare(null);
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Personale</h2>
            <p className="card-sub">Chi lavora in pizzeria, mansione e ferie spettanti</p>
          </div>
          <div className="azioni-testa">
            <button className="btn btn-secondario" onClick={apriAggiungiMansione}>
              <span>＋</span> Aggiungi mansione
            </button>
            <button className="btn btn-primario" onClick={apriAggiungiDipendente}>
              <span>＋</span> Aggiungi dipendente
            </button>
          </div>
        </div>

        {dipendenti.length === 0 ? (
          <div className="vuoto">
            <div className="vuoto-icona">👥</div>
            <p className="vuoto-titolo">Nessun dipendente</p>
            <p className="vuoto-testo">Aggiungi la prima persona per iniziare.</p>
          </div>
        ) : (
          <ScrollArea>
            <table className="tabella tabella-personale">
              <thead>
                <tr>
                  <th className="col-nome">Dipendente</th>
                  <th>Mansione</th>
                  <th>Ferie spettanti</th>
                  <th>Godute nel {annoCorrente()}</th>
                  <th className="col-azioni">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dipendenti.map(dip => {
                  const usate = contaFerie(
                    ferieDellAnno(ferie[dip.id] || [], annoCorrente()),
                    giorniChiusura
                  );
                  const reparto = repartoDi(dip);

                  return (
                    <tr key={dip.id} className={daEliminare === dip.id ? 'riga-in-eliminazione' : ''}>
                      <td className="col-nome">
                        <div className="persona">
                          <Avatar nome={dip.nome} />
                          <span className="persona-nome">{dip.nome}</span>
                        </div>
                      </td>

                      <td>
                        <Select
                          valore={reparto}
                          opzioni={opzioniMansione}
                          onChange={(v) => cambiaReparto(dip.id, v)}
                          classe={`pillola pillola-mansione ${classeReparto(reparto)}`}
                          stile={stileMansione(reparto)}
                          etichettaAria={`Mansione di ${dip.nome}`}
                          // una mansione tolta altrove resta leggibile finché non si cambia
                          etichettaFuoriElenco={reparto}
                        />
                      </td>

                      <td>
                        {inModifica === dip.id ? (
                          <div className="edit-giorni">
                            <input
                              type="number"
                              value={valoreGiorni}
                              onChange={(e) => setValoreGiorni(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') salvaModifica();
                                if (e.key === 'Escape') setInModifica(null);
                              }}
                              min="1"
                              autoFocus
                            />
                            <button className="btn btn-ok btn-icona" onClick={salvaModifica} title="Salva">✓</button>
                            <button className="btn btn-muto btn-icona" onClick={() => setInModifica(null)} title="Annulla">✕</button>
                          </div>
                        ) : (
                          <button className="valore-modificabile" onClick={() => iniziaModifica(dip)} title="Clicca per modificare">
                            {dip.giorni_ferie}
                            <span className="matita">✎</span>
                          </button>
                        )}
                      </td>

                      <td><span className="num num-usate">{usate}</span></td>

                      <td className="col-azioni">
                        {daEliminare === dip.id ? (
                          <div className="conferma-eliminazione">
                            <span className="conferma-testo">Eliminare?</span>
                            <button className="btn btn-pericolo" onClick={() => confermaEliminazione(dip.id)}>Sì</button>
                            <button className="btn btn-secondario" onClick={() => setDaEliminare(null)}>No</button>
                          </div>
                        ) : (
                          <button className="btn btn-fantasma-rosso" onClick={() => setDaEliminare(dip.id)}>
                            Elimina
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Quando siamo aperti</h2>
            <p className="card-sub">
              Nei giorni chiusi i turni sono disattivati e le ferie non vengono conteggiate
            </p>
          </div>
          <button className="btn btn-secondario" onClick={apriGiorniChiusura}>Modifica</button>
        </div>

        <div className="blocco-chiusura">
          <ul className="elenco-aperture-riepilogo">
            {GIORNI.map((giorno, idx) => {
              const scelta = aperturaDi(aperture, giorno);
              return (
                <li key={giorno} className={scelta === 'chiuso' ? 'chiusa' : ''}>
                  <span className="riepilogo-giorno">{GIORNI_LABEL[idx]}</span>
                  <span className={`pill-orario ap-${scelta}`}>
                    {APERTURE.find(a => a.valore === scelta)?.etichetta}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
