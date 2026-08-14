import React, { useMemo } from 'react';
import { GIORNI, GIORNI_SIGLA, classeReparto, repartoDi, stileMansione } from '../costanti';
import { aIso, chiaveGiorno, etichettaMese, giorniDelMese } from '../date';

const indiceSettimana = (data) => (data.getDay() + 6) % 7;

/** "Domenico Barbatano" → "DB": quello che ci sta nelle caselle strette. */
const iniziali = (nome) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

/**
 * Il mese davanti agli occhi, giorno per giorno, con scritto chi è in
 * ferie. Ogni nome porta il colore della sua mansione: così si vede
 * subito se a mancare è la sala o la pizzeria.
 */
export default function MeseFerie({ mese, onCambiaMese, suOggi, dipendenti, ferie, giorniChiusura }) {
  // giorno per giorno, chi è in ferie in quel mese
  const perGiorno = useMemo(() => {
    const mappa = new Map();

    dipendenti.forEach(dip => {
      (ferie[dip.id] || []).forEach(data => {
        mappa.set(data, [...(mappa.get(data) || []), dip]);
      });
    });

    return mappa;
  }, [dipendenti, ferie]);

  const giorni = giorniDelMese(mese);
  const isoOggi = aIso(new Date());

  // le caselle partono dal lunedì, come nel resto dell'app
  const celle = [];
  for (let i = 0; i < indiceSettimana(new Date(`${giorni[0]}T00:00:00`)); i++) celle.push(null);
  celle.push(...giorni);

  const quantiInFerie = giorni.reduce((somma, g) => somma + (perGiorno.get(g)?.length || 0), 0);
  const meseDiOggi = giorni.includes(isoOggi);

  return (
    <div className="mese-ferie">
      <div className="mese-ferie-testa">
        <div>
          <h3>Chi è in ferie</h3>
          <p className="mese-ferie-sub">
            {quantiInFerie === 0
              ? 'Nessuno in ferie in questo mese'
              : `${quantiInFerie} ${quantiInFerie === 1 ? 'giorno di ferie' : 'giorni di ferie'} in questo mese`}
          </p>
        </div>

        <div className="navigazione-mese">
          <button className="icon-btn" onClick={() => onCambiaMese(-1)} title="Mese precedente">‹</button>
          <span className="mese-corrente">{etichettaMese(mese)}</span>
          <button className="icon-btn" onClick={() => onCambiaMese(1)} title="Mese successivo">›</button>
          {!meseDiOggi && (
            <button className="btn btn-secondario btn-oggi" onClick={suOggi}>Oggi</button>
          )}
        </div>
      </div>

      <div className="mese-ferie-sigle">
        {GIORNI_SIGLA.map((s, i) => (
          <span key={s} className={giorniChiusura.includes(GIORNI[i]) ? 'chiusa' : ''}>{s}</span>
        ))}
      </div>

      <div className="mese-ferie-griglia">
        {celle.map((iso, i) => {
          if (!iso) return <div key={`v${i}`} className="giorno-mese vuoto" />;

          const chi = perGiorno.get(iso) || [];
          const chiuso = giorniChiusura.includes(chiaveGiorno(iso));
          const classi = ['giorno-mese'];

          if (chiuso) classi.push('chiuso');
          if (chi.length > 0) classi.push('con-ferie');
          if (iso === isoOggi) classi.push('oggi');

          return (
            <div key={iso} className={classi.join(' ')}>
              <span className="giorno-numero">{Number(iso.slice(8))}</span>

              {chi.map(dip => {
                const reparto = repartoDi(dip);
                return (
                  <span
                    key={dip.id}
                    className={`ferie-chip ${classeReparto(reparto)}`}
                    style={stileMansione(reparto)}
                    title={`${dip.nome} — ${reparto}`}
                  >
                    <span className="ferie-chip-nome">{dip.nome}</span>
                    {/* sul telefono al posto del nome restano le iniziali:
                        per chi legge con la voce il nome c'è già sopra */}
                    <span className="ferie-chip-iniziali" aria-hidden="true">{iniziali(dip.nome)}</span>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
