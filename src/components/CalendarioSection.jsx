import React, { useMemo, useState } from 'react';
import Avatar from './Avatar';
import { GIORNI, repartoDi, slugReparto } from '../costanti';
import {
  aData,
  aIso,
  contaFerie,
  etichettaSettimana,
  giorniDellaSettimana,
  lunediDiOggi,
  spostaSettimana
} from '../date';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const SIGLE = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// Lunedì = 0
const indiceSettimana = (data) => (data.getDay() + 6) % 7;

export default function CalendarioSection({ dipendenti, ferie, giorniChiusura }) {
  const oggi = new Date();
  const [vista, setVista] = useState({ anno: oggi.getFullYear(), mese: oggi.getMonth() });
  const [lunedi, setLunedi] = useState(lunediDiOggi);
  const [aSettimana, setASettimana] = useState(false);

  // Chi è in ferie, giorno per giorno
  const feriePerGiorno = useMemo(() => {
    const mappa = {};
    dipendenti.forEach(dip => {
      (ferie[dip.id] || []).forEach(data => {
        if (!mappa[data]) mappa[data] = [];
        mappa[data].push(dip);
      });
    });
    return mappa;
  }, [dipendenti, ferie]);

  // Celle del mese, allineate da lunedì a domenica
  const celleMese = useMemo(() => {
    const primo = new Date(vista.anno, vista.mese, 1);
    const giorniNelMese = new Date(vista.anno, vista.mese + 1, 0).getDate();
    const vuotePrima = indiceSettimana(primo);

    const risultato = [];
    for (let i = 0; i < vuotePrima; i++) risultato.push(null);
    for (let g = 1; g <= giorniNelMese; g++) {
      risultato.push(aIso(new Date(vista.anno, vista.mese, g)));
    }
    while (risultato.length % 7 !== 0) risultato.push(null);
    return risultato;
  }, [vista]);

  const celle = aSettimana ? giorniDellaSettimana(lunedi) : celleMese;

  // aggiornamento funzionale: piu clic ravvicinati avanzano di un passo ciascuno
  const cambiaMese = (delta) => {
    setVista(v => {
      const d = new Date(v.anno, v.mese + delta, 1);
      return { anno: d.getFullYear(), mese: d.getMonth() };
    });
  };

  const scorri = (delta) => {
    if (aSettimana) setLunedi(l => spostaSettimana(l, delta));
    else cambiaMese(delta);
  };

  const vaiAOggi = () => {
    setVista({ anno: oggi.getFullYear(), mese: oggi.getMonth() });
    setLunedi(lunediDiOggi());
  };

  const isoOggi = aIso(oggi);

  const titolo = aSettimana
    ? etichettaSettimana(lunedi)
    : `${MESI[vista.mese]} ${vista.anno}`;

  // Riepilogo del periodo mostrato: quanti giorni di ferie per persona
  const riepilogo = useMemo(() => {
    const dentro = aSettimana
      ? (d) => giorniDellaSettimana(lunedi).includes(d)
      : (d) => d.startsWith(`${vista.anno}-${String(vista.mese + 1).padStart(2, '0')}`);

    return dipendenti
      .map(dip => ({
        dip,
        quanti: contaFerie((ferie[dip.id] || []).filter(dentro), giorniChiusura)
      }))
      .filter(r => r.quanti > 0)
      .sort((a, b) => b.quanti - a.quanti);
  }, [dipendenti, ferie, vista, lunedi, aSettimana, giorniChiusura]);

  const titoloRiepilogo = aSettimana
    ? 'Ferie della settimana'
    : `Ferie di ${MESI[vista.mese].toLowerCase()}`;

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Calendario</h2>
          <p className="card-sub">Chi è in ferie, giorno per giorno</p>
        </div>

        <div className="testa-calendario">
          <div className="segmenti segmenti-vista">
            <button
              type="button"
              className={`segmento ${aSettimana ? '' : 'attivo'}`}
              onClick={() => setASettimana(false)}
            >
              Mese
            </button>
            <button
              type="button"
              className={`segmento ${aSettimana ? 'attivo' : ''}`}
              onClick={() => setASettimana(true)}
            >
              Settimana
            </button>
          </div>

          <div className="navigazione-mese">
            <button className="icon-btn" onClick={() => scorri(-1)} title={aSettimana ? 'Settimana precedente' : 'Mese precedente'}>‹</button>
            <span className="mese-corrente">{titolo}</span>
            <button className="icon-btn" onClick={() => scorri(1)} title={aSettimana ? 'Settimana successiva' : 'Mese successivo'}>›</button>
            <button className="btn btn-secondario btn-oggi" onClick={vaiAOggi}>Oggi</button>
          </div>
        </div>
      </div>

      {dipendenti.length === 0 ? (
        <div className="vuoto">
          <div className="vuoto-icona">🗓️</div>
          <p className="vuoto-titolo">Nessun dipendente</p>
          <p className="vuoto-testo">Le ferie che inserisci compaiono qui nel calendario.</p>
        </div>
      ) : (
        <>
          <div className={`calendario ${aSettimana ? 'a-settimana' : ''}`}>
            <div className="calendario-intestazione">
              {SIGLE.map((s, i) => (
                <div key={s} className={giorniChiusura.includes(GIORNI[i]) ? 'sigla chiuso' : 'sigla'}>
                  {s}
                </div>
              ))}
            </div>

            <div className="calendario-griglia">
              {celle.map((iso, i) => {
                if (!iso) return <div key={`v${i}`} className="giorno fuori" />;

                const inFerie = feriePerGiorno[iso] || [];
                const chiuso = giorniChiusura.includes(GIORNI[i % 7]);
                // nella settimana c'è spazio: i nomi si vedono tutti
                const mostrati = aSettimana ? inFerie : inFerie.slice(0, 3);
                const classi = [
                  'giorno',
                  chiuso ? 'chiuso' : '',
                  iso === isoOggi ? 'oggi' : '',
                  inFerie.length ? 'con-ferie' : ''
                ].filter(Boolean).join(' ');

                return (
                  <div key={iso} className={classi}>
                    <div className="giorno-testa">
                      <span className="giorno-numero">{aData(iso).getDate()}</span>
                      {chiuso && <span className="giorno-chiuso">chiuso</span>}
                    </div>

                    {inFerie.length > 0 && (
                      <ul className="giorno-persone">
                        {mostrati.map(dip => (
                          <li
                            key={dip.id}
                            className={`persona-chip rep-${slugReparto(repartoDi(dip))}`}
                            title={`${dip.nome} — ${repartoDi(dip)}`}
                          >
                            <Avatar nome={dip.nome} size="sm" />
                            <span className="chip-nome">{dip.nome.split(' ')[0]}</span>
                          </li>
                        ))}
                        {inFerie.length > mostrati.length && (
                          <li className="persona-chip altri" title={inFerie.slice(mostrati.length).map(d => d.nome).join(', ')}>
                            +{inFerie.length - mostrati.length}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="riepilogo-mese">
            {riepilogo.length === 0 ? (
              <p className="dettaglio-vuoto">
                {aSettimana ? 'Nessuna ferie in questa settimana.' : `Nessuna ferie in ${MESI[vista.mese]}.`}
              </p>
            ) : (
              <>
                <h3>{titoloRiepilogo}</h3>
                <ul className="elenco-riepilogo">
                  {riepilogo.map(({ dip, quanti }) => (
                    <li key={dip.id}>
                      <Avatar nome={dip.nome} />
                      <span className="riepilogo-persona">{dip.nome}</span>
                      <span className={`pill-reparto rep-${slugReparto(repartoDi(dip))}`}>
                        {repartoDi(dip)}
                      </span>
                      <span className="ferie-quanti">
                        {quanti} {quanti === 1 ? 'giorno' : 'giorni'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
