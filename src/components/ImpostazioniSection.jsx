import React, { useState } from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import { GIORNI, GIORNI_LABEL, REPARTI, repartoDi, slugReparto } from '../costanti';
import { contaFerie, ferieDellAnno, annoCorrente } from '../date';

const OPZIONI_REPARTO = REPARTI.map(r => ({
  valore: r,
  etichetta: r,
  classe: `mansione rep-${slugReparto(r)}`
}));

export default function ImpostazioniSection({
  dipendenti,
  setDipendenti,
  ferie,
  eliminaDipendente,
  cambiaReparto,
  giorniChiusura,
  apriAggiungiDipendente,
  apriGiorniChiusura
}) {
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

  const labelChiusura = giorniChiusura
    .map(g => GIORNI_LABEL[GIORNI.indexOf(g)])
    .filter(Boolean);

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Personale</h2>
            <p className="card-sub">Chi lavora in pizzeria, mansione e ferie spettanti</p>
          </div>
          <button className="btn btn-primario" onClick={apriAggiungiDipendente}>
            <span>＋</span> Aggiungi dipendente
          </button>
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
                          opzioni={OPZIONI_REPARTO}
                          onChange={(v) => cambiaReparto(dip.id, v)}
                          classe={`pillola pillola-mansione rep-${slugReparto(reparto)}`}
                          etichettaAria={`Mansione di ${dip.nome}`}
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
            <h2>Giorni di chiusura</h2>
            <p className="card-sub">Nei giorni di chiusura i turni sono disattivati e le ferie non vengono conteggiate</p>
          </div>
          <button className="btn btn-secondario" onClick={apriGiorniChiusura}>Modifica</button>
        </div>

        <div className="blocco-chiusura">
          {labelChiusura.length === 0 ? (
            <p className="dettaglio-vuoto">Nessun giorno di chiusura impostato.</p>
          ) : (
            <ul className="elenco-chiusura">
              {labelChiusura.map(g => (
                <li key={g} className="pill-chiusura">{g}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
