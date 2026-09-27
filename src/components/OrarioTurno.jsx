import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import usePosizionePopup, { stilePopup } from '../usePosizionePopup';
import { durataOrario, oreScritte, orarioValido } from '../turni';

const ALTEZZA_POPUP = 168;
const LARGHEZZA_POPUP = 214;

/**
 * L'orario di entrata e uscita di una casella.
 *
 * Sulla casella si vede solo la riga `18:30 – 23:30`; toccandola si apre
 * un pannellino con le due ore. Finché non si cambia niente vale l'orario
 * normale del turno, quello delle Impostazioni: `onChange(null)` ci
 * riporta lì, senza lasciare un orario uguale scritto a mano.
 */
export default function OrarioTurno({
  orario,
  predefinito,
  suMisura,
  classeTurno = '',
  // "spento" = quel giorno la persona non lavora: si vede l'orario che
  // avrebbe, in chiaro, e toccandolo la si rimette al lavoro
  spento = false,
  onAttiva,
  onChange,
  etichettaAria
}) {
  const [aperto, setAperto] = useState(false);
  const [bozza, setBozza] = useState(orario);

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const soloChiudi = useCallback(() => setAperto(false), []);

  const pos = usePosizionePopup({
    aperto,
    ancoraRef: triggerRef,
    popupRef,
    altezzaStimata: ALTEZZA_POPUP,
    larghezzaDesiderata: LARGHEZZA_POPUP,
    chiudi: soloChiudi
  });

  // riaperto dopo che l'orario è cambiato da fuori (turno diverso,
  // standard modificato): la bozza riparte da quello che c'è adesso
  useEffect(() => {
    if (aperto) setBozza(orario);
  }, [aperto, orario]);

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

  const chiudi = () => {
    setAperto(false);
    triggerRef.current?.focus();
  };

  /**
   * Si salva solo quando tutte e due le ore ci sono: mentre si scrive
   * un campo può restare a metà, e mezzo orario non vuol dire niente.
   */
  const scrivi = (campo, valore) => {
    const nuovo = { ...bozza, [campo]: valore };
    setBozza(nuovo);
    if (orarioValido(nuovo)) onChange(nuovo);
  };

  const tornaAlNormale = () => {
    onChange(null);
    setBozza(predefinito);
    chiudi();
  };

  const minuti = durataOrario(orario);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`orario-turno ${classeTurno} ${spento ? 'spento' : ''} ${suMisura ? 'su-misura' : ''} ${aperto ? 'aperto' : ''}`}
        onClick={() => {
          if (spento) return onAttiva?.();
          return aperto ? chiudi() : setAperto(true);
        }}
        aria-label={etichettaAria}
        aria-expanded={spento ? undefined : aperto}
        title={spento
          ? 'Tocca per metterlo al lavoro'
          : suMisura
            ? `Orario scritto a mano (${oreScritte(minuti)})`
            : `Orario normale del turno (${oreScritte(minuti)})`}
      >
        <span className="icona-orario" aria-hidden="true">🕒</span>
        {orario ? `${orario.inizio}–${orario.fine}` : 'orario'}
      </button>

      {aperto && !spento && pos && createPortal(
        <div
          ref={popupRef}
          className="popup-orario"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); chiudi(); } }}
          style={stilePopup(pos)}
        >
          <label className="campo-orario">
            <span>Entra</span>
            <input
              type="time"
              value={bozza?.inizio || ''}
              onChange={(e) => scrivi('inizio', e.target.value)}
            />
          </label>

          <label className="campo-orario">
            <span>Esce</span>
            <input
              type="time"
              value={bozza?.fine || ''}
              onChange={(e) => scrivi('fine', e.target.value)}
            />
          </label>

          <p className="durata-orario">
            {orarioValido(bozza)
              ? <>In tutto <strong>{oreScritte(durataOrario(bozza))}</strong></>
              : 'Mancano le ore'}
          </p>

          {suMisura && (
            <button type="button" className="btn btn-secondario btn-torna-normale" onClick={tornaAlNormale}>
              Torna all'orario normale
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
