import React from 'react';

// Iniziali del nome: "Mario Rossi" -> "MR"
const iniziali = (nome) =>
  nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

// Tinta stabile ricavata dal nome, così ogni persona ha sempre lo stesso colore
const tinta = (nome) => {
  let somma = 0;
  for (const c of nome) somma = (somma + c.charCodeAt(0) * 7) % 360;
  return somma;
};

export default function Avatar({ nome, size = 'md' }) {
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ '--tinta': tinta(nome) }}
      aria-hidden="true"
    >
      {iniziali(nome)}
    </span>
  );
}
