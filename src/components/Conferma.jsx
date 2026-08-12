import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Finestrella di conferma per le scelte che non si possono annullare
 * con un clic (sovrascrivere una settimana, forzare ferie sovrapposte).
 */
export default function Conferma({
  titolo,
  icona = '⚠️',
  tono = 'avviso',
  conferma = 'Procedi',
  annulla = 'Annulla',
  onConferma,
  onAnnulla,
  children
}) {
  useEffect(() => {
    const suTasto = (e) => {
      if (e.key === 'Escape') onAnnulla();
    };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [onAnnulla]);

  return createPortal(
    <>
      <div className="modale-overlay" onClick={onAnnulla} />
      <div className={`modale modale-${tono}`} role="alertdialog" aria-modal="true" aria-label={titolo}>
        <div className="modale-testa">
          <span className="modale-icona" aria-hidden="true">{icona}</span>
          <h2>{titolo}</h2>
        </div>

        <div className="modale-corpo">{children}</div>

        <div className="modale-azioni">
          <button className="btn btn-secondario" onClick={onAnnulla} autoFocus>{annulla}</button>
          <button className={`btn ${tono === 'pericolo' ? 'btn-pericolo' : 'btn-primario'}`} onClick={onConferma}>
            {conferma}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
