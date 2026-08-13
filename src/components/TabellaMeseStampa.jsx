import React from 'react';
import {
  GIORNI,
  GIORNI_SIGLA,
  classeReparto,
  classeTurno,
  eChiusoIlGiorno,
  eLavorativo,
  etichettaCasella,
  repartoDi,
  stileMansione
} from '../costanti';
import { chiaveGiorno, dataBreve, giorniDelMese } from '../date';
import { creaLettoreMansioni, creaLettoreTurni } from '../turni';

/**
 * Il mese intero su un foglio solo: i giorni in riga, le persone in
 * colonna, raggruppate per mansione. Serve alla stampa del mese; a
 * schermo non compare mai.
 */
export default function TabellaMeseStampa({
  mese,
  gruppi,
  settimane,
  mansioniSettimane,
  ferie,
  aperture
}) {
  const giorni = giorniDelMese(mese);
  const persone = gruppi.flatMap(g => g.membri);
  const leggiTurno = creaLettoreTurni(settimane);
  const leggiMansione = creaLettoreMansioni(mansioniSettimane);

  return (
    <table className="tabella tabella-mese">
      <thead>
        <tr>
          <th className="col-giorno" rowSpan={2}>Giorno</th>
          {gruppi.map(({ reparto, membri }) => (
            <th key={reparto} colSpan={membri.length} className="testa-mansione">
              <span className={`pill-reparto ${classeReparto(reparto)}`} style={stileMansione(reparto)}>
                {reparto}
              </span>
            </th>
          ))}
        </tr>
        <tr>
          {persone.map(dip => (
            <th key={dip.id} className="testa-persona">{dip.nome}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {giorni.map(data => {
          const giorno = chiaveGiorno(data);
          const chiuso = eChiusoIlGiorno(aperture, giorno);
          const sigla = GIORNI_SIGLA[GIORNI.indexOf(giorno)];

          return (
            <tr key={data} className={chiuso ? 'riga-chiusa' : ''}>
              <th scope="row" className="col-giorno">
                <span className="giorno-sigla">{sigla}</span> {dataBreve(data)}
              </th>

              {chiuso ? (
                <td colSpan={persone.length} className="cella-chiusa">Pizzeria chiusa</td>
              ) : (
                persone.map(dip => {
                  const inFerie = (ferie[dip.id] || []).includes(data);
                  const valore = leggiTurno(dip.id, data);
                  const sua = repartoDi(dip);
                  const mansione = leggiMansione(dip.id, data, sua);

                  return (
                    <td key={dip.id} className={inFerie ? 'in-ferie' : ''}>
                      {inFerie ? (
                        <span className="turno-stampa turno-ferie-testo">Ferie</span>
                      ) : (
                        <>
                          <span className={`turno-stampa ${classeTurno(valore)}`}>
                            {etichettaCasella(valore)}
                          </span>
                          {/* la mansione solo dove cambia da quella di sempre */}
                          {eLavorativo(valore) && mansione !== sua && (
                            <span className="mansione-del-giorno">{mansione}</span>
                          )}
                        </>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
