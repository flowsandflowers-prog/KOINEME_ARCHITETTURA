// Verifica la regola sui testi del modello «La Soglia».
// - Ogni stringa delle sezioni PROMPT di soglia/testi.js deve comparire, carattere per carattere,
//   in soglia/fonte/PROMPT_MODULO_1.md (unica tolleranza: la maiuscola iniziale di un'etichetta).
// - Le stringhe APPROVATE e le PROPOSTE vengono elencate a parte; le PROPOSTE fanno fallire
//   il controllo se si passa --rigoroso (da usare quando il modello va pubblicato).
//
//   node scripts/verifica-testi.mjs            → controllo dei testi del prompt
//   node scripts/verifica-testi.mjs --rigoroso → in più, nessuna proposta in sospeso
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as T from '../soglia/testi.js';

// i segni del grassetto Markdown (**) sono formattazione, non testo: si tolgono prima del confronto
const fonte = readFileSync(fileURLToPath(new URL('../soglia/fonte/PROMPT_MODULO_1.md', import.meta.url)), 'utf8').replaceAll('**', '');
const rigoroso = process.argv.includes('--rigoroso');

function stringhe(v, percorso, out) {
  if (typeof v === 'string') out.push([percorso, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => stringhe(x, `${percorso}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) {
    if (k === 'spazio' || k === 'attivo' || k === 'n') continue; // chiavi tecniche, non testo
    stringhe(v[k], `${percorso}.${k}`, out);
  }
  return out;
}
const presente = (s) => fonte.includes(s) || fonte.includes(s[0].toLowerCase() + s.slice(1));

const dalPrompt = [
  ...stringhe(T.SPAZI, 'SPAZI', []),
  ...stringhe(T.ETICHETTE, 'ETICHETTE', []),
  ...stringhe(T.DOMANDE, 'DOMANDE', []),
  ['DOVE_VA', T.DOVE_VA],
  ...stringhe(T.VOCI, 'VOCI', []),
  ...stringhe(T.MEZZANINO_SPIEGAZIONE, 'MEZZANINO_SPIEGAZIONE', []),
];
const mancanti = dalPrompt.filter(([, s]) => !presente(s));
const approvati = stringhe(T.STANZE_CHIUSE, 'STANZE_CHIUSE', []);
const proposte = [...stringhe(T.INTERFACCIA, 'INTERFACCIA', []), ...stringhe(T.RACCORDI, 'RACCORDI', [])];

console.log(`Testi dal prompt: ${dalPrompt.length - mancanti.length}/${dalPrompt.length} trovati alla lettera.`);
for (const [p, s] of mancanti) console.log(`  NON TROVATO  ${p}: «${s}»`);
console.log(`Approvati in chat: ${approvati.length} (${approvati.map(([, s]) => s).join(', ')})`);
console.log(`Proposte da approvare: ${proposte.length}`);
for (const [p, s] of proposte) console.log(`  ${p}: «${s}»`);

if (mancanti.length || (rigoroso && proposte.length)) {
  console.error(mancanti.length ? '\nERRORE: ci sono testi che non sono nel prompt.' : '\nERRORE: ci sono proposte non ancora approvate.');
  process.exit(1);
}
