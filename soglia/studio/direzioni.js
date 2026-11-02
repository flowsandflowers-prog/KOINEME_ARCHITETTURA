// Cinque direzioni visive per «La Soglia», sulla stessa disposizione A, senza gravità:
// le quote galleggiano, le vie sono nastri sospesi, niente corrimano né parapetti.
//   ?dir=1 il disegno che diventa spazio · 2 luce nel buio · 3 Giappone essenziale
//        4 paesaggio e acqua · 5 membrane
//   ?vista=fuori (per raccontare) | dentro (a altezza d'occhi, nella Soglia)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { disposeObject } from '../../src/lib/dispose.js';

const Q = new URLSearchParams(location.search);
const DIR = Math.min(5, Math.max(1, parseInt(Q.get('dir') || '1', 10)));
const VISTA = Q.get('vista') === 'dentro' ? 'dentro' : 'fuori';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();

/* ---------- la disposizione A, uguale per tutte le direzioni ---------- */
const S = V(-14, 0, 0);          // la Soglia
const PORTALI = [[-17.5, 4.4], [-14.5, 4.0], [-11.5, 3.6]]; // x, altezza: i tre passaggi
const M = V(-1.6, 2.6, -3.8);    // il mezzanino, a mezza quota
const C = V(10, 5.2, 0);         // la stanza, al centro della quota delle stanze
const Y_SOTTO = -4.2, Y_FOND = -8.6;
const ANG = [...Array(8)].map((_, k) => Math.PI / 8 + (k * Math.PI) / 4); // le otto stanze chiuse; l'asse verso -x resta libero
const VIA_SU = [new THREE.QuadraticBezierCurve3(V(-9, 0.05, -1.4), V(-5.5, 0.4, -4.2), V(-3.6, 2.6, -3.8)),
  new THREE.QuadraticBezierCurve3(V(0.4, 2.6, -3.8), V(2.4, 3.2, -2.6), V(1.6, 5.2, -1.4))];
const VIA_GIU = new THREE.QuadraticBezierCurve3(V(-12, 0.05, 3.4), V(-8.5, -1.2, 7), V(-4.5, Y_SOTTO + 0.06, 6));
const APPOGGI = [V(-9, 0, -7), V(9, 0, -7), V(-9, 0, 7), V(9, 0, 7)];

/* ---------- strumenti ---------- */
const add = (m, x = 0, y = 0, z = 0, parent = scene) => { m.position.set(x, y, z); parent.add(m); return m; };
const mesh = (g, mat) => new THREE.Mesh(g, mat);
function ribbon(curve, w, segs = 80) {
  const pos = [], idx = [], up = V(0, 1, 0), p = V(0, 0, 0), t = V(0, 0, 0), s = V(0, 0, 0);
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; curve.getPoint(u, p); curve.getTangent(u, t);
    s.crossVectors(t, up).normalize().multiplyScalar(w / 2);
    pos.push(p.x - s.x, p.y, p.z - s.z, p.x + s.x, p.y, p.z + s.z);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
const ink = new THREE.LineBasicMaterial({ color: 0x2b2520 });
function edges(m, mat = ink, angle = 28) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, angle), mat); m.add(l); return m; }
function shadows(on) { if (!on) return; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; scene.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = o.receiveShadow = true; } }); }
function sun(color, intensity, pos, shadow) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.copy(pos);
  if (shadow) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); Object.assign(l.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 120 }); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.04; }
  scene.add(l); return l;
}
function gradientSky(top, bottom) {
  const g = mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 a;uniform vec3 b;varying float h;void main(){gl_FragColor=vec4(mix(b,a,smoothstep(-.2,.6,h)),1.);}',
  }));
  scene.add(g);
}
let composer = null;

/* =========================================================
   1 · IL DISEGNO CHE DIVENTA SPAZIO
   china su carta, volumi appena campiti ad acquerello, assonometria
   ========================================================= */
function disegno() {
  scene.background = new THREE.Color(0xf4efe4);
  const wash = (c, o = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, side: THREE.DoubleSide, depthWrite: o >= 1 });
  const W = { carta: wash(0xf7f2e8, 1), soglia: wash(0xead7b0, 1), stanza: wash(0xf0b88e, 1), chiuse: wash(0xd9d3e6, 1), anti: wash(0xf3dfb3, 1), corr: wash(0xcfe1d4, 1), mezz: wash(0xf1d9a6, 1), via: wash(0xe9e1cf, 1), sotto: wash(0xa9cdd2, 0.55), app: wash(0xe8dcc6, 1), fond: wash(0xd3c1a2, 1) };
  // la Soglia e i tre passaggi
  edges(add(mesh(new THREE.BoxGeometry(10, 0.25, 7), W.soglia), S.x, -0.12, S.z));
  for (const [x, h] of PORTALI) {
    for (const z of [-1.3, 1.3]) edges(add(mesh(new THREE.BoxGeometry(0.3, h, 0.3), W.carta), x, h / 2, z));
    edges(add(mesh(new THREE.BoxGeometry(0.3, 0.3, 2.9), W.carta), x, h, 0));
  }
  // vie, mezzanino
  for (const c of [...VIA_SU, VIA_GIU]) edges(add(mesh(ribbon(c, 1.6), W.via)));
  edges(add(mesh(new THREE.BoxGeometry(4, 0.22, 3), W.mezz), M.x, M.y - 0.11, M.z));
  // quota delle stanze
  edges(add(mesh(new THREE.CylinderGeometry(9.8, 9.8, 0.22, 64), W.carta), C.x, C.y - 0.11, C.z));
  edges(add(mesh(new THREE.RingGeometry(8.2, 9.2, 96), W.corr), C.x, C.y + 0.02, C.z)).rotation.x = -Math.PI / 2;
  edges(add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 40), W.stanza), C.x, C.y + 1.6, C.z), ink, 40);
  for (const a of ANG) edges(add(mesh(new THREE.BoxGeometry(2, 2.6, 2), W.chiuse), C.x + Math.cos(a) * 6.3, C.y + 1.3, C.z + Math.sin(a) * 6.3)).rotation.y = -a;
  edges(add(mesh(new THREE.BoxGeometry(2.4, 0.06, 2.4), W.anti), C.x - 4.4, C.y + 0.03, C.z));
  // sotto: una campitura d'acqua, gli appoggi, le fondamenta
  add(mesh(new THREE.PlaneGeometry(46, 32), W.sotto), 0, Y_SOTTO, 0).rotation.x = -Math.PI / 2;
  add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(46, 32)), ink), 0, Y_SOTTO, 0).rotation.x = -Math.PI / 2;
  for (const p of APPOGGI) edges(add(mesh(new THREE.CylinderGeometry(0.8, 0.8, Y_SOTTO - Y_FOND, 24), W.app), p.x, (Y_SOTTO + Y_FOND) / 2, p.z), ink, 40);
  edges(add(mesh(new THREE.BoxGeometry(40, 2.2, 26), W.fond), 0, Y_FOND - 1.1, 0));
  // la struttura, il tratto: la pianta disegnata in trasparenza sotto la quota delle stanze
  const plan = new THREE.Group(); const dash = new THREE.LineDashedMaterial({ color: 0x8a4b2a, dashSize: 0.4, gapSize: 0.25 });
  const circ = (r, cx, cz) => { const pts = []; for (let i = 0; i <= 80; i++) { const a = (i / 80) * Math.PI * 2; pts.push(V(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dash); l.computeLineDistances(); plan.add(l); };
  circ(9.8, C.x, C.z); circ(2.4, C.x, C.z); circ(8.2, C.x, C.z);
  for (const a of ANG) { const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2, 2)), dash); l.rotation.x = -Math.PI / 2; l.rotation.z = a; l.position.set(C.x + Math.cos(a) * 6.3, 0, C.z + Math.sin(a) * 6.3); l.computeLineDistances(); plan.add(l); }
  add(plan, 0, 1.6, 0);
  return { ortho: true };
}

/* =========================================================
   2 · LUCE NEL BUIO
   gli spazi esistono per la luce che hanno; l'acqua scura sotto riflette
   ========================================================= */
function luce() {
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.FogExp2(0x05060a, 0.008);
  scene.add(new THREE.HemisphereLight(0x3a4560, 0x050505, 0.35));
  const dark = new THREE.MeshStandardMaterial({ color: 0x14151b, roughness: 0.85 });
  const glow = (c, i) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i, roughness: 1 });
  const warm = glow(0xffd7a0, 3.2), cool = glow(0x8fb0d8, 1.4), faint = glow(0x7d8fae, 0.55);
  // la Soglia: una lastra scura, tre portali fatti solo di luce
  edges(add(mesh(new THREE.BoxGeometry(10, 0.25, 7), dark), S.x, -0.12, S.z), new THREE.LineBasicMaterial({ color: 0x3a3428 }));
  for (const [x, h] of PORTALI) {
    const fr = (w, hh, px, py) => add(mesh(new THREE.BoxGeometry(0.06, hh, w), warm), x, py, px);
    fr(0.06, h, -1.15, h / 2); fr(0.06, h, 1.15, h / 2); fr(2.36, 0.06, 0, h);
    add(new THREE.PointLight(0xffc98a, 2.5, 6, 2), x + 0.3, h * 0.6, 0);
  }
  for (const c of [...VIA_SU, VIA_GIU]) add(mesh(ribbon(c, 0.08), cool));
  for (const c of [...VIA_SU, VIA_GIU]) add(mesh(ribbon(c, 1.4), dark)).position.y -= 0.02;
  add(mesh(new THREE.BoxGeometry(4, 0.2, 3), dark), M.x, M.y - 0.1, M.z);
  add(mesh(new THREE.BoxGeometry(4.04, 0.03, 3.04), faint), M.x, M.y + 0.01, M.z);
  // la quota delle stanze
  edges(add(mesh(new THREE.CylinderGeometry(9.8, 9.8, 0.2, 64), dark), C.x, C.y - 0.1, C.z), new THREE.LineBasicMaterial({ color: 0x2c3548 }));
  add(mesh(new THREE.TorusGeometry(8.7, 0.03, 6, 160), cool), C.x, C.y + 0.04, C.z).rotation.x = Math.PI / 2;
  // la stanza: si accende da dentro, la luce esce dalle fessure
  const st = add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 48, 1, true), dark), C.x, C.y + 1.6, C.z); st.material = dark.clone(); st.material.side = THREE.DoubleSide;
  add(mesh(new THREE.CircleGeometry(2.38, 48), glow(0xffb870, 4)), C.x, C.y + 0.02, C.z).rotation.x = -Math.PI / 2;
  add(mesh(new THREE.TorusGeometry(2.42, 0.025, 6, 96), warm), C.x, C.y + 3.2, C.z).rotation.x = Math.PI / 2;
  add(mesh(new THREE.BoxGeometry(0.05, 2.3, 1.0), glow(0xffd7a0, 2)), C.x - 2.42, C.y + 1.15, C.z);
  add(new THREE.PointLight(0xffb070, 30, 14, 1.6), C.x, C.y + 4, C.z);
  // le otto stanze chiuse: volumi scuri, solo un filo di luce sotto la porta
  for (const a of ANG) {
    const x = C.x + Math.cos(a) * 6.3, z = C.z + Math.sin(a) * 6.3;
    const room = add(mesh(new THREE.BoxGeometry(2, 2.6, 2), dark), x, C.y + 1.3, z); room.rotation.y = -a;
    edges(room, new THREE.LineBasicMaterial({ color: 0x46587a }));
    const seam = add(mesh(new THREE.BoxGeometry(0.04, 0.05, 0.8), faint), x - Math.cos(a) * 1.02, C.y + 0.04, z - Math.sin(a) * 1.02); seam.rotation.y = -a;
  }
  // l'anticamera: davanti alla porta, un rettangolo di luce a terra
  add(mesh(new THREE.PlaneGeometry(2.2, 2.2), glow(0xffd7a0, 0.6)), C.x - 4.4, C.y + 0.02, C.z).rotation.x = -Math.PI / 2;
  // il piano di sotto: acqua scura che riflette tutto quello che sta sopra
  const water = new Reflector(new THREE.PlaneGeometry(60, 44), { textureWidth: 1024, textureHeight: 1024, color: 0x3a4652 });
  add(water, 0, Y_SOTTO, 0).rotation.x = -Math.PI / 2;
  for (const p of APPOGGI) add(mesh(new THREE.CylinderGeometry(0.05, 0.05, Y_SOTTO - Y_FOND, 8), faint), p.x, (Y_SOTTO + Y_FOND) / 2, p.z);
  // bloom: la luce si allarga come nell'occhio
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.55, 0.45, 0.35));
  composer.addPass(new OutputPass());
  return {};
}

/* =========================================================
   3 · GIAPPONE ESSENZIALE, A SCALA VERA
   legno, carta degli shoji, listelli, ombre lunghe di sole basso
   ========================================================= */
function giappone() {
  gradientSky(0xe9e2d6, 0xf5efe5);
  scene.fog = new THREE.Fog(0xf0e9de, 45, 140);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xb8a58a, 1.1));
  sun(0xffe2b8, 3.0, V(-30, 22, 18), true);
  const wood = new THREE.MeshStandardMaterial({ color: 0xa97e52, roughness: 0.7 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xdcc39c, roughness: 0.75 });
  const shojiTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f7f2e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a48'; g.lineWidth = 5; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(0, j * h / 6); g.lineTo(w, j * h / 6); g.stroke(); } });
  const shoji = new THREE.MeshStandardMaterial({ map: shojiTex, roughness: 0.9, emissive: 0xffe6c0, emissiveIntensity: 0.12 });
  const tatamiTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d8cfa4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { g.fillStyle = i % 2 ? 'rgba(120,110,60,.08)' : 'rgba(255,255,230,.08)'; g.fillRect(0, i * 3.2, w, 1.6); } g.strokeStyle = '#3b3328'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }, [4, 3]);
  const tatami = new THREE.MeshStandardMaterial({ map: tatamiTex, roughness: 0.95 });
  const slat = (len, x, y, z, ry = 0, mat = wood) => { const m = add(mesh(new THREE.BoxGeometry(0.09, len, 0.09), mat), x, y, z); m.rotation.y = ry; return m; };
  // la Soglia: un pavimento di tatami e tre portali di listelli verticali, sempre più fitti
  add(mesh(new THREE.BoxGeometry(10, 0.3, 7), tatami), S.x, -0.15, S.z);
  PORTALI.forEach(([x, h], k) => {
    add(mesh(new THREE.BoxGeometry(0.22, 0.22, 3.4), wood), x, h, 0);
    const n = 8 + k * 6;
    for (let i = 0; i < n; i++) { const z = -1.6 + (3.2 * i) / (n - 1); if (Math.abs(z) < 1.1) continue; slat(h, x, h / 2, z); }
  });
  for (const c of [...VIA_SU, VIA_GIU]) add(mesh(ribbon(c, 1.3), pale));
  add(mesh(new THREE.BoxGeometry(4, 0.25, 3), pale), M.x, M.y - 0.12, M.z);
  // quota delle stanze: engawa di legno ad anello (il corridoio), tatami dentro
  add(mesh(new THREE.CylinderGeometry(9.8, 9.8, 0.3, 64), tatami), C.x, C.y - 0.15, C.z);
  add(mesh(new THREE.RingGeometry(8.2, 9.8, 96), pale), C.x, C.y + 0.02, C.z).rotation.x = -Math.PI / 2;
  // la stanza: un volume di shoji, il solo con la luce accesa dentro
  const stanza = add(mesh(new THREE.BoxGeometry(4.4, 3.2, 4.4), shoji.clone()), C.x, C.y + 1.6, C.z); stanza.material.emissiveIntensity = 0.55;
  add(mesh(new THREE.BoxGeometry(5, 0.18, 5), wood), C.x, C.y + 3.3, C.z);
  // le otto stanze chiuse: shoji spenti
  for (const a of ANG) { const r = add(mesh(new THREE.BoxGeometry(2, 2.6, 2), shoji), C.x + Math.cos(a) * 6.3, C.y + 1.3, C.z + Math.sin(a) * 6.3); r.rotation.y = -a; add(mesh(new THREE.BoxGeometry(2.3, 0.12, 2.3), wood), 0, 1.36, 0, r); }
  // l'anticamera: due schermi di listelli davanti alla porta
  for (const z of [-1.3, 1.3]) for (let i = 0; i < 14; i++) slat(3, C.x - 5.6 + i * 0.2, C.y + 1.5, C.z + z, Math.PI / 2);
  // il piano di sotto: acqua ferma, scura, che riflette il cielo
  add(mesh(new THREE.PlaneGeometry(60, 44), new THREE.MeshStandardMaterial({ color: 0x8fa39c, roughness: 0.12, metalness: 0.1 })), 0, Y_SOTTO, 0).rotation.x = -Math.PI / 2;
  // gli appoggi: pietre
  for (const p of APPOGGI) { const s = add(mesh(new THREE.DodecahedronGeometry(1.4, 1), new THREE.MeshStandardMaterial({ color: 0x8c877c, roughness: 0.95 })), p.x, Y_SOTTO + 0.2, p.z); s.scale.set(1.3, 0.5, 1.1); }
  return { shadow: true };
}

/* =========================================================
   4 · PAESAGGIO E ACQUA
   travertino, cemento, bronzo; la Soglia è un taglio nei muri, il piano di sotto una vasca
   ========================================================= */
function paesaggio() {
  gradientSky(0xbfd0d8, 0xeee7dc);
  scene.fog = new THREE.Fog(0xe6e3dc, 50, 150);
  scene.add(new THREE.HemisphereLight(0xf2f4f5, 0x9c8f7a, 1.0));
  sun(0xfff0dc, 3.2, V(-18, 30, 22), true);
  const trav = new THREE.MeshStandardMaterial({ color: 0xd8ccb8, roughness: 0.85 });
  const cls = new THREE.MeshStandardMaterial({ color: 0xb4afa6, roughness: 0.9 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, roughness: 0.4, metalness: 0.7 });
  // la Soglia: tre muri spessi, ognuno con un taglio stretto; si passa attraverso
  add(mesh(new THREE.BoxGeometry(10, 0.5, 7), trav), S.x, -0.25, S.z);
  PORTALI.forEach(([x, h]) => {
    const H = h + 1.2, gap = 1.0;
    add(mesh(new THREE.BoxGeometry(0.7, H, 2.6), cls), x, H / 2, -(gap / 2 + 1.3));
    add(mesh(new THREE.BoxGeometry(0.7, H, 2.6), cls), x, H / 2, gap / 2 + 1.3);
    add(mesh(new THREE.BoxGeometry(0.7, H - h, gap), cls), x, h + (H - h) / 2, 0);
  });
  // canale d'acqua che accompagna verso i tagli
  add(mesh(new THREE.BoxGeometry(9, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x5d8486, roughness: 0.1 })), S.x, 0.02, 2.6);
  for (const c of [...VIA_SU, VIA_GIU]) add(mesh(ribbon(c, 1.5), trav));
  add(mesh(new THREE.BoxGeometry(4, 0.5, 3), trav), M.x, M.y - 0.25, M.z);
  // quota delle stanze: una terrazza di travertino, il corridoio è un anello d'acqua bassa da costeggiare
  add(mesh(new THREE.CylinderGeometry(9.8, 9.8, 0.6, 64), trav), C.x, C.y - 0.3, C.z);
  add(mesh(new THREE.RingGeometry(8.4, 9.2, 96), new THREE.MeshStandardMaterial({ color: 0x5d8486, roughness: 0.08 })), C.x, C.y + 0.01, C.z).rotation.x = -Math.PI / 2;
  // la stanza: un tamburo di cemento con una porta di bronzo
  add(mesh(new THREE.CylinderGeometry(2.5, 2.5, 3.4, 48), cls), C.x, C.y + 1.7, C.z);
  add(mesh(new THREE.BoxGeometry(0.1, 2.4, 1.0), bronze), C.x - 2.48, C.y + 1.2, C.z);
  // le otto stanze chiuse: cubi di pietra, porte di bronzo
  for (const a of ANG) { const r = add(mesh(new THREE.BoxGeometry(2, 2.4, 2), trav), C.x + Math.cos(a) * 6.3, C.y + 1.2, C.z + Math.sin(a) * 6.3); r.rotation.y = -a; add(mesh(new THREE.BoxGeometry(0.06, 1.8, 0.8), bronze), -1.01, -0.3, 0, r); }
  // l'anticamera: un recinto di muri bassi davanti alla porta
  add(mesh(new THREE.BoxGeometry(3, 1.4, 0.3), cls), C.x - 4.6, C.y + 0.7, C.z - 1.4); add(mesh(new THREE.BoxGeometry(3, 1.4, 0.3), cls), C.x - 4.6, C.y + 0.7, C.z + 1.4);
  // il piano di sotto: una grande vasca, l'acqua fino al bordo
  add(mesh(new THREE.PlaneGeometry(52, 36), new THREE.MeshStandardMaterial({ color: 0x79a3a6, roughness: 0.08, metalness: 0.1 })), 0, Y_SOTTO, 0).rotation.x = -Math.PI / 2;
  add(mesh(new THREE.BoxGeometry(54, 0.8, 38), cls), 0, Y_SOTTO - 0.45, 0);
  for (const p of APPOGGI) add(mesh(new THREE.BoxGeometry(1.3, Y_SOTTO - Y_FOND, 1.3), trav), p.x, (Y_SOTTO + Y_FOND) / 2 - 0.4, p.z);
  // le fondamenta: terra a strati
  const strata = canvasTex(64, 256, (g, w, h) => { const t = ['#9b8468', '#8a7258', '#a99273', '#7f6a52']; let y = 0, i = 0; while (y < h) { const hh = 12 + ((i * 29) % 21); g.fillStyle = t[i % 4]; g.fillRect(0, y, w, hh); y += hh; i++; } });
  add(mesh(new THREE.BoxGeometry(54, 3.2, 38), new THREE.MeshStandardMaterial({ map: strata, roughness: 1 })), 0, Y_FOND - 1.6, 0);
  return { shadow: true };
}

/* =========================================================
   5 · MEMBRANE
   tele tese traslucide, alberi sottili, un edificio morbido che respira
   ========================================================= */
function membrane() {
  gradientSky(0x5f6f96, 0xead9c6);
  scene.fog = new THREE.Fog(0xd9d0cb, 60, 170);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc8c0d0, 1.3));
  sun(0xfff4e8, 2.0, V(-20, 30, 20), false);
  const tela = new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.9, transparent: true, opacity: 0.78, side: THREE.DoubleSide, emissive: 0xfff2e0, emissiveIntensity: 0.08 });
  const telaCalda = tela.clone(); telaCalda.color.set(0xffe6c8); telaCalda.emissive.set(0xffc58a); telaCalda.emissiveIntensity = 0.45; telaCalda.opacity = 0.9;
  const cavo = new THREE.LineBasicMaterial({ color: 0x4a4a52 });
  const albero = new THREE.MeshStandardMaterial({ color: 0x6b6b74, roughness: 0.5, metalness: 0.4 });
  // superficie a sella fra quattro punti: la forma base di una tela tesa
  function sella(p0, p1, p2, p3, sag, seg = 24) {
    const g = new THREE.PlaneGeometry(1, 1, seg, seg); const pos = g.attributes.position; const a = V(0, 0, 0), b = V(0, 0, 0), p = V(0, 0, 0);
    for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) + 0.5, v = pos.getY(i) + 0.5; a.lerpVectors(p0, p1, u); b.lerpVectors(p3, p2, u); p.lerpVectors(a, b, v); p.y -= sag * Math.sin(Math.PI * u) * Math.sin(Math.PI * v); pos.setXYZ(i, p.x, p.y, p.z); }
    g.computeVertexNormals(); return g;
  }
  // tenda: profilo a campana tirata verso un punto alto
  const tenda = (r, h, mat) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(r * Math.pow(1 - t, 1.8) + 0.03, t * h)); } return mesh(new THREE.LatheGeometry(pts, 6), mat); };
  // la Soglia: un pavimento di tela tesa e tre archi di membrana a sella
  add(mesh(sella(V(-19, 0, -3.5), V(-9, 0, -3.5), V(-9, 0, 3.5), V(-19, 0, 3.5), -0.25), tela));
  // ogni passaggio è un arco di tela: un nastro largo teso su una catenaria
  PORTALI.forEach(([x, h]) => {
    const pts = []; for (let i = 0; i <= 40; i++) { const t = -1 + (2 * i) / 40; pts.push(V(x, (h * (Math.cosh(1.5) - Math.cosh(1.5 * t))) / (Math.cosh(1.5) - 1), t * 1.5)); }
    const arc = new THREE.CatmullRomCurve3(pts); const pos = [], idx = []; const p = V(0, 0, 0);
    for (let i = 0; i <= 60; i++) { arc.getPoint(i / 60, p); pos.push(p.x - 0.7, p.y, p.z, p.x + 0.7, p.y, p.z); if (i < 60) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    add(mesh(g, tela));
  });
  for (const c of [...VIA_SU, VIA_GIU]) add(mesh(ribbon(c, 1.2), tela));
  add(mesh(sella(V(M.x - 2, M.y, M.z - 1.5), V(M.x + 2, M.y, M.z - 1.5), V(M.x + 2, M.y, M.z + 1.5), V(M.x - 2, M.y, M.z + 1.5), 0.3), tela));
  // quota delle stanze: una grande tela sospesa a un albero centrale
  add(mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.05, 64), tela), C.x, C.y, C.z);
  add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 8), albero), C.x, C.y + 4.5, C.z);
  // la stanza: la sola tenda chiusa e accesa
  add(tenda(2.8, 4.2, telaCalda), C.x, C.y, C.z);
  add(new THREE.PointLight(0xffc58a, 14, 9, 1.6), C.x, C.y + 1.5, C.z);
  // le otto chiuse: tende più piccole, spente
  for (const a of ANG) add(tenda(1.4, 2.8, tela), C.x + Math.cos(a) * 6.3, C.y, C.z + Math.sin(a) * 6.3);
  // il corridoio: un nastro di tela ondulato intorno a tutte
  add(mesh(ribbon(new THREE.CatmullRomCurve3([...Array(48)].map((_, i) => { const a = (i / 48) * Math.PI * 2; return V(C.x + Math.cos(a) * 8.7, C.y + 0.25 + 0.25 * Math.sin(a * 6), C.z + Math.sin(a) * 8.7); }), true), 0.9, 200), tela));
  // cavi dalla cima dell'albero al bordo
  const cv = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; cv.push(C.x, C.y + 9, C.z, C.x + Math.cos(a) * 9.6, C.y, C.z + Math.sin(a) * 9.6); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cv, 3)); scene.add(new THREE.LineSegments(cg, cavo));
  // il piano di sotto: una grande tela che si flette, tenuta su dai quattro appoggi
  const sotto = add(mesh(sella(V(-24, Y_SOTTO, -17), V(24, Y_SOTTO, -17), V(24, Y_SOTTO, 17), V(-24, Y_SOTTO, 17), 1.2, 48), new THREE.MeshStandardMaterial({ color: 0xa9b8d4, roughness: 0.8, transparent: true, opacity: 0.92, side: THREE.DoubleSide })));
  sotto.renderOrder = -1;
  for (const p of APPOGGI) add(mesh(new THREE.CylinderGeometry(0.07, 0.07, Y_SOTTO - Y_FOND + 1, 8), albero), p.x, (Y_SOTTO + Y_FOND) / 2 - 0.5, p.z);
  add(mesh(new THREE.BoxGeometry(40, 1.6, 26), new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 1 })), 0, Y_FOND - 0.8, 0);
  return {};
}

/* ---------- camera e inquadrature ---------- */
let camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
const controls = new OrbitControls(camera, canvas);
const BUILD = [disegno, luce, giappone, paesaggio, membrane][DIR - 1];
const opts = BUILD() || {};
if (opts.ortho && VISTA === 'fuori') {
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
  controls.object = camera;
}
if (opts.shadow) shadows(true);
if (VISTA === 'fuori') { camera.position.set(-30, 20, 33); controls.target.set(-1, 0, 0); }
else { if (camera.isPerspectiveCamera) camera.fov = 58; camera.position.set(-26, 1.7, 0.9); controls.target.set(-9, 2.6, -0.5); }
if (composer) composer.passes[0].camera = camera;

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false);
  if (camera.isOrthographicCamera) { const s = 21; camera.left = -s * w / h; camera.right = s * w / h; camera.top = s; camera.bottom = -s; }
  else camera.aspect = w / h;
  camera.updateProjectionMatrix(); if (composer) composer.setSize(w, h);
}
window.addEventListener('resize', resize); resize();
let raf = 0;
function loop() { raf = requestAnimationFrame(loop); controls.update(); if (composer) composer.render(); else renderer.render(scene, camera); }
loop();
document.documentElement.dataset.pronto = '1';
window.addEventListener('pagehide', (e) => { if (e.persisted) return; cancelAnimationFrame(raf); controls.dispose(); disposeObject(scene); if (composer) composer.dispose(); renderer.dispose(); });
