// Il mutaforma: in attesa sulla piattaforma davanti al primo passaggio della Soglia.
// Vaga sulla piattaforma (cammina, si ferma, si guarda intorno) e, a caso, cambia forma:
// si scioglie in polvere di luce e si ricompone in un altro animale. Le forme: cervo, volpe, lepre, cicogna.
// Ogni animale usa le animazioni del proprio file. La cicogna si alza, vola alta sopra la Soglia, gira intorno al nido
// e torna alla piattaforma (area.volo: i punti del giro); al ritorno cambia di nuovo forma.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DIR = 'modelli/';
const FORME = [
  { nome: 'cervo', file: 'animali/cervo.glb', misura: 5.0, va: 'Walk', corre: 'Gallop', sta: ['Idle', 'Eating', 'Idle_Headlow'], vel: 1.8 },
  { nome: 'volpe', file: 'volpe.glb', misura: 3.0, va: 'Walk', corre: 'Run', sta: ['Survey'], vel: 1.6 },
  { nome: 'lepre', file: 'animali/lepre.glb', misura: 2.0, va: 'Running', corre: 'Running', sta: ['Guarding', 'Sitting.000'], vel: 3.0, texture: true },
  { nome: 'cicogna', file: 'cicogna.glb', misura: 4.6, vola: true, vel: 9 },
];

async function vesteLepre(root) {
  const tl = new THREE.TextureLoader(), L = async (f, srgb) => { const t = await tl.loadAsync(DIR + 'animali/' + f); t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const [pelo, col, nor] = await Promise.all([L('lepre_pelo.webp', 1), L('lepre_colore.webp', 1), L('lepre_normale.webp')]);
  root.traverse((o) => { if (o.isMesh) o.material = o.name === 'Rabbit' ? new THREE.MeshStandardMaterial({ map: col, normalMap: nor, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ map: pelo, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }); });
}

// carica un animale per nome, alla misura voluta (la dimensione maggiore, in metri), dentro un gruppo da posizionare
const loader = new GLTFLoader();
export async function caricaAnimale(nome, misura, parent) {
  const d = FORME.find((x) => x.nome === nome);
  const gl = await loader.loadAsync(DIR + d.file), root = gl.scene;
  if (d.texture) await vesteLepre(root);
  const box = new THREE.Box3().setFromObject(root), sz = box.getSize(V(0, 0, 0)), s = (misura || d.misura) / Math.max(sz.x, sz.y, sz.z);
  root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  const meshes = []; root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; meshes.push(o); } });
  const g = new THREE.Group(); g.add(root); parent.add(g);
  const mixer = new THREE.AnimationMixer(root), act = {}; for (const c of gl.animations) act[c.name] = mixer.clipAction(c);
  return { ...d, g, meshes, mixer, act, corrente: null,
    suona(n) { const x = act[n] || Object.values(act)[0]; if (!x || this.corrente === x) return; x.reset().play(); if (this.corrente) x.crossFadeFrom(this.corrente, 0.4, false); this.corrente = x; } };
}

export async function creaMutaforma(scene, area) {
  const forme = await Promise.all(FORME.map(async (d) => { const f = await caricaAnimale(d.nome, d.misura, scene); f.g.visible = false; return f; }));
  const FN = Object.fromEntries(forme.map((x) => [x.nome, x]));

  // la polvere: della trasformazione e dell'attraversamento delle fessure
  const N = 1100;
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  const polvere = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf6ead2, size: 0.13, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  polvere.frustumCulled = false; polvere.visible = false; scene.add(polvere);
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3), J = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) J[i] = Math.random() - 0.5;
  const tv = V(0, 0, 0);
  function campiona(fm, out) {
    fm.g.updateMatrixWorld(true);
    for (let i = 0; i < N; i++) { const m = fm.meshes[i % fm.meshes.length], n = m.geometry.attributes.position.count; m.getVertexPosition(Math.floor(Math.random() * n), tv); tv.applyMatrix4(m.matrixWorld); out[i * 3] = tv.x; out[i * 3 + 1] = tv.y; out[i * 3 + 2] = tv.z; }
  }
  // la nuvola: intorno a pos, schiacciata in profondità (sz) quando passa in una fessura; gira su sé stessa
  let sz = 1, tNow = 0;
  function nuvola(out) {
    for (let i = 0, j = 0; i < N; i++, j += 3) { const a = tNow * 2.2 + J[j + 1] * 9, c = Math.cos(a), s = Math.sin(a), x = J[j] * 1.8, z = J[j + 2] * 1.8;
      out[j] = pos.x + x * c - z * s * 0.3; out[j + 1] = pos.y + 1.1 + J[j + 1] * 1.8; out[j + 2] = pos.z + (x * s * 0.3 + z * c) * sz; }
  }

  // stato
  const pos = V((area.x0 + area.x1) / 2, area.y, 0), meta = V(0, 0, 0), p0 = V(0, 0, 0);
  const VOLO = new THREE.CatmullRomCurve3(area.volo, true, 'centripetal'), LV = VOLO.getLength(), tg = V(0, 0, 0);
  let u = 0, yaw = Math.PI / 2, f = forme[0], stato = 'sta', timer = 2, prossimo = 9 + Math.random() * 6, muta = null;
  let regia = false, inPolvere = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const suona = (fm, nome) => fm.suona(nome);
  function mostra(fm) { for (const x of forme) x.g.visible = !inPolvere && x === fm; }
  function avvia(fm) {
    if (fm.vola) { suona(fm); stato = 'vola'; u = 0; }
    else { stato = 'sta'; timer = rnd(0.5, 1.5); suona(fm, fm.sta[0]); }
  }
  function colloca(fm) {
    if (fm.vola && !regia) { VOLO.getPointAt(0, fm.g.position); VOLO.getTangentAt(0, tg); yaw = Math.atan2(tg.x, tg.z); } else fm.g.position.copy(pos);
    fm.g.rotation.set(0, yaw, 0);
  }
  // la trasformazione: verso una forma (oggetto) o verso la polvere ('polvere'); dur in secondi
  function avviaMuta(verso, dur) {
    if (muta) finisci();
    const pa = pg.attributes.position.array;
    if (inPolvere) A.set(pa); else { campiona(f, A); f.g.visible = false; }
    p0.copy(pos);
    if (verso !== 'polvere') { colloca(verso); verso.mixer.update(0.01); verso.g.visible = true; campiona(verso, B); verso.g.visible = false; }
    polvere.visible = true; return new Promise((res) => { muta = { k: 0, dur, verso, res }; });
  }
  function finisci() {
    const m = muta; muta = null;
    if (m.verso === 'polvere') { inPolvere = true; mostra(f); }
    else { inPolvere = false; polvere.visible = false; f = m.verso; if (!regia) avvia(f); colloca(f); mostra(f); }
    polvere.material.opacity = 1; m.res();
  }
  avvia(f); colloca(f); mostra(f);

  return {
    get forma() { return inPolvere ? 'polvere' : f.nome; },
    get oggetto() { return inPolvere ? null : f.g; },
    pos,
    nomi: FORME.map((x) => x.nome),
    // la regia dello Smistamento: ferma il vagare; muta, metti, corri; lascia lo riporta sulla piattaforma
    prendi() { regia = true; if (f.vola && !inPolvere) { f.g.rotation.x = 0; } },
    muta(nome, dur = 0.8) { const v = nome === 'polvere' ? 'polvere' : FN[nome]; if (v !== 'polvere' && v === f && !inPolvere) return Promise.resolve(); return avviaMuta(v, dur); },
    metti(x, y, z, ya) { pos.set(x, y, z); if (ya !== undefined) yaw = ya; if (!inPolvere && !muta) { f.g.position.copy(pos); f.g.rotation.y = yaw; } },
    schiaccia(v) { sz = v; },
    anima(chiave) { if (inPolvere) return; const n = chiave === 'corre' ? f.corre : chiave === 'va' ? f.va : chiave === 'sta' ? f.sta?.[0] : chiave; suona(f, n); },
    ferma(v) { if (f.corrente) f.corrente.timeScale = v; },
    lascia() { regia = false; if (muta) finisci(); inPolvere = false; polvere.visible = false; pos.set((area.x0 + area.x1) / 2, area.y, (area.z0 + area.z1) / 2); yaw = Math.PI / 2;
      for (const x of forme) { if (x.corrente) x.corrente.timeScale = 1; x.g.rotation.set(0, 0, 0); } f = forme.filter((x) => !x.vola)[Math.floor(Math.random() * 3)]; f.g.rotation.set(0, yaw, 0); avvia(f); colloca(f); mostra(f); prossimo = rnd(9, 16); },
    update(dt, t) {
      tNow = t;
      if (muta) { // la trasformazione: la polvere passa dalla forma vecchia alla nuova, e segue lo spostamento
        muta.k += dt / muta.dur; const k = Math.min(1, muta.k), e = k * k * (3 - 2 * k), b = Math.sin(Math.PI * k), p = pg.attributes.position.array;
        const dx = pos.x - p0.x, dy = pos.y - p0.y, dz = pos.z - p0.z;
        if (muta.verso === 'polvere') nuvola(B);
        for (let i = 0; i < N * 3; i += 3) { p[i] = A[i] + (B[i] - A[i]) * e + b * 1.2 * J[i] + dx; p[i + 1] = A[i + 1] + (B[i + 1] - A[i + 1]) * e + b * (0.5 + 1.0 * (J[i + 1] + 0.5)) + dy; p[i + 2] = A[i + 2] + (B[i + 2] - A[i + 2]) * e + b * 1.2 * J[i + 2] * sz + dz; }
        if (muta.verso === 'polvere') for (let i = 0; i < N * 3; i += 3) { p[i] -= dx * e; p[i + 1] -= dy * e; p[i + 2] -= dz * e; } // la nuvola è già nel posto giusto
        pg.attributes.position.needsUpdate = true; polvere.material.opacity = 0.45 + 0.55 * b;
        if (muta.verso !== 'polvere') { muta.verso.mixer.update(dt); }
        if (k >= 1) finisci();
        return;
      }
      if (inPolvere) { nuvola(pg.attributes.position.array); pg.attributes.position.needsUpdate = true; return; }
      f.mixer.update(dt);
      if (regia) return;
      prossimo -= dt;
      if (f.vola) { // il giro: alta sopra la Soglia, intorno al nido, ritorno; finito il giro cambia forma
        u = Math.min(1, u + dt * f.vel / LV); VOLO.getPointAt(u, f.g.position); VOLO.getTangentAt(u, tg);
        yaw = Math.atan2(tg.x, tg.z); f.g.rotation.y = yaw; f.g.rotation.x = -Math.asin(THREE.MathUtils.clamp(tg.y, -1, 1)) * 0.6;
        pos.set(f.g.position.x, area.y, f.g.position.z); prossimo = u >= 1 ? 0 : 1;
      } else if (stato === 'sta') {
        timer -= dt;
        if (timer <= 0) { meta.set(rnd(area.x0, area.x1), area.y, rnd(area.z0, area.z1)); if (meta.distanceTo(pos) > 5) { stato = 'va'; suona(f, f.va); } else timer = 1; }
      } else { // va: si gira piano verso la meta e cammina
        tv.subVectors(meta, pos); const d = Math.hypot(tv.x, tv.z), want = Math.atan2(tv.x, tv.z);
        let dyaw = want - yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)); yaw += Math.sign(dyaw) * Math.min(Math.abs(dyaw), dt * 2.2);
        const avanti = Math.abs(dyaw) < 0.9 ? f.vel * dt : 0; pos.x += Math.sin(yaw) * avanti; pos.z += Math.cos(yaw) * avanti;
        f.g.position.set(pos.x, area.y, pos.z); f.g.rotation.y = yaw;
        if (d < 0.4) { stato = 'sta'; timer = rnd(0.8, 2.5); suona(f, f.sta[Math.floor(Math.random() * f.sta.length)]); }
      }
      if (prossimo <= 0) { // cambia forma: mai la stessa
        const altre = forme.filter((x) => x !== f), verso = altre[Math.floor(Math.random() * altre.length)];
        if (!verso.vola) { pos.x = THREE.MathUtils.clamp(pos.x, area.x0, area.x1); pos.z = THREE.MathUtils.clamp(pos.z, area.z0, area.z1); pos.y = area.y; }
        prossimo = 99; avviaMuta(verso, 1.8);
      }
    },
  };
}
