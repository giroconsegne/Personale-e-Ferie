import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import usePosizionePopup, { stilePopup } from '../usePosizionePopup';

const ALTEZZA_OPZIONE = 40;

/**
 * Menu a tendina personalizzato.
 * La lista viene montata in fondo al body così non viene tagliata
 * dai contenitori che scorrono (le tabelle).
 */
export default function Select({
  valore,
  opzioni,
  onChange,
  classe = '',
  etichettaAria,
  etichettaFuoriElenco
}) {
  const [aperto, setAperto] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const trovato = opzioni.findIndex(o => o.valore === valore);
  const indiceCorrente = Math.max(0, trovato);

  // un valore non più in elenco (turno tolto da questa pizzeria) va
  // comunque mostrato per quello che è, non scambiato con il primo
  const corrente = trovato >= 0
    ? opzioni[trovato]
    : { valore, etichetta: etichettaFuoriElenco ?? '' };

  const soloChiudi = useCallback(() => setAperto(false), []);

  const pos = usePosizionePopup({
    aperto,
    ancoraRef: triggerRef,
    popupRef,
    altezzaStimata: Math.min(opzioni.length * ALTEZZA_OPZIONE + 10, 260),
    chiudi: soloChiudi
  });

  useEffect(() => {
    if (!aperto) return;

    const suClickFuori = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (popupRef.current?.contains(e.target)) return;
      setAperto(false);
    };

    document.addEventListener('pointerdown', suClickFuori);
    return () => document.removeEventListener('pointerdown', suClickFuori);
  }, [aperto]);

  useEffect(() => {
    if (aperto) popupRef.current?.focus();
  }, [aperto, pos]);

  const apri = () => {
    setEvidenziato(indiceCorrente);
    setAperto(true);
  };

  const chiudi = () => {
    setAperto(false);
    triggerRef.current?.focus();
  };

  const scegli = (opzione) => {
    onChange(opzione.valore);
    chiudi();
  };

  const suTastoTrigger = (e) => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      apri();
    }
  };

  const suTastoLista = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      chiudi();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setEvidenziato(i => (i + 1) % opzioni.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setEvidenziato(i => (i - 1 + opzioni.length) % opzioni.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setEvidenziato(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setEvidenziato(opzioni.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scegli(opzioni[evidenziato]);
    } else if (e.key === 'Tab') {
      setAperto(false);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`select-trigger ${classe} ${aperto ? 'aperto' : ''}`}
        onClick={() => (aperto ? chiudi() : apri())}
        onKeyDown={suTastoTrigger}
        aria-haspopup="listbox"
        aria-expanded={aperto}
        aria-label={etichettaAria}
      >
        {/* "breve" serve alle opzioni che nella casella devono restare discrete */}
        <span className="select-valore">{corrente?.breve ?? corrente?.etichetta}</span>
        <svg className="select-freccia" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aperto && pos && createPortal(
        <div
          ref={popupRef}
          className="select-popup"
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`opz-${evidenziato}`}
          onKeyDown={suTastoLista}
          style={stilePopup(pos)}
        >
          {opzioni.map((o, i) => (
            <div
              key={o.valore}
              id={`opz-${i}`}
              role="option"
              aria-selected={o.valore === valore}
              className={`select-opzione ${i === evidenziato ? 'evidenziata' : ''} ${o.valore === valore ? 'scelta' : ''}`}
              onMouseEnter={() => setEvidenziato(i)}
              onClick={() => scegli(o)}
            >
              {o.classe && <span className={`punto-opzione ${o.classe}`} />}
              <span className="select-opzione-testo">{o.etichetta}</span>
              {o.valore === valore && (
                <svg className="select-spunta" width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
                  <path d="M1 5l3.2 3.2L11 1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
