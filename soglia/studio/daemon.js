// Il compagno: proposte per sostituire il manichino. Cinque stazioni in fila:
// 1 la volpe, 2 la cicogna (modelli animati presi da librerie libere, con le loro animazioni),
// 3 il mutaforma (volpe sul passaggio, si scioglie in polvere e diventa cicogna, poi torna),
// 4 lo sciame (polvere di luce che cambia figura: raccolta, distesa, a spirale, in volo),
// 5 il filo (una scia di luce che vaga). In basso: com'è il modello, scuro fuori, luminoso dopo la Soglia.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { disposeObject } from '../../src/lib/dispose.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9d978d);
scene.fog = new THREE.Fog(0x9d978d, 40, 120);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
camera.position.set(0, 7, 36);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.2, 0); controls.enableDamping = true; controls.minDistance = 6; controls.maxDistance = 80;
scene.add(new THREE.HemisphereLight(0xd8d2c6, 0x34302b, 0.7));
const sun = new THREE.DirectionalLight(0xf6e4c8, 2.6); sun.position.set(-20, 30, 20); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 15, bottom: -15 }); sun.shadow.mapSize.set(2048, 1024); scene.add(sun);

// il passaggio in basalto su cui stanno
const basalt = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.25, metalness: 0.3 });
const piano = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 7), basalt); piano.position.y = -0.5; piano.receiveShadow = true; scene.add(piano);

const X = [-14, -7, 0, 7, 14];
const CAP = [
  ['La volpe', 'Un animale vero, già animato: cammina, si ferma, si guarda intorno. Fuori scura, dentro luminosa.'],
  ['La cicogna', 'Vola. Attraversa le fessure in volo; nel nido si posa. Lenta, ampia, di Arrival.'],
  ['Il mutaforma', 'Come il daimon di Pullman: cambia forma con il percorso. Sul passaggio volpe, alla Soglia si scioglie, oltre vola.'],
  ['Lo sciame', 'Astratto: polvere di luce. Raccolta nella stanza, distesa nel corridoio, a spirale nel mezzanino, cade lungo la scala.'],
  ['Il filo', 'Astratto e minimo: una scia di luce che vaga. Disegna il percorso invece di percorrerlo.'],
];
const caps = CAP.map(([b, s]) => { const d = document.createElement('div'); d.className = 'cap'; const e = document.createElement('b'); e.textContent = b; const f = document.createElement('span'); f.textContent = s; d.append(e, f); document.getElementById('caps').appendChild(d); return d; });

/* ---------- i tre aspetti ---------- */
let MODO = 1;
const darkM = new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.6, metalness: 0.1 });
const litM = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, roughness: 0.6, emissive: 0xeef3ff, emissiveIntensity: 0.8 });
const MESHES = [];
function veste() { for (const m of MESHES) m.material = MODO === 0 ? m.userData.orig : MODO === 1 ? darkM : litM; for (const p of PUNTI) tinta(p); }
document.getElementById('bar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; MODO = +b.dataset.m; for (const x of b.parentNode.children) x.setAttribute('aria-pressed', x === b); veste(); });

/* ---------- polvere luminosa ---------- */
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const PUNTI = [];
function nuvola(n, size) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const m = new THREE.PointsMaterial({ size, map: dotTex, transparent: true, depthWrite: false, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); PUNTI.push(p); tinta(p); return p;
}
function tinta(p) { const m = p.material; if (MODO === 2) { m.color.set(0xeaf1ff); m.blending = THREE.AdditiveBlending; m.opacity = 0.95; } else if (MODO === 1) { m.color.set(0x1f1d1a); m.blending = THREE.NormalBlending; m.opacity = 0.9; } else { m.color.set(0xffc58a); m.blending = THREE.AdditiveBlending; m.opacity = 0.9; } m.needsUpdate = true; }

/* ---------- i modelli ---------- */
const loader = new GLTFLoader();
const load = (f) => loader.loadAsync(`../modelli/${f}`);
function prepara(gltf, lungo) {
  const root = gltf.scene; const box = new THREE.Box3().setFromObject(root), sz = box.getSize(V(0, 0, 0));
  const s = lungo / Math.max(sz.x, sz.y, sz.z); root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  const g = new THREE.Group(); g.add(root); scene.add(g);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.orig = o.material; MESHES.push(o); } });
  const mixer = new THREE.AnimationMixer(root); return { g, root, mixer, clips: gltf.animations };
}
// punti di una forma, presi dai vertici della geometria (posizione a riposo), nello spazio del gruppo
function campiona(obj, n) {
  const out = []; obj.g.updateMatrixWorld(true); const inv = obj.g.matrixWorld.clone().invert(), v = V(0, 0, 0);
  const meshes = []; obj.root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (let i = 0; i < n; i++) { const m = meshes[i % meshes.length], pa = m.geometry.attributes.position; v.fromBufferAttribute(pa, Math.floor(Math.random() * pa.count)).applyMatrix4(m.matrixWorld).applyMatrix4(inv); out.push(v.x, v.y, v.z); }
  return Float32Array.from(out);
}

const [fox, stork, fox2, stork2] = await Promise.all([load('volpe.glb'), load('cicogna.glb'), load('volpe.glb'), load('cicogna.glb')]);
const VOLPE = prepara(fox, 3.6), CICO = prepara(stork, 4.2), MV = prepara(fox2, 3.6), MC = prepara(stork2, 4.2);
const walk = (o) => { const c = o.clips.find((a) => /walk/i.test(a.name)) || o.clips[0]; o.mixer.clipAction(c).play(); };
walk(VOLPE); walk(MV); CICO.mixer.clipAction(CICO.clips[0]).play(); MC.mixer.clipAction(MC.clips[0]).play();
// le forme del mutaforma, campionate a riposo
MV.g.position.set(0, 0, 0); MC.g.position.set(0, 0, 0);
const NM = 1400, FV = campiona(MV, NM), FC = campiona(MC, NM);
for (let i = 1; i < NM * 3; i += 3) FC[i] += 2.2; // la cicogna vola più in alto
const muta = nuvola(NM, 0.12);
veste();

/* ---------- lo sciame ---------- */
const NS = 900, sciame = nuvola(NS, 0.14), SP = sciame.geometry.attributes.position.array;
const FORME = [
  (i, t, o) => { const u = i / NS, ph = i * 2.399963, r = 1.25 * Math.cbrt((i * 7919 % NS) / NS); o.set(Math.cos(ph) * Math.sqrt(1 - (2 * u - 1) ** 2) * r, 2.4 + (2 * u - 1) * r, Math.sin(ph) * Math.sqrt(1 - (2 * u - 1) ** 2) * r); },  // raccolta
  (i, t, o) => { const u = i / NS; o.set((u - 0.5) * 7, 1.3 + 0.12 * Math.sin(u * 40 + t * 2), 0.15 * Math.cos(u * 33)); },                                                                                // distesa
  (i, t, o) => { const u = i / NS, a = u * Math.PI * 8 + t * 0.8; o.set(Math.cos(a) * (0.4 + u * 1.2), 0.2 + u * 4.6, Math.sin(a) * (0.4 + u * 1.2)); },                                                    // a spirale
  (i, t, o) => { const u = (i / NS + t * 0.08) % 1, a = u * Math.PI * 2; o.set(Math.cos(a) * 2.4, 2.4 + 0.8 * Math.sin(a * 2), Math.sin(a) * 1.4).addScaledVector(J[i], 0.35); },                         // in volo
];
const J = [...Array(NS)].map(() => V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
const tgt = V(0, 0, 0);
for (let i = 0; i < NS; i++) { FORME[0](i, 0, tgt); SP[i * 3] = tgt.x; SP[i * 3 + 1] = tgt.y; SP[i * 3 + 2] = tgt.z; }

/* ---------- il filo ---------- */
const NF = 140, filo = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), NF);
filo.frustumCulled = false; scene.add(filo); const scia = [...Array(NF)].map(() => V(X[4], 2, 0)), o3 = new THREE.Object3D(), fc = new THREE.Color();

/* ---------- post ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.5, 0.5, 0.8));
composer.addPass(new OutputPass());
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  // inquadra le cinque stazioni qualunque sia la forma dello schermo
  const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect), d = 18.5 / Math.tan(hf) + 3.5; camera.position.set(0, 2.2 + d * 0.16, d); controls.target.set(0, 2.2, 0); }
window.addEventListener('resize', resize); resize();

/* ---------- il loop ---------- */
const clock = new THREE.Clock(), tv = V(0, 0, 0);
function giro(o, cx, r, y, t, vel) { const a = t * vel; o.g.position.set(cx + Math.cos(a) * r, y, Math.sin(a) * r * 0.6); o.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 0.6) + (o.dir || 0); }
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  for (const o of [VOLPE, CICO, MV, MC]) o.mixer.update(dt);
  giro(VOLPE, X[0], 1.1, 0, t, 0.3);
  giro(CICO, X[1], 1.4, 2.2 + 0.3 * Math.sin(t * 0.7), t, 0.4);
  // il mutaforma: 0-5 s volpe, 5-6.5 si scioglie, 6.5-11 cicogna, 11-12.5 torna
  { const c = t % 12.5; let k, vis;
    if (c < 5) { vis = 'v'; k = 0; } else if (c < 6.5) { vis = 'p'; k = (c - 5) / 1.5; } else if (c < 11) { vis = 'c'; k = 1; } else { vis = 'p'; k = 1 - (c - 11) / 1.5; }
    MV.g.visible = vis === 'v'; MC.g.visible = vis === 'c'; muta.visible = vis === 'p';
    MV.g.position.set(X[2], 0, 0); MV.g.rotation.y = Math.PI / 2; MC.g.position.set(X[2], 2.2 + 0.25 * Math.sin(t), 0); MC.g.rotation.y = Math.PI / 2;
    if (vis === 'p') { const p = muta.geometry.attributes.position.array, e = k * k * (3 - 2 * k), b = Math.sin(Math.PI * k);
      for (let i = 0; i < NM * 3; i += 3) { const j = i / 3; p[i] = X[2] + FV[i] * (1 - e) + FC[i] * e + b * 1.2 * J[j % NS].x; p[i + 1] = FV[i + 1] * (1 - e) + FC[i + 1] * e + b * 1.6 * (J[j % NS].y + 0.5); p[i + 2] = FV[i + 2] * (1 - e) + FC[i + 2] * e + b * 1.2 * J[j % NS].z; }
      muta.geometry.attributes.position.needsUpdate = true; } }
  // lo sciame: cambia figura ogni 4 secondi
  { const f = Math.floor(t / 4) % FORME.length, kk = 1 - Math.exp(-dt * 2.2);
    for (let i = 0; i < NS; i++) { FORME[f](i, t, tgt); const j = i * 3; SP[j] += (X[3] + tgt.x + 0.04 * Math.sin(t * 3 + i) - SP[j]) * kk; SP[j + 1] += (tgt.y + 0.04 * Math.cos(t * 2.7 + i) - SP[j + 1]) * kk; SP[j + 2] += (tgt.z - SP[j + 2]) * kk; }
    sciame.geometry.attributes.position.needsUpdate = true; }
  // il filo: la testa vaga, il corpo la segue
  { tv.set(X[4] + 2.2 * Math.sin(t * 0.7) * Math.cos(t * 0.23), 2.4 + 1.6 * Math.sin(t * 0.53 + 1), 1.6 * Math.sin(t * 0.41)); const coda = scia.pop(); scia.unshift(coda.copy(tv));
    if (MODO === 2) fc.set(0xeaf1ff); else if (MODO === 1) fc.set(0x1f1d1a); else fc.set(0xffc58a);
    for (let i = 0; i < NF; i++) { o3.position.copy(scia[i]); o3.scale.setScalar(0.09 * (1 - i / NF) + 0.01); o3.updateMatrix(); filo.setMatrixAt(i, o3.matrix); }
    filo.material.color.copy(fc); filo.instanceMatrix.needsUpdate = true; }
  controls.update(); composer.render();
  // didascalie sotto ogni stazione
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (let i = 0; i < 5; i++) { tv.set(X[i], -1.2, 3.5).project(camera); caps[i].style.left = ((tv.x + 1) / 2) * w + 'px'; caps[i].style.top = ((1 - tv.y) / 2) * h + 'px'; caps[i].style.display = tv.z < 1 ? '' : 'none'; }
});
window.addEventListener('pagehide', () => { renderer.setAnimationLoop(null); controls.dispose(); disposeObject(scene); composer.dispose(); renderer.dispose(); });
