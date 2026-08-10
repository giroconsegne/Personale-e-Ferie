import React, { useMemo, useState } from 'react';
import Avatar from './Avatar';
import ScrollArea from './ScrollArea';
import { repartoDi, slugReparto } from '../costanti';
import { aIso, conteggiaGiorni } from '../date';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function ResocontoSection({ dipendenti, turni, ferie, giorniChiusura }) {
  const oggi = new Date();
  const isoOggi = aIso(oggi);
  const [vista, setVista] = useState({ anno: oggi.getFullYear(), mese: oggi.getMonth() });

  const righe = useMemo(() => {
    const primoDelMese = aIso(new Date(vista.anno, vista.mese, 1));
    const ultimoDelMese = aIso(new Date(vista.anno, vista.mese + 1, 0));
    const primoDellAnno = aIso(new Date(vista.anno, 0, 1));
    const ultimoDellAnno = aIso(new Date(vista.anno, 11, 31));

    return dipendenti.map(dip => {
      const comuni = {
        turniDip: turni[dip.id],
        ferieDip: ferie[dip.id] || [],
        giorniChiusura,
        oggi: isoOggi
      };
      return {
        dip,
        mese: conteggiaGiorni({ dal: primoDelMese, al: ultimoDelMese, ...comuni }),
        anno: conteggiaGiorni({ dal: primoDellAnno, al: ultimoDellAnno, ...comuni })
      };
    });
  }, [dipendenti, turni, ferie, giorniChiusura, vista, isoOggi]);

  const totali = useMemo(
    () =>
      righe.reduce(
        (acc, r) => ({
          lavorati: acc.lavorati + r.mese.lavorati,
          previsti: acc.previsti + r.mese.previsti,
          mattine: acc.mattine + r.mese.mattine,
          sere: acc.sere + r.mese.sere,
          ferie: acc.ferie + r.mese.ferie,
          annoLavorati: acc.annoLavorati + r.anno.lavorati,
          annoPrevisti: acc.annoPrevisti + r.anno.previsti,
          annoFerie: acc.annoFerie + r.anno.ferie
        }),
        { lavorati: 0, previsti: 0, mattine: 0, sere: 0, ferie: 0, annoLavorati: 0, annoPrevisti: 0, annoFerie: 0 }
      ),
    [righe]
  );

  // aggiornamento funzionale: piu clic ravvicinati avanzano di un mese ciascuno
  const cambiaMese = (delta) => {
    setVista(v => {
      const d = new Date(v.anno, v.mese + delta, 1);
      return { anno: d.getFullYear(), mese: d.getMonth() };
    });
  };

  const vaiAOggi = () => setVista({ anno: oggi.getFullYear(), mese: oggi.getMonth() });

  const meseFuturo = new Date(vista.anno, vista.mese, 1) > oggi;

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Resoconto</h2>
          <p className="card-sub">Giorni lavorati per persona, nel mese e nell'anno</p>
        </div>
        <div className="navigazione-mese">
          <button className="icon-btn" onClick={() => cambiaMese(-1)} title="Mese precedente">‹</button>
          <span className="mese-corrente">{MESI[vista.mese]} {vista.anno}</span>
          <button className="icon-btn" onClick={() => cambiaMese(1)} title="Mese successivo">›</button>
          <button className="btn btn-secondario btn-oggi" onClick={vaiAOggi}>Oggi</button>
        </div>
      </div>

      {dipendenti.length === 0 ? (
        <div className="vuoto">
          <div className="vuoto-icona">📊</div>
          <p className="vuoto-titolo">Nessun dipendente</p>
          <p className="vuoto-testo">Il resoconto si compila dai turni che imposti.</p>
        </div>
      ) : (
        <>
          <ScrollArea>
            <table className="tabella tabella-resoconto">
              <thead>
                <tr className="riga-gruppi">
                  <th className="col-nome" rowSpan={2}>Dipendente</th>
                  <th colSpan={4} className="gruppo-mese">{MESI[vista.mese]}</th>
                  <th colSpan={2} className="gruppo-anno">Anno {vista.anno}</th>
                </tr>
                <tr>
                  <th>Lavorati</th>
                  <th>Mattine</th>
                  <th>Sere</th>
                  <th>Ferie</th>
                  <th className="inizio-gruppo">Lavorati</th>
                  <th>Ferie</th>
                </tr>
              </thead>
              <tbody>
                {righe.map(({ dip, mese, anno }) => (
                  <tr key={dip.id}>
                    <td className="col-nome">
                      <div className="persona">
                        <Avatar nome={dip.nome} />
                        <div className="persona-testo">
                          <span className="persona-nome">{dip.nome}</span>
                          <span className={`pill-reparto piccola rep-${slugReparto(repartoDi(dip))}`}>
                            {repartoDi(dip)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="num num-neutro">{mese.lavorati}</span>
                      <span className="su-totale">di {mese.previsti}</span>
                    </td>
                    <td><span className="conta conta-mattina">{mese.mattine}</span></td>
                    <td><span className="conta conta-sera">{mese.sere}</span></td>
                    <td><span className="num num-usate">{mese.ferie}</span></td>

                    <td className="inizio-gruppo">
                      <span className="num num-neutro">{anno.lavorati}</span>
                      <span className="su-totale">di {anno.previsti}</span>
                    </td>
                    <td><span className="num num-usate">{anno.ferie}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="col-nome">Totale</td>
                  <td>
                    <span className="num num-neutro">{totali.lavorati}</span>
                    <span className="su-totale">di {totali.previsti}</span>
                  </td>
                  <td><span className="conta conta-mattina">{totali.mattine}</span></td>
                  <td><span className="conta conta-sera">{totali.sere}</span></td>
                  <td><span className="num num-usate">{totali.ferie}</span></td>
                  <td className="inizio-gruppo">
                    <span className="num num-neutro">{totali.annoLavorati}</span>
                    <span className="su-totale">di {totali.annoPrevisti}</span>
                  </td>
                  <td><span className="num num-usate">{totali.annoFerie}</span></td>
                </tr>
              </tfoot>
            </table>
          </ScrollArea>

          <p className="nota-resoconto">
            {meseFuturo
              ? 'Mese non ancora iniziato: sono indicati i soli giorni previsti dai turni.'
              : `Sono contati i giorni già trascorsi (al ${oggi.toLocaleDateString('it-IT')}); accanto, il totale previsto dai turni.`}
            {' '}Chiusure e ferie non vengono conteggiate.
          </p>
        </>
      )}
    </section>
  );
}
