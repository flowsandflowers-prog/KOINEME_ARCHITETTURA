// Terza prova: palette fra fuoco e ghiaccio; appoggi come tronchi rossi radicati; la quota delle stanze come
// bozzolo verticale intrecciato (un nido, in verticale come Arrival); i tre passaggi sono triliti uguali.
// - Si arriva da fuori lungo un passaggio orizzontale in quota; si attraversa la Soglia (tre monoliti con fessura);
//   lo stesso passaggio prosegue in quota fino al guscio sospeso della quota delle stanze. L'unica scala scende.
// - Il piano di sotto è la superficie di un serbatoio d'acqua ferma (quota = livello; ampiezza = grandezza della vasca).
//   Sotto la superficie i quattro appoggi; in fondo le fondamenta, una massa organica quasi ossea (il corpo).
// - Fuori la figura umana è scura; dopo la Soglia è luminosa.
// - L'unica cosa calda è la luce della stanza.
// Viste: ?vista=fuori (in sezione) | soglia | passaggio | sotto
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 5000);
const controls = new OrbitControls(camera, canvas);

/* ---------- materia, fredda ---------- */
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
// basalto: scanalature verticali finissime
const basaltTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2d2f31'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '220,228,235' : '0,0,0'},${0.02 + rnd() * 0.05})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 3, h); } }, [6, 3]);
const basalt = new THREE.MeshStandardMaterial({ map: basaltTex, roughness: 0.8 });
// pietra grigia scanalata: la rupe della Soglia
const stoneTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6d7174'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { const l = 0.5 + 0.5 * Math.sin(x * 0.25); g.fillStyle = `rgba(0,0,0,${0.05 + 0.12 * l})`; g.fillRect(x, 0, 3, h); } for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, [10, 4]);
const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92 });
const stoneTop = new THREE.MeshStandardMaterial({ color: 0x7b7f82, roughness: 0.95 });
const bone = new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: 0.75 });
// lama di luce
const bladeTex = canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(235,240,245,0.95)'); gr.addColorStop(0.35, 'rgba(220,228,238,0.35)'); gr.addColorStop(1, 'rgba(210,220,235,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,.7)'); v.addColorStop(0.15, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); });
const bladeMat = (op) => new THREE.MeshBasicMaterial({ map: bladeTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); scene.add(m); return m; };
const box = (w, h, d, mat, x, y, z) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z); m.castShadow = m.receiveShadow = true; return m; };
function blade(x0, y0, z, len, h, op) { const g = new THREE.PlaneGeometry(len, h); g.translate(len / 2, 0, 0); const m = add(new THREE.Mesh(g, bladeMat(op)), x0, y0, z); m.rotation.y = Math.PI; return m; }
// la figura: scura fuori, luminosa dentro
function persona(x, y, z, accesa) {
  const g = new THREE.Group();
  const mat = accesa ? new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xeaf2ff, emissiveIntensity: 2.0 }) : new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.9 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.15, 4, 10), mat); b.position.y = 0.8; g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat); hd.position.y = 1.62; g.add(hd);
  if (accesa) { const l = new THREE.PointLight(0xdfeaff, 6, 12, 2); l.position.y = 1.2; g.add(l); }
  g.traverse((o) => { o.castShadow = !accesa; }); g.position.set(x, y, z); scene.add(g); return g;
}

/* ---------- cielo, foschia, luce: grigio, freddo ---------- */
scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying float h;void main(){vec3 a=vec3(.40,.40,.41);vec3 b=vec3(.73,.71,.68);gl_FragColor=vec4(mix(b,a,smoothstep(0.,.55,h)),1.);}' })));
scene.fog = new THREE.FogExp2(0xb1ada6, VISTA === 'fuori' ? 0.0012 : VISTA === 'sotto' ? 0.004 : 0.0021);
scene.add(new THREE.HemisphereLight(0xd6d1c8, 0x4a4540, 0.9));
const sun = new THREE.DirectionalLight(0xf1e6d6, 1.7); sun.position.set(220, 140, -90);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -220, right: 220, top: 160, bottom: -120, near: 10, far: 900 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.4; scene.add(sun);

/* ---------- quote ---------- */
const Q = 40;          // la quota della Soglia e delle stanze
const LIV = 0;         // il livello del serbatoio: la quota del piano di sotto
const FOND = -34;      // le fondamenta
const TAGLIO = 46;     // il piano di sezione (davanti, z = TAGLIO): si vede sotto la superficie
const cut = [new THREE.Plane(new THREE.Vector3(0, 0, -1), TAGLIO)];

/* ---------- il serbatoio: acqua ferma, tagliata davanti ---------- */
{
  const surf = add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x6f7a80, roughness: 0.18, metalness: 0.1, clippingPlanes: cut })), 0, LIV, 0);
  surf.rotation.x = -Math.PI / 2; surf.receiveShadow = true;
  // il corpo d'acqua sotto la superficie, visibile solo sul taglio
  const body = add(new THREE.Mesh(new THREE.BoxGeometry(3000, LIV - FOND, 1), new THREE.MeshStandardMaterial({ color: 0x5b6466, roughness: 0.4, transparent: true, opacity: 0.42, depthWrite: false })), 0, (LIV + FOND) / 2, TAGLIO);
  body.renderOrder = 2;
}
/* ---------- le fondamenta: una massa organica, quasi ossea ---------- */
{
  box(3000, 14, 3000, new THREE.MeshStandardMaterial({ color: 0x8f8c84, roughness: 0.9, clippingPlanes: cut }), 0, FOND - 7, 0);
  box(3000, 14, 1, new THREE.MeshStandardMaterial({ color: 0x7d7a73, roughness: 0.95 }), 0, FOND - 7, TAGLIO);
  // davanti al taglio: un piano scuro, come il tavolo sotto un plastico
  add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x3e4245, roughness: 1 })), 0, FOND - 14, 0).rotation.x = -Math.PI / 2;
  // la superficie del corpo: rilievi arrotondati come vertebre e ossa (InstancedMesh)
  const n = 260, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: 0.75, clippingPlanes: cut }), n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { o.position.set(-260 + rnd() * 520, FOND + 0.5, -200 + rnd() * (TAGLIO + 200)); const s = 3 + rnd() * 9; o.scale.set(s * (1 + rnd()), s * 0.45, s); o.rotation.y = rnd() * 3; o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}
/* ---------- i quattro appoggi: tronchi rossi, radicati nelle fondamenta ---------- */
{
  const barkTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#7a2e22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = rnd() * w; g.strokeStyle = `rgba(${rnd() < 0.5 ? '40,10,6' : '150,70,50'},${0.25 + rnd() * 0.3})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 6, y); g.stroke(); } }, [3, 2]);
  const bark = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.85 });
  const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector2(3.0 + 3.4 * Math.pow(1 - t, 4) + 0.9 * Math.pow(t, 6) + 0.15 * Math.sin(t * 22), FOND + t * (LIV - FOND))); }
  const trunk = new THREE.LatheGeometry(pts, 36);
  for (const [x, z] of [[-70, 22], [-10, 30], [90, 28], [170, 20]]) {
    const m = add(new THREE.Mesh(trunk, bark), x, 0, z); m.castShadow = m.receiveShadow = true;
    // le radici: si allargano e affondano nel corpo
    const roots = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rnd() * 0.4, len = 16 + rnd() * 14;
      const c = new THREE.CatmullRomCurve3([V(x + Math.cos(a) * 3, FOND + 4, z + Math.sin(a) * 3), V(x + Math.cos(a) * len * 0.45, FOND + 1.5, z + Math.sin(a) * len * 0.45), V(x + Math.cos(a) * len, FOND - 1 - rnd() * 3, z + Math.sin(a) * len), V(x + Math.cos(a + 0.3) * len * 1.25, FOND - 6, z + Math.sin(a + 0.3) * len * 1.25)]);
      const tg = new THREE.TubeGeometry(c, 30, 1.1 + rnd() * 0.6, 8, false);
      const pp = tg.attributes.position, ctr = V(0, 0, 0), q = V(0, 0, 0);
      for (let i = 0; i <= 30; i++) { c.getPointAt(i / 30, ctr); const sc = 1.3 - 1.0 * (i / 30); for (let j = 0; j <= 8; j++) { const idx = i * 9 + j; q.fromBufferAttribute(pp, idx).sub(ctr).multiplyScalar(sc).add(ctr); pp.setXYZ(idx, q.x, q.y, q.z); } }
      tg.computeVertexNormals(); roots.push(tg);
    }
    const r = add(new THREE.Mesh(mergeGeometries(roots), bark)); r.castShadow = r.receiveShadow = true;
  }
}

/* ---------- la rupe della Soglia: sale dal fondo fino alla quota ---------- */
const SX = -20;
{
  const r = box(70, Q - FOND, 40, stone, SX, (Q + FOND) / 2, 0); r.material = [stone, stone, stoneTop, stone, stone, stone];
  // la Soglia: tre triliti uguali di basalto, in fila; due pilastri e un architrave, un varco stretto e alto.
  // La luce passa dal varco e cade verso chi arriva.
  [-44, -24, -4].forEach((x) => {
    const H = 22, P = 8.5, slit = 2.4, L = 4.5;
    box(5, H, P, basalt, x, Q + H / 2, -(slit / 2 + P / 2));
    box(5, H, P, basalt, x, Q + H / 2, slit / 2 + P / 2);
    box(5.6, L, slit + 2 * P + 2, basalt, x, Q + H + L / 2, 0);
    blade(x - 2.5, Q + (H - 4) / 2, 0, 22, H - 4, 0.38);
    const f = add(new THREE.Mesh(new THREE.PlaneGeometry(22, 1.5), bladeMat(0.45)), x - 12.3, Q + 0.05, 0); f.rotation.x = -Math.PI / 2; f.scale.x = -1;
  });
  // l'unica scala: scende lungo la rupe fino al livello del serbatoio
  const steps = 48, im = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.4, 3.2), basalt, steps), o = new THREE.Object3D();
  for (let i = 0; i < steps; i++) { const t = i / (steps - 1); o.position.set(SX + 30 - t * 58, Q - 0.2 - t * (Q - LIV - 0.6), 21.8); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}
/* ---------- il passaggio in quota: da fuori alla Soglia, e dalla Soglia al guscio ---------- */
box(400, 1.2, 3.2, basalt, SX - 35 - 200, Q - 0.6, 0);  // da fuori, dall'orizzonte
const GX = 140; // centro del bozzolo
box(GX - 28 - (SX + 35) + 2, 1.2, 3.2, basalt, (SX + 35 + GX - 28) / 2, Q - 0.6, 0);

/* ---------- la quota delle stanze: un bozzolo verticale intrecciato, sospeso ---------- */
const CH = 96, CR = 30, CY = Q + 4; // altezza, raggio, centro
{
  const prof = (t) => CR * Math.pow(Math.sin(Math.PI * t), 0.75) * (1 + 0.12 * Math.sin(Math.PI * t * 0.9 + 0.4));
  const fibre = [];
  for (let k = 0; k < 150; k++) {
    const phi0 = rnd() * Math.PI * 2, tw = (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.9), pts = [];
    for (let i = 0; i <= 48; i++) { const t = 0.02 + 0.96 * (i / 48); const r = prof(t) * (1 + (rnd() - 0.5) * 0.05); const a = phi0 + tw * t * Math.PI * 2; pts.push(V(Math.cos(a) * r, (t - 0.5) * CH, Math.sin(a) * r)); }
    fibre.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.32 + rnd() * 0.35, 5, false));
  }
  const nest = add(new THREE.Mesh(mergeGeometries(fibre), new THREE.MeshStandardMaterial({ color: 0x4a3f38, roughness: 0.9 })), GX, CY, 0);
  nest.castShadow = nest.receiveShadow = true;
  // dentro, la stanza: l'unica luce calda, che filtra fra le fibre
  const core = add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb06a, emissiveIntensity: 1.6 })), GX, CY + 2, 0);
  core.scale.set(CR * 0.72, CH * 0.38, CR * 0.72);
  const L = new THREE.PointLight(0xffb06a, 900, 160, 1.6); L.position.set(GX, CY, 0); scene.add(L);
}

/* ---------- chi arriva e chi è passato ---------- */
persona(SX - 52, Q, 0.4, false); persona(SX - 56, Q, -0.6, false); persona(SX - 120, Q, 0.2, false); // fuori: figure scure
persona(SX + 50, Q, 0.2, true); // dopo la Soglia: luminosa

/* ---------- inquadrature ---------- */
let target;
if (VISTA === 'soglia') { camera.fov = 60; camera.position.set(SX - 78, Q + 1.7, 1.2); target = V(SX + 40, Q + 16, 0); }
else if (VISTA === 'passaggio') { camera.fov = 50; camera.position.set(SX + 30, Q + 3, -14); target = V(GX, Q + 12, 0); }
else if (VISTA === 'sotto') { camera.fov = 48; camera.position.set(10, -12, 150); target = V(20, -18, 0); }
else { camera.fov = 40; camera.position.set(-250, 62, 185); target = V(35, 6, 0); }
controls.target.copy(target);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.5, 0.5, 0.7));
composer.addPass(new OutputPass());
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); composer.setSize(w, h); }
window.addEventListener('resize', resize); resize();
let raf = 0;
function loop() { raf = requestAnimationFrame(loop); controls.update(); composer.render(); }
loop();
document.documentElement.dataset.pronto = '1';
window.addEventListener('pagehide', (e) => { if (e.persisted) return; cancelAnimationFrame(raf); controls.dispose(); disposeObject(scene); composer.dispose(); renderer.dispose(); });
