// Studio nella chiave della matrice (le tre domande come assi dell'architettura), su scala monumentale.
//   Riguarda che cosa?          → DIREZIONE: con oggetto lo spazio punta verso qualcosa; senza, è un orizzonte uguale ovunque
//   Valutazione di rilevanza?   → LUCE: la valutazione è una lama di luce che distingue
//   Si muovono insieme?         → ALLINEAMENTO: se le fessure si allineano la luce passa e la porta si apre
//   durata → MASSA · corpo → MATERIA
// Viste: ?vista=fuori | soglia | anticamera | stanza
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { disposeObject } from '../../src/lib/dispose.js';

const VISTA = new URLSearchParams(location.search).get('vista') || 'fuori';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 4000);
const controls = new OrbitControls(camera, canvas);

/* ---------- materia ---------- */
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// basalto: striature verticali finissime, quasi senza dettaglio
const basaltTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#3a3734'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,220' : '0,0,0'},${0.02 + rnd() * 0.05})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 3, h); } }, [6, 3]);
const basalt = new THREE.MeshStandardMaterial({ map: basaltTex, roughness: 0.82, color: 0xffffff });
// sabbia
const sandTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9ad84'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,245,225' : '90,60,30'},${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(120,85,45,.06)'; g.lineWidth = 3; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 20, w * 0.6, y - 20, w, y + 5); g.stroke(); } }, [120, 120]);
const sand = new THREE.MeshStandardMaterial({ map: sandTex, roughness: 0.95 });
// roccia a strati (la terrazza della Soglia, le fondamenta)
const strataTex = canvasTex(64, 512, (g, w, h) => { const t = ['#a98a64', '#9a7a56', '#b5976f', '#8c6e4d', '#a2835d']; let y = 0, i = 0; while (y < h) { const hh = 8 + ((i * 31) % 27); g.fillStyle = t[i % 5]; g.fillRect(0, y, w, hh); y += hh; i++; } }, [8, 1]);
const rock = new THREE.MeshStandardMaterial({ map: strataTex, roughness: 0.95 });
// lama di luce: un foglio verticale che sfuma allontanandosi dalla fessura
const bladeTex = canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,236,200,0.9)'); gr.addColorStop(0.35, 'rgba(255,220,170,0.35)'); gr.addColorStop(1, 'rgba(255,210,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,.6)'); v.addColorStop(0.15, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); });
const bladeMat = (op = 0.55) => new THREE.MeshBasicMaterial({ map: bladeTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); scene.add(m); return m; };
const box = (w, h, d, mat, x, y, z) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z); m.castShadow = m.receiveShadow = true; return m; };
// lama verticale che parte da (x0, z) e va verso -x per len metri
function blade(x0, y0, z, len, h, op, dir = -1) {
  const g = new THREE.PlaneGeometry(len, h); g.translate(len / 2, 0, 0);
  const m = add(new THREE.Mesh(g, bladeMat(op)), x0, y0, z); if (dir < 0) m.rotation.y = Math.PI; return m;
}
// una persona, per la scala
function persona(x, y, z, s = 1) {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.9 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 1.15 * s, 4, 10), mat); b.position.y = 0.8 * s; g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 12, 10), mat); hd.position.y = 1.62 * s; g.add(hd);
  g.traverse((o) => { o.castShadow = true; }); g.position.set(x, y, z); scene.add(g); return g;
}

/* =========================================================
   FUORI e SOGLIA: il deserto, la terrazza della Soglia, la massa sospesa
   ========================================================= */
function esterno() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float h;void main(){vec3 a=vec3(.46,.44,.43);vec3 b=vec3(.74,.6,.43);gl_FragColor=vec4(mix(b,a,smoothstep(0.,.5,h)),1.);}' }));
  scene.add(sky);
  scene.fog = new THREE.FogExp2(0xbca487, 0.0016);
  scene.add(new THREE.HemisphereLight(0xd8c8b0, 0x6a4e34, 0.45));
  // sole basso, dietro i monoliti: la luce viene verso chi arriva, attraverso le fessure
  const sun = new THREE.DirectionalLight(0xffdcae, 3.2); sun.position.set(260, 70, -40); sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 120, bottom: -80, near: 10, far: 700 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.3; scene.add(sun); scene.add(sun.target);

  // il piano di sotto: un orizzonte senza direzione, uguale ovunque, nella foschia
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), sand)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  // il livello del serbatoio: un velo d'acqua ferma che copre la sabbia
  const water = add(new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0xa79a84, roughness: 0.7, metalness: 0.0, transparent: true, opacity: 0.25 })), 0, 0.15, 0); water.rotation.x = -Math.PI / 2; water.receiveShadow = true;

  // la Soglia: una terrazza di roccia a strati, sola, alla sua quota; tre monoliti con una fessura
  const T = 14; // quota della Soglia sopra il piano di sotto
  // strati sui fianchi, superficie compatta sopra
  { const top = new THREE.MeshStandardMaterial({ color: 0xb79c76, roughness: 1 }); const m = box(110, T, 46, rock, -10, T / 2, 0); m.material = [rock, rock, top, rock, rock, rock]; }
  const G = [-38, -10, 18]; // i tre passaggi lungo l'asse
  G.forEach((x, i) => {
    const H = 34 - i * 3, W = 30, slit = 1.4;
    box(3, H, (W - slit) / 2, basalt, x, T + H / 2, -(slit / 2 + (W - slit) / 4));
    box(3, H, (W - slit) / 2, basalt, x, T + H / 2, slit / 2 + (W - slit) / 4);
    // la valutazione: una lama di luce che attraversa la fessura e cade verso chi arriva
    blade(x - 1.5, T + (H - 4) / 2, 0, 26, H - 4, 0.42);
    const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 1.6), bladeMat(0.5)), x - 14.5, T + 0.06, 0); floor.rotation.x = -Math.PI / 2;
  });

  // la quota delle stanze: una massa sospesa, opaca. È la forma vista da fuori: non dice niente di sé
  const MX = 190, MY = 92;
  box(110, 56, 80, basalt, MX, MY, 0);
  // nervature: l'unico segno organico, sotto la massa
  for (let i = 0; i < 9; i++) { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.5, 18 + (i % 3) * 6, 8), basalt), MX - 48 + i * 12, MY - 28 - 8, 0); r.castShadow = true; }
  // il mezzanino: una mensola a mezza quota, che si accende e si spegne
  box(16, 1.2, 10, basalt, MX - 63, MY - 14, -26);
  add(new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.15, 10.2), new THREE.MeshBasicMaterial({ color: 0xffd9a8 })), MX - 63, MY - 13.3, -26);

  // le due vie, senza gravità: lastre sospese che salgono alla massa e scendono al piano di sotto
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 0.5, 3), basalt, 46); const o = new THREE.Object3D(); let n = 0;
  const su = new THREE.QuadraticBezierCurve3(V(30, T + 0.5, 4), V(90, T + 10, 30), V(MX - 56, MY - 18, 12));
  for (let i = 0; i < 30; i++) { su.getPoint(i / 29, o.position); o.rotation.y = 0.3 * Math.sin(i); o.updateMatrix(); plates.setMatrixAt(n++, o.matrix); }
  const giu = new THREE.QuadraticBezierCurve3(V(-60, T - 1, 18), V(-80, 6, 40), V(-100, 0.6, 52));
  for (let i = 0; i < 16; i++) { giu.getPoint(i / 15, o.position); o.rotation.y = 0.4 * Math.cos(i); o.updateMatrix(); plates.setMatrixAt(n++, o.matrix); }
  plates.count = n; plates.castShadow = plates.receiveShadow = true; plates.computeBoundingSphere(); scene.add(plates);

  // chi attraversa: piccolissimo
  persona(-45, T, 1.4); persona(-47, T, -2.2, 0.98); persona(62, T + 3.4 + 2, 15.5);
  return { T, G, MX, MY };
}

/* =========================================================
   ANTICAMERA e STANZA: lo stesso luogo, due stati della terza domanda
   tre pareti con una fessura fra chi aspetta e la porta; dietro la porta, la luce della stanza
   ========================================================= */
function interno(allineate) {
  const stone = new THREE.MeshStandardMaterial({ map: basaltTex, color: 0xffffff, roughness: 0.85 }); stone.map = basaltTex.clone(); stone.map.needsUpdate = true;
  const sandstone = new THREE.MeshStandardMaterial({ map: sandTex.clone(), color: 0xb09a80, roughness: 0.9 }); sandstone.map.repeat.set(3, 3); sandstone.map.needsUpdate = true;
  scene.background = new THREE.Color(0x0d0b09);
  scene.fog = new THREE.FogExp2(0x3a2d22, 0.012);
  scene.add(new THREE.HemisphereLight(0xc8ae8c, 0x2a2018, 1.0));
  { const d = new THREE.DirectionalLight(0xe6dccd, 1.6); d.position.set(-30, 50, 25); scene.add(d); }
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2e2924, roughness: 0.7, metalness: 0.05 });
  const f = add(new THREE.Mesh(new THREE.PlaneGeometry(300, 200), floorMat), 30, 0, 0); f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
  // una sala vasta e buia; in fondo la parete con la porta della stanza
  const DX = 50, H = 30;
  box(1.6, H, 40, stone, DX, H / 2, -21.6); box(1.6, H, 40, stone, DX, H / 2, 21.6); box(1.6, H - 10, 3.2, stone, DX, 10 + (H - 10) / 2, 0);
  const leaf = box(0.5, 10, 3.2, new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.5, metalness: 0.6 }), DX - 0.2, 5, 0);
  if (allineate) { leaf.geometry.translate(0, 0, 1.6); leaf.position.z = -1.6; leaf.rotation.y = -1.25; }
  // tre schermi monolitici staccati, ognuno con una fessura al centro.
  // Allineati: le fessure stanno sull'asse della porta. Sfalsati: ogni schermo è spostato di lato.
  const X = [14, 24, 34], Z = allineate ? [0, 0, 0] : [0, 2.8, -2.6], slit = 1.4, W = 11, SH = 24;
  X.forEach((x, i) => {
    const z = Z[i], half = (W - slit) / 2;
    box(1.2, SH, half, sandstone, x, SH / 2, z - slit / 2 - half / 2);
    box(1.2, SH, half, sandstone, x, SH / 2, z + slit / 2 + half / 2);
  });
  // dentro la stanza: luce calda
  const glowWall = box(1, 40, 30, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc27a, emissiveIntensity: 1.4 }), 66, 20, 0);
  glowWall.castShadow = false;
  const L = new THREE.PointLight(0xffc27a, allineate ? 400 : 140, 90, 1.6); L.position.set(58, 6, 0); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; scene.add(L);
  if (allineate) {
    // le componenti si allineano: un'unica lama attraversa tutte le fessure, fino a chi guarda
    blade(DX - 0.8, 4, 0, DX - 4, 8, 0.5);
    const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(DX + 4, 1.8), bladeMat(0.45)), (DX - 4) / 2 - 2, 0.05, 0); fl.rotation.x = -Math.PI / 2; fl.scale.x = -1;
  } else {
    // sfalsati: dalla porta la luce arriva solo fino al primo schermo che incontra, e lì si ferma
    blade(DX - 0.8, 4, 0, DX - 0.8 - 34 - 0.6, 8, 0.45);
    const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(DX - 35.4, 1.8), bladeMat(0.4)), 34.6 + (DX - 35.4) / 2, 0.05, 0); fl.rotation.x = -Math.PI / 2; fl.scale.x = -1;
  }
  persona(9, 0, -1.6);
}

/* ---------- inquadrature ---------- */
let target = V(0, 0, 0);
const INTERNO = VISTA === 'anticamera' || VISTA === 'stanza';
if (INTERNO) {
  interno(VISTA === 'stanza');
  camera.fov = 46; camera.position.set(-14, 2.0, -4.2); target = V(50, 4.5, 0.8);
} else {
  const E = esterno();
  if (VISTA === 'soglia') { camera.fov = 62; camera.position.set(-62, E.T + 1.7, 0.6); target = V(40, E.T + 16, 0); }
  else { camera.fov = 40; camera.position.set(-180, 60, 150); target = V(60, 40, 0); }
}
controls.target.copy(target);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), INTERNO ? 0.35 : 0.4, INTERNO ? 0.4 : 0.6, INTERNO ? 0.7 : 0.6));
composer.addPass(new OutputPass());

function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); composer.setSize(w, h); }
window.addEventListener('resize', resize); resize();
let raf = 0;
function loop() { raf = requestAnimationFrame(loop); controls.update(); composer.render(); }
loop();
document.documentElement.dataset.pronto = '1';
window.addEventListener('pagehide', (e) => { if (e.persisted) return; cancelAnimationFrame(raf); controls.dispose(); disposeObject(scene); composer.dispose(); renderer.dispose(); });
