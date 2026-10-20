import React from 'react';
import {
  GIORNI,
  GIORNI_LABEL,
  GIORNI_SIGLA,
  classeReparto,
  stileMansione
} from '../costanti';
import { minimoDi, serviziDelGiorno } from '../turni';

/**
 * Quante persone servono come minimo, mansione per mansione e giorno
 * per giorno. Zero vuol dire "nessun minimo": è il valore di partenza,
 * così chi non usa questa cosa non se ne accorge nemmeno.
 */
const SERVIZI = [
  { nome: 'pranzo', lettera: 'P' },
  { nome: 'cena', lettera: 'C' }
];

export default function MinimiDrawer({ mansioni, minimi, aperture, quantiNellaMansione, cambiaMinimo, chiudi }) {
  // Se in settimana c'è anche un solo giorno aperto a pranzo e a cena,
  // tutti i giorni mostrano le due righe P e C: dove il servizio non c'è
  // resta una casella spenta, così le caselle restano tutte uguali e
  // incolonnate. Se non si apre mai a pranzo, una casella per giorno.
  const settimanaDoppia = GIORNI.some(g => serviziDelGiorno(aperture, g).length > 1);

  return (
    <>
      <div className="drawer-overlay" onClick={chiudi} />
      <div className="drawer">
        <div className="drawer-handle" />
        <div className="drawer-body">
          <div className="drawer-head">
            <h2>Personale minimo</h2>
            <button className="icon-btn" onClick={chiudi} title="Chiudi">✕</button>
          </div>
          <p className="drawer-sub">
            Quante persone servono per ogni mansione, giorno per giorno. Se nei turni
            della settimana non ci arrivi, te lo faccio notare quando cambi pagina.
            Lascia zero dove non serve un minimo.
            {' '}Nei giorni aperti a pranzo e a cena i minimi sono due: <strong>P</strong> per
            il pranzo e <strong>C</strong> per la cena.
          </p>

          <div className="elenco-minimi">
            {mansioni.map(mansione => (
              <div key={mansione} className="blocco-minimi">
                <div className="minimi-testa">
                  <span className={`pill-reparto ${classeReparto(mansione)}`} style={stileMansione(mansione)}>
                    {mansione}
                  </span>
                  <span className="minimi-quanti">
                    {quantiNellaMansione(mansione)} in organico
                  </span>
                </div>

                <div className="griglia-minimi">
                  {GIORNI.map((giorno, i) => {
                    const servizi = serviziDelGiorno(aperture, giorno);

                    // la settimana senza pranzi resta com'era: una casella
                    if (!settimanaDoppia) {
                      return (
                        <label key={giorno} className={`minimo-giorno ${servizi.length === 0 ? 'chiuso' : ''}`}>
                          <span className="minimo-sigla">{GIORNI_SIGLA[i]}</span>
                          {servizi.length === 0 ? (
                            <span className="minimo-chiuso" title={`${GIORNI_LABEL[i]}: pizzeria chiusa`}>—</span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="99"
                              inputMode="numeric"
                              value={minimoDi(minimi, mansione, giorno, 'cena')}
                              onChange={(e) => cambiaMinimo(mansione, giorno, 'cena', e.target.value)}
                              aria-label={`${mansione}, ${GIORNI_LABEL[i]}`}
                            />
                          )}
                        </label>
                      );
                    }

                    return (
                      <div key={giorno} className={`minimo-giorno doppio ${servizi.length === 0 ? 'chiuso' : ''}`}>
                        <span className="minimo-sigla">{GIORNI_SIGLA[i]}</span>

                        {SERVIZI.map(({ nome, lettera }) => (
                          <label key={nome} className="minimo-campo">
                            <span className="minimo-servizio" aria-hidden="true">{lettera}</span>

                            {servizi.includes(nome) ? (
                              <input
                                type="number"
                                min="0"
                                max="99"
                                inputMode="numeric"
                                value={minimoDi(minimi, mansione, giorno, nome)}
                                onChange={(e) => cambiaMinimo(mansione, giorno, nome, e.target.value)}
                                aria-label={`${mansione}, ${GIORNI_LABEL[i]}, ${nome}`}
                              />
                            ) : (
                              <span
                                className="minimo-spento"
                                title={servizi.length === 0
                                  ? `${GIORNI_LABEL[i]}: pizzeria chiusa`
                                  : `${GIORNI_LABEL[i]}: a ${nome} non si apre`}
                              >
                                —
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primario btn-blocco" onClick={chiudi}>Fatto</button>
        </div>
      </div>
    </>
  );
}
