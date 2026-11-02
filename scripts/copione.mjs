// Genera soglia/COPIONE.md a partire da soglia/testi.js, così il copione da registrare
// e il modello usano le stesse parole. Elenca anche i nomi dei file audio, che il modello
// cercherà in soglia/voce/ (uno per pezzo; finché un file manca, legge la voce sintetica).
//
//   node scripts/copione.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPAZI, ORDINE, DOMANDE, DOVE_VA, VOCI, RACCORDI, ETICHETTE } from '../soglia/testi.js';

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[«»"']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);

// Ogni pezzo parlato: file, testo, provenienza ('prompt' o 'raccordo').
export function pezzi() {
  const P = [];
  P.push({ file: '00-apertura', testo: RACCORDI.apertura, da: 'raccordo', quando: "All'apertura, prima de «L'edificio»." });
  for (const k of ORDINE) {
    const s = SPAZI[k];
    const righe = [s.nome + '.', ...s.testo];
    if (s.formula) righe.push(s.formula);
    P.push({ file: `spazio-${k}`, testo: righe.join('\n\n'), da: 'prompt', quando: `Quando si entra in «${s.nome}».` });
  }
  P.push({ file: 'appoggi-invito', testo: RACCORDI.appoggiInvito, da: 'raccordo', quando: '«Il piano di sotto», dopo il testo, quando i quattro appoggi diventano toccabili.' });
  P.push({ file: 'voce-entra', testo: RACCORDI.voceEntra, da: 'raccordo', quando: 'Ogni volta che una voce dello Smistamento parte.' });
  for (const v of VOCI) P.push({ file: `voce-${String(v.n).padStart(2, '0')}`, testo: v.voce, da: 'prompt', quando: `La voce ${v.n}, mentre si avvicina al primo arco.` });
  DOMANDE.forEach((d, i) => P.push({ file: `domanda-${i + 1}`, testo: d, da: 'prompt', quando: `Sotto l'arco ${i + 1}, per ogni voce.` }));
  // le risposte si ripetono fra le voci: un file per ogni risposta diversa
  const viste = new Map();
  VOCI.forEach((v) => v.risposte.forEach((r, i) => {
    const f = `risposta-${slug(r)}`;
    if (!viste.has(f)) viste.set(f, { file: f, testo: r, da: 'prompt', quando: [] });
    viste.get(f).quando.push(`voce ${v.n}, arco ${i + 1}`);
  }));
  for (const r of viste.values()) P.push({ ...r, quando: r.quando.join('; ') });
  P.push({ file: 'voce-arriva', testo: RACCORDI.voceArriva, da: 'raccordo', quando: 'Dopo il terzo arco, prima di «Dove va», per le voci che vanno in uno spazio.' });
  const dest = new Map();
  for (const v of VOCI) {
    const f = `dove-${v.spazio}`;
    if (!dest.has(f)) dest.set(f, { file: f, testo: v.doveVa, da: 'prompt', quando: [] });
    dest.get(f).quando.push(`voce ${v.n}`);
  }
  for (const d of dest.values()) P.push({ ...d, quando: d.quando.join(', ') });
  P.push({ file: 'voce-struttura', testo: RACCORDI.voceStruttura, da: 'raccordo', quando: 'Voce 6, al posto di «voce-arriva»: la voce resta nella Soglia.' });
  return P;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const P = pezzi();
  const raccordi = P.filter((p) => p.da === 'raccordo');
  const quote = (t) => t.split('\n\n').map((r) => '> ' + r).join('\n>\n');
  let md = `# Copione della voce · La Soglia

*Generato da \`scripts/copione.mjs\` a partire da \`soglia/testi.js\`: non si modifica a mano, si modifica \`testi.js\` e si rigenera.*

## Come si registra

| | |
|---|---|
| Pezzi da registrare | **${P.length}**, di cui ${P.length - raccordi.length} dai testi del Modulo 1 e ${raccordi.length} raccordi |
| Un file per pezzo | con il nome indicato, in \`.mp3\` o \`.m4a\` (anche \`.wav\` va bene, li converto io) |
| Dove vanno | nella cartella \`public/soglia/voce/\` (e il nome in \`elenco.json\`), oppure me li mandi e li metto io |
| Inizio e fine | mezzo secondo di silenzio prima e dopo; li taglio io se servono |
| Il punto mediano « · » | si legge come una pausa breve |
| Le note | (*Trascina per girarci intorno…*, *Sotto: il piano di sotto…*, *Intorno, otto stanze…*, *Muovi la quota…*) restano **solo scritte**: sono istruzioni per lo schermo |
| Finché un file manca | il modello legge quel pezzo con la voce sintetica |

I raccordi sono segnati **[RACCORDO · da approvare]** e sono elencati anche in fondo, in *Aggiunte mie*: si possono cambiare o togliere in blocco.

`;
  let sezione = '';
  const titolo = (f) => f.startsWith('00') ? 'Apertura' : f.startsWith('spazio') ? 'Gli spazi' : f === 'appoggi-invito' ? 'Il piano di sotto, invito' : 'Lo Smistamento';
  for (const p of P) {
    const t = titolo(p.file);
    if (t !== sezione) { md += `\n## ${t}\n\n`; sezione = t; }
    md += `### \`${p.file}\`${p.da === 'raccordo' ? ' · [RACCORDO · da approvare]' : ''}\n\n*${p.quando}*\n\n${quote(p.testo)}\n\n`;
  }
  md += `## Aggiunte mie\n\nTutto quello che nel copione non viene dal prompt del Modulo 1.\n\n`;
  for (const r of raccordi) md += `- \`${r.file}\`: «${r.testo}»\n`;
  md += `\nNon sono raccordi, ma scelte mie da confermare:\n\n- I nomi degli spazi (es. «La Soglia.») si leggono prima del loro testo.\n- Le formule (es. «SOGLIA → C.O.R.E.») si leggono dopo il testo; «→» si legge come pausa.\n- Le note restano solo scritte.\n- Le risposte uguali fra le voci si registrano una volta sola (es. «sì», «no», «il corpo»).\n`;
  writeFileSync(fileURLToPath(new URL('../soglia/COPIONE.md', import.meta.url)), md);
  console.log(`soglia/COPIONE.md: ${P.length} pezzi (${raccordi.length} raccordi).`);
}
