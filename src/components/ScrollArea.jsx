import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Contenitore con scorrimento orizzontale: mostra una sfumatura sul bordo
 * destro finché c'è altro contenuto da vedere.
 *
 * `className` serve a chi vuole anche lo scorrimento verticale (i turni).
 */
export default function ScrollArea({ children, className = '' }) {
  const ref = useRef(null);
  const [altroADestra, setAltroADestra] = useState(false);

  const aggiorna = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAltroADestra(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    aggiorna();
    const osservatore = new ResizeObserver(aggiorna);
    osservatore.observe(el);
    if (el.firstElementChild) osservatore.observe(el.firstElementChild);
    return () => osservatore.disconnect();
  }, [aggiorna]);

  return (
    <div className={`scroll-area ${className} ${altroADestra ? 'altro-a-destra' : ''}`}>
      <div className="scroll-area-inner" ref={ref} onScroll={aggiorna}>
        {children}
      </div>
    </div>
  );
}
