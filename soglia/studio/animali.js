// Il mutaforma: gli animali animati che si possono usare (licenze libere), uno per riquadro.
// Ogni riquadro è una vista della stessa scena (un animale ogni 60 m), disegnata con lo scissor.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObject } from '../../src/lib/dispose.js';
import { posaAppesa, alaAverla, vesteAverla } from '../animali.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const A = [
  ['La volpe', '../modelli/volpe.glb', 'terra'], ['Il lupo', '../modelli/animali/lupo.glb', 'terra'],
  ['Il cane', '../modelli/animali/cane.glb', 'terra'], ['Il cervo', '../modelli/animali/cervo.glb', 'terra'],
  ['La cerva', '../modelli/animali/cerva.glb', 'terra'], ['Il cavallo', '../modelli/animali/cavallo.glb', 'terra'],
  ['Il toro', '../modelli/animali/toro.glb', 'terra'], ["L'alpaca", '../modelli/animali/alpaca.glb', 'terra'],
  ['La cicogna', '../modelli/cicogna.glb', 'aria'], ['Il fenicottero', '../modelli/animali/fenicottero.glb', 'aria'],
  ['Il pappagallo', '../modelli/pappagallo.glb', 'aria'], ["L'averla", '../modelli/animali/averla.glb', 'averla'],
  ['La scimmia', '../modelli/animali/scimmia.glb', 'appesa'],
];
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setScissorTest(true); renderer.setClearColor(0x9d978d);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xd8d2c6, 0x34302b, 0.9));
const sun = new THREE.DirectionalLight(0xf6e4c8, 2.4); sun.position.set(-1, 2, 1.5); scene.add(sun);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
const basalt = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.25, metalness: 0.3 });

const griglia = document.getElementById('griglia');
const celle = A.map(([nome, , tipo]) => { const d = document.createElement('div'); d.className = 'cella'; const b = document.createElement('b'); b.textContent = nome; d.appendChild(b);
  if (false) { const s = document.createElement('span'); s.textContent = 'Nessun modello libero raggiungibile da qui: serve trovarlo o farlo.'; d.appendChild(s); }
  griglia.appendChild(d); return d; });

let MODO = 1;
const darkM = new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.6, metalness: 0.1 });
const litM = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, roughness: 0.6, emissive: 0xeef3ff, emissiveIntensity: 0.8 });
const MESHES = [];
const veste = () => { for (const m of MESHES) m.material = MODO === 0 ? m.userData.orig : MODO === 1 ? darkM : litM; };
document.getElementById('bar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; MODO = +b.dataset.m; for (const x of b.parentNode.children) x.setAttribute('aria-pressed', x === b); veste(); });

const loader = new GLTFLoader(), MIX = [], STAZ = [], APPESE = [], AVERLE = [];
await Promise.all(A.map(async ([, url, tipo], i) => {
  const cx = i * 60, g = new THREE.Group(); g.position.x = cx; scene.add(g);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 48), basalt); disco.position.y = -0.15; g.add(disco);
  STAZ[i] = { cx, tipo };
  if (!url) return;
  const gl = await loader.loadAsync(url); const root = gl.scene;
  if (tipo === 'averla') await vesteAverla(root, '../modelli/animali/');
  if (tipo === 'appesa') { // appesa alla fune per la mano destra; il perno è la mano
    const h = posaAppesa(root, 2.4); const perno = new THREE.Group(); perno.position.y = 3.0; g.add(perno); perno.add(h.g);
    const fune = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x2a2520 })); fune.position.y = 3.7; g.add(fune);
    root.traverse((o) => { if (o.isMesh) { o.userData.orig = o.material; MESHES.push(o); o.frustumCulled = false; } });
    APPESE.push({ perno, h }); return; }
  const box = new THREE.Box3().setFromObject(root), sz = box.getSize(V(0, 0, 0)), aria = tipo === 'aria' || tipo === 'averla', s = (aria ? 3.4 : 3.0) / Math.max(sz.x, sz.y, sz.z);
  root.scale.setScalar(s); root.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s + (aria ? 0.9 : 0), -(box.min.z + box.max.z) / 2 * s);
  if (tipo === 'averla') AVERLE.push(root);
  root.traverse((o) => { if (o.isMesh) { o.userData.orig = o.material; MESHES.push(o); o.frustumCulled = false; } });
  const pivot = new THREE.Group(); pivot.rotation.y = -0.6; pivot.add(root); g.add(pivot);
  const mixer = new THREE.AnimationMixer(root); const clip = gl.animations.find((c) => /^walk$/i.test(c.name)) || gl.animations.find((c) => /walk/i.test(c.name)) || gl.animations[0];
  if (clip) mixer.clipAction(clip).play(); MIX.push(mixer);
}));
veste();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  for (const m of MIX) m.update(dt); const t = clock.elapsedTime;
  for (const a of AVERLE) alaAverla(a, t);
  for (const a of APPESE) { a.perno.rotation.z = 0.18 * Math.sin(t * 1.3); a.perno.rotation.x = 0.06 * Math.sin(t * 0.9); a.h.oscilla(t); }
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.floor(W * renderer.getPixelRatio())) renderer.setSize(W, H, false);
  renderer.setScissor(0, 0, W, H); renderer.setViewport(0, 0, W, H); renderer.clear();
  for (let i = 0; i < celle.length; i++) {
    const r = celle[i].getBoundingClientRect(), y = H - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height); renderer.setScissor(r.left, y, r.width, r.height);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    const d = 8.5 / Math.min(1, camera.aspect); camera.position.set(STAZ[i].cx, 2.1, d); camera.lookAt(STAZ[i].cx, 1.2, 0);
    renderer.render(scene, camera);
  }
});
window.addEventListener('pagehide', () => { renderer.setAnimationLoop(null); disposeObject(scene); renderer.dispose(); });
