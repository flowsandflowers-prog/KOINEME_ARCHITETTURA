// Seconda prova nella chiave della matrice: Dune + Arrival, palette fredda, volumi organici sospesi.
// - Si arriva da fuori lungo un passaggio orizzontale in quota; si attraversa la Soglia (tre monoliti con fessura);
//   lo stesso passaggio prosegue in quota fino al guscio sospeso della quota delle stanze. L'unica scala scende.
// - Il piano di sotto è la superficie di un serbatoio d'acqua ferma (quota = livello; ampiezza = grandezza della vasca).
//   Sotto la superficie i quattro appoggi; in fondo le fondamenta, una massa organica quasi ossea (il corpo).
// - Fuori la figura umana è scura; dopo la Soglia è luminosa.
// - L'unica cosa calda è la luce della stanza.
// Viste: ?vista=fuori (in sezione) | soglia | passaggio
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
  fragmentShader: 'varying float h;void main(){vec3 a=vec3(.36,.39,.43);vec3 b=vec3(.68,.71,.73);gl_FragColor=vec4(mix(b,a,smoothstep(0.,.55,h)),1.);}' })));
scene.fog = new THREE.FogExp2(0xa7aeb2, VISTA === 'fuori' ? 0.0012 : 0.0021);
scene.add(new THREE.HemisphereLight(0xc9d2da, 0x3c4246, 0.9));
const sun = new THREE.DirectionalLight(0xe8eef4, 1.6); sun.position.set(220, 140, -90);
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
  const body = add(new THREE.Mesh(new THREE.BoxGeometry(3000, LIV - FOND, 1), new THREE.MeshStandardMaterial({ color: 0x55636b, roughness: 0.4, transparent: true, opacity: 0.55 })), 0, (LIV + FOND) / 2, TAGLIO);
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
/* ---------- i quattro appoggi: colonne organiche dal fondo alla superficie ---------- */
{
  const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector2(3.2 + 2.2 * Math.pow(1 - t, 3) + 1.4 * Math.pow(t, 4) + 0.3 * Math.sin(t * 18), FOND + t * (LIV - FOND))); }
  const g = new THREE.LatheGeometry(pts, 32);
  for (const [x, z] of [[-70, 22], [-10, 30], [90, 28], [170, 20]]) { const m = add(new THREE.Mesh(g, bone), x, 0, z); m.castShadow = true; }
}

/* ---------- la rupe della Soglia: sale dal fondo fino alla quota ---------- */
const SX = -20;
{
  const r = box(70, Q - FOND, 40, stone, SX, (Q + FOND) / 2, 0); r.material = [stone, stone, stoneTop, stone, stone, stone];
  // la Soglia: tre monoliti di basalto con una fessura; la luce passa e cade verso chi arriva
  [-44, -24, -4].forEach((x, i) => {
    const H = 30 - i * 3, W = 26, slit = 1.3, half = (W - slit) / 2;
    box(2.6, H, half, basalt, x, Q + H / 2, -(slit / 2 + half / 2));
    box(2.6, H, half, basalt, x, Q + H / 2, slit / 2 + half / 2);
    blade(x - 1.3, Q + (H - 4) / 2, 0, 22, H - 4, 0.38);
    const f = add(new THREE.Mesh(new THREE.PlaneGeometry(22, 1.5), bladeMat(0.45)), x - 12.3, Q + 0.05, 0); f.rotation.x = -Math.PI / 2; f.scale.x = -1;
  });
  // l'unica scala: scende lungo la rupe fino al livello del serbatoio
  const steps = 48, im = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.4, 3.2), basalt, steps), o = new THREE.Object3D();
  for (let i = 0; i < steps; i++) { const t = i / (steps - 1); o.position.set(SX + 30 - t * 58, Q - 0.2 - t * (Q - LIV - 0.6), 21.8); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}
/* ---------- il passaggio in quota: da fuori alla Soglia, e dalla Soglia al guscio ---------- */
box(400, 1.2, 3.2, basalt, SX - 35 - 200, Q - 0.6, 0);  // da fuori, dall'orizzonte
const GX = 150; // centro del guscio
box(GX - 72 - (SX + 35) + 2, 1.2, 3.2, basalt, (SX + 35 + GX - 72) / 2, Q - 0.6, 0);

/* ---------- la quota delle stanze: un guscio organico sospeso ---------- */
{
  const g = new THREE.SphereGeometry(1, 160, 96); const p = g.attributes.position; const v = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.y), along = v.x;
    // nervature longitudinali sottili, più marcate sotto; le punte si affusolano
    const rib = 1 + 0.004 * Math.sin(a * 28) * (v.y < 0 ? 1.6 : 0.5) * Math.max(0, 1 - Math.pow(Math.abs(along), 2));
    const taper = 1 - 0.18 * Math.pow(Math.abs(along), 3);
    v.y *= rib * taper; v.z *= rib * taper;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const shell = add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: basaltTex, color: 0x9aa0a6, roughness: 0.55, metalness: 0.15 })), GX, Q + 6, 0);
  shell.scale.set(74, 30, 42); shell.rotation.z = -0.06; shell.castShadow = shell.receiveShadow = true;
  // l'ingresso: una fessura verticale; da dentro trapela l'unica luce calda
  box(0.6, 14, 1.6, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb877, emissiveIntensity: 2.2 }), GX - 73.2, Q + 7, 0).castShadow = false;
}

/* ---------- chi arriva e chi è passato ---------- */
persona(SX - 52, Q, 0.4, false); persona(SX - 56, Q, -0.6, false); persona(SX - 120, Q, 0.2, false); // fuori: figure scure
persona(SX + 50, Q, 0.2, true); // dopo la Soglia: luminosa

/* ---------- inquadrature ---------- */
let target;
if (VISTA === 'soglia') { camera.fov = 56; camera.position.set(SX - 66, Q + 1.7, 1.2); target = V(SX + 40, Q + 14, 0); }
else if (VISTA === 'passaggio') { camera.fov = 50; camera.position.set(SX + 12, Q + 2.6, -22); target = V(GX - 40, Q + 5, 0); }
else { camera.fov = 40; camera.position.set(-150, 55, 250); target = V(40, 2, 0); }
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
