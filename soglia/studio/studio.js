// Studio visivo per «La Soglia»: plastico in sezione, legno, bambù, carta, tubi di cartone.
// Disposizione A: la Soglia da sola alla sua quota; una via sale alla quota delle stanze,
// con il mezzanino a metà salita appeso all'ossatura; una via scende al piano di sotto (serbatoio);
// sotto, le fondamenta. Metà anteriore tagliata, come un plastico in sezione.
// Inquadrature: ?vista=insieme | soglia | sotto
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { disposeObject } from '../../src/lib/dispose.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xece7de);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/* ---------- luce da studio: cielo diffuso + un solo sole con ombra ---------- */
scene.add(new THREE.HemisphereLight(0xfffaf2, 0xb9ad9c, 1.6));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(-22, 34, 26);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 26, bottom: -22, near: 5, far: 110 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun);

/* ---------- materiali ---------- */
const M = {
  ply: new THREE.MeshStandardMaterial({ color: 0xdcc6a2, roughness: 0.82 }),
  plyDark: new THREE.MeshStandardMaterial({ color: 0xc9ae86, roughness: 0.85 }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0xcdb57c, roughness: 0.55 }),
  kraft: new THREE.MeshStandardMaterial({ color: 0xa8825a, roughness: 0.9 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.95, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
  paperRoom: new THREE.MeshStandardMaterial({ color: 0xf4eee2, roughness: 0.95, transparent: true, opacity: 0.86 }),
  door: new THREE.MeshStandardMaterial({ color: 0xb79a72, roughness: 0.8 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xfff0d2, emissive: 0xffc77a, emissiveIntensity: 1.1, roughness: 0.9 }),
  water: new THREE.MeshStandardMaterial({ color: 0x8fb1b6, roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.78 }),
  waterSide: new THREE.MeshStandardMaterial({ color: 0x7fa2a8, roughness: 0.3, transparent: true, opacity: 0.55 }),
  base: new THREE.MeshStandardMaterial({ color: 0xf2eee7, roughness: 1 }),
};

// le fondamenta: strati compressi, visibili sul taglio
const strata = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const tones = ['#b9a58a', '#a8937a', '#c4b197', '#9e8970', '#b3a084'];
  let y = 0, i = 0;
  while (y < 256) { const h = 10 + ((i * 37) % 23); g.fillStyle = tones[i % tones.length]; g.fillRect(0, y, 64, h); y += h; i++; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
M.found = new THREE.MeshStandardMaterial({ color: 0xffffff, map: strata, roughness: 0.95 });

const shade = (o) => { o.castShadow = true; o.receiveShadow = true; return o; };
const add = (geo, mat, x, y, z, parent = scene) => { const m = shade(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); parent.add(m); return m; };

/* ---------- quote ---------- */
const Y = { found0: -10, found1: -7, water: -4.2, soglia: 0, mezz: 2.2, rooms: 4.4 };
const RC = new THREE.Vector3(12, 0, -2.6); // centro della quota delle stanze

/* ---------- basamento del plastico ---------- */
add(new THREE.BoxGeometry(60, 0.6, 40), M.base, 2, Y.found0 - 0.3, -2).receiveShadow = true;

/* ---------- le fondamenta: un blocco a strati, tagliato davanti ---------- */
add(new THREE.BoxGeometry(46, Y.found1 - Y.found0, 22), M.found, 2, (Y.found0 + Y.found1) / 2, -4);

/* ---------- il piano di sotto: il serbatoio, tagliato davanti ---------- */
{
  const w = 46, d = 22, h = Y.water - Y.found1;
  const water = add(new THREE.BoxGeometry(w - 0.6, h, d - 0.3), M.water, 2, Y.found1 + h / 2, -4.15);
  water.castShadow = false;
  // pareti della vasca (solo dietro e ai lati: davanti è il taglio)
  add(new THREE.BoxGeometry(w, h + 0.6, 0.3), M.plyDark, 2, Y.found1 + (h + 0.6) / 2, -4 - d / 2);
  add(new THREE.BoxGeometry(0.3, h + 0.6, d), M.plyDark, 2 - w / 2, Y.found1 + (h + 0.6) / 2, -4);
  add(new THREE.BoxGeometry(0.3, h + 0.6, d), M.plyDark, 2 + w / 2, Y.found1 + (h + 0.6) / 2, -4);
  // i quattro appoggi: pali di legno dalle fondamenta alla superficie
  // più larghi delle colonne e di legno chiaro, con un cappello sulla superficie: reggono il livello
  M.appoggio = new THREE.MeshStandardMaterial({ color: 0xead8b8, roughness: 0.7 });
  const ap = new THREE.CylinderGeometry(0.95, 1.1, Y.water - Y.found1, 28);
  const cap = new THREE.CylinderGeometry(1.5, 1.5, 0.18, 32);
  [[-4, 3], [5, 4], [14, 4.5], [21, 3]].forEach(([x, z]) => { add(ap, M.appoggio, x, (Y.water + Y.found1) / 2, z); add(cap, M.appoggio, x, Y.water + 0.05, z); });
}

/* ---------- l'ossatura: tubi di cartone (InstancedMesh) ---------- */
{
  const pts = [];
  // sotto la quota delle stanze: un anello di colonne
  // le teste delle colonne restano sotto i pavimenti
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pts.push([RC.x + Math.cos(a) * 8.6, RC.z + Math.sin(a) * 8.6, Y.rooms - 0.45]); }
  pts.push([RC.x, RC.z, Y.rooms - 0.45]);
  // sotto la Soglia
  [[-17, -4], [-9, -4], [-17, 3], [-9, 3]].forEach(([x, z]) => pts.push([x, z, Y.soglia - 0.45]));
  // il mezzanino poggia su due colonne dell'ossatura: si raggiunge dalla struttura
  pts.push([-3.8, -6.0, Y.mezz - 0.2]);
  pts.push([-0.6, -6.0, Y.mezz - 0.2]);
  const geo = new THREE.CylinderGeometry(0.32, 0.32, 1, 18);
  const im = new THREE.InstancedMesh(geo, M.kraft, pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  pts.forEach(([x, z, top], i) => { const h = top - Y.found1; p.set(x, Y.found1 + h / 2, z); s.set(1, h, 1); m4.compose(p, q, s); im.setMatrixAt(i, m4); });
  im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}

/* ---------- la Soglia: una piattaforma sola, tre archi di bambù in sequenza ---------- */
{
  add(new THREE.BoxGeometry(10, 0.4, 9), M.ply, -13, Y.soglia - 0.2, -0.5);
  // il percorso da fuori
  add(new THREE.BoxGeometry(5, 0.2, 2.4), M.plyDark, -20.5, Y.soglia - 0.3, 0.8);
  const arch = (x, w, h) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = -1 + (2 * i) / 40;
      const y = (h * (Math.cosh(1.4) - Math.cosh(1.4 * t))) / (Math.cosh(1.4) - 1);
      pts.push(new THREE.Vector3(x, Y.soglia + y, 0.8 + t * w));
    }
    const c = new THREE.CatmullRomCurve3(pts);
    for (const off of [-0.18, 0.18]) {
      const g = new THREE.TubeGeometry(c, 60, 0.11, 10, false);
      const m = shade(new THREE.Mesh(g, M.bamboo)); m.position.x = off; scene.add(m);
    }
  };
  arch(-17.2, 2.0, 4.4); arch(-14.4, 1.9, 4.1); arch(-11.6, 1.8, 3.8);
  // schermi di carta solo dietro: la Soglia resta aperta verso chi arriva
  add(new THREE.BoxGeometry(10, 4.6, 0.06), M.paper, -13, Y.soglia + 2.3, -5).castShadow = false;
}

/* ---------- le due vie: una scala sale, una scende ---------- */
function stair(from, to, steps, width, mat) {
  const geo = new THREE.BoxGeometry(width, 0.16, 0.9);
  const im = new THREE.InstancedMesh(geo, mat, steps);
  const o = new THREE.Object3D();
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    o.position.lerpVectors(from, to, t);
    o.lookAt(to.x, o.position.y, to.z);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
  }
  im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}
// su: dalla Soglia a un pianerottolo a mezza quota, poi alla quota delle stanze
stair(new THREE.Vector3(-8.0, Y.soglia + 0.1, -2.0), new THREE.Vector3(-3.4, Y.mezz, -2.0), 11, 2.0, M.ply);
add(new THREE.BoxGeometry(2.4, 0.3, 2.2), M.ply, -2.2, Y.mezz, -2.0);
stair(new THREE.Vector3(-0.8, Y.mezz + 0.2, -2.0), new THREE.Vector3(1.3, Y.rooms - 0.1, -2.0), 8, 2.0, M.ply);
{
  // il mezzanino: ballatoio che sporge dal pianerottolo, a mezza quota, sopra due colonne dell'ossatura
  add(new THREE.BoxGeometry(4.4, 0.3, 3.6), M.ply, -2.2, Y.mezz, -4.9);
  const rail = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), M.bamboo, 8);
  const o = new THREE.Object3D();
  for (let i = 0; i < 8; i++) { o.position.set(-4.2 + i * 0.57, Y.mezz + 0.7, -6.6); o.updateMatrix(); rail.setMatrixAt(i, o.matrix); }
  rail.castShadow = true; rail.computeBoundingSphere(); scene.add(rail);
  add(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 8), M.bamboo, -2.2, Y.mezz + 1.25, -6.6).rotation.z = Math.PI / 2;
}
// giù: dalla Soglia al piano di sotto
stair(new THREE.Vector3(-12, Y.soglia - 0.2, 3.4), new THREE.Vector3(-6.5, Y.water + 0.2, 5.6), 14, 2.0, M.plyDark);

/* ---------- la quota delle stanze ---------- */
{
  const deck = add(new THREE.CylinderGeometry(10.6, 10.6, 0.4, 72), M.ply, RC.x, Y.rooms - 0.2, RC.z);
  // il corridoio: un anello fuori da tutte le stanze
  add(new THREE.TorusGeometry(9.3, 0.06, 6, 120), M.bamboo, RC.x, Y.rooms + 0.95, RC.z).rotation.x = Math.PI / 2;
  const railPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.95, 8), M.bamboo, 40);
  const o = new THREE.Object3D();
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; o.position.set(RC.x + Math.cos(a) * 9.3, Y.rooms + 0.47, RC.z + Math.sin(a) * 9.3); o.updateMatrix(); railPosts.setMatrixAt(i, o.matrix); }
  railPosts.castShadow = true; railPosts.computeBoundingSphere(); scene.add(railPosts);
  deck.receiveShadow = true;

  // la stanza: l'unico volume con un dentro (tagliata a metà per farlo vedere)
  const R = 2.6, H = 3.6;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true, Math.PI * 0.5, Math.PI * 1.0), M.paperRoom);
  shell.material = M.paperRoom.clone(); shell.material.side = THREE.DoubleSide;
  shell.position.set(RC.x, Y.rooms + H / 2, RC.z); shade(shell); scene.add(shell);
  add(new THREE.CylinderGeometry(R + 0.15, R + 0.15, 0.2, 48, 1, false, Math.PI * 0.5, Math.PI), M.plyDark, RC.x, Y.rooms + H + 0.1, RC.z);
  add(new THREE.CircleGeometry(R - 0.1, 48), M.glow, RC.x, Y.rooms + 0.02, RC.z).rotation.x = -Math.PI / 2;
  const inner = new THREE.PointLight(0xffc77a, 18, 9, 2); inner.position.set(RC.x, Y.rooms + 2, RC.z); scene.add(inner);
  // la porta della stanza, verso l'anticamera
  add(new THREE.BoxGeometry(0.12, 2.4, 1.1), M.door, RC.x - R - 0.02, Y.rooms + 1.2, RC.z);

  // l'anticamera: davanti alla porta, due pareti di carta e nessun tetto
  add(new THREE.BoxGeometry(2.6, 3.0, 0.06), M.paper, RC.x - R - 1.6, Y.rooms + 1.5, RC.z - 1.3).castShadow = false;
  add(new THREE.BoxGeometry(0.06, 3.0, 2.6), M.paper, RC.x - R - 2.9, Y.rooms + 1.5, RC.z).castShadow = false;

  // le otto stanze chiuse, intorno (InstancedMesh): volumi di carta, porte di legno chiuse
  const rooms = new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 2.7, 2.1), M.paperRoom, 8);
  const doors = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 2.0, 0.08), M.door, 8);
  const ro = new THREE.Object3D();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + (k / 8) * Math.PI * 2; // l'asse dell'anticamera (verso -x) resta libero
    const x = RC.x + Math.cos(a) * 6.2, z = RC.z + Math.sin(a) * 6.2;
    ro.position.set(x, Y.rooms + 1.35, z); ro.rotation.set(0, -a + Math.PI / 2, 0); ro.updateMatrix(); rooms.setMatrixAt(k, ro.matrix);
    ro.position.set(x - Math.cos(a) * 1.08, Y.rooms + 1.0, z - Math.sin(a) * 1.08); ro.updateMatrix(); doors.setMatrixAt(k, ro.matrix);
  }
  for (const im of [rooms, doors]) { im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); }

  // l'involucro: carta traslucida solo nella metà dietro (sezione)
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.5, 4.2, 96, 1, true, Math.PI * 0.5, Math.PI), M.paper);
  skin.position.set(RC.x, Y.rooms + 2.1, RC.z); scene.add(skin);
}

/* ---------- inquadrature ---------- */
const VISTE = {
  insieme: [[-36, 21, 40], [3, -1.5, -2]],
  soglia: [[-27, 2.4, 7.5], [-10, 2.2, -0.5]],
  sotto: [[8, -5.0, 27], [6, -6.2, -4]],
};
const v = VISTE[new URLSearchParams(location.search).get('vista')] || VISTE.insieme;
camera.position.set(...v[0]); controls.target.set(...v[1]);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

let raf = 0;
function loop() { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); }
loop();
document.documentElement.dataset.pronto = '1';
window.addEventListener('pagehide', (e) => { if (e.persisted) return; cancelAnimationFrame(raf); controls.dispose(); disposeObject(scene); renderer.dispose(); });
