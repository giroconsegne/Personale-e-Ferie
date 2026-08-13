import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import Conferma from './Conferma';
import ScegliStampa from './ScegliStampa';
import TabellaStampa from './TabellaStampa';
import {
  APERTURE,
  GIORNI_SIGLA,
  REPARTI,
  TURNI,
  aperturaDi,
  classeTurno,
  eLavorativo,
  etichettaTurno,
  repartoDi,
  slugReparto,
  turniDelGiorno
} from '../costanti';
import {
  dataBreve,
  etichettaMese,
  etichettaSettimana,
  giorniDellaSettimana,
  lunediDiOggi,
  settimaneDelMese,
  spostaSettimana
} from '../date';
import { settimanaPropria, turniDellaSettimana, turnoDelGiorno } from '../turni';

const comeOpzione = (t) => ({
  valore: t.valore,
  etichetta: t.etichetta,
  breve: t.breve,
  classe: t.classe
});

// Riposo e "non previsto" si possono sempre scegliere
const SENZA_LAVORO = TURNI.filter(t => !eLavorativo(t.valore)).map(comeOpzione);

export default function TurniSection({
  dipendenti,
  settimane,
  setSettimane,
  ferie,
  giorni,
  giorniLabel,
  giorniChiusura,
  aperture,
  nomeLocale,
  turniDisponibili,
  avvisa
}) {
  /**
   * I turni scegliibili in un certo giorno: quelli previsti in questa
   * pizzeria, ristretti all'orario di apertura (nei giorni di sola cena
   * il pranzo non si può scegliere), più riposo e "non previsto".
   */
  const opzioniDelGiorno = (giorno) => [
    ...turniDelGiorno(turniDisponibili, aperture, giorno)
      .map(v => comeOpzione(TURNI.find(t => t.valore === v))),
    ...SENZA_LAVORO
  ];

  const [lunedi, setLunedi] = useState(lunediDiOggi);
  const [daSovrascrivere, setDaSovrascrivere] = useState(null);
  const [daConfermare, setDaConfermare] = useState(null);
  // null = niente stampa in corso; 'settimana' o 'mese' = cosa mandare sul foglio
  const [scegliStampa, setScegliStampa] = useState(false);
  const [stampa, setStampa] = useState(null);

  const dateSettimana = giorniDellaSettimana(lunedi);
  const propria = settimanaPropria(settimane, lunedi);
  const settimanaDiOggi = lunedi === lunediDiOggi();

  // I turni scritti per la settimana mostrata, persona per persona
  const turniDi = (dipId) => turniDellaSettimana(settimane, dipId, lunedi);

  const applicaTurno = (dipId, giorno, valore) => {
    setSettimane({
      ...settimane,
      [lunedi]: {
        ...(settimane[lunedi] || {}),
        // si parte dai turni che la settimana sta già mostrando, così
        // cambiare una casella non azzera tutte le altre
        [dipId]: { ...turniDi(dipId), [giorno]: valore }
      }
    });
  };

  /** Chi altro, nella stessa mansione, quel giorno non lavora. */
  const altriFermi = (dipId, giorno) => {
    const dip = dipendenti.find(d => d.id === dipId);
    if (!dip) return [];

    const data = dateSettimana[giorni.indexOf(giorno)];
    const mansione = repartoDi(dip);

    return dipendenti
      .filter(d => d.id !== dipId && repartoDi(d) === mansione)
      .map(d => {
        if ((ferie[d.id] || []).includes(data)) return { dip: d, motivo: 'in ferie' };
        const turno = turnoDelGiorno(turniDi(d.id), giorno);
        if (turno === 'Riposo') return { dip: d, motivo: 'a riposo' };
        if (!eLavorativo(turno)) return { dip: d, motivo: 'senza turno' };
        return null;
      })
      .filter(Boolean);
  };

  // Mettere a riposo qualcuno quando un collega della stessa mansione
  // è già fermo lascia scoperto il posto: va confermato a parte.
  const cambiaTurno = (dipId, giorno, valore) => {
    if (!eLavorativo(valore)) {
      const fermi = altriFermi(dipId, giorno);
      if (fermi.length > 0) {
        setDaConfermare({ dipId, giorno, valore, fermi });
        return;
      }
    }
    applicaTurno(dipId, giorno, valore);
  };

  const scriviSettimana = (destinazione) => {
    const copia = {};
    dipendenti.forEach(dip => {
      copia[dip.id] = { ...turniDi(dip.id) };
    });

    setSettimane({ ...settimane, [destinazione]: copia });
    setLunedi(destinazione);
    avvisa?.(`Turni copiati sulla settimana ${etichettaSettimana(destinazione)}`);
  };

  const copiaSullaProssima = () => {
    const prossima = spostaSettimana(lunedi, 1);
    if (settimanaPropria(settimane, prossima)) setDaSovrascrivere(prossima);
    else scriviSettimana(prossima);
  };

  /** Il testo da mandare al collaboratore su WhatsApp. */
  const testoTurni = (dip) => {
    const suoiTurni = turniDi(dip.id);
    const sueFerie = ferie[dip.id] || [];

    const righe = dateSettimana.map((data, i) => {
      let valore;
      if (giorniChiusura.includes(giorni[i])) valore = 'Chiuso';
      else if (sueFerie.includes(data)) valore = 'Ferie';
      else valore = etichettaTurno(turnoDelGiorno(suoiTurni, giorni[i]));
      return `${GIORNI_SIGLA[i]} ${dataBreve(data)} — ${valore}`;
    });

    return [
      `Ciao ${dip.nome.split(' ')[0]}, i tuoi turni:`,
      `Settimana ${etichettaSettimana(lunedi)}`,
      '',
      ...righe
    ].join('\n');
  };

  const invia = async (dip) => {
    const testo = testoTurni(dip);

    if (navigator.share) {
      try {
        await navigator.share({ text: testo });
        return;
      } catch {
        return; // condivisione annullata
      }
    }

    try {
      await navigator.clipboard.writeText(testo);
      avvisa?.(`Turni di ${dip.nome} copiati: incollali dove preferisci`);
    } catch {
      avvisa?.('Non riesco a copiare il testo su questo dispositivo');
    }
  };

  // Una sezione di tabella per mansione, saltando quelle senza personale
  const gruppi = REPARTI
    .map(reparto => ({
      reparto,
      membri: dipendenti.filter(d => repartoDi(d) === reparto)
    }))
    .filter(g => g.membri.length > 0);

  /* ---------- stampa ---------- */

  // Il mese è quello in cui cade il lunedì della settimana mostrata.
  // Le settimane ancora vuote resterebbero fogli di soli trattini: fuori.
  const settimaneStampabili = settimaneDelMese(lunedi)
    .filter(lun => settimanaPropria(settimane, lun));

  /**
   * Qui il foglio scelto è già nella pagina: useEffect gira a schermo
   * aggiornato, quindi si può stampare senza aspettare.
   * La classe sul body serve al CSS di stampa, che deve cambiare i
   * margini della pagina da fuori della card.
   */
  // tenuto in un riferimento: se finisse tra le dipendenze dell'effetto
  // la stampa ripartirebbe a ogni ridisegno
  const avvisaRef = useRef(avvisa);
  avvisaRef.current = avvisa;

  useEffect(() => {
    if (!stampa) return;

    const classe = `stampa-${stampa.cosa}`;
    document.body.classList.add(classe);

    // la finestra di stampa blocca la pagina, ma dove non lo fa
    // ci pensa "afterprint" a rimettere le cose a posto
    const finito = () => setStampa(null);
    window.addEventListener('afterprint', finito);

    try {
      window.print();
    } catch {
      avvisaRef.current?.('Non riesco ad aprire la stampa su questo dispositivo');
    }
    setStampa(null);

    return () => {
      window.removeEventListener('afterprint', finito);
      document.body.classList.remove(classe);
    };
  }, [stampa]);

  // il contatore rende ogni richiesta diversa dalla precedente: stampare
  // due volte di fila la stessa cosa deve funzionare lo stesso
  const avviaStampa = (cosa) => {
    setScegliStampa(false);
    setStampa(precedente => ({ cosa, n: (precedente?.n || 0) + 1 }));
  };

  return (
    <section className="card sezione-turni">
      <div className="card-head">
        <div>
          <h2>Turni settimanali</h2>
          <p className="card-sub">
            {propria
              ? 'Turni impostati per questa settimana'
              : 'Settimana ancora da compilare: le caselle partono da «non previsto»'}
          </p>
        </div>

        <div className="navigazione-mese">
          <button className="icon-btn" onClick={() => setLunedi(spostaSettimana(lunedi, -1))} title="Settimana precedente">‹</button>
          <span className="mese-corrente">{etichettaSettimana(lunedi)}</span>
          <button className="icon-btn" onClick={() => setLunedi(spostaSettimana(lunedi, 1))} title="Settimana successiva">›</button>
          {!settimanaDiOggi && (
            <button className="btn btn-secondario btn-oggi" onClick={() => setLunedi(lunediDiOggi())}>
              Oggi
            </button>
          )}
        </div>
      </div>

      {/* Intestazione che compare solo sul foglio stampato */}
      <div className="intestazione-stampa">
        <h1>{nomeLocale}</h1>
        <p>Turni della settimana {etichettaSettimana(lunedi)}</p>
      </div>

      {dipendenti.length === 0 ? (
        <div className="vuoto">
          <div className="vuoto-icona">📋</div>
          <p className="vuoto-titolo">Nessun dipendente</p>
          <p className="vuoto-testo">Aggiungine uno da Impostazioni per costruire la settimana.</p>
        </div>
      ) : (
        <>
          <div className="barra-turni">
            <div className="legenda">
              {/* "non previsto" non è un turno: nella legenda non ci sta */}
              {TURNI.filter(t => t.valore && turniDisponibili.includes(t.valore)).map(t => (
                <span key={t.valore} className={`legenda-voce ${t.classe}`}>
                  <i className="punto" />
                  {t.etichetta}
                </span>
              ))}
            </div>

            <div className="azioni-turni">
              <button className="btn btn-secondario" onClick={copiaSullaProssima}>
                <span aria-hidden="true">📋</span> Copia sulla prossima
              </button>
              <button className="btn btn-secondario" onClick={() => setScegliStampa(true)}>
                <span aria-hidden="true">🖨️</span> Stampa / PDF
              </button>
            </div>
          </div>

          <ScrollArea>
            <table className="tabella tabella-turni">
              <thead>
                <tr>
                  <th className="col-nome">Dipendente</th>
                  {giorniLabel.map((label, idx) => {
                    const apertura = aperturaDi(aperture, giorni[idx]);
                    const chiuso = apertura === 'chiuso';
                    // "pranzo e cena" è la normalità: si segnala solo il resto
                    const daSegnalare = apertura !== 'entrambi';

                    return (
                      <th key={giorni[idx]} className={chiuso ? 'chiuso' : ''}>
                        <span className="giorno-nome">{label}</span>
                        <span className="giorno-data">{dataBreve(dateSettimana[idx])}</span>
                        {daSegnalare && (
                          <span className={`badge-chiuso ${chiuso ? '' : 'badge-orario'}`}>
                            {APERTURE.find(a => a.valore === apertura)?.breve}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {gruppi.map(({ reparto, membri }) => (
                <tbody key={reparto}>
                  <tr className="riga-gruppo">
                    <th scope="rowgroup" className="col-nome">
                      <span className={`pill-reparto rep-${slugReparto(reparto)}`}>{reparto}</span>
                    </th>
                    <td colSpan={giorni.length} className="cella-gruppo">
                      {membri.length} {membri.length === 1 ? 'persona' : 'persone'}
                    </td>
                  </tr>

                  {membri.map(dip => {
                    const suoiTurni = turniDi(dip.id);
                    const sueFerie = ferie[dip.id] || [];

                    return (
                      <tr key={dip.id}>
                        <td className="col-nome">
                          <div className="persona">
                            <Avatar nome={dip.nome} />
                            <span className="persona-nome">{dip.nome}</span>
                            <button
                              className="icon-btn btn-invia"
                              onClick={() => invia(dip)}
                              title={`Invia i turni a ${dip.nome}`}
                              aria-label={`Invia i turni a ${dip.nome}`}
                            >
                              ➤
                            </button>
                          </div>
                        </td>

                        {giorni.map((giorno, idx) => {
                          const chiuso = giorniChiusura.includes(giorno);
                          const inFerie = sueFerie.includes(dateSettimana[idx]);
                          const valore = turnoDelGiorno(suoiTurni, giorno);

                          // chiusura e ferie non si toccano: niente turno da scegliere
                          return (
                            <td key={giorno} className={chiuso ? 'chiuso' : inFerie ? 'in-ferie' : ''}>
                              {chiuso ? (
                                <span className="turno-chiuso">—</span>
                              ) : inFerie ? (
                                <span className="turno-ferie" title={`${dip.nome} è in ferie`}>
                                  <span aria-hidden="true">🏖️</span> Ferie
                                </span>
                              ) : (
                                <Select
                                  valore={valore}
                                  opzioni={opzioniDelGiorno(giorno)}
                                  onChange={(v) => cambiaTurno(dip.id, giorno, v)}
                                  classe={`pillola ${classeTurno(valore)}`}
                                  etichettaAria={`Turno di ${dip.nome}`}
                                  etichettaFuoriElenco={etichettaTurno(valore)}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </ScrollArea>
        </>
      )}

      {/* Il mese: esiste nella pagina solo il tempo di stamparlo,
          una settimana per foglio. A schermo non si vede mai. */}
      {stampa?.cosa === 'mese' && (
        <div className="foglio-mese">
          {settimaneStampabili.map(lun => (
            <div className="foglio-settimana" key={lun}>
              <div className="intestazione-stampa">
                <h1>{nomeLocale}</h1>
                <p>Turni della settimana {etichettaSettimana(lun)}</p>
              </div>

              <TabellaStampa
                lunedi={lun}
                gruppi={gruppi}
                settimane={settimane}
                ferie={ferie}
                giorni={giorni}
                giorniLabel={giorniLabel}
                giorniChiusura={giorniChiusura}
                aperture={aperture}
              />
            </div>
          ))}
        </div>
      )}

      {scegliStampa && (
        <ScegliStampa
          settimana={etichettaSettimana(lunedi)}
          mese={etichettaMese(lunedi)}
          settimaneCompilate={settimaneStampabili.length}
          onSettimana={() => avviaStampa('settimana')}
          onMese={() => avviaStampa('mese')}
          onAnnulla={() => setScegliStampa(false)}
        />
      )}

      {daConfermare && (() => {
        const dip = dipendenti.find(d => d.id === daConfermare.dipId);
        const idx = giorni.indexOf(daConfermare.giorno);
        const parola = daConfermare.valore === 'Riposo' ? 'a riposo' : 'senza turno';

        return (
          <Conferma
            titolo={`Due persone della stessa mansione ${parola}`}
            tono="pericolo"
            conferma="Sì, mettilo lo stesso"
            annulla="No, annulla"
            onAnnulla={() => setDaConfermare(null)}
            onConferma={() => {
              applicaTurno(daConfermare.dipId, daConfermare.giorno, daConfermare.valore);
              setDaConfermare(null);
            }}
          >
            <p>
              {giorniLabel[idx]} {dataBreve(dateSettimana[idx])} {dip?.nome} resterebbe {parola}
              {' '}insieme a chi fa la stessa mansione ({repartoDi(dip)}):
            </p>
            <ul className="elenco-conflitti">
              {daConfermare.fermi.map(({ dip: collega, motivo }) => (
                <li key={collega.id}>
                  <strong>{collega.nome}</strong> — {motivo}
                </li>
              ))}
            </ul>
            <p>Sei sicuro?</p>
          </Conferma>
        );
      })()}

      {daSovrascrivere && (
        <Conferma
          titolo="La settimana successiva ha già i suoi turni"
          conferma="Sovrascrivi"
          onAnnulla={() => setDaSovrascrivere(null)}
          onConferma={() => {
            scriviSettimana(daSovrascrivere);
            setDaSovrascrivere(null);
          }}
        >
          <p>
            Sulla settimana {etichettaSettimana(daSovrascrivere)} sono già stati scritti dei turni.
            Copiando quelli di questa settimana andranno persi.
          </p>
        </Conferma>
      )}
    </section>
  );
}
