import React from 'react';

export default function TurniSection({ dipendenti, turni, setTurni, giorni, giorniLabel, giorniChiusura }) {
  const handleTurnoChange = (dipendentiId, giorno, valore) => {
    setTurni({
      ...turni,
      [dipendentiId]: {
        ...turni[dipendentiId],
        [giorno]: valore
      }
    });
  };

  return (
    <section className="section turni-section">
      <h2>📅 Turni Settimanali</h2>
      {dipendenti.length === 0 ? (
        <p className="empty">Nessun dipendente. Aggiungine uno per iniziare!</p>
      ) : (
        <div className="turni-table-container">
          <table className="turni-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                {giorniLabel.map((g, idx) => (
                  <th key={idx} className={giorniChiusura.includes(giorni[idx]) ? 'chiuso' : ''}>
                    {g}
                    {giorniChiusura.includes(giorni[idx]) && <span className="closed-badge">CHIUSO</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dipendenti.map(dip => (
                <tr key={dip.id}>
                  <td className="nome-dipendente">{dip.nome}</td>
                  {giorni.map((giorno, idx) => (
                    <td key={idx} className={giorniChiusura.includes(giorno) ? 'chiuso' : ''}>
                      <select
                        value={turni[dip.id]?.[giorno] || ''}
                        onChange={(e) => handleTurnoChange(dip.id, giorno, e.target.value)}
                        disabled={giorniChiusura.includes(giorno)}
                        className={giorniChiusura.includes(giorno) ? 'disabled' : ''}
                      >
                        <option value="Mattina">Mattina</option>
                        <option value="Sera">Sera</option>
                        <option value="Riposo">Riposo</option>
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
