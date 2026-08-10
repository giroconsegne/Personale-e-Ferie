import React from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import { REPARTI, repartoDi, slugReparto } from '../costanti';

const TURNI = [
  { valore: 'Mattina', classe: 'turno-mattina' },
  { valore: 'Sera', classe: 'turno-sera' },
  { valore: 'Riposo', classe: 'turno-riposo' }
];

const OPZIONI_TURNO = TURNI.map(t => ({
  valore: t.valore,
  etichetta: t.valore,
  classe: t.classe
}));

const classeTurno = (valore) =>
  TURNI.find(t => t.valore === valore)?.classe || 'turno-riposo';

export default function TurniSection({ dipendenti, turni, setTurni, giorni, giorniLabel, giorniChiusura }) {
  const handleTurnoChange = (dipendenteId, giorno, valore) => {
    setTurni({
      ...turni,
      [dipendenteId]: {
        ...turni[dipendenteId],
        [giorno]: valore
      }
    });
  };

  // Una sezione di tabella per reparto, saltando quelli senza personale
  const gruppi = REPARTI
    .map(reparto => ({
      reparto,
      membri: dipendenti.filter(d => repartoDi(d) === reparto)
    }))
    .filter(g => g.membri.length > 0);

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Turni settimanali</h2>
          <p className="card-sub">Il turno di ogni persona, reparto per reparto</p>
        </div>
        <div className="legenda">
          {TURNI.map(t => (
            <span key={t.valore} className={`legenda-voce ${t.classe}`}>
              <i className="punto" />
              {t.valore}
            </span>
          ))}
        </div>
      </div>

      {dipendenti.length === 0 ? (
        <div className="vuoto">
          <div className="vuoto-icona">📋</div>
          <p className="vuoto-titolo">Nessun dipendente</p>
          <p className="vuoto-testo">Aggiungine uno dal menu per costruire la settimana.</p>
        </div>
      ) : (
        <ScrollArea>
          <table className="tabella tabella-turni">
            <thead>
              <tr>
                <th className="col-nome">Dipendente</th>
                {giorniLabel.map((label, idx) => {
                  const chiuso = giorniChiusura.includes(giorni[idx]);
                  return (
                    <th key={giorni[idx]} className={chiuso ? 'chiuso' : ''}>
                      <span className="giorno-nome">{label}</span>
                      {chiuso && <span className="badge-chiuso">Chiuso</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {gruppi.map(({ reparto, membri }) => (
              <tbody key={reparto}>
                <tr className="riga-gruppo">
                  <th scope="rowgroup" className="col-nome">
                    <span className={`pill-reparto rep-${slugReparto(reparto)}`}>{reparto}</span>
                  </th>
                  <td colSpan={giorni.length} className="cella-gruppo">
                    {membri.length} {membri.length === 1 ? 'persona' : 'persone'}
                  </td>
                </tr>

                {membri.map(dip => (
                  <tr key={dip.id}>
                    <td className="col-nome">
                      <div className="persona">
                        <Avatar nome={dip.nome} />
                        <span className="persona-nome">{dip.nome}</span>
                      </div>
                    </td>
                    {giorni.map(giorno => {
                      const chiuso = giorniChiusura.includes(giorno);
                      const valore = turni[dip.id]?.[giorno] || 'Riposo';
                      return (
                        <td key={giorno} className={chiuso ? 'chiuso' : ''}>
                          {chiuso ? (
                            <span className="turno-chiuso">—</span>
                          ) : (
                            <Select
                              valore={valore}
                              opzioni={OPZIONI_TURNO}
                              onChange={(v) => handleTurnoChange(dip.id, giorno, v)}
                              classe={`pillola ${classeTurno(valore)}`}
                              etichettaAria={`Turno di ${dip.nome}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </ScrollArea>
      )}
    </section>
  );
}
