import React from 'react';

export default function GiorniChiusuraSection({ giorniChiusura, setGiorniChiusura, giorniLabel }) {
  const handleToggleGiorno = (giorno) => {
    if (giorniChiusura.includes(giorno)) {
      setGiorniChiusura(giorniChiusura.filter(g => g !== giorno));
    } else {
      setGiorniChiusura([...giorniChiusura, giorno]);
    }
  };

  return (
    <section className="section giorni-chiusura-section">
      <h2>🚫 Giorni di Chiusura</h2>
      <div className="giorni-grid">
        {giorniLabel.map((giorno, idx) => (
          <label key={idx} className="checkbox-label">
            <input
              type="checkbox"
              checked={giorniChiusura.includes(giorno.toLowerCase())}
              onChange={() => handleToggleGiorno(giorno.toLowerCase())}
            />
            <span>{giorno}</span>
          </label>
        ))}
      </div>
      {giorniChiusura.length > 0 && (
        <p className="info">Giorni chiusi: {giorniChiusura.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}</p>
      )}
    </section>
  );
}
