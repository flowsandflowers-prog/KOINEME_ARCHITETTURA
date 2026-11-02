// Scena di base del progetto: tre archi di pietra nel crepuscolo, uno per ogni
// versione dell'edificio. Segue le skill del progetto:
// - threejs-performance: InstancedMesh per le pietre, una sola DirectionalLight
//   con ombra a bassa risoluzione, luce delle soglie "cotta" in una texture,
//   nessuna allocazione nel loop, dispose di tutto quando la pagina si chiude;
// - threejs-interaction: un solo Raycaster, eventi pointer, objectsToIntersect;
// - 3d-web-experience: niente schermo nero (il testo c'è subito e la scena entra
//   in dissolvenza), qualità ridotta sui dispositivi leggeri, i link funzionano
//   anche senza WebGL.
import * as THREE from 'three';
import { disposeObject } from './lib/dispose.js';
import { createPicker } from './lib/picker.js';

const canvas = document.getElementById('scene');
const links = [...document.querySelectorAll('[data-soglia]')];
const mm = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
const REDUCE = mm('(prefers-reduced-motion: reduce)');
const LOW = (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
  (mm('(pointer:coarse)') && Math.min(screen.width, screen.height) < 520);

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

if (!webglOK()) document.body.classList.add('flat');
else start();

function start() {
  /* ---------- renderer, scena, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a2140, 26, 80);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  const LOOK = new THREE.Vector3(0, 2.8, -1);

  // cielo: un gradiente dal tramonto alla notte, in un solo shader
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vP;void main(){float h=normalize(vP).y;vec3 top=vec3(.07,.09,.22);vec3 mid=vec3(.36,.22,.38);vec3 hor=vec3(.93,.58,.42);vec3 c=h>0.?mix(mix(hor,mid,smoothstep(0.,.16,h)),top,smoothstep(.16,.65,h)):mix(hor*.5,vec3(.05,.06,.1),smoothstep(0.,-.2,h));gl_FragColor=vec4(c,1.);}',
  })));

  /* ---------- luci: cielo diffuso + un solo sole con ombra piccola e stretta ---------- */
  scene.add(new THREE.HemisphereLight(0xc9b6e6, 0x2f5a52, 1.25));
  const sun = new THREE.DirectionalLight(0xffc98a, 3.2);
  sun.position.set(-12, 9, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(LOW ? 512 : 1024, LOW ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 9, bottom: -3, near: 2, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  /* ---------- il suolo ---------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0x3d5f5c, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- tre archi a catenaria, pietre in un'unica InstancedMesh ---------- */
  const ARCHES = [
    { x: -6.6, z: 0.6, w: 2.2, h: 5.0, base: 0xe2d0b0 },
    { x: 0.0, z: -1.6, w: 2.6, h: 6.2, base: 0xe7d6b8 },
    { x: 6.6, z: 0.6, w: 2.2, h: 5.0, base: 0xd9c19a },
  ];
  const STONES = 25;
  const stoneGeo = new THREE.BoxGeometry(1, 1, 1);
  const stoneMat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, ARCHES.length * STONES);
  stones.castShadow = true;
  stones.receiveShadow = true;

  // texture "cotta" per la luce che abita la soglia: nessuna PointLight
  // ha la forma della luce dell'arco (la stessa catenaria) e bordi sfumati
  const glowTex = (() => {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.filter = 'blur(5px)';
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = -1 + (2 * i) / 40;
      const y = (Math.cosh(1.6) - Math.cosh(1.6 * x)) / (Math.cosh(1.6) - 1);
      g.lineTo(S / 2 + x * S * 0.42, S - 4 - y * (S - 12));
    }
    g.closePath();
    const gr = g.createLinearGradient(0, S, 0, 0);
    gr.addColorStop(0, 'rgba(255,214,150,0.9)'); gr.addColorStop(0.6, 'rgba(244,197,110,0.3)'); gr.addColorStop(1, 'rgba(244,197,110,0)');
    g.fillStyle = gr; g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  const tan = new THREE.Vector3(), nor = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const baseColors = [];   // un colore per pietra, calcolato una volta
  const glows = [];
  const objectsToIntersect = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  ARCHES.forEach((a, k) => {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const x = -a.w + (2 * a.w * i) / 60;
      const y = (a.h * (Math.cosh(1.6) - Math.cosh((1.6 * x) / a.w))) / (Math.cosh(1.6) - 1);
      pts.push(new THREE.Vector3(a.x + x, y, a.z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const len = curve.getLength() / STONES;
    for (let i = 0; i < STONES; i++) {
      const t = (i + 0.5) / STONES;
      curve.getPointAt(t, pos);
      curve.getTangentAt(t, tan);
      nor.crossVectors(Z, tan).normalize();
      m4.makeBasis(tan, nor, Z);
      const thick = 0.62 - 0.14 * Math.sin(Math.PI * t); // più massicce alle imposte
      scl.set(len * 0.94, thick, 0.95);
      m4.scale(scl);
      m4.setPosition(pos);
      const id = k * STONES + i;
      stones.setMatrixAt(id, m4);
      const c = new THREE.Color(a.base).offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.06);
      baseColors.push(c);
      stones.setColorAt(id, c);
    }
    // la luce nella soglia
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(a.w * 2.38, a.h), new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    glow.position.set(a.x, a.h * 0.5, a.z);
    scene.add(glow);
    glows.push(glow);
    // bersaglio invisibile del raggio: un piano che riempie l'arco
    const proxy = new THREE.Mesh(new THREE.PlaneGeometry(a.w * 2, a.h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    proxy.position.set(a.x, a.h / 2, a.z);
    proxy.visible = false;
    proxy.userData.pick = k;
    scene.add(proxy);
    objectsToIntersect.push(proxy);
  });
  stones.instanceMatrix.needsUpdate = true;
  stones.instanceColor.needsUpdate = true;
  stones.computeBoundingSphere();
  scene.add(stones);

  /* ---------- quale soglia è "accesa": dal puntatore sulla scena o dalla lista ---------- */
  let hot = -1;
  const heat = new Float32Array(ARCHES.length);
  const HOT = new THREE.Color(0xf4c56e), tmpC = new THREE.Color();
  function setHot(i) {
    hot = i;
    links.forEach((l, j) => l.classList.toggle('hot', j === i));
  }
  links.forEach((l, j) => {
    l.addEventListener('pointerenter', () => setHot(j));
    l.addEventListener('pointerleave', () => setHot(-1));
    l.addEventListener('focus', () => setHot(j));
    l.addEventListener('blur', () => setHot(-1));
  });
  const picker = createPicker(canvas, camera, objectsToIntersect, {
    onHover: (o) => setHot(o ? o.userData.pick : -1),
    onClick: (o) => { window.location.href = links[o.userData.pick].href; },
  });

  /* ---------- parallasse leggera col puntatore ---------- */
  let px = 0, py = 0, sx = 0, sy = 0, dist = 19;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    px = (e.clientX / window.innerWidth) * 2 - 1;
    py = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // Composizione: gli archi lasciano spazio al testo. Su schermi larghi la scena
  // si sposta a destra, in verticale sale nella metà alta (setViewOffset).
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    const wide = w / h > 1.1;
    let fw = w, fh = h, oy = 0, frac = 1, span = 9.8;
    if (wide) {
      // centro degli archi nello spazio libero a destra del testo
      const cx = w > 900 ? 0.66 : 0.6;
      fw = w * cx * 2;
      frac = (w - w * cx) / (fw / 2); // quota della semiampiezza che resta visibile a destra
    } else {
      // in verticale gli archi salgono nel terzo alto; i lati possono uscire di poco
      fh = h * 1.34; oy = fh - h; span = 8.4;
    }
    camera.fov = wide ? 40 : 52;
    camera.aspect = fw / fh;
    camera.setViewOffset(fw, fh, 0, oy, w, h);
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max(19, span / (frac * half * camera.aspect));
    scene.fog.near = dist + 4; scene.fog.far = dist + 70;
    camera.far = dist + 300;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- loop: nessun oggetto nuovo qui dentro ---------- */
  let raf = 0, last = performance.now(), first = true;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-dt * (REDUCE ? 20 : 4));

    if (!REDUCE) { sx += (px - sx) * k; sy += (py - sy) * k; }
    camera.position.set(sx * 2.2, 4 - sy * 0.8 + dist * 0.04, dist);
    camera.lookAt(LOOK);

    picker.update();

    let dirty = false;
    for (let a = 0; a < ARCHES.length; a++) {
      const target = a === hot ? 1 : 0;
      if (Math.abs(heat[a] - target) < 0.002) { if (heat[a] !== target) { heat[a] = target; dirty = true; } continue; }
      heat[a] += (target - heat[a]) * k * 1.6;
      dirty = true;
    }
    if (dirty) {
      for (let a = 0; a < ARCHES.length; a++) {
        glows[a].material.opacity = 0.18 + 0.55 * heat[a];
        for (let i = 0; i < STONES; i++) {
          const id = a * STONES + i;
          tmpC.copy(baseColors[id]).lerp(HOT, heat[a] * 0.45);
          stones.setColorAt(id, tmpC);
        }
      }
      stones.instanceColor.needsUpdate = true;
    }

    renderer.render(scene, camera);
    if (first) { first = false; canvas.classList.add('on'); }
  }
  raf = requestAnimationFrame(loop);

  /* ---------- quando la pagina si chiude: liberare tutto ---------- */
  window.addEventListener('pagehide', (e) => {
    if (e.persisted) return; // resta in cache: la scena serve ancora al ritorno
    cancelAnimationFrame(raf);
    picker.dispose();
    disposeObject(scene);
    renderer.dispose();
  });
}
