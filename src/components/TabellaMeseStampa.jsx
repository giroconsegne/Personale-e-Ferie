import React from 'react';
import {
  GIORNI,
  GIORNI_SIGLA,
  classeTurno,
  eChiusoIlGiorno,
  eLavorativo,
  etichettaCasella,
  repartoDi
} from '../costanti';
import { chiaveGiorno, dataBreve, giorniDelMese } from '../date';
import { creaLettoreMansioni, creaLettoreTurni } from '../turni';

/**
 * Il mese intero su un foglio solo: i giorni in riga, le persone in
 * colonna, nello stesso ordine in cui stanno nella settimana a schermo.
 * Serve alla stampa del mese; a schermo non compare mai.
 */
export default function TabellaMeseStampa({
  mese,
  persone,
  settimane,
  mansioniSettimane,
  ferie,
  aperture
}) {
  const giorni = giorniDelMese(mese);
  const leggiTurno = creaLettoreTurni(settimane);
  const leggiMansione = creaLettoreMansioni(mansioniSettimane);

  /**
   * I giorni che una persona lavora davvero nel mese: fuori dalle
   * chiusure, fuori dalle sue ferie e con un turno di lavoro.
   */
  const giorniLavorati = (dip) =>
    giorni.filter(data =>
      !eChiusoIlGiorno(aperture, chiaveGiorno(data)) &&
      !(ferie[dip.id] || []).includes(data) &&
      eLavorativo(leggiTurno(dip.id, data))
    ).length;

  // una volta sola: servono sia in fondo a ogni colonna sia sommati
  const lavoratiPerPersona = persone.map(giorniLavorati);
  const totaleLocale = lavoratiPerPersona.reduce((somma, n) => somma + n, 0);

  return (
    <table className="tabella tabella-mese">
      {/* sul foglio la riga delle mansioni non si scrive: ruba spazio
          e i nomi bastano */}
      <thead>
        <tr>
          <th className="col-giorno">Giorno</th>
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

      {/* in fondo al mese: quanti giorni ha lavorato ognuno, e sotto
          quanti ne ha lavorati la pizzeria in tutto */}
      <tfoot>
        <tr className="riga-totali">
          <th scope="row" className="col-giorno">Totale</th>
          {persone.map((dip, i) => (
            <td key={dip.id}>{lavoratiPerPersona[i]}</td>
          ))}
        </tr>

        <tr className="riga-totale-locale">
          <th scope="row" className="col-giorno">Totale locale</th>
          <td colSpan={persone.length}>{totaleLocale} giorni lavorati in tutto</td>
        </tr>
      </tfoot>
    </table>
  );
}
