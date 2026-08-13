import React from 'react';
import {
  GIORNI,
  GIORNI_LABEL,
  GIORNI_SIGLA,
  classeReparto,
  eChiusoIlGiorno,
  stileMansione
} from '../costanti';
import { minimoDi } from '../turni';

/**
 * Quante persone servono come minimo, mansione per mansione e giorno
 * per giorno. Zero vuol dire "nessun minimo": è il valore di partenza,
 * così chi non usa questa cosa non se ne accorge nemmeno.
 */
export default function MinimiDrawer({ mansioni, minimi, aperture, quantiNellaMansione, cambiaMinimo, chiudi }) {
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
                    const chiuso = eChiusoIlGiorno(aperture, giorno);
                    return (
                      <label key={giorno} className={`minimo-giorno ${chiuso ? 'chiuso' : ''}`}>
                        <span className="minimo-sigla">{GIORNI_SIGLA[i]}</span>
                        {chiuso ? (
                          <span className="minimo-chiuso" title={`${GIORNI_LABEL[i]}: pizzeria chiusa`}>—</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="99"
                            inputMode="numeric"
                            value={minimoDi(minimi, mansione, giorno)}
                            onChange={(e) => cambiaMinimo(mansione, giorno, e.target.value)}
                            aria-label={`${mansione}, ${GIORNI_LABEL[i]}`}
                          />
                        )}
                      </label>
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
