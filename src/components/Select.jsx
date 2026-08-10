import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ALTEZZA_OPZIONE = 40;

/**
 * Menu a tendina personalizzato.
 * La lista viene montata in fondo al body così non viene tagliata
 * dai contenitori che scorrono (le tabelle).
 */
export default function Select({ valore, opzioni, onChange, classe = '', etichettaAria }) {
  const [aperto, setAperto] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);
  const [pos, setPos] = useState(null);

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const indiceCorrente = Math.max(0, opzioni.findIndex(o => o.valore === valore));
  const corrente = opzioni[indiceCorrente] || opzioni[0];

  const calcolaPosizione = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    // se il pulsante esce dallo schermo chiudo invece di lasciare la lista sospesa
    if (r.bottom < 0 || r.top > window.innerHeight) {
      setAperto(false);
      return;
    }

    const altezzaLista = Math.min(opzioni.length * ALTEZZA_OPZIONE + 10, 260);
    const spazioSotto = window.innerHeight - r.bottom;
    const versoAlto = spazioSotto < altezzaLista + 12 && r.top > spazioSotto;
    const larghezza = Math.max(r.width, 150);
    const left = Math.min(r.left, window.innerWidth - larghezza - 8);

    setPos({
      left: Math.max(8, left),
      larghezza,
      top: versoAlto ? null : r.bottom + 6,
      bottom: versoAlto ? window.innerHeight - r.top + 6 : null
    });
  }, [opzioni.length]);

  useLayoutEffect(() => {
    if (aperto) calcolaPosizione();
  }, [aperto, calcolaPosizione]);

  useEffect(() => {
    if (!aperto) return;

    const suClickFuori = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (popupRef.current?.contains(e.target)) return;
      setAperto(false);
    };
    const suScroll = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      calcolaPosizione();
    };

    document.addEventListener('pointerdown', suClickFuori);
    window.addEventListener('scroll', suScroll, true);
    window.addEventListener('resize', calcolaPosizione);
    return () => {
      document.removeEventListener('pointerdown', suClickFuori);
      window.removeEventListener('scroll', suScroll, true);
      window.removeEventListener('resize', calcolaPosizione);
    };
  }, [aperto, calcolaPosizione]);

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
        <span className="select-valore">{corrente?.etichetta}</span>
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
          style={{
            left: pos.left,
            width: pos.larghezza,
            ...(pos.top !== null ? { top: pos.top } : { bottom: pos.bottom })
          }}
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
