import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Chiede cosa mandare in stampa: la sola settimana mostrata oppure
 * tutte le settimane compilate del mese, una per foglio.
 */
export default function ScegliStampa({
  settimana,
  mese,
  settimaneCompilate,
  onSettimana,
  onMese,
  onAnnulla
}) {
  useEffect(() => {
    const suTasto = (e) => {
      if (e.key === 'Escape') onAnnulla();
    };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [onAnnulla]);

  const niente = settimaneCompilate === 0;

  return createPortal(
    <>
      <div className="modale-overlay" onClick={onAnnulla} />
      <div className="modale" role="dialog" aria-modal="true" aria-label="Cosa vuoi stampare">
        <div className="modale-testa">
          <span className="modale-icona" aria-hidden="true">🖨️</span>
          <h2>Cosa vuoi stampare?</h2>
        </div>

        <div className="modale-corpo">
          <div className="scelte-stampa">
            <button className="scelta-stampa" onClick={onSettimana} autoFocus>
              <span className="scelta-icona" aria-hidden="true">📅</span>
              <span className="scelta-testo">
                <strong>Solo questa settimana</strong>
                <span>{settimana}</span>
              </span>
            </button>

            <button className="scelta-stampa" onClick={onMese} disabled={niente}>
              <span className="scelta-icona" aria-hidden="true">🗓️</span>
              <span className="scelta-testo">
                <strong>Tutto il mese di {mese}</strong>
                <span>
                  {niente
                    ? 'Nessuna settimana di questo mese ha turni scritti'
                    : `${settimaneCompilate} ${settimaneCompilate === 1 ? 'settimana' : 'settimane'} con i turni scritti, un foglio ciascuna`}
                </span>
              </span>
            </button>
          </div>

          <p className="nota-scelta">
            Le settimane ancora da compilare non vengono stampate.
          </p>
        </div>

        <div className="modale-azioni">
          <button className="btn btn-secondario" onClick={onAnnulla}>Annulla</button>
        </div>
      </div>
    </>,
    document.body
  );
}
