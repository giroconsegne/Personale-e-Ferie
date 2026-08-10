import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

/**
 * Posiziona un pannello agganciato a un elemento, montato sul body.
 * Si apre verso l'alto se sotto non c'è spazio e si richiude se
 * l'elemento di riferimento esce dallo schermo mentre si scorre.
 */
export default function usePosizionePopup({
  aperto,
  ancoraRef,
  popupRef,
  altezzaStimata,
  larghezzaDesiderata = null,
  chiudi
}) {
  const [pos, setPos] = useState(null);

  const calcola = useCallback(() => {
    const el = ancoraRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      chiudi();
      return;
    }

    const larghezza = larghezzaDesiderata ?? Math.max(r.width, 150);
    const spazioSotto = window.innerHeight - r.bottom;
    const versoAlto = spazioSotto < altezzaStimata + 12 && r.top > spazioSotto;
    const left = Math.min(r.left, window.innerWidth - larghezza - 8);

    const nuova = {
      left: Math.max(8, left),
      larghezza,
      top: versoAlto ? null : r.bottom + 6,
      bottom: versoAlto ? window.innerHeight - r.top + 6 : null
    };

    // aggiorna solo se cambia davvero: evita cicli di render
    setPos(precedente =>
      precedente &&
      precedente.left === nuova.left &&
      precedente.larghezza === nuova.larghezza &&
      precedente.top === nuova.top &&
      precedente.bottom === nuova.bottom
        ? precedente
        : nuova
    );
  }, [ancoraRef, altezzaStimata, larghezzaDesiderata, chiudi]);

  useLayoutEffect(() => {
    if (aperto) calcola();
  }, [aperto, calcola]);

  useEffect(() => {
    if (!aperto) return;

    const suScroll = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      calcola();
    };

    window.addEventListener('scroll', suScroll, true);
    window.addEventListener('resize', calcola);
    return () => {
      window.removeEventListener('scroll', suScroll, true);
      window.removeEventListener('resize', calcola);
    };
  }, [aperto, calcola, popupRef]);

  return pos;
}

// Stile inline da applicare al pannello
export const stilePopup = (pos) =>
  pos
    ? {
        left: pos.left,
        width: pos.larghezza,
        ...(pos.top !== null ? { top: pos.top } : { bottom: pos.bottom })
      }
    : {};
