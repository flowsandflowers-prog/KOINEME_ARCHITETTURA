// Il mutaforma: in attesa sulla piattaforma davanti al primo passaggio della Soglia.
// Vaga sulla piattaforma (cammina, si ferma, si guarda intorno) e, a caso, cambia forma:
// si scioglie in polvere di luce e si ricompone in un altro animale. Le forme: cervo, volpe, lepre, cicogna.
// Ogni animale usa le animazioni del proprio file; la cicogna vola in cerchi bassi sopra la piattaforma.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DIR = 'modelli/';
const FORME = [
  { nome: 'cervo', file: 'animali/cervo.glb', misura: 5.0, va: 'Walk', sta: ['Idle', 'Eating', 'Idle_Headlow'], vel: 1.8 },
  { nome: 'volpe', file: 'volpe.glb', misura: 3.0, va: 'Walk', sta: ['Survey'], vel: 1.6 },
  { nome: 'lepre', file: 'animali/lepre.glb', misura: 2.0, va: 'Running', sta: ['Guarding', 'Sitting.000'], vel: 3.0, texture: true },
  { nome: 'cicogna', file: 'cicogna.glb', misura: 4.6, vola: true, vel: 2.2 },
];

async function vesteLepre(root) {
  const tl = new THREE.TextureLoader(), L = async (f, srgb) => { const t = await tl.loadAsync(DIR + 'animali/' + f); t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const [pelo, col, nor] = await Promise.all([L('lepre_pelo.webp', 1), L('lepre_colore.webp', 1), L('lepre_normale.webp')]);
  root.traverse((o) => { if (o.isMesh) o.material = o.name === 'Rabbit' ? new THREE.MeshStandardMaterial({ map: col, normalMap: nor, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ map: pelo, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }); });
}

export async function creaMutaforma(scene, area) {
  const loader = new GLTFLoader();
  const forme = await Promise.all(FORME.map(async (d) => {
    const gl = await loader.loadAsync(DIR + d.file), root = gl.scene;
    if (d.texture) await vesteLepre(root);
    const box = new THREE.Box3().setFromObject(root), sz = box.getSize(V(0, 0, 0)), s = d.misura / Math.max(sz.x, sz.y, sz.z);
    root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
    const meshes = []; root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; meshes.push(o); } });
    const g = new THREE.Group(); g.add(root); g.visible = false; scene.add(g);
    const mixer = new THREE.AnimationMixer(root), act = {}; for (const c of gl.animations) act[c.name] = mixer.clipAction(c);
    return { ...d, g, meshes, mixer, act, corrente: null };
  }));

  // la polvere della trasformazione
  const N = 1100;
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  const polvere = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf6ead2, size: 0.13, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  polvere.frustumCulled = false; polvere.visible = false; scene.add(polvere);
  const A = new Float32Array(N * 3), B = new Float32Array(N * 3), J = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) J[i] = Math.random() - 0.5;
  const tv = V(0, 0, 0);
  function campiona(f, out) {
    f.g.updateMatrixWorld(true);
    for (let i = 0; i < N; i++) { const m = f.meshes[i % f.meshes.length], n = m.geometry.attributes.position.count; m.getVertexPosition(Math.floor(Math.random() * n), tv); tv.applyMatrix4(m.matrixWorld); out[i * 3] = tv.x; out[i * 3 + 1] = tv.y; out[i * 3 + 2] = tv.z; }
  }

  // stato
  const pos = V((area.x0 + area.x1) / 2, area.y, 0), meta = V(0, 0, 0), C = V((area.x0 + area.x1) / 2, area.y, (area.z0 + area.z1) / 2);
  let yaw = Math.PI / 2, f = forme[0], stato = 'sta', timer = 2, prossimo = 9 + Math.random() * 6, muta = null, giro = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function suona(fm, nome) { const a = fm.act[nome]; if (!a || fm.corrente === a) return; a.reset().play(); if (fm.corrente) a.crossFadeFrom(fm.corrente, 0.4, false); fm.corrente = a; }
  function mostra(fm) { for (const x of forme) x.g.visible = x === fm; }
  function avvia(fm) {
    if (fm.vola) { suona(fm, Object.keys(fm.act)[0]); stato = 'vola'; giro = Math.atan2(pos.z - C.z, pos.x - C.x); }
    else { stato = 'sta'; timer = rnd(1, 2.5); suona(fm, fm.sta[0]); }
  }
  function colloca(fm) {
    if (fm.vola) fm.g.position.set(pos.x, area.y + 4.5, pos.z); else fm.g.position.set(pos.x, area.y, pos.z);
    fm.g.rotation.y = yaw;
  }
  avvia(f); colloca(f); mostra(f);

  return {
    get forma() { return f.nome; },
    update(dt, t) {
      if (muta) { // la trasformazione: la polvere passa dalla forma vecchia alla nuova
        muta.k += dt / 1.8; const k = Math.min(1, muta.k), e = k * k * (3 - 2 * k), b = Math.sin(Math.PI * k), p = pg.attributes.position.array;
        for (let i = 0; i < N * 3; i += 3) { p[i] = A[i] + (B[i] - A[i]) * e + b * 1.4 * J[i]; p[i + 1] = A[i + 1] + (B[i + 1] - A[i + 1]) * e + b * (0.8 + 1.4 * (J[i + 1] + 0.5)); p[i + 2] = A[i + 2] + (B[i + 2] - A[i + 2]) * e + b * 1.4 * J[i + 2]; }
        pg.attributes.position.needsUpdate = true; polvere.material.opacity = 0.35 + 0.65 * b;
        if (k >= 1) { polvere.visible = false; f = muta.verso; mostra(f); muta = null; prossimo = rnd(9, 16); }
        return;
      }
      f.mixer.update(dt);
      prossimo -= dt;
      if (f.vola) { // cerchi bassi sopra la piattaforma
        giro += dt * f.vel / 4.5; const r = 4.5; pos.set(C.x + Math.cos(giro) * r * 0.7, area.y, C.z + Math.sin(giro) * r * 1.6);
        yaw = Math.atan2(-Math.sin(giro) * 0.7, Math.cos(giro) * 1.6); f.g.position.set(pos.x, area.y + 4.5 + 0.4 * Math.sin(t * 0.9), pos.z); f.g.rotation.y = yaw;
      } else if (stato === 'sta') {
        timer -= dt;
        if (timer <= 0) { meta.set(rnd(area.x0, area.x1), area.y, rnd(area.z0, area.z1)); if (meta.distanceTo(pos) > 2) { stato = 'va'; suona(f, f.va); } else timer = 1; }
      } else { // va: si gira piano verso la meta e cammina
        tv.subVectors(meta, pos); const d = Math.hypot(tv.x, tv.z), want = Math.atan2(tv.x, tv.z);
        let dy = want - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += Math.sign(dy) * Math.min(Math.abs(dy), dt * 2.2);
        const avanti = Math.abs(dy) < 0.9 ? f.vel * dt : 0; pos.x += Math.sin(yaw) * avanti; pos.z += Math.cos(yaw) * avanti;
        f.g.position.set(pos.x, area.y, pos.z); f.g.rotation.y = yaw;
        if (d < 0.4) { stato = 'sta'; timer = rnd(1.5, 4.5); suona(f, f.sta[Math.floor(Math.random() * f.sta.length)]); }
      }
      if (prossimo <= 0) { // cambia forma: mai la stessa
        const altre = forme.filter((x) => x !== f), verso = altre[Math.floor(Math.random() * altre.length)];
        campiona(f, A); f.g.visible = false;
        if (!verso.vola) { pos.x = THREE.MathUtils.clamp(pos.x, area.x0, area.x1); pos.z = THREE.MathUtils.clamp(pos.z, area.z0, area.z1); }
        avvia(verso); colloca(verso); verso.mixer.update(0.01); verso.g.visible = true; campiona(verso, B); verso.g.visible = false;
        polvere.visible = true; muta = { k: 0, verso };
      }
    },
  };
}
