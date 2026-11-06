// La casa: il plastico, nel linguaggio di House IV di Peter Eisenman (cartoncino bianco, griglia, piani).
// Unità: metri. La griglia è un quadrato di nove: celle di 5 m separate da fasce di 1,5 m; i pilastri stanno sugli
// incroci delle linee x, z ∈ {-9, -3.25, 3.25, 9}.
//   fondamenta   y ≤ -6      la platea, ferma
//   interrato    -6 … 0      il vuoto in cui scende il piano terra (la linea di base mobile)
//   piano terra  0           il piano di sotto: una lastra sui quattro appoggi; quota, appoggi, ampiezza
//   piano primo  4.3         ingresso in quota: la Soglia (tre telai sul passaggio), il corridoio (nella fascia),
//                            l'anticamera (la fascia accanto alla stanza, con tre schermi), la stanza al centro,
//                            a doppia altezza, e intorno le otto stanze chiuse
//   sopra        8.3 … 12.6  le coperture delle otto, il telaio sopra la stanza (la struttura), il mezzanino appeso
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const G = [-9, -3.25, 3.25, 9];           // le linee della griglia
export const C = [-6.5, 0, 6.5], CELLA = 5;       // i centri delle celle, il lato
export const Y = { fond: -6, terra: 0, primo: 4.3, tetto: 8.3, alto: 12.3 };

export function costruisciCasa(scene, { bordi = true } = {}) {
  const M = {
    carta: new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.92 }),
    cartaOmbra: new THREE.MeshStandardMaterial({ color: 0xe4e0d8, roughness: 0.95 }),
    base: new THREE.MeshStandardMaterial({ color: 0x232325, roughness: 0.85 }),
    terra: new THREE.MeshStandardMaterial({ color: 0xa9bccb, roughness: 0.9 }),     // il piano di sotto: azzurro cartoncino
    appoggio: new THREE.MeshStandardMaterial({ color: 0xb06f58, roughness: 0.85 }), // i quattro appoggi: terracotta
    fessura: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 }),
    caldo: new THREE.MeshStandardMaterial({ color: 0xffe2bd, emissive: 0xffb877, emissiveIntensity: 0.55, roughness: 1 }),
  };
  const edgeM = new THREE.LineBasicMaterial({ color: 0x8b857c });
  const casa = new THREE.Group(); scene.add(casa);
  const parti = {}; // gruppi per nome, per accendere/spegnere e per le etichette
  const gruppo = (k) => (parti[k] ||= Object.assign(new THREE.Group(), { name: k }), casa.add(parti[k]), parti[k]);
  // un parallelepipedo dai due estremi (x0,y0,z0)-(x1,y1,z1)
  function blocco(k, x0, y0, z0, x1, y1, z1, mat = M.carta, edges = bordi) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = m.receiveShadow = true;
    gruppo(k).add(m);
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeM); e.position.copy(m.position); gruppo(k).add(e); }
    return m;
  }
  const t = 0.14; // spessore delle pareti di cartoncino

  /* ---------- la base del plastico, con lo scavo dell'interrato ---------- */
  const H = 9.3, R = 34;
  blocco('base', -R, -7.2, -R, -H, 0, R, M.base, false); blocco('base', H, -7.2, -R, R, 0, R, M.base, false);
  blocco('base', -H, -7.2, -R, H, 0, -H, M.base, false); blocco('base', -H, -7.2, H, H, 0, R, M.base, false);
  /* ---------- le fondamenta: la platea ---------- */
  blocco('fondamenta', -H, -7.2, -H, H, Y.fond, H, M.cartaOmbra);
  /* ---------- l'interrato: le pareti contro terra ---------- */
  blocco('interrato', -H, Y.fond, -H, -H + t, 0, H); blocco('interrato', H - t, Y.fond, -H, H, 0, H);
  blocco('interrato', -H, Y.fond, -H, H, 0, -H + t); blocco('interrato', -H, Y.fond, H - t, H, 0, H);
  /* ---------- i pilastri della griglia ---------- */
  for (const x of G) for (const z of G) { const dentro = Math.abs(x) < 4 && Math.abs(z) < 4; blocco('struttura', x - 0.2, Y.fond, z - 0.2, x + 0.2, dentro ? Y.alto + 0.3 : Y.tetto + 0.2, z + 0.2); }
  /* ---------- il piano terra (il piano di sotto) sui quattro appoggi ---------- */
  const terra = new THREE.Group(); terra.name = 'pianoTerra'; casa.add(terra); parti.pianoTerra = terra;
  { const g = new THREE.BoxGeometry(17.6, 0.3, 17.6), m = new THREE.Mesh(g, M.terra); m.position.y = -0.15; m.castShadow = m.receiveShadow = true; terra.add(m); if (bordi) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeM); e.position.copy(m.position); terra.add(e); } }
  const appoggi = [[-6.2, -6.2], [6.2, -6.2], [-6.2, 6.2], [6.2, 6.2]].map(([x, z]) => blocco('appoggi', x - 0.18, Y.fond, z - 0.18, x + 0.18, -0.3, z + 0.18, M.appoggio));
  /* ---------- il piano primo ---------- */
  blocco('primo', -H, Y.primo - 0.3, -H, H, Y.primo, H);
  // le otto stanze chiuse: celle murate, con la copertura e una sola fessura scura (la porta chiusa) verso la stanza
  const OTTO = [];
  for (const cx of C) for (const cz of C) {
    if (cx === 0 && cz === 0) continue;
    const x0 = cx - 2.5, x1 = cx + 2.5, z0 = cz - 2.5, z1 = cz + 2.5, k = 'otto';
    blocco(k, x0, Y.primo, z0, x1, Y.tetto, z0 + t); blocco(k, x0, Y.primo, z1 - t, x1, Y.tetto, z1);
    blocco(k, x0, Y.primo, z0, x0 + t, Y.tetto, z1); blocco(k, x1 - t, Y.primo, z0, x1, Y.tetto, z1);
    blocco(k, x0 - 0.1, Y.tetto, z0 - 0.1, x1 + 0.1, Y.tetto + 0.2, z1 + 0.1);
    // la porta chiusa: una fessura sul lato rivolto alla stanza
    const dx = -Math.sign(cx), dz = -Math.sign(cz);
    if (dx !== 0 && dz === 0) { const x = dx > 0 ? x1 + 0.01 : x0 - 0.01; blocco(k, x - 0.02, Y.primo, cz - 0.05, x + 0.02, Y.primo + 2.4, cz + 0.05, M.fessura, false); }
    else if (dz !== 0) { const z = dz > 0 ? z1 + 0.01 : z0 - 0.01; blocco(k, cx - 0.05, Y.primo, z - 0.02, cx + 0.05, Y.primo + 2.4, z + 0.02, M.fessura, false); }
    OTTO.push(V(cx, Y.primo + 2, cz));
  }
  // la stanza: la cella centrale, a doppia altezza, aperta verso l'anticamera (lato ovest)
  { const k = 'stanza', x0 = -2.5, x1 = 2.5, z0 = -2.5, z1 = 2.5;
    blocco(k, x0, Y.primo, z0, x1, Y.alto, z0 + t); blocco(k, x0, Y.primo, z1 - t, x1, Y.alto, z1); blocco(k, x1 - t, Y.primo, z0, x1, Y.alto, z1);
    blocco(k, x0, Y.primo, z0, x0 + t, Y.alto, -0.7); blocco(k, x0, Y.primo, 0.7, x0 + t, Y.alto, z1); blocco(k, x0, Y.primo + 2.7, -0.7, x0 + t, Y.alto, 0.7);
    blocco(k, -2.3, Y.primo, -2.3, 2.3, Y.primo + 0.02, 2.3, M.caldo, false); // la sola luce calda
  }
  // l'anticamera: la fascia a ovest della stanza, con tre schermi sfalsati, ognuno con una fessura
  [-2.0, -1.2, -0.4].forEach((z, i) => { const k = 'anticamera', s = [-3.6, -3.0, -3.35][i], y0 = Y.primo, y1 = Y.primo + 3;
    blocco(k, -4.0, y0, z - 0.04, s - 0.12, y1, z + 0.04); blocco(k, s + 0.12, y0, z - 0.04, -2.5, y1, z + 0.04); });
  /* ---------- il telaio sopra la stanza (la struttura) e il mezzanino appeso ---------- */
  { const k = 'struttura', y0 = Y.alto, y1 = Y.alto + 0.3;
    blocco(k, -3.45, y0, -3.45, 3.45, y1, -3.05); blocco(k, -3.45, y0, 3.05, 3.45, y1, 3.45); blocco(k, -3.45, y0, -3.45, -3.05, y1, 3.45); blocco(k, 3.05, y0, -3.45, 3.45, y1, 3.45);
    blocco(k, -0.15, y0, -3.25, 0.15, y1, 3.25); blocco(k, -3.25, y0, -0.15, 3.25, y1, 0.15); }
  { const k = 'mezzanino', x = 1.25, z = 1.25, y = Y.tetto + 0.4;
    blocco(k, x - 1.05, y, z - 1.05, x + 1.05, y + 0.12, z + 1.05);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) blocco(k, x + dx - 0.02, y + 0.12, z + dz - 0.02, x + dx + 0.02, Y.alto, z + dz + 0.02, M.carta, false); }
  /* ---------- l'ingresso in quota: il passaggio, la Soglia (tre telai), la scala che scende al piano terra ---------- */
  const zP = -3.25, wP = 0.8, xA = -40;
  blocco('passaggio', xA, Y.primo - 0.3, zP - wP, -H, Y.primo, zP + wP);
  for (const x of [-33, -24, -15]) blocco('passaggio', x - 0.25, 0, zP - 0.25, x + 0.25, Y.primo - 0.3, zP + 0.25);
  const SOGLIA = [-31, -27, -23];
  for (const x of SOGLIA) { const k = 'soglia', a = 0.22, h = Y.primo + 3.2;
    blocco(k, x - a / 2, Y.primo, zP - wP - a, x + a / 2, h, zP - wP); blocco(k, x - a / 2, Y.primo, zP + wP, x + a / 2, h, zP + wP + a);
    blocco(k, x - a / 2, h, zP - wP - a, x + a / 2, h + a, zP + wP + a); }
  // la scala: un pieno gradinato che scende dal passaggio, di lato, fino al piano terra
  { const n = 16, x0 = -19.2, x1 = -17.6, zA = zP + wP, run = 0.5, rise = Y.primo / n;
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, Y.primo);
    for (let i = 0; i < n; i++) { sh.lineTo(i * run + run, Y.primo - i * rise); sh.lineTo(i * run + run, Y.primo - (i + 1) * rise); }
    sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x1, 0, zA);
    const m = new THREE.Mesh(g, M.carta); m.castShadow = m.receiveShadow = true; gruppo('vie').add(m);
    if (bordi) gruppo('vie').add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), edgeM)); }

  const ANCORE = {
    soglia: V(-27, Y.primo + 4.2, zP), corridoio: V(-6.2, Y.primo + 1, zP), anticamera: V(-3.25, Y.primo + 3.4, -1.2), stanza: V(0, Y.alto + 1.2, 0),
    mezzanino: V(1.25, Y.tetto + 1.2, 1.25), vie: V(-18.4, 2.6, 2.5), sotto: V(0, 0.6, 7.5), fondamenta: V(0, -6.6, 8.5), struttura: V(0, Y.alto + 1.6, 3.3),
  };
  return { casa, parti, M, OTTO, ANCORE, SOGLIA, terra, appoggi, zP };
}
