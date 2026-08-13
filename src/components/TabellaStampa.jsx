import React from 'react';
import {
  APERTURE,
  aperturaDi,
  classeTurno,
  etichettaCasella,
  slugReparto
} from '../costanti';
import { dataBreve, giorniDellaSettimana } from '../date';
import { turniDellaSettimana, turnoDelGiorno } from '../turni';

/**
 * La settimana in sola lettura, senza tendine né pulsanti: serve alla
 * stampa del mese, dove ogni settimana è un foglio a sé.
 * Usa le stesse classi della tabella modificabile, così sul foglio le
 * due stampe si assomigliano.
 */
export default function TabellaStampa({
  lunedi,
  gruppi,
  settimane,
  ferie,
  giorni,
  giorniLabel,
  giorniChiusura,
  aperture
}) {
  const dateSettimana = giorniDellaSettimana(lunedi);

  return (
    <table className="tabella tabella-turni">
      <thead>
        <tr>
          <th className="col-nome">Dipendente</th>
          {giorniLabel.map((label, idx) => {
            const apertura = aperturaDi(aperture, giorni[idx]);
            const chiuso = apertura === 'chiuso';
            const daSegnalare = apertura !== 'entrambi';

            return (
              <th key={giorni[idx]} className={chiuso ? 'chiuso' : ''}>
                <span className="giorno-nome">{label}</span>
                <span className="giorno-data">{dataBreve(dateSettimana[idx])}</span>
                {daSegnalare && (
                  <span className={`badge-chiuso ${chiuso ? '' : 'badge-orario'}`}>
                    {APERTURE.find(a => a.valore === apertura)?.breve}
                  </span>
                )}
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

          {membri.map(dip => {
            const suoiTurni = turniDellaSettimana(settimane, dip.id, lunedi);
            const sueFerie = ferie[dip.id] || [];

            return (
              <tr key={dip.id}>
                <td className="col-nome">
                  <span className="persona-nome">{dip.nome}</span>
                </td>

                {giorni.map((giorno, idx) => {
                  const chiuso = giorniChiusura.includes(giorno);
                  const inFerie = sueFerie.includes(dateSettimana[idx]);
                  const valore = turnoDelGiorno(suoiTurni, giorno);

                  return (
                    <td key={giorno} className={chiuso ? 'chiuso' : inFerie ? 'in-ferie' : ''}>
                      {chiuso ? (
                        <span className="turno-chiuso">—</span>
                      ) : inFerie ? (
                        <span className="turno-ferie">
                          <span aria-hidden="true">🏖️</span> Ferie
                        </span>
                      ) : (
                        <span className={`turno-stampa ${classeTurno(valore)}`}>
                          {etichettaCasella(valore)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
