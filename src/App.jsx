import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import TurniSection from './components/TurniSection';
import FerieSection from './components/FerieSection';
import CalendarioSection from './components/CalendarioSection';
import ResocontoSection from './components/ResocontoSection';
import ImpostazioniSection from './components/ImpostazioniSection';
import MinimiDrawer from './components/MinimiDrawer';
import Conferma from './components/Conferma';
import {
  APERTURE,
  GIORNI,
  GIORNI_LABEL,
  LOCALI,
  REPARTI,
  REPARTO_PREDEFINITO,
  aperturaDi,
  classeReparto,
  giorniChiusuraDa,
  mansioneGiaPresente,
  repartoDi,
  stileMansione,
  turniDelLocale
} from './costanti';
import { carica, salva, ascolta, online, statoVuoto } from './archivio';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

// Un vuoto sempre uguale a se stesso: usarlo come ripiego evita di
// creare un oggetto nuovo a ogni render, che farebbe ricalcolare tutto
const NIENTE = {};

// La pizzeria scelta resta su questo dispositivo: ognuno riapre la sua
const CHIAVE_SCELTA = 'pizzeriaLocaleScelto';

// I dipendenti salvati prima delle mansioni ne ricevono una predefinita
const conReparto = (elenco) => (elenco || []).map(d => ({ ...d, reparto: repartoDi(d) }));

function App() {
  const [locali, setLocali] = useState(() => statoVuoto().locali);
  const [idLocale, setIdLocale] = useState(
    () => localStorage.getItem(CHIAVE_SCELTA) || LOCALI[0].id
  );
  const [caricato, setCaricato] = useState(false);
  const [problemaRete, setProblemaRete] = useState(false);
  const [avviso, setAvviso] = useState('');
  const [nuovoDipendente, setNuovoDipendente] = useState('');
  const [nuovoReparto, setNuovoReparto] = useState(REPARTO_PREDEFINITO);
  const [nuovaMansione, setNuovaMansione] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showMansioneDrawer, setShowMansioneDrawer] = useState(false);
  const [showGiorniDrawer, setShowGiorniDrawer] = useState(false);
  const [showMinimiDrawer, setShowMinimiDrawer] = useState(false);
  // ammanchi della settimana aperta in Turni, riferiti dalla sezione stessa
  const [ammanchi, setAmmanchi] = useState([]);
  const [sezioneDaAprire, setSezioneDaAprire] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [activeSection, setActiveSection] = useState('turni');

  // Ultimo contenuto scritto o ricevuto: evita di rimandare al database
  // dati identici a quelli appena arrivati da un altro dispositivo.
  const ultimoSincronizzato = useRef(null);

  const applica = (dati) => {
    ultimoSincronizzato.current = JSON.stringify(dati);
    setLocali(dati.locali.map(l => ({ ...l, dipendenti: conReparto(l.dipendenti) })));
  };

  // ---- la pizzeria che si sta guardando ----
  const indiceLocale = Math.max(0, locali.findIndex(l => l.id === idLocale));
  const locale = locali[indiceLocale];
  const { dipendenti, settimane, ferie, aperture } = locale;
  const mansioniSettimane = locale.mansioniSettimane || NIENTE;
  const minimi = locale.minimi || NIENTE;

  // Le mansioni di questa pizzeria: quelle di partenza che non sono state
  // tolte, più quelle aggiunte a mano
  const mansioniTolte = locale.mansioniTolte || [];
  const mansioni = useMemo(
    () => [
      ...REPARTI.filter(r => !(locale.mansioniTolte || []).includes(r)),
      ...(locale.mansioni || [])
    ],
    [locale.mansioniTolte, locale.mansioni]
  );

  const quantiNellaMansione = (nome) => dipendenti.filter(d => repartoDi(d) === nome).length;

  // i giorni chiusi si ricavano dagli orari: il resto dell'app ragiona su quelli
  const giorniChiusura = giorniChiusuraDa(aperture);

  // Ogni modifica tocca solo la pizzeria aperta
  const modificaLocale = (campi) =>
    setLocali(prima => prima.map((l, i) => (i === indiceLocale ? { ...l, ...campi } : l)));

  const setDipendenti = (v) => modificaLocale({ dipendenti: v });
  const setSettimane = (v) => modificaLocale({ settimane: v });
  const setMansioniSettimane = (v) => modificaLocale({ mansioniSettimane: v });
  const setFerie = (v) => modificaLocale({ ferie: v });

  const cambiaPizzeria = (id) => {
    setIdLocale(id);
    localStorage.setItem(CHIAVE_SCELTA, id);
    if (isMobile()) setSidebarOpen(false);
  };

  // Messaggio passeggero in basso (copia riuscita, turni copiati...)
  const avvisa = (testo) => setAvviso(testo);

  useEffect(() => {
    if (!avviso) return;
    const timer = setTimeout(() => setAvviso(''), 4000);
    return () => clearTimeout(timer);
  }, [avviso]);

  // Primo caricamento
  useEffect(() => {
    let annullato = false;

    (async () => {
      try {
        const dati = await carica();
        if (!annullato) applica(dati);
      } catch (e) {
        console.error('Caricamento fallito', e);
        if (!annullato) setProblemaRete(true);
      } finally {
        if (!annullato) setCaricato(true);
      }
    })();

    return () => { annullato = true; };
  }, []);

  // Modifiche fatte da altri dispositivi
  useEffect(() => {
    if (!caricato) return;
    return ascolta(applica);
  }, [caricato]);

  // Salvataggio: parte solo a caricamento concluso, così non sovrascrive
  // i dati appena letti, ed è ritardato per non scrivere a ogni tasto.
  useEffect(() => {
    if (!caricato) return;

    const dati = { locali };
    const serializzato = JSON.stringify(dati);
    if (serializzato === ultimoSincronizzato.current) return;

    const timer = setTimeout(async () => {
      ultimoSincronizzato.current = serializzato;
      try {
        await salva(dati);
        setProblemaRete(false);
      } catch (e) {
        console.error('Salvataggio fallito', e);
        setProblemaRete(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [caricato, locali]);

  // Esc chiude i pannelli aperti
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setShowAddDrawer(false);
      setShowGiorniDrawer(false);
      setShowMinimiDrawer(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Aggiungi dipendente
  const aggiungiDipendente = () => {
    const nome = nuovoDipendente.trim();
    if (!nome) return;

    const newId = Date.now().toString();
    setDipendenti([...dipendenti, { id: newId, nome, reparto: nuovoReparto, giorni_ferie: 20 }]);
    setFerie({ ...ferie, [newId]: [] });
    setNuovoDipendente('');
    setShowAddDrawer(false);
  };

  // Elimina dipendente: con lui se ne vanno turni, mansioni del giorno e ferie
  const eliminaDipendente = (id) => {
    const senzaLaPersona = (perSettimana) => {
      const ripulito = {};
      Object.entries(perSettimana || {}).forEach(([lunedi, dellaSettimana]) => {
        const resto = { ...dellaSettimana };
        delete resto[id];
        if (Object.keys(resto).length > 0) ripulito[lunedi] = resto;
      });
      return ripulito;
    };

    const nuoveFerie = { ...ferie };
    delete nuoveFerie[id];

    modificaLocale({
      dipendenti: dipendenti.filter(d => d.id !== id),
      settimane: senzaLaPersona(settimane),
      mansioniSettimane: senzaLaPersona(mansioniSettimane),
      ferie: nuoveFerie
    });
  };

  const cambiaReparto = (id, reparto) => {
    setDipendenti(dipendenti.map(d => (d.id === id ? { ...d, reparto } : d)));
  };

  // Aggiungi mansione: resta a questa pizzeria, l'altra ha le sue
  const aggiungiMansione = () => {
    const nome = nuovaMansione.trim();
    if (!nome) return;

    if (mansioneGiaPresente(mansioni, nome)) {
      avvisa(`La mansione ${nome} c'è già`);
      return;
    }

    modificaLocale({ mansioni: [...(locale.mansioni || []), nome] });
    setNuovaMansione('');
    setShowMansioneDrawer(false);
    avvisa(`Mansione ${nome} aggiunta`);
  };

  /**
   * Elimina mansione. Con qualcuno dentro non si può: resterebbe gente
   * con una mansione che non esiste più, invisibile nella tabella dei
   * turni. Prima si spostano le persone, poi si toglie la mansione.
   */
  const eliminaMansione = (nome) => {
    const quanti = quantiNellaMansione(nome);
    if (quanti > 0) {
      avvisa(`${nome}: prima sposta ${quanti === 1 ? 'la persona' : `le ${quanti} persone`} in un'altra mansione`);
      return;
    }

    if (mansioni.length <= 1) {
      avvisa('Deve restare almeno una mansione');
      return;
    }

    if (REPARTI.includes(nome)) {
      modificaLocale({ mansioniTolte: [...mansioniTolte, nome] });
    } else {
      modificaLocale({ mansioni: (locale.mansioni || []).filter(m => m !== nome) });
    }

    // il pannello del dipendente nuovo può essere rimasto puntato su di lei
    if (nuovoReparto === nome) setNuovoReparto(mansioni.find(m => m !== nome));
    avvisa(`Mansione ${nome} eliminata`);
  };

  const cambiaApertura = (giorno, valore) => {
    modificaLocale({ aperture: { ...aperture, [giorno]: valore } });
  };

  const cambiaMinimo = (mansione, giorno, valore) => {
    const quanti = Math.max(0, Math.min(99, parseInt(valore, 10) || 0));
    modificaLocale({
      minimi: { ...minimi, [mansione]: { ...(minimi[mansione] || {}), [giorno]: quanti } }
    });
  };

  // Su mobile il menu si richiude dopo la scelta
  const apriSezione = (sezione) => {
    setActiveSection(sezione);
    if (isMobile()) setSidebarOpen(false);
  };

  /**
   * Lasciando i turni con la settimana sotto il personale minimo si
   * chiede conferma: è l'ultimo momento utile per accorgersene.
   */
  const vaiA = (sezione) => {
    if (activeSection === 'turni' && sezione !== 'turni' && ammanchi.length > 0) {
      setSezioneDaAprire(sezione);
      return;
    }
    apriSezione(sezione);
  };

  const labelDiChiusura = giorniChiusura
    .map(g => GIORNI_LABEL[GIORNI.indexOf(g)])
    .filter(Boolean);

  // Nel riepilogo del menu compaiono solo le mansioni con qualcuno dentro
  const conteggioReparti = mansioni
    .map(r => ({ reparto: r, quanti: dipendenti.filter(d => repartoDi(d) === r).length }))
    .filter(r => r.quanti > 0);

  return (
    <div className="app">
      {/* ---------- Menu laterale ---------- */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-head">
          <div className="logo">
            <span className="logo-testo">
              <strong>Personale e ferie</strong>
              <small>Turni, ferie e resoconti</small>
            </span>
          </div>
          <button className="icon-btn chiudi-menu" onClick={() => setSidebarOpen(false)} title="Chiudi menu">
            ✕
          </button>
        </div>

        <div className="scelta-locale">
          <p className="nav-label">Pizzeria</p>
          {locali.map(l => (
            <button
              key={l.id}
              className={`locale-voce ${l.id === locale.id ? 'attivo' : ''}`}
              onClick={() => cambiaPizzeria(l.id)}
              aria-pressed={l.id === locale.id}
            >
              <span className="locale-nome">{l.nome}</span>
              <span className="locale-conta">{l.dipendenti.length}</span>
            </button>
          ))}
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Gestione</p>
          <button
            className={`nav-item ${activeSection === 'turni' ? 'active' : ''}`}
            onClick={() => vaiA('turni')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Turni</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'ferie' ? 'active' : ''}`}
            onClick={() => vaiA('ferie')}
          >
            <span className="nav-icon">🏖️</span>
            <span className="nav-text">Ferie</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'calendario' ? 'active' : ''}`}
            onClick={() => vaiA('calendario')}
          >
            <span className="nav-icon">🗓️</span>
            <span className="nav-text">Calendario</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'resoconto' ? 'active' : ''}`}
            onClick={() => vaiA('resoconto')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Resoconto</span>
          </button>

          <div className="nav-divisore" />

          <button className="nav-item" onClick={() => setShowMinimiDrawer(true)}>
            <span className="nav-icon">🔢</span>
            <span className="nav-text">Personale minimo</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'impostazioni' ? 'active' : ''}`}
            onClick={() => vaiA('impostazioni')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Impostazioni</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          {conteggioReparti.length > 0 && (
            <ul className="riepilogo-reparti">
              {conteggioReparti.map(({ reparto, quanti }) => (
                <li key={reparto}>
                  <span className={`punto-reparto ${classeReparto(reparto)}`} style={stileMansione(reparto)} />
                  <span className="riepilogo-nome">{reparto}</span>
                  <span className="riepilogo-num">{quanti}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Sfondo scuro dietro al menu (solo mobile) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ---------- Contenuto ---------- */}
      <div className="main-wrapper">
        <header className="topbar">
          <button
            className="icon-btn menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Nascondi menu' : 'Mostra menu'}
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
          <h1 className="topbar-titolo">{locale.nome}</h1>
          <div className="topbar-chip-area">
            <span
              className={`chip ${problemaRete ? 'chip-avviso' : online ? 'chip-online' : 'chip-locale'}`}
              title={
                problemaRete
                  ? 'Dati non sincronizzati: al momento salvati solo su questo dispositivo'
                  : online
                    ? 'I dati sono condivisi con chiunque apra il link'
                    : 'I dati restano solo in questo browser'
              }
            >
              <span className="chip-icona">{problemaRete ? '⚠️' : online ? '☁️' : '📱'}</span>
              <span className="chip-testo">
                {problemaRete ? 'Non sincronizzato' : online ? 'Condiviso' : 'Solo qui'}
              </span>
            </span>
            <span className="chip">
              <span className="chip-icona">👥</span>
              {dipendenti.length}
            </span>
            {labelDiChiusura.length > 0 && (
              <span className="chip chip-avviso" title={`Chiuso: ${labelDiChiusura.join(', ')}`}>
                <span className="chip-icona">🚫</span>
                {labelDiChiusura.map(g => g.slice(0, 3)).join(' · ')}
              </span>
            )}
          </div>
        </header>

        <main className="container">
          {!caricato && (
            <section className="card">
              <div className="vuoto">
                <div className="vuoto-icona">⏳</div>
                <p className="vuoto-titolo">Carico i dati…</p>
              </div>
            </section>
          )}

          {caricato && activeSection === 'turni' && (
            <TurniSection
              dipendenti={dipendenti}
              settimane={settimane}
              setSettimane={setSettimane}
              mansioniSettimane={mansioniSettimane}
              setMansioniSettimane={setMansioniSettimane}
              ferie={ferie}
              giorni={GIORNI}
              giorniLabel={GIORNI_LABEL}
              giorniChiusura={giorniChiusura}
              aperture={aperture}
              mansioni={mansioni}
              minimi={minimi}
              onAmmanchi={setAmmanchi}
              nomeLocale={locale.nome}
              turniDisponibili={turniDelLocale(locale.id)}
              avvisa={avvisa}
            />
          )}

          {caricato && activeSection === 'ferie' && (
            <FerieSection
              dipendenti={dipendenti}
              ferie={ferie}
              setFerie={setFerie}
              giorniChiusura={giorniChiusura}
              avvisa={avvisa}
            />
          )}

          {caricato && activeSection === 'calendario' && (
            <CalendarioSection
              dipendenti={dipendenti}
              settimane={settimane}
              ferie={ferie}
              giorniChiusura={giorniChiusura}
            />
          )}

          {caricato && activeSection === 'resoconto' && (
            <ResocontoSection
              dipendenti={dipendenti}
              settimane={settimane}
              ferie={ferie}
              giorniChiusura={giorniChiusura}
            />
          )}

          {caricato && activeSection === 'impostazioni' && (
            <ImpostazioniSection
              dipendenti={dipendenti}
              setDipendenti={setDipendenti}
              ferie={ferie}
              eliminaDipendente={eliminaDipendente}
              cambiaReparto={cambiaReparto}
              mansioni={mansioni}
              giorniChiusura={giorniChiusura}
              aperture={aperture}
              apriAggiungiDipendente={() => setShowAddDrawer(true)}
              apriAggiungiMansione={() => setShowMansioneDrawer(true)}
              apriGiorniChiusura={() => setShowGiorniDrawer(true)}
            />
          )}
        </main>
      </div>

      {/* ---------- Pannello: personale minimo ---------- */}
      {showMinimiDrawer && (
        <MinimiDrawer
          mansioni={mansioni}
          minimi={minimi}
          aperture={aperture}
          quantiNellaMansione={quantiNellaMansione}
          cambiaMinimo={cambiaMinimo}
          chiudi={() => setShowMinimiDrawer(false)}
        />
      )}

      {/* ---------- Avviso: settimana sotto il personale minimo ---------- */}
      {sezioneDaAprire && (
        <Conferma
          titolo="Non arrivi al personale minimo"
          tono="pericolo"
          conferma="Esci lo stesso"
          annulla="Resto sui turni"
          onAnnulla={() => setSezioneDaAprire(null)}
          onConferma={() => {
            apriSezione(sezioneDaAprire);
            setSezioneDaAprire(null);
          }}
        >
          <p>Nella settimana che stai guardando mancano delle persone:</p>
          <ul className="elenco-conflitti">
            {ammanchi.map(a => (
              <li key={`${a.giorno}-${a.mansione}`}>
                <strong>{GIORNI_LABEL[a.indice]}</strong> — {a.mansione}:{' '}
                {a.presenti} {a.presenti === 1 ? 'persona' : 'persone'} su {a.richiesti}
              </li>
            ))}
          </ul>
          <p>Vuoi tornare ai turni per sistemare, o uscire comunque?</p>
        </Conferma>
      )}

      {/* ---------- Messaggio passeggero ---------- */}
      {avviso && (
        <div className="toast" role="status">
          <span className="toast-icona" aria-hidden="true">✓</span>
          {avviso}
        </div>
      )}

      {/* ---------- Pannello: giorni di chiusura ---------- */}
      {showGiorniDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowGiorniDrawer(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-body">
              <div className="drawer-head">
                <h2>Quando siamo aperti</h2>
                <button className="icon-btn" onClick={() => setShowGiorniDrawer(false)} title="Chiudi">✕</button>
              </div>
              <p className="drawer-sub">
                Giorno per giorno: dove è aperto solo a pranzo (o solo a cena) l'altro turno
                non si può scegliere. Nei giorni chiusi i turni sono disattivati e le ferie
                non vengono conteggiate.
              </p>

              <div className="elenco-aperture">
                {GIORNI.map((giorno, idx) => {
                  const scelta = aperturaDi(aperture, giorno);
                  return (
                    <div key={giorno} className={`riga-apertura ${scelta === 'chiuso' ? 'chiusa' : ''}`}>
                      <span className="apertura-giorno">{GIORNI_LABEL[idx]}</span>
                      <div className="segmenti segmenti-apertura">
                        {APERTURE.map(a => (
                          <button
                            key={a.valore}
                            type="button"
                            className={`segmento ${scelta === a.valore ? `attivo ap-${a.valore}` : ''}`}
                            onClick={() => cambiaApertura(giorno, a.valore)}
                          >
                            {a.breve}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="btn btn-primario btn-blocco" onClick={() => setShowGiorniDrawer(false)}>
                Fatto
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---------- Pannello: aggiungi dipendente ---------- */}
      {showAddDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowAddDrawer(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-body">
              <div className="drawer-head">
                <h2>Aggiungi dipendente</h2>
                <button className="icon-btn" onClick={() => setShowAddDrawer(false)} title="Chiudi">✕</button>
              </div>
              <p className="drawer-sub">Parte con 20 giorni di ferie, modificabili in seguito.</p>

              <input
                className="campo"
                type="text"
                value={nuovoDipendente}
                onChange={(e) => setNuovoDipendente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungiDipendente()}
                placeholder="Nome e cognome"
                autoFocus
              />

              <div className="scelta-reparto">
                <span className="campo-label">Mansione</span>
                <div className="segmenti">
                  {mansioni.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`segmento ${nuovoReparto === r ? `attivo ${classeReparto(r)}` : ''}`}
                      style={nuovoReparto === r ? stileMansione(r) : undefined}
                      onClick={() => setNuovoReparto(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primario btn-blocco"
                onClick={aggiungiDipendente}
                disabled={!nuovoDipendente.trim()}
              >
                Aggiungi in {nuovoReparto}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ---------- Pannello: aggiungi mansione ---------- */}
      {showMansioneDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowMansioneDrawer(false)} />
          <div className="drawer">
            <div className="drawer-handle" />
            <div className="drawer-body">
              <div className="drawer-head">
                <h2>Aggiungi mansione</h2>
                <button className="icon-btn" onClick={() => setShowMansioneDrawer(false)} title="Chiudi">✕</button>
              </div>
              <p className="drawer-sub">
                Vale per {locale.nome}: l'altra pizzeria ha le sue. La ritrovi
                nell'elenco delle mansioni di ogni dipendente.
              </p>

              <input
                className="campo"
                type="text"
                value={nuovaMansione}
                onChange={(e) => setNuovaMansione(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungiMansione()}
                placeholder="Per esempio Fornaio"
                autoFocus
              />

              <div className="scelta-reparto">
                <span className="campo-label">Mansioni di adesso</span>
                <div className="elenco-mansioni">
                  {mansioni.map(m => {
                    const quanti = quantiNellaMansione(m);

                    return (
                      <span
                        key={m}
                        className={`pill-reparto pill-con-x ${classeReparto(m)}`}
                        style={stileMansione(m)}
                      >
                        {m}
                        {quanti > 0 && <span className="quanti-mansione">{quanti}</span>}
                        <button
                          type="button"
                          className="togli-mansione"
                          onClick={() => eliminaMansione(m)}
                          disabled={quanti > 0 || mansioni.length <= 1}
                          title={
                            quanti > 0
                              ? `${quanti === 1 ? 'C\'è una persona' : `Ci sono ${quanti} persone`} in ${m}: spostala prima`
                              : `Elimina ${m}`
                          }
                          aria-label={`Elimina la mansione ${m}`}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
                <p className="nota-mansioni">
                  Una mansione si elimina solo quando non c'è più nessuno dentro:
                  il numero accanto dice quante persone la fanno.
                </p>
              </div>

              <button
                className="btn btn-primario btn-blocco"
                onClick={aggiungiMansione}
                disabled={!nuovaMansione.trim()}
              >
                Aggiungi mansione
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
