// Anteprima dei percorsi: un animale in ogni spazio di destinazione, per vedere l'abbinamento proposto.
// Si accende con ?percorsi nell'indirizzo. Il mutaforma davanti alla Soglia resta com'è.
//   la stanza: il cervo in movimento, gira intorno alla luce calda
//   l'anticamera: il cervo fermo, a testa bassa, nel collo del nido
//   il corridoio: la volpe che cammina senza fine sul nastro di Möbius
//   il piano di sotto: la lepre di guardia sul pavimento blu (segue il livello); ogni tanto scatta
//   le fondamenta: nessun animale; una nuvola di polvere scende la scala fino al fondo e si posa fra i sassi
//   la struttura: la cicogna che gira alta intorno a tutto l'edificio
//   il mezzanino: vuoto, in attesa della scimmia
import * as THREE from 'three';
import { caricaAnimale } from './mutaforma.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function creaAbitanti(scene, W, { Q, NC, FOND }) {
  const [cervo, cervo2, volpe, lepre, cicogna] = await Promise.all([
    caricaAnimale('cervo', 4.2, W.SOPRA), caricaAnimale('cervo', 3.0, W.SOPRA), caricaAnimale('volpe', 2.4, W.SOPRA),
    caricaAnimale('lepre', 2.4, W.SOTTO), caricaAnimale('cicogna', 7, W.SOPRA)]);
  // dopo la Soglia sono luminosi
  const luce = new THREE.MeshStandardMaterial({ color: 0xe4e9f0, roughness: 0.6, emissive: 0xeef3ff, emissiveIntensity: 0.85 });
  for (const a of [cervo, cervo2, volpe, lepre, cicogna]) for (const m of a.meshes) m.material = luce;
  cervo.suona('Walk'); cervo2.suona('Idle_Headlow'); volpe.suona('Walk'); lepre.suona('Guarding'); cicogna.suona();

  // l'anticamera: fermo nel collo, guarda verso la stanza
  { const p = W.NECK.getPointAt(0.12), q = W.NECK.getPointAt(0.3); cervo2.g.position.set(p.x, Q, p.z); cervo2.g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); }

  // la polvere delle fondamenta: un rivolo che scende la scala (prima rampa, pianerottolo, seconda rampa) e si sparge fra i sassi
  const S = W.SCALA, h = 0.7;
  const via = new THREE.CatmullRomCurve3([V(S.x0 + 4, Q + h, 0), V(S.x0, Q + h, S.z), V(S.xL, S.ym + h, S.z), V(S.xE + 3, S.ym + h, (S.z + S.z2) / 2),
    V(S.xL, S.ym + h, S.z2), V(S.x1, FOND + h, S.z2), V(S.x1 + 12, FOND + 1.2, 34), V(S.x1 + 30, FOND + 1.5, 40)], false, 'centripetal');
  const N = 900, off = new Float32Array(N), jit = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { off[i] = Math.random(); jit[i * 3] = Math.random() - 0.5; jit[i * 3 + 1] = Math.random(); jit[i * 3 + 2] = Math.random() - 0.5; }
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  const polvere = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf6ead2, size: 0.25, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  polvere.frustumCulled = false; W.SOPRA.add(polvere);

  // il giro della cicogna: alto, intorno a tutto l'edificio
  const giro = new THREE.CatmullRomCurve3([...Array(32)].map((_, i) => { const a = (i / 32) * Math.PI * 2; return V(55 + 125 * Math.cos(a), Q + 78 + 8 * Math.sin(a * 2), 72 * Math.sin(a)); }), true);
  const LG = giro.getLength();

  const tA = V(0, 0, 0), tB = V(0, 0, 0), RN = V(0, 0, 0), RF = V(0, 0, 0), RX = V(0, 0, 0), M = new THREE.Matrix4();
  let fase = 0, scatto = 0;
  // per la camera: dove sta l'animale di ogni spazio (in coordinate del mondo) e da che distanza guardarlo
  const FONDO = V(S.x1 + 12, FOND + 1.5, 34);
  const DI = { stanza: cervo, anticamera: cervo2, corridoio: volpe, sotto: lepre, struttura: cicogna };
  const VISTA = { stanza: [-4, 4, 5], anticamera: [-13, 4, 7], corridoio: [6, 5, 26], sotto: [9, 4, 13], struttura: [-28, 10, 30], fondamenta: [-22, 14, 38] };
  return {
    VISTA,
    posizione(k, out) { if (k === 'fondamenta') return out.copy(FONDO); const a = DI[k]; if (!a) return null; a.g.getWorldPosition(out); out.y += 1.2; return out; },
    update(dt, t) {
      for (const a of [cervo, cervo2, volpe, lepre, cicogna]) a.mixer.update(dt);
      // la stanza: un cerchio intorno alla luce
      { const a = t * 1.6 / 9; cervo.g.position.set(NC.x + Math.cos(a) * 9, Q, NC.z + Math.sin(a) * 9); cervo.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); }
      // il corridoio: sul nastro, i piedi sulla superficie anche capovolta
      if (W.mobius) { const th = (t * 1.5 / 13) % (Math.PI * 4); W.mobius(th, 0, tA, RN); W.mobius(th + 0.01, 0, tB); RF.subVectors(tB, tA).normalize(); RX.crossVectors(RN, RF); M.makeBasis(RX, RN, RF); volpe.g.quaternion.setFromRotationMatrix(M); volpe.g.position.copy(tA); }
      // il piano di sotto: di guardia; ogni 7 secondi un breve scatto in tondo
      fase += dt; if (fase > 7) { fase = 0; scatto = 1.6; lepre.suona('Running'); }
      if (scatto > 0) { scatto -= dt; if (scatto <= 0) lepre.suona('Guarding'); }
      { const a = t * 0.05 + (scatto > 0 ? (1.6 - scatto) * 0.5 : 0); lepre.g.position.set(68 + Math.cos(a * 4) * 6, 0, 36 + Math.sin(a * 4) * 6); lepre.g.rotation.y = Math.atan2(-Math.sin(a * 4), Math.cos(a * 4)); }
      // le fondamenta: ogni granello percorre la scala in circa 8 secondi, poi si sparge e si posa
      { const p = pg.attributes.position.array;
        for (let i = 0; i < N; i++) { const u = (t / 8 + off[i]) % 1; via.getPointAt(u, tA); const sp = u > 0.78 ? (u - 0.78) / 0.22 : 0, r = 0.6 + 14 * sp;
          p[i * 3] = tA.x + jit[i * 3] * r; p[i * 3 + 1] = tA.y + jit[i * 3 + 1] * (0.8 - 0.6 * sp); p[i * 3 + 2] = tA.z + jit[i * 3 + 2] * r; }
        pg.attributes.position.needsUpdate = true; }
      // la struttura: il giro alto
      { const u = (t * 10 / LG) % 1; giro.getPointAt(u, cicogna.g.position); giro.getTangentAt(u, tA); cicogna.g.rotation.y = Math.atan2(tA.x, tA.z); }
    },
  };
}
