import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import usePosizionePopup, { stilePopup } from '../usePosizionePopup';
import { GIORNI } from '../costanti';
import { aData, aIso, eChiuso } from '../date';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const SIGLE = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

const indiceSettimana = (data) => (data.getDay() + 6) % 7;

const formatta = (iso) =>
  aData(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

export default function DatePicker({
  valore,
  onChange,
  min,
  max,
  giorniChiusura = [],
  ferieEsistenti = [],
  inizioIntervallo = null,
  placeholder = 'Scegli una data',
  etichettaAria
}) {
  const [aperto, setAperto] = useState(false);
  const [vista, setVista] = useState(() => {
    const base = valore ? aData(valore) : new Date();
    return { anno: base.getFullYear(), mese: base.getMonth() };
  });

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // identità stabile: il calcolo della posizione dipende da questa funzione
  const chiudi = useCallback(() => setAperto(false), []);

  const pos = usePosizionePopup({
    aperto,
    ancoraRef: triggerRef,
    popupRef,
    altezzaStimata: 340,
    larghezzaDesiderata: 296,
    chiudi
  });

  // All'apertura mostra il mese della data scelta
  useEffect(() => {
    if (!aperto) return;
    const base = valore ? aData(valore) : new Date();
    setVista({ anno: base.getFullYear(), mese: base.getMonth() });
    popupRef.current?.focus();
  }, [aperto, valore]);

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

  const cambiaMese = (delta) => {
    setVista(v => {
      const d = new Date(v.anno, v.mese + delta, 1);
      return { anno: d.getFullYear(), mese: d.getMonth() };
    });
  };

  const scegli = (iso) => {
    onChange(iso);
    setAperto(false);
    triggerRef.current?.focus();
  };

  const suTasto = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setAperto(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cambiaMese(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      cambiaMese(1);
    }
  };

  // Celle del mese, allineate da lunedì
  const primo = new Date(vista.anno, vista.mese, 1);
  const giorniNelMese = new Date(vista.anno, vista.mese + 1, 0).getDate();
  const celle = [];
  for (let i = 0; i < indiceSettimana(primo); i++) celle.push(null);
  for (let g = 1; g <= giorniNelMese; g++) celle.push(aIso(new Date(vista.anno, vista.mese, g)));

  const isoOggi = aIso(new Date());

  const fuoriLimiti = (iso) => (min && iso < min) || (max && iso > max);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`datepicker-trigger ${aperto ? 'aperto' : ''} ${valore ? '' : 'vuoto'}`}
        onClick={() => setAperto(!aperto)}
        aria-haspopup="dialog"
        aria-expanded={aperto}
        aria-label={etichettaAria}
      >
        <span className="datepicker-icona" aria-hidden="true">🗓️</span>
        <span className="datepicker-valore">{valore ? formatta(valore) : placeholder}</span>
        {valore && (
          <span
            className="datepicker-pulisci"
            role="button"
            tabIndex={-1}
            title="Cancella"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            ✕
          </span>
        )}
      </button>

      {aperto && pos && createPortal(
        <div
          ref={popupRef}
          className="datepicker-popup"
          role="dialog"
          aria-label="Scegli una data"
          tabIndex={-1}
          onKeyDown={suTasto}
          style={stilePopup(pos)}
        >
          <div className="datepicker-testa">
            <button type="button" className="icon-btn" onClick={() => cambiaMese(-1)} title="Mese precedente">‹</button>
            <span className="datepicker-mese">{MESI[vista.mese]} {vista.anno}</span>
            <button type="button" className="icon-btn" onClick={() => cambiaMese(1)} title="Mese successivo">›</button>
          </div>

          <div className="datepicker-sigle">
            {SIGLE.map((s, i) => (
              <span key={i} className={giorniChiusura.includes(GIORNI[i]) ? 'chiusa' : ''}>{s}</span>
            ))}
          </div>

          <div className="datepicker-griglia">
            {celle.map((iso, i) => {
              if (!iso) return <span key={`v${i}`} className="dp-giorno vuoto" />;

              const disabilitata = fuoriLimiti(iso);
              const chiusa = eChiuso(iso, giorniChiusura);
              const nelIntervallo =
                inizioIntervallo && valore && iso > inizioIntervallo && iso < valore;
              const classi = [
                'dp-giorno',
                iso === valore ? 'scelta' : '',
                iso === isoOggi ? 'oggi' : '',
                iso === inizioIntervallo ? 'estremo' : '',
                nelIntervallo ? 'intervallo' : '',
                chiusa ? 'chiusa' : '',
                ferieEsistenti.includes(iso) ? 'gia-ferie' : '',
                disabilitata ? 'disabilitata' : ''
              ].filter(Boolean).join(' ');

              return (
                <button
                  type="button"
                  key={iso}
                  className={classi}
                  disabled={disabilitata}
                  onClick={() => scegli(iso)}
                  aria-current={iso === isoOggi ? 'date' : undefined}
                >
                  {aData(iso).getDate()}
                </button>
              );
            })}
          </div>

          <div className="datepicker-piede">
            <button
              type="button"
              className="datepicker-azione"
              onClick={() => {
                if (!fuoriLimiti(isoOggi)) scegli(isoOggi);
              }}
              disabled={fuoriLimiti(isoOggi)}
            >
              Oggi
            </button>
            <button type="button" className="datepicker-azione" onClick={() => scegli('')}>
              Cancella
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
