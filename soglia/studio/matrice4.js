// Quarta prova. Dune + Arrival, grigi neutri e ocra spenta, basalto.
// - Fuori la figura è scura; arriva in quota dall'orizzonte. La Soglia: tre monoliti uguali con una fessura.
//   Dopo la Soglia la figura è luminosa. Dritto, in quota, verso il nido; oppure giù per l'unica scala.
// - Il nido (ispirato al nido del tessitore): corpo asimmetrico intrecciato che fluttua alla quota del passaggio.
//   Il collo d'ingresso è l'anticamera (tre schermi con una fessura: se si allineano la porta si apre);
//   la camera centrale è la stanza (la sola luce calda); otto camere germogliate intorno, chiuse da una membrana;
//   il corridoio è una galleria esterna che gira intorno a tutte; i quattro assi sono fibre tese fra le opposte.
// - Il piano di sotto: quattro alberi dal tronco rosso (gli appoggi) salgono dalle fondamenta, con radici aeree
//   che si inarcano prima di affondare; alla quota del piano di sotto i rami si intrecciano in un tessuto
//   selvaggio, immerso nell'acqua del serbatoio. Con ?livello=basso un appoggio è tolto e il livello scende.
// Viste: ?vista=fuori | soglia | nido | anticamera | sotto
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { disposeObject } from '../../src/lib/dispose.js';

const P = new URLSearchParams(location.search);
const VISTA = P.get('vista') || 'fuori';
const BASSO = P.get('livello') === 'basso';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.2, 5000);
const controls = new OrbitControls(camera, canvas);
let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/* ---------- materia ---------- */
function canvasTex(w, h, draw, rep, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
const basaltTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#26262a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = `rgba(0,0,0,${0.12 + 0.12 * Math.sin(x * 0.3)})`; g.fillRect(x, 0, 2, h); } for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '215,210,200' : '0,0,0'},${0.02 + rnd() * 0.05})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); } }, [8, 3]);
const basalt = new THREE.MeshStandardMaterial({ map: basaltTex, roughness: 0.72, metalness: 0.05 });
const barkTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#7d2b1f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const x = rnd() * w; g.strokeStyle = `rgba(${rnd() < 0.5 ? '35,8,4' : '160,72,48'},${0.25 + rnd() * 0.35})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 6, y); g.stroke(); } }, [2, 4]);
const bark = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.82 });
const fibreMat = new THREE.MeshStandardMaterial({ color: 0x5a4b3e, roughness: 0.9 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0xc4b9a6, roughness: 0.7 });
const add = (m, x = 0, y = 0, z = 0, parent = scene) => { m.position.set(x, y, z); parent.add(m); return m; };
const shade = (m) => { m.castShadow = m.receiveShadow = true; return m; };
const box = (w, h, d, mat, x, y, z, parent) => shade(add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, parent));
// tubo che si assottiglia lungo il percorso
function taperTube(curve, r0, r1, seg = 24, rs = 7) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rs, false); const p = g.attributes.position, c = V(0, 0, 0), q = V(0, 0, 0);
  for (let i = 0; i <= seg; i++) { curve.getPointAt(i / seg, c); const r = r0 + (r1 - r0) * (i / seg); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; q.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, q.x, q.y, q.z); } }
  g.computeVertexNormals(); return g;
}
function persona(x, y, z, accesa, parent = scene) {
  const g = new THREE.Group();
  const mat = accesa ? new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xeef3ff, emissiveIntensity: 2.0 }) : new THREE.MeshStandardMaterial({ color: 0x121213, roughness: 0.9 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.15, 4, 10), mat); b.position.y = 0.8; g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat); hd.position.y = 1.62; g.add(hd);
  if (accesa) { const l = new THREE.PointLight(0xe4ecff, 5, 10, 2); l.position.y = 1.2; g.add(l); } else g.traverse((o) => { o.castShadow = true; });
  g.position.set(x, y, z); parent.add(g); return g;
}

/* ---------- cielo, luce: neutro, contrastato ---------- */
scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying float h;void main(){vec3 a=vec3(.44,.43,.42);vec3 b=vec3(.78,.73,.64);gl_FragColor=vec4(mix(b,a,smoothstep(0.,.5,h)),1.);}' })));
scene.fog = new THREE.FogExp2(0xb8b0a2, { fuori: 0.0009, soglia: 0.0016, nido: 0.0013, anticamera: 0.01, sotto: 0.0022 }[VISTA] || 0.0012);
scene.add(new THREE.HemisphereLight(0xd8d2c6, 0x3e3a35, 0.75));
const sun = new THREE.DirectionalLight(0xf3e6d2, 2.6); sun.position.set(-180, 120, 140);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -240, right: 240, top: 180, bottom: -140, near: 10, far: 900 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5; scene.add(sun);

/* ---------- quote ---------- */
const DY = BASSO ? -9 : 0;     // togliere un appoggio: il livello scende, e tutto quello che sta sopra con lui
const Q = 40 + DY, LIV = 0 + DY, FOND = -34, TAGLIO = 52;
const cut = [new THREE.Plane(V(0, 0, -1), TAGLIO)];
const SX = -20, GX = 130;

/* =========================================================
   SOTTO: fondamenta, alberi, intreccio, acqua
   ========================================================= */
{
  // le fondamenta: il corpo, forme quasi ossee
  shade(add(new THREE.Mesh(new THREE.BoxGeometry(3000, 16, 3000), new THREE.MeshStandardMaterial({ color: 0x9c9384, roughness: 0.9, clippingPlanes: cut })), 0, FOND - 8, 0));
  box(3000, 16, 1, new THREE.MeshStandardMaterial({ color: 0x857c6f, roughness: 0.95 }), 0, FOND - 8, TAGLIO);
  add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x2e2c29, roughness: 1 })), 0, FOND - 16, 0).rotation.x = -Math.PI / 2;
  const n = 220, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: 0xc4b9a6, roughness: 0.7, clippingPlanes: cut }), n), o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { o.position.set(-260 + rnd() * 560, FOND + 0.4, -220 + rnd() * (TAGLIO + 220)); const s = 3 + rnd() * 10; o.scale.set(s * (1 + rnd() * 1.4), s * 0.5, s); o.rotation.y = rnd() * 3; o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}
// i quattro alberi: tronco rosso, radici aeree, rami che si intrecciano in quota
const ALBERI = [[-80, 16], [0, 30], [80, 18], [170, 26]];
ALBERI.forEach(([x, z], k) => {
  const tolto = BASSO && k === 3;
  const top = tolto ? FOND + 10 : LIV + 1.5;
  const parts = [];
  // il tronco
  parts.push(taperTube(new THREE.CatmullRomCurve3([V(x, FOND + 6, z), V(x + 1.5, (FOND + top) / 2, z - 1), V(x - 0.5, top, z)]), 3.4, tolto ? 1.2 : 2.6, 20, 12));
  // radici aeree: escono dal tronco sopra il suolo, si inarcano, poi affondano
  for (let r = 0; r < 11; r++) {
    const a = (r / 11) * Math.PI * 2 + rnd() * 0.3, h0 = FOND + 8 + rnd() * 9, d = 9 + rnd() * 9;
    const c = new THREE.CatmullRomCurve3([V(x + Math.cos(a) * 2.5, h0, z + Math.sin(a) * 2.5), V(x + Math.cos(a) * d * 0.55, h0 + 2.5, z + Math.sin(a) * d * 0.55), V(x + Math.cos(a) * d, FOND + 3, z + Math.sin(a) * d), V(x + Math.cos(a) * (d + 2), FOND - 4, z + Math.sin(a) * (d + 2))]);
    parts.push(taperTube(c, 1.0, 0.35, 24, 6));
  }
  if (!tolto) {
    // i rami: si allargano in orizzontale e si intrecciano con quelli degli altri alberi
    for (let b = 0; b < 16; b++) {
      const a = (b / 16) * Math.PI * 2 + rnd() * 0.3, L = 45 + rnd() * 45, pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8, aa = a + Math.sin(t * 4 + b) * 0.35; pts.push(V(x + Math.cos(aa) * L * t, top + Math.sin(t * 9 + b) * 1.1 - (BASSO ? 3.5 * Math.sin(Math.PI * t) : 0), z + Math.sin(aa) * L * t)); }
      const c = new THREE.CatmullRomCurve3(pts); parts.push(taperTube(c, 1.5, 0.35, 30, 6));
      for (let s = 0; s < 3; s++) { const t0 = 0.3 + rnd() * 0.5, p0 = c.getPoint(t0), aa = a + (rnd() - 0.5) * 2.2, l2 = 14 + rnd() * 16; parts.push(taperTube(new THREE.CatmullRomCurve3([p0, V(p0.x + Math.cos(aa) * l2 * 0.5, top + (rnd() - 0.5) * 2, p0.z + Math.sin(aa) * l2 * 0.5), V(p0.x + Math.cos(aa) * l2, top + (rnd() - 0.5) * 2 - (BASSO ? 2 : 0), p0.z + Math.sin(aa) * l2)]), 0.6, 0.2, 14, 5)); }
    }
  }
  const tree = shade(add(new THREE.Mesh(mergeGeometries(parts), tolto ? new THREE.MeshStandardMaterial({ color: 0x5c4a42, roughness: 0.95 }) : bark)));
  tree.material = tree.material.clone(); tree.material.clippingPlanes = cut;
});
// l'acqua del serbatoio: superficie increspata, corpo che scurisce in profondità, sezione davanti
{
  const ripple = canvasTex(512, 512, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin((x + y) * 0.11) * 0.3 + Math.sin(y * 0.19 - x * 0.03) * 0.2; const nx = 128 + v * 40, ny = 128 + Math.cos(y * 0.06 + x * 0.02) * 40; const i = (y * w + x) * 4; img.data[i] = nx; img.data[i + 1] = ny; img.data[i + 2] = 255; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, [60, 60], false);
  const surf = add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x4f5f62, roughness: 0.08, metalness: 0.35, normalMap: ripple, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.86, clippingPlanes: cut })), 0, LIV, 0);
  surf.rotation.x = -Math.PI / 2; surf.receiveShadow = true;
  const depth = LIV - FOND, g = new THREE.PlaneGeometry(3000, depth, 1, 16), col = [];
  for (let i = 0; i < g.attributes.position.count; i++) { const t = (g.attributes.position.getY(i) + depth / 2) / depth; const c = new THREE.Color(0x1f2b2f).lerp(new THREE.Color(0x6f8a8c), Math.pow(t, 1.6)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const face = add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false })), 0, (LIV + FOND) / 2, TAGLIO + 0.2); face.renderOrder = 3;
  add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 0.18), new THREE.MeshBasicMaterial({ color: 0xdfe6e4 })), 0, LIV - 0.09, TAGLIO + 0.25); // il menisco
  // particelle sospese: dicono che è un fluido
  const pp = []; for (let i = 0; i < 1600; i++) pp.push(-200 + rnd() * 460, FOND + 2 + rnd() * (depth - 3), -60 + rnd() * (TAGLIO + 58));
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xc9d6d3, size: 0.35, transparent: true, opacity: 0.55, depthWrite: false })));
}

/* =========================================================
   SOPRA: la rupe, la Soglia, il passaggio, il nido
   ========================================================= */
// la rupe: basalto colonnare, organica, dal fondo alla quota
{
  const g = new THREE.CylinderGeometry(30, 36, Q - FOND, 64, 24, false); const p = g.attributes.position, v = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z); if (r < 1) continue; const k = 1 + 0.06 * Math.sin(a * 3 + v.y * 0.05) + 0.03 * Math.sin(a * 7) + 0.02 * Math.sin(a * 36); v.x = Math.cos(a) * r * k * 1.25; v.z = Math.sin(a) * r * k * 0.75; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  shade(add(new THREE.Mesh(g, basalt), SX, (Q + FOND) / 2, 0));
}
// la Soglia: tre monoliti uguali di basalto, con una fessura; la luce passa e cade verso chi arriva
const bladeTex = canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(250,244,232,0.95)'); gr.addColorStop(0.35, 'rgba(240,232,215,0.35)'); gr.addColorStop(1, 'rgba(235,225,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,.7)'); v.addColorStop(0.15, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); });
const bladeMat = (op) => new THREE.MeshBasicMaterial({ map: bladeTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
[-42, -22, -2].forEach((dx) => {
  const x = SX + dx, H = 30, W = 24, slit = 1.3, half = (W - slit) / 2;
  box(2.8, H, half, basalt, x, Q + H / 2, -(slit / 2 + half / 2)); box(2.8, H, half, basalt, x, Q + H / 2, slit / 2 + half / 2);
  const bl = new THREE.PlaneGeometry(20, H - 4); bl.translate(10, 0, 0); const m = add(new THREE.Mesh(bl, bladeMat(0.38)), x - 1.4, Q + (H - 4) / 2, 0); m.rotation.y = Math.PI;
  const f = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 1.4), bladeMat(0.45)), x - 11.4, Q + 0.06, 0); f.rotation.x = -Math.PI / 2; f.scale.x = -1;
});
// il passaggio in quota: dall'orizzonte alla Soglia, e dritto fino al collo del nido
const NECK0 = V(GX - 58, Q, 0);
box(400, 1.0, 3.0, basalt, SX - 36 - 200, Q - 0.5, 0);
box(NECK0.x - (SX + 36), 1.0, 3.0, basalt, (SX + 36 + NECK0.x) / 2, Q - 0.5, 0);
// l'unica scala: scende avvolgendo la rupe fino all'intreccio del piano di sotto (la via più larga e più battuta)
{
  const steps = 70, im = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.45, 2.2), basalt, steps), o = new THREE.Object3D();
  for (let i = 0; i < steps; i++) { const t = i / (steps - 1), a = -0.2 + t * Math.PI * 1.15; o.position.set(SX + Math.cos(a) * 41, Q - 0.25 - t * (Q - LIV - 1), Math.sin(a) * 26); o.rotation.y = -a; o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  shade(im); im.computeBoundingSphere(); scene.add(im);
}

/* ---------- il nido ---------- */
const NC = V(GX, Q + 14, -4); // centro della camera centrale
const fibre = [];
// un corpo intrecciato: fibre su cerchi con assi casuali, raggio deformato (asimmetria, lobo, peso in basso)
function corpoIntrecciato(center, R, n, lobe, lobeAmt, squash, thick) {
  const ax = V(0, 0, 0), u = V(0, 0, 0), w = V(0, 0, 0), d = V(0, 0, 0);
  for (let k = 0; k < n; k++) {
    ax.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    u.set(1, 0, 0); if (Math.abs(ax.x) > 0.8) u.set(0, 1, 0); u.cross(ax).normalize(); w.crossVectors(ax, u);
    const pts = [], ph = rnd() * 6.28, span = 2.2 + rnd() * 2.5;
    for (let i = 0; i <= 26; i++) {
      const a = ph + (i / 26) * span; d.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a));
      const r = R * (1 + 0.18 * d.y * squash + lobeAmt * Math.pow(Math.max(0, d.dot(lobe)), 2)) * (1 + (rnd() - 0.5) * 0.06);
      pts.push(V(center.x + d.x * r, center.y + d.y * r * 0.92, center.z + d.z * r));
    }
    fibre.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, thick * (0.6 + rnd() * 0.8), 4, false));
  }
}
// la camera centrale, asimmetrica: un lobo verso l'alto e indietro, più peso in basso
corpoIntrecciato(NC, 21, 230, V(0.3, 0.7, -0.6).normalize(), 0.45, -1, 0.42);
// le otto camere chiuse, germogliate intorno: le opposte una di fronte all'altra
const OTTO = [];
for (let k = 0; k < 8; k++) {
  const a = (k / 8) * Math.PI * 2 + 0.25, el = (k % 2 ? -0.32 : -0.62) + 0.08 * Math.sin(k * 1.7);
  const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).normalize();
  if (dir.x < -0.75) dir.x = -0.75; // il lato del collo resta più libero
  dir.normalize();
  const c = NC.clone().addScaledVector(dir, 15 + rnd() * 4), R = 5 + rnd() * 3.5;
  corpoIntrecciato(c, R, 60, dir, 0.9, 0.5, 0.3);
  OTTO.push(c);
}
// il collo d'ingresso: l'anticamera
const NECK = new THREE.CatmullRomCurve3([NECK0, V(GX - 46, Q + 0.2, -1), V(GX - 34, Q + 1.0, -2.5), V(GX - 22, Q + 4, -4)]);
for (let k = 0; k < 70; k++) {
  const ph = rnd() * 6.28, tw = (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.8), pts = [], c = V(0, 0, 0), t3 = V(0, 0, 0), n1 = V(0, 0, 0), n2 = V(0, 0, 0), up = V(0, 1, 0);
  for (let i = 0; i <= 30; i++) { const t = i / 30; NECK.getPointAt(t, c); NECK.getTangentAt(t, t3); n1.crossVectors(t3, up).normalize(); n2.crossVectors(n1, t3).normalize(); const a = ph + tw * t * 6.28, r = 3.6 + 1.2 * Math.pow(t, 2); pts.push(c.clone().addScaledVector(n1, Math.cos(a) * r).addScaledVector(n2, Math.sin(a) * r + 1.6)); }
  fibre.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.22 + rnd() * 0.18, 4, false));
}
const nest = shade(add(new THREE.Mesh(mergeGeometries(fibre), fibreMat)));
// dentro la stanza: la sola luce calda
const core = add(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffaa62, emissiveIntensity: 1.5 })), NC.x, NC.y - 2, NC.z); core.scale.set(13, 10, 13);
const warm = new THREE.PointLight(0xffaa62, 700, 120, 1.6); warm.position.copy(NC); scene.add(warm);
// le membrane che chiudono le otto camere
for (const c of OTTO) { const m = add(new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 16), new THREE.MeshStandardMaterial({ color: 0x6e5f50, roughness: 0.7, transparent: true, opacity: 0.6 })), c.x, c.y, c.z); m.castShadow = false; }
// i quattro assi: fibre tese, chiare, da un'opposta all'altra attraverso la stanza
for (let k = 0; k < 4; k++) {
  const a = OTTO[k], b = OTTO[k + 4], len = a.distanceTo(b) + 16, mid = a.clone().add(b).multiplyScalar(0.5);
  const ax = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 6), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe9eef2, emissiveIntensity: 1.1 })), mid.x, mid.y, mid.z);
  ax.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
}
// il corridoio: una galleria esterna che gira intorno a tutte le camere, senza entrare
{
  const pts = []; for (let i = 0; i <= 64; i++) { const a = -Math.PI * 0.85 + (i / 64) * Math.PI * 2.1; pts.push(V(NC.x + Math.cos(a) * 40, Q + 2 + 9 * Math.sin(i / 64 * Math.PI) + 2 * Math.sin(a * 3), NC.z + Math.sin(a) * 33)); }
  const c = new THREE.CatmullRomCurve3(pts), pos = [], idx = [], p = V(0, 0, 0), t = V(0, 0, 0), s = V(0, 0, 0), up = V(0, 1, 0);
  for (let i = 0; i <= 200; i++) { c.getPoint(i / 200, p); c.getTangent(i / 200, t); s.crossVectors(t, up).normalize().multiplyScalar(1.4); pos.push(p.x - s.x, p.y, p.z - s.z, p.x + s.x, p.y, p.z + s.z); if (i < 200) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  shade(add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3b332c, roughness: 0.85, side: THREE.DoubleSide }))));
  // il raccordo: dal collo al corridoio
  box(10, 0.8, 2.6, basalt, NECK0.x + 4, Q - 0.4, -6);
}
// l'anticamera, dentro il collo: tre schermi con una fessura fuori centro, ruotati (sfalsati)
const SCHERMI = [GX - 52, GX - 46, GX - 40];
SCHERMI.forEach((x, i) => {
  const s = new THREE.Shape(); s.absarc(0, 0, 3.7, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.moveTo(-0.45, 0.6); hole.lineTo(0.45, 0.6); hole.lineTo(0.45, 3.1); hole.lineTo(-0.45, 3.1); hole.closePath(); s.holes.push(hole);
  const m = shade(add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0x8a7866, roughness: 0.8 })), 0, 0, 0));
  const c = NECK.getPointAt([0.12, 0.3, 0.48][i]); m.position.set(c.x, c.y + 1.6, c.z); m.rotation.y = Math.PI / 2;
  m.rotateZ([0, 1.1, -1.4][i]); // sfalsati: le fessure non stanno in fila
});

{ const l = new THREE.PointLight(0xe6e9ec, 60, 30, 1.5); l.position.set(GX - 64, Q + 4, 2); scene.add(l); }

/* ---------- chi arriva e chi è passato ---------- */
persona(SX - 60, Q, 0.3, false); persona(SX - 64, Q, -0.6, false); persona(SX - 150, Q, 0.2, false);
persona(SX + 52, Q, 0.2, true);

/* ---------- inquadrature ---------- */
const VIEWS = {
  fuori: [40, [-250, 70, 205], [40, 8, 0]],
  soglia: [60, [SX - 82, Q + 1.7, 1.0], [SX + 40, Q + 15, 0]],
  nido: [44, [SX + 40, Q + 9, -58], [GX - 6, Q + 10, -2]],
  anticamera: [52, [GX - 70, Q + 2.4, 3.5], [GX - 44, Q + 2.0, -1.2]],
  sotto: [50, [20, -14, 160], [20, -16, 0]],
};
const [fov, cp, ct] = VIEWS[VISTA] || VIEWS.fuori;
camera.fov = fov; camera.position.set(...cp); controls.target.set(...ct);
if (VISTA === 'sotto' && BASSO) { /* stessa inquadratura, il livello è sceso */ }
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.45, 0.5, 0.75));
composer.addPass(new OutputPass());
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); composer.setSize(w, h); }
window.addEventListener('resize', resize); resize();
let raf = 0;
function loop() { raf = requestAnimationFrame(loop); controls.update(); composer.render(); }
loop();
document.documentElement.dataset.pronto = '1';
window.addEventListener('pagehide', (e) => { if (e.persisted) return; cancelAnimationFrame(raf); controls.dispose(); disposeObject(scene); composer.dispose(); renderer.dispose(); });
