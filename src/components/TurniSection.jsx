import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar';
import Select from './Select';
import ScrollArea from './ScrollArea';
import Conferma from './Conferma';
import ScegliStampa from './ScegliStampa';
import TabellaMeseStampa from './TabellaMeseStampa';
import {
  APERTURE,
  GIORNI_SIGLA,
  TURNI,
  aperturaDi,
  classeReparto,
  classeTurno,
  eLavorativo,
  etichettaTurno,
  repartoDi,
  stileMansione,
  turniDelGiorno
} from '../costanti';
import {
  dataBreve,
  etichettaMese,
  etichettaSettimana,
  giorniDelMese,
  giorniDellaSettimana,
  lunediDiOggi,
  settimaneDelMese,
  spostaSettimana
} from '../date';
import {
  ammanchiDellaSettimana,
  mansioneDelGiorno,
  mansioniDellaSettimana,
  settimanaPropria,
  turniDellaSettimana,
  turnoDelGiorno
} from '../turni';

const comeOpzione = (t) => ({
  valore: t.valore,
  etichetta: t.etichetta,
  breve: t.breve,
  classe: t.classe
});

// Riposo e "non previsto" si possono sempre scegliere
const SENZA_LAVORO = TURNI.filter(t => !eLavorativo(t.valore)).map(comeOpzione);

/* ---------- l'ordine dei nomi, deciso trascinandoli ---------- */

// Quanto va tenuto premuto un nome prima che si possa spostare.
const ATTESA_TRASCINAMENTO = 600;

// Oltre questo movimento la pressione non è più "tenere premuto":
// è il dito che sta facendo scorrere la tabella.
const MOVIMENTO_MASSIMO = 10;

/**
 * Le persone nell'ordine scelto a mano. Chi non compare nell'elenco
 * (assunto dopo l'ultimo trascinamento) finisce in fondo, mantenendo
 * l'ordine di partenza: `sort` in JavaScript non scambia i pari merito.
 */
function ordinaPersone(persone, ordine) {
  if (!ordine?.length) return persone;

  const posto = new Map(ordine.map((id, i) => [id, i]));
  const dove = (dip) => (posto.has(dip.id) ? posto.get(dip.id) : Number.MAX_SAFE_INTEGER);
  return [...persone].sort((a, b) => dove(a) - dove(b));
}

/** L'elenco di id con `id` tolto dal suo posto e rimesso dov'era `bersaglio`. */
function spostaId(elenco, id, bersaglio) {
  const senza = elenco.filter(x => x !== id);
  const dove = senza.indexOf(bersaglio);
  if (dove === -1) return elenco;

  // scendendo si passa sotto la riga scavalcata, salendo ci si mette sopra
  const sotto = elenco.indexOf(id) < elenco.indexOf(bersaglio);
  senza.splice(sotto ? dove + 1 : dove, 0, id);
  return senza;
}

export default function TurniSection({
  dipendenti,
  settimane,
  setSettimane,
  mansioniSettimane,
  setMansioniSettimane,
  ferie,
  ordine,
  setOrdine,
  giorni,
  giorniLabel,
  giorniChiusura,
  aperture,
  mansioni,
  minimi,
  onAmmanchi,
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

  // Le mansioni fra cui scegliere sotto ogni turno
  const opzioniMansione = mansioni.map(m => ({
    valore: m,
    etichetta: m,
    classe: `mansione ${classeReparto(m)}`,
    stile: stileMansione(m)
  }));

  const [lunedi, setLunedi] = useState(lunediDiOggi);
  const [daSovrascrivere, setDaSovrascrivere] = useState(null);
  const [daConfermare, setDaConfermare] = useState(null);
  // null = niente stampa in corso; 'settimana' o 'mese' = cosa mandare sul foglio
  const [scegliStampa, setScegliStampa] = useState(false);
  const [stampa, setStampa] = useState(null);

  // Trascinamento dei nomi: chi si sta spostando e l'ordine provvisorio
  const [trascinato, setTrascinato] = useState(null);
  const [bozza, setBozza] = useState(null);
  // chi è tenuto premuto ma non si è ancora staccato: serve all'animazione
  // che accompagna l'attesa
  const [inAttesa, setInAttesa] = useState(null);
  // le righe a schermo, per capire su quale si trova il dito
  const righe = useRef(new Map());
  const corpoTabella = useRef(null);
  const attesa = useRef(null);
  const pressione = useRef(null);
  // ultima altezza toccata dal dito e verso in cui sta andando
  const ultimaY = useRef(0);
  const versoIlBasso = useRef(true);
  // dov'era ogni riga prima dell'ultimo scambio, per animarne lo spostamento
  const posizioni = useRef(new Map());

  // memorizzata: entra nel calcolo degli ammanchi, che non deve rifarsi a ogni render
  const dateSettimana = useMemo(() => giorniDellaSettimana(lunedi), [lunedi]);
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

  /* ---------- la mansione, giorno per giorno ---------- */

  const mansioniDi = (dipId) => mansioniDellaSettimana(mansioniSettimane, dipId, lunedi);

  /** La mansione di quel giorno: quella scelta, o quella fissa della persona. */
  const mansioneDi = (dip, giorno) =>
    mansioneDelGiorno(mansioniDi(dip.id), giorno, repartoDi(dip));

  const cambiaMansione = (dipId, giorno, valore) => {
    setMansioniSettimane({
      ...mansioniSettimane,
      [lunedi]: {
        ...(mansioniSettimane[lunedi] || {}),
        [dipId]: { ...mansioniDi(dipId), [giorno]: valore }
      }
    });
  };

  /* ---------- personale minimo ---------- */

  // Dove la settimana mostrata non arriva ai minimi chiesti
  const ammanchi = useMemo(
    () => ammanchiDellaSettimana({
      dipendenti, settimane, mansioniSettimane, ferie, aperture,
      minimi, mansioni, lunedi, dateSettimana
    }),
    [dipendenti, settimane, mansioniSettimane, ferie, aperture, minimi, mansioni, lunedi, dateSettimana]
  );

  // App li usa per avvisare quando si cambia pagina
  useEffect(() => { onAmmanchi?.(ammanchi); }, [ammanchi, onAmmanchi]);

  // Quando si lascia i turni l'avviso non ha più senso
  useEffect(() => () => onAmmanchi?.([]), [onAmmanchi]);

  const ammanchiDelGiorno = (indice) => ammanchi.filter(a => a.indice === indice);

  /** Chi altro, nella stessa mansione di quel giorno, quel giorno non lavora. */
  const altriFermi = (dipId, giorno) => {
    const dip = dipendenti.find(d => d.id === dipId);
    if (!dip) return [];

    const data = dateSettimana[giorni.indexOf(giorno)];
    const mansione = mansioneDi(dip, giorno);

    return dipendenti
      .filter(d => d.id !== dipId && mansioneDi(d, giorno) === mansione)
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
    const copiaMansioni = {};
    dipendenti.forEach(dip => {
      copia[dip.id] = { ...turniDi(dip.id) };
      // le mansioni scelte giorno per giorno viaggiano con i turni
      const sue = mansioniDi(dip.id);
      if (Object.keys(sue).length > 0) copiaMansioni[dip.id] = { ...sue };
    });

    setMansioniSettimane({ ...mansioniSettimane, [destinazione]: copiaMansioni });
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
      else {
        const turno = turnoDelGiorno(suoiTurni, giorni[i]);
        valore = etichettaTurno(turno);

        // la mansione si scrive solo quando cambia da quella di sempre:
        // ripeterla sette volte sarebbe rumore
        const mansione = mansioneDi(dip, giorni[i]);
        if (eLavorativo(turno) && mansione !== repartoDi(dip)) valore += ` (${mansione})`;
      }
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

  // Se qualcuno ha una mansione che non è più in elenco (tolta da un altro
  // dispositivo) il suo gruppo va mostrato lo stesso: nessuno deve sparire
  // dalla settimana solo perché la sua mansione non c'è più.
  const fuoriElenco = [...new Set(dipendenti.map(d => repartoDi(d)))]
    .filter(m => !mansioni.includes(m));

  // L'ordine di partenza, quello di chi non ha mai spostato niente:
  // raggruppati per mansione, che è come stavano da sempre.
  const perMansione = [...mansioni, ...fuoriElenco]
    .flatMap(reparto => dipendenti.filter(d => repartoDi(d) === reparto));

  // In tabella i nomi vanno di fila: la mansione si legge già sotto ogni
  // turno, e le righe di intestazione rubavano solo spazio.
  // Comanda l'ordine deciso trascinando i nomi; chi non è ancora stato
  // spostato (assunto dopo) resta in coda com'era, per mansione.
  const secondoOrdine = ordinaPersone(perMansione, ordine);

  // Durante il trascinamento comanda la bozza: le righe si riordinano
  // sotto il dito, e solo al rilascio l'ordine viene salvato.
  const inTabella = bozza
    ? bozza.map(id => secondoOrdine.find(d => d.id === id)).filter(Boolean)
    : secondoOrdine;

  /* ---------- spostare i nomi tenendoli premuti ---------- */

  const fermaAttesa = () => {
    clearTimeout(attesa.current);
    attesa.current = null;
    setInAttesa(null);
  };

  /** Dove si trova adesso ogni riga: il "prima" da cui parte l'animazione. */
  const segnaPosizioni = () => {
    posizioni.current = new Map();
    righe.current.forEach((riga, id) => {
      if (riga) posizioni.current.set(id, riga.getBoundingClientRect().top);
    });
  };

  const senzaAnimazione = (riga) => {
    riga.style.transition = '';
    riga.style.transform = '';
  };

  /**
   * Si tiene premuto un nome: se il dito resta fermo per il tempo giusto
   * la riga si stacca e si può spostare. Se invece si muove prima, era
   * la tabella che si voleva far scorrere e non succede niente.
   */
  const iniziaPressione = (e, dipId) => {
    // i pulsanti dentro la casella (invia i turni) restano cliccabili
    if (e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const elemento = e.currentTarget;
    const pointerId = e.pointerId;
    pressione.current = { x: e.clientX, y: e.clientY };
    setInAttesa(dipId);

    attesa.current = setTimeout(() => {
      attesa.current = null;
      setInAttesa(null);
      try { elemento.setPointerCapture(pointerId); } catch { /* già rilasciato */ }
      ultimaY.current = pressione.current.y;
      versoIlBasso.current = true;
      setTrascinato(dipId);
      setBozza(inTabella.map(d => d.id));
      navigator.vibrate?.(25);
    }, ATTESA_TRASCINAMENTO);
  };

  /**
   * La riga con cui scambiare il posto, se il dito è arrivato abbastanza
   * avanti. Sfiorare il bordo di una riga non basta: bisogna averne
   * passato la metà, nel verso in cui ci si sta muovendo. Senza questa
   * regola, appena avvenuto lo scambio il dito si ritrova sopra la riga
   * di prima e le due si rincorrono, ballando avanti e indietro.
   */
  const rigaSotto = (y, giu) => {
    const corpo = corpoTabella.current;
    if (!corpo) return null;

    // Le righe vanno cercate dove le mette l'impaginazione, non dove si
    // vedono: mentre scivolano al posto nuovo quello che si vede è
    // ancora a metà strada, e due righe sembrano occupare lo stesso
    // spazio. Con offsetTop lo scivolamento non conta.
    const origine = corpo.getBoundingClientRect().top - corpo.offsetTop;

    for (const [id, riga] of righe.current) {
      if (!riga) continue;

      const alto = origine + riga.offsetTop;
      const altezza = riga.offsetHeight;
      if (y < alto || y > alto + altezza) continue;

      const meta = alto + altezza / 2;
      if (giu ? y < meta : y > meta) return null;
      return id;
    }
    return null;
  };

  const muoviPressione = (e) => {
    if (attesa.current) {
      const p = pressione.current;
      const quanto = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (quanto > MOVIMENTO_MASSIMO) fermaAttesa();
      return;
    }

    if (!trascinato) return;

    // fermandosi si tiene buono l'ultimo verso: non serve un nuovo scambio
    if (e.clientY !== ultimaY.current) {
      versoIlBasso.current = e.clientY > ultimaY.current;
      ultimaY.current = e.clientY;
    }

    const sopra = rigaSotto(e.clientY, versoIlBasso.current);
    if (!sopra || sopra === trascinato) return;

    segnaPosizioni();
    setBozza(prima => spostaId(prima, trascinato, sopra));
  };

  /** Al rilascio l'ordine provvisorio diventa quello buono. */
  const finiscePressione = () => {
    fermaAttesa();
    if (trascinato && bozza) setOrdine(bozza);
    righe.current.forEach(riga => { if (riga) senzaAnimazione(riga); });
    posizioni.current = new Map();
    setTrascinato(null);
    setBozza(null);
  };

  /**
   * Le righe scavalcate non devono saltare da un posto all'altro: le
   * rimetto dov'erano un istante prima e le lascio scivolare al nuovo
   * posto. Va fatto prima che lo schermo si aggiorni, quindi in
   * useLayoutEffect e non nel solito useEffect.
   */
  useLayoutEffect(() => {
    if (!bozza || posizioni.current.size === 0) return;

    const erano = posizioni.current;
    posizioni.current = new Map();

    const daAnimare = [];
    righe.current.forEach((riga, id) => {
      if (!riga || id === trascinato) return;

      const era = erano.get(id);
      if (era === undefined) return;

      // prima si toglie lo scivolamento ancora in corso, altrimenti si
      // misurerebbe una posizione di passaggio invece di quella nuova
      riga.style.transition = 'none';
      riga.style.transform = '';

      const salto = era - riga.getBoundingClientRect().top;
      if (!salto) {
        riga.style.transition = '';
        return;
      }

      riga.style.transform = `translateY(${salto}px)`;
      daAnimare.push(riga);
    });

    if (daAnimare.length === 0) return;

    // il fotogramma dopo si toglie tutto: da lì parte la scivolata
    const prossimo = requestAnimationFrame(() => daAnimare.forEach(senzaAnimazione));
    return () => cancelAnimationFrame(prossimo);
  }, [bozza, trascinato]);

  /**
   * Mentre si sposta una riga il dito non deve far scorrere la pagina.
   * Va fatto con un ascoltatore "non passivo", l'unico a cui il browser
   * dia retta quando gli si chiede di non scorrere.
   */
  useEffect(() => {
    if (!trascinato) return;

    const blocca = (e) => e.preventDefault();
    document.addEventListener('touchmove', blocca, { passive: false });
    return () => document.removeEventListener('touchmove', blocca);
  }, [trascinato]);

  // se la sezione sparisce mentre si tiene premuto, il tempo va fermato
  useEffect(() => () => clearTimeout(attesa.current), []);

  /* ---------- stampa ---------- */

  // Il mese è quello in cui cade il lunedì della settimana mostrata.
  const giorniDaStampare = giorniDelMese(lunedi).length;

  // Un mese senza nemmeno una settimana compilata sarebbe un foglio di
  // soli trattini: la scelta resta lì ma spenta.
  const meseHaTurni = settimaneDelMese(lunedi)
    .some(lun => settimanaPropria(settimane, lun));

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

          {ammanchi.length > 0 && (
            <p className="nota nota-avviso striscia-ammanchi">
              ⚠️ Sotto il personale minimo:{' '}
              {ammanchi
                .map(a => `${giorniLabel[a.indice]} ${a.mansione} ${a.presenti}/${a.richiesti}`)
                .join(' · ')}
            </p>
          )}

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

                    const scoperti = ammanchiDelGiorno(idx);

                    return (
                      <th key={giorni[idx]} className={`${chiuso ? 'chiuso' : ''} ${scoperti.length ? 'sotto-minimo' : ''}`}>
                        <span className="giorno-nome">{label}</span>
                        <span className="giorno-data">{dataBreve(dateSettimana[idx])}</span>
                        {daSegnalare && (
                          <span className={`badge-chiuso ${chiuso ? '' : `badge-orario badge-${apertura}`}`}>
                            {APERTURE.find(a => a.valore === apertura)?.breve}
                          </span>
                        )}
                        {scoperti.length > 0 && (
                          <span
                            className="badge-chiuso badge-minimo"
                            title={scoperti.map(a => `${a.mansione}: ${a.presenti} su ${a.richiesti}`).join('\n')}
                          >
                            ⚠️ Manca gente
                          </span>
                        )}
                      </th>
                    );
                  })}
                  {/* solo sul foglio stampato: quanti giorni lavora ognuno */}
                  <th className="col-totale">Giorni lavorati</th>
                </tr>
              </thead>

              <tbody ref={corpoTabella}>
                  {inTabella.map(dip => {
                    const suoiTurni = turniDi(dip.id);
                    const sueFerie = ferie[dip.id] || [];

                    // i giorni che lavora davvero: fuori dalle chiusure,
                    // fuori dalle sue ferie e con un turno di lavoro
                    const giorniLavorati = giorni.filter((giorno, idx) =>
                      !giorniChiusura.includes(giorno) &&
                      !sueFerie.includes(dateSettimana[idx]) &&
                      eLavorativo(turnoDelGiorno(suoiTurni, giorno))
                    ).length;

                    return (
                      <tr
                        key={dip.id}
                        ref={(el) => {
                          if (el) righe.current.set(dip.id, el);
                          else righe.current.delete(dip.id);
                        }}
                        className={
                          trascinato === dip.id ? 'riga-trascinata'
                            : inAttesa === dip.id ? 'riga-in-attesa'
                              : ''
                        }
                        // la durata dell'animazione è la stessa attesa del
                        // codice: così non possono scollarsi fra loro
                        style={inAttesa === dip.id
                          ? { '--attesa': `${ATTESA_TRASCINAMENTO}ms` }
                          : undefined}
                      >
                        <td
                          className="col-nome nome-spostabile"
                          onPointerDown={(e) => iniziaPressione(e, dip.id)}
                          onPointerMove={muoviPressione}
                          onPointerUp={finiscePressione}
                          onPointerCancel={finiscePressione}
                          onContextMenu={(e) => { if (trascinato) e.preventDefault(); }}
                          title="Tienilo premuto per spostarlo"
                        >
                          <div className="persona">
                            <Avatar nome={dip.nome} />
                            <span className="persona-nome">{dip.nome}</span>
                            {/* quanti giorni lavora in settimana, accanto al nome:
                                sul foglio lo dice già la colonna in fondo */}
                            <span
                              className="conta-giorni"
                              title={giorniLavorati === 1
                                ? '1 giorno lavorato questa settimana'
                                : `${giorniLavorati} giorni lavorati questa settimana`}
                            >
                              {giorniLavorati}
                            </span>
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
                                <div className="casella-turno">
                                  <Select
                                    valore={valore}
                                    opzioni={opzioniDelGiorno(giorno)}
                                    onChange={(v) => cambiaTurno(dip.id, giorno, v)}
                                    classe={`pillola ${classeTurno(valore)}`}
                                    etichettaAria={`Turno di ${dip.nome}`}
                                    etichettaFuoriElenco={etichettaTurno(valore)}
                                  />

                                  {/* la mansione si sceglie solo dove si lavora:
                                      a riposo o senza turno non vuol dire niente */}
                                  {eLavorativo(valore) && (() => {
                                    const mansione = mansioneDi(dip, giorno);
                                    const suaFissa = mansione === repartoDi(dip);

                                    return (
                                      <div className={`riga-mansione ${suaFissa ? 'mansione-fissa' : ''}`}>
                                        <Select
                                          valore={mansione}
                                          opzioni={opzioniMansione}
                                          onChange={(v) => cambiaMansione(dip.id, giorno, v)}
                                          classe={`pillola pillola-mansione select-mansione ${classeReparto(mansione)}`}
                                          stile={stileMansione(mansione)}
                                          etichettaAria={`Mansione di ${dip.nome}`}
                                          etichettaFuoriElenco={mansione}
                                        />
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="col-totale">{giorniLavorati}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </ScrollArea>
        </>
      )}

      {/* Il mese: esiste nella pagina solo il tempo di stamparlo,
          tutto su un foglio. A schermo non si vede mai. */}
      {stampa?.cosa === 'mese' && (
        <div className="foglio-mese">
          <div className="intestazione-stampa">
            <h1>{nomeLocale}</h1>
            <p>Turni di {etichettaMese(lunedi)}</p>
          </div>

          <TabellaMeseStampa
            mese={lunedi}
            persone={secondoOrdine}
            settimane={settimane}
            mansioniSettimane={mansioniSettimane}
            ferie={ferie}
            aperture={aperture}
          />
        </div>
      )}

      {scegliStampa && (
        <ScegliStampa
          settimana={etichettaSettimana(lunedi)}
          mese={etichettaMese(lunedi)}
          giorniDelMese={giorniDaStampare}
          meseScritto={meseHaTurni}
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
