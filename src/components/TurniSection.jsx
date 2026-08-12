import React, { useState } from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import Conferma from './Conferma';
import {
  GIORNI_SIGLA,
  REPARTI,
  TURNI,
  classeTurno,
  etichettaTurno,
  repartoDi,
  slugReparto
} from '../costanti';
import {
  dataBreve,
  etichettaSettimana,
  giorniDellaSettimana,
  lunediDiOggi,
  spostaSettimana
} from '../date';
import { settimanaPropria, turniDellaSettimana, turnoDelGiorno } from '../turni';

const OPZIONI_TURNO = TURNI.map(t => ({
  valore: t.valore,
  etichetta: t.etichetta,
  breve: t.breve,
  classe: t.classe
}));

/**
 * Numero pronto per WhatsApp: solo cifre, con prefisso internazionale.
 * Se non è già scritto con +39 o 0039 si assume un numero italiano.
 */
function numeroWhatsApp(telefono) {
  const scritto = (telefono || '').trim();
  if (!scritto) return null;

  const cifre = scritto.replace(/\D/g, '');
  if (cifre.length < 6) return null;

  if (scritto.startsWith('+')) return cifre;
  if (cifre.startsWith('00')) return cifre.slice(2);
  if (cifre.startsWith('39') && cifre.length >= 12) return cifre;
  return `39${cifre}`;
}

export default function TurniSection({
  dipendenti,
  turni,
  settimane,
  setSettimane,
  ferie,
  giorni,
  giorniLabel,
  giorniChiusura,
  avvisa
}) {
  const [lunedi, setLunedi] = useState(lunediDiOggi);
  const [daSovrascrivere, setDaSovrascrivere] = useState(null);
  const [daRipristinare, setDaRipristinare] = useState(false);

  const dateSettimana = giorniDellaSettimana(lunedi);
  const propria = settimanaPropria(settimane, lunedi);
  const settimanaDiOggi = lunedi === lunediDiOggi();

  // I turni effettivi della settimana mostrata, persona per persona
  const turniDi = (dipId) => turniDellaSettimana(settimane, turni, dipId, lunedi);

  const cambiaTurno = (dipId, giorno, valore) => {
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

  // Toglie i turni propri della settimana: torna a seguire quella precedente
  const riprendiPrecedente = () => {
    const ripulite = { ...settimane };
    delete ripulite[lunedi];
    setSettimane(ripulite);
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
    const numero = numeroWhatsApp(dip.telefono);

    if (numero) {
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(testo)}`, '_blank', 'noopener');
      return;
    }

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

  return (
    <section className="card sezione-turni">
      <div className="card-head">
        <div>
          <h2>Turni settimanali</h2>
          <p className="card-sub">
            {propria
              ? 'Turni impostati per questa settimana'
              : 'Turni ripresi dalla settimana precedente: modificane uno per cambiarli solo qui'}
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
        <h1>Turni settimanali</h1>
        <p>Settimana {etichettaSettimana(lunedi)}</p>
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
              {TURNI.map(t => (
                <span key={t.valore || 'vuoto'} className={`legenda-voce ${t.classe}`}>
                  <i className="punto" />
                  {t.etichetta}
                </span>
              ))}
            </div>

            <div className="azioni-turni">
              {propria && (
                <button className="btn btn-fantasma" onClick={() => setDaRipristinare(true)} title="Cancella i turni scritti per questa settimana">
                  Riprendi la settimana precedente
                </button>
              )}
              <button className="btn btn-secondario" onClick={copiaSullaProssima}>
                <span aria-hidden="true">📋</span> Copia sulla prossima
              </button>
              <button className="btn btn-secondario" onClick={() => window.print()}>
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
                    const chiuso = giorniChiusura.includes(giorni[idx]);
                    return (
                      <th key={giorni[idx]} className={chiuso ? 'chiuso' : ''}>
                        <span className="giorno-nome">{label}</span>
                        <span className="giorno-data">{dataBreve(dateSettimana[idx])}</span>
                        {chiuso && <span className="badge-chiuso">Chiuso</span>}
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

                          return (
                            <td key={giorno} className={chiuso ? 'chiuso' : ''}>
                              {chiuso ? (
                                <span className="turno-chiuso">—</span>
                              ) : (
                                <>
                                  <Select
                                    valore={valore}
                                    opzioni={OPZIONI_TURNO}
                                    onChange={(v) => cambiaTurno(dip.id, giorno, v)}
                                    classe={`pillola ${classeTurno(valore)}`}
                                    etichettaAria={`Turno di ${dip.nome}`}
                                  />
                                  {inFerie && <span className="segno-ferie" title="In ferie">🏖️</span>}
                                </>
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

      {daRipristinare && (
        <Conferma
          titolo="Cancellare i turni di questa settimana?"
          tono="pericolo"
          conferma="Sì, cancellali"
          annulla="No, li tengo"
          onAnnulla={() => setDaRipristinare(false)}
          onConferma={() => {
            riprendiPrecedente();
            setDaRipristinare(false);
          }}
        >
          <p>
            I turni scritti per la settimana {etichettaSettimana(lunedi)} vengono eliminati e
            tornano quelli della settimana precedente.
          </p>
        </Conferma>
      )}

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
