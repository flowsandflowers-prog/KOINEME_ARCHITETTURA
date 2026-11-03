// «La Soglia»: il modello navigabile dell'edificio del Modulo 1.
// Due modi: Racconta (per chi conduce, su Zoom: inquadrature composte, la camera vola da uno spazio all'altro)
// e Attraversa (per chi partecipa: in prima persona, a altezza d'occhi, si avanza con lo scorrimento).
// Ogni testo visibile o detto arriva da testi.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPicker } from '../src/lib/picker.js';
import { disposeObject } from '../src/lib/dispose.js';
import { SPAZI, ORDINE, ETICHETTE, DOMANDE, DOVE_VA, VOCI, STANZE_CHIUSE, INTERFACCIA, RACCORDI, MEZZANINO_SPIEGAZIONE } from './testi.js';
import { costruisci, Q, FOND, SX, GX, NC } from './mondo.js';
import { creaMutaforma } from './mutaforma.js';
import { creaAbitanti } from './abitanti.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mm = (q) => !!(window.matchMedia && window.matchMedia(q).matches);
const REDUCE = mm('(prefers-reduced-motion: reduce)');
const LOW = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (mm('(pointer:coarse)') && Math.min(screen.width, screen.height) < 520);

/* ---------- i testi dell'interfaccia ---------- */
document.title = INTERFACCIA.titoloPagina;
$('titolo').textContent = INTERFACCIA.titoloPagina;
$('closePanel').textContent = INTERFACCIA.nascondiTesti; $('openPanel').textContent = INTERFACCIA.mostraTesti;
$('mRacconta').textContent = INTERFACCIA.racconta; $('mAttraversa').textContent = INTERFACCIA.attraversa;
$('tVoci').textContent = ETICHETTE.voci; $('voceGo').textContent = INTERFACCIA.faiEntrare;
$('tAppoggi').textContent = ETICHETTE.appoggiTitolo;
$('lQuota').textContent = ETICHETTE.quota; $('lAmpiezza').textContent = ETICHETTE.ampiezza;
$('lValenza').textContent = ETICHETTE.valenza[0].toUpperCase() + ETICHETTE.valenza.slice(1);
$('lAttivazione').textContent = ETICHETTE.attivazione[0].toUpperCase() + ETICHETTE.attivazione.slice(1);
$('voce').textContent = INTERFACCIA.voce; $('suono').textContent = INTERFACCIA.suono;
$('hint').textContent = INTERFACCIA.avanza; $('loadMsg').textContent = INTERFACCIA.caricamento;

/* ---------- il quaderno: nomi, schede ---------- */
const chipsEl = $('chips'), card = $('card');
ORDINE.forEach((k) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = SPAZI[k].nome; b.dataset.k = k; b.setAttribute('aria-pressed', 'false'); chipsEl.appendChild(b); });
function renderCard(k) {
  const s = SPAZI[k]; card.replaceChildren();
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = txt; card.appendChild(e); };
  el('h2', '', s.nome); if (s.stato) el('p', 'stato', s.stato);
  s.testo.forEach((t) => el('p', '', t));
  if (k === 'mezzanino' && MEZZANINO_SPIEGAZIONE.attivo) el('p', '', MEZZANINO_SPIEGAZIONE.testo);
  if (s.formula) el('p', 'formula', s.formula); if (s.nota) el('p', 'nota', s.nota);
}
let current = 'edificio';
function mark(k) { current = k; [...chipsEl.children].forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === k ? 'true' : 'false')); renderCard(k); }
mark('edificio');
const sel = $('voceSel'); VOCI.forEach((v) => { const o = document.createElement('option'); o.value = String(v.n - 1); o.textContent = `${v.n}. ${v.voce}`; sel.appendChild(o); });
const appEl = $('appoggi'); ETICHETTE.appoggi.forEach((n, i) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = n; b.setAttribute('aria-pressed', 'true'); b.dataset.i = i; appEl.appendChild(b); });
const panel = $('panel');
$('closePanel').addEventListener('click', () => { panel.classList.add('closed'); $('openPanel').classList.add('on'); resize(); });
$('openPanel').addEventListener('click', () => { panel.classList.remove('closed'); $('openPanel').classList.remove('on'); resize(); });

/* ---------- niente zoom della pagina: il pizzico muove solo la camera ---------- */
// (lo zoom del browser restava anche dopo aver ricaricato: la scena si impastava e non si recuperava)
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
window.addEventListener('wheel', (e) => { if (e.ctrlKey && e.target.id !== 'scene') e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 && e.target.id !== 'scene') e.preventDefault(); }, { passive: false });

/* ---------- caricamento ---------- */
const loader = $('loader'), loadBar = $('loadBar');
const step = (p) => { loadBar.style.transform = `scaleX(${p})`; return new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); };
function webglOK() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
function flat() { $('loadMsg').textContent = INTERFACCIA.senza3D; chipsEl.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) mark(b.dataset.k); }); setTimeout(() => loader.classList.add('done'), 2500); }

if (!webglOK()) flat(); else start().catch((e) => { console.error(e); flat(); });

async function start() {
  await step(0.08);
  /* ---------- renderer, scena, camera ---------- */
  const canvas = $('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
  const PRMAX = Math.min(window.devicePixelRatio || 1, LOW ? 1.25 : 1.75), PRMIN = Math.min(1, PRMAX); let PR = PRMAX; renderer.setPixelRatio(PR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07; controls.maxDistance = 520; controls.minDistance = 6;
  controls.zoomToCursor = false; controls.screenSpacePanning = true; controls.maxPolarAngle = Math.PI * 0.52;
  // il bersaglio non esce mai dall'edificio: con il pizzico non si perde più la vista d'insieme
  const LIM = new THREE.Box3(V(-260, FOND, -200), V(260, Q + 120, 160));
  controls.addEventListener('change', () => { if (!LIM.containsPoint(controls.target)) { const b = LIM.clampPoint(controls.target, V(0, 0, 0)); camera.position.add(b.sub(controls.target)); controls.target.add(b); } });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float h;void main(){vec3 a=vec3(.44,.43,.42);vec3 b=vec3(.78,.73,.64);gl_FragColor=vec4(mix(b,a,smoothstep(0.,.5,h)),1.);}' })));
  // la nebbia comincia oltre l'edificio: il modello resta nitido, si sfuma solo l'orizzonte
  scene.fog = new THREE.Fog(0xb4ab9c, 620, 2600);
  scene.add(new THREE.HemisphereLight(0xd8d2c6, 0x34302b, 0.55));
  // sole basso: ombre lunghe, più contrasto
  const sun = new THREE.DirectionalLight(0xf6e4c8, 3.1); sun.position.set(-230, 80, 170); scene.add(sun);
  if (!LOW) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -240, right: 240, top: 180, bottom: -140, near: 10, far: 900 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5; }
  await step(0.25);
  const pmrem = new THREE.PMREMGenerator(renderer); const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  const W = costruisci(scene, { low: LOW, env: envTex, corridoio: new URLSearchParams(location.search).get('corridoio') === 'anello' ? 'anello' : 'nastro' });
  await step(0.75);
  const ST = { ...W.S0, appoggi: [...W.S0.appoggi] };
  let allineaT = 0, strutturaT = 0;

  /* ---------- le figure umane sono tolte. Restano dei segnaposto vuoti, finché lo storyboard dello Smistamento
     non decide chi attraversa: il codice che li muove non disegna nulla ---------- */
  const litM = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, roughness: 0.6, emissive: 0xeef3ff, emissiveIntensity: 0.75 });
  function figura() { const g = new THREE.Group(); g.userData = { meshes: [], l: { intensity: 0 }, glow: { material: { opacity: 0 } }, mixer: null, set() {}, cammina() {} }; return g; }
  const VF = figura(), RUM = figura(), FIG = [];
  const vfM = new THREE.MeshStandardMaterial({ color: 0x1b1916 }); let accesa = 0, accesaT = 0;
  const DARK = new THREE.Color(0x1b1916), LIGHT = new THREE.Color(0x9aa6b8);
  VF.userData.set = (on) => { accesaT = on ? 1 : 0; if (!on) accesa = 0; };

  /* ---------- il mutaforma: in attesa sulla piattaforma davanti al primo passaggio; vaga e, a caso, cambia forma ---------- */
  const MUTA = await creaMutaforma(scene, { x0: SX - 33, x1: W.SOGLIA_X[0] - 4, z0: -17, z1: 10, y: Q,
    // il giro della cicogna: un anello chiuso che parte e torna davanti alla Soglia, alto sopra la Soglia e intorno al nido
    volo: [...Array(40)].map((_, i) => { const th = Math.PI + (i / 40) * Math.PI * 2, c = (1 + Math.cos(th)) / 2; return V(68 + 116 * Math.cos(th), Q + 5 + 52 * Math.pow(c, 0.6), 46 * Math.sin(th)); }) }).catch((e) => { console.warn(e); return null; });
  // l'anteprima dei percorsi (?percorsi): un animale in ogni spazio di destinazione
  const ABIT = /[?&]percorsi\b/.test(location.search) ? await creaAbitanti(scene, W, { Q, NC, FOND }).catch((e) => { console.warn(e); return null; }) : null;

  /* ---------- le inquadrature del racconto ---------- */
  // f: 's' = sale e scende con il livello; 'w' = fissa
  const RAC = {
    edificio: [[-250, 72, 205], [40, 10, 0], 'w'], quote: [[60, 18, 300], [40, 2, 0], 'w'],
    soglia: [[SX - 84, Q + 1.7, 1.0], [SX + 40, Q + 15, 0], 's'], vie: [[SX + 40, Q + 18, 95], [SX - 2, Q / 2, 12], 's'],
    stanza: [[NC.x - 7, Q + 6, NC.z + 7], [NC.x + 3, Q + 4, NC.z - 3], 's'], anticamera: [[GX - 66, Q + 2.4, 3.5], [GX - 42, Q + 2.2, -1.2], 's'],
    corridoio: W.MOBIUS ? [[90, Q + 16, 46], [56, Q + 12, 0], 's'] : [[GX - 20, Q + 34, 84], [GX, Q + 12, -4], 's'], mezzanino: [[W.MZ.x - 13, W.MZ.y + 0.5, W.MZ.z + 10], [W.MZ.x, W.MZ.y + 1.5, W.MZ.z], 's'],
    sotto: [[95, 34, 165], [55, -4, -10], 'b'], fondamenta: [[10, FOND + 10, 140], [10, FOND + 2, 0], 'w'],
    struttura: [[GX - 50, Q + 230, 40], [GX - 50, Q, 0], 's'],
  };
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0), tmpC = V(0, 0, 0), RDIR = V(0, 0, 0), RN = V(0, 0, 0), RF = V(0, 0, 0), RX = V(0, 0, 0), RMAT = new THREE.Matrix4();
  const off = (f) => (f === 's' ? ST.liv : f === 'b' ? ST.sotto : 0); // 's' l'edificio di sopra (fermo), 'b' il pavimento di sotto (segue il livello)
  let fly = null;
  function flyTo(k, dur = 3) { const r = RAC[k]; if (!r) return; controls.autoRotate = false; fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: V(r[0][0], r[0][1] + off(r[2]), r[0][2]), t1: V(r[1][0], r[1][1] + off(r[2]), r[1][2]), s: performance.now(), d: dur * 1000 }; }
  const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep: parte e arriva piano

  /* ---------- la voce narrante: i tuoi file, se ci sono; altrimenti la voce sintetica ---------- */
  let voiceOn = true, elenco = new Set(); const sub = $('sub');
  fetch('voce/elenco.json').then((r) => (r.ok ? r.json() : [])).then((a) => { elenco = new Set(a); }).catch(() => {});
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[«»"']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
  let audio = null, sayId = 0;
  function zitto() { sayId++; try { speechSynthesis.cancel(); } catch (e) {} if (audio) { audio.pause(); audio = null; } sub.classList.remove('on'); }
  function say(file, text) {
    const id = ++sayId; sub.textContent = text; sub.classList.add('on');
    return new Promise((res) => {
      const fine = () => { if (id === sayId) sub.classList.remove('on'); res(); };
      const durata = 1200 + text.length * 70;
      if (!voiceOn) { setTimeout(fine, durata); return; }
      if (elenco.has(file + '.mp3')) { audio = new Audio(`voce/${file}.mp3`); audio.onended = fine; audio.onerror = fine; audio.play().catch(fine); return; }
      try { const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, '').replace(/ · /g, ', ').replace(/→/g, ', ')); u.lang = 'it-IT'; u.rate = 0.93; const it = speechSynthesis.getVoices().find((v) => /^it/i.test(v.lang)); if (it) u.voice = it; let done = false; const f = () => { if (!done) { done = true; fine(); } }; u.onend = f; u.onerror = f; setTimeout(f, durata + 4000); speechSynthesis.speak(u); } catch (e) { setTimeout(fine, durata); }
    });
  }
  const testoSpazio = (k) => { const s = SPAZI[k]; return [s.nome + '.', ...s.testo, ...(s.formula ? [s.formula] : [])].join(' '); };
  $('voce').addEventListener('click', () => { voiceOn = !voiceOn; $('voce').setAttribute('aria-pressed', voiceOn); if (!voiceOn) { try { speechSynthesis.cancel(); } catch (e) {} if (audio) audio.pause(); } });

  /* ---------- il tappeto sonoro: un bordone grave che segue il livello ---------- */
  let AC = null, master, filt, lfoG, soundOn = false;
  function initAudio() {
    AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
    filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500; filt.connect(master);
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.08; lfoG = AC.createGain(); lfoG.gain.value = 120; lfo.connect(lfoG); lfoG.connect(filt.frequency); lfo.start();
    [43.65, 65.4, 87.3, 130.8].forEach((f, i) => { const o = AC.createOscillator(); o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = f; const g = AC.createGain(); g.gain.value = [0.28, 0.16, 0.08, 0.04][i]; o.connect(g); g.connect(filt); o.start(); });
  }
  $('suono').addEventListener('click', () => { if (!AC) initAudio(); soundOn = !soundOn; $('suono').setAttribute('aria-pressed', soundOn); AC.resume(); master.gain.setTargetAtTime(soundOn ? 0.35 : 0, AC.currentTime, 0.8); });

  /* ---------- scegliere uno spazio ---------- */
  let invitato = false, segueK = null; const SEG = V(0, 0, 0);
  function select(k, { noFly = false, parla = true } = {}) {
    if (mode === 'attraversa') { const i = TOUR_KEYS.indexOf(k); if (i >= 0) { tourGo(i); return; } setMode('racconta'); }
    mark(k); strutturaT = k === 'struttura' ? 1 : 0; RUM.visible = k === 'corridoio'; allinea3T = 1;
    segueK = null; liberaDaemon();
    if (ABIT && ABIT.VISTA[k] && !noFly) { // anteprima dei percorsi: la camera va sull'animale dello spazio e poi lo segue
      ABIT.posizione(k, tmpA); const o = ABIT.VISTA[k];
      fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: V(tmpA.x + o[0], tmpA.y + o[1], tmpA.z + o[2]), t1: tmpA.clone(), s: performance.now(), d: 2500 }; segueK = k;
    } else if (!noFly) flyTo(k);
    if (parla) { zitto(); say(`spazio-${k}`, testoSpazio(k)).then(() => { if (k === 'sotto' && !invitato && current === 'sotto') { invitato = true; say('appoggi-invito', RACCORDI.appoggiInvito); } }); }
  }
  chipsEl.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) select(b.dataset.k); });

  /* ---------- i comandi del piano di sotto ---------- */
  appEl.addEventListener('click', (e) => { const b = e.target.closest('.btn'); if (!b) return; const i = +b.dataset.i; ST.appoggi[i] = !ST.appoggi[i]; b.setAttribute('aria-pressed', ST.appoggi[i]); });
  for (const k of ['quota', 'ampiezza', 'valenza', 'attivazione']) $(k).addEventListener('input', (e) => { ST[k] = parseFloat(e.target.value); });

  /* ---------- etichette nella scena ---------- */
  const labelsEl = $('labels'), LAB = [];
  function etichetta(testo, [parent, p], k, small) { const el = document.createElement('div'); el.className = 'lab' + (small ? ' small' : ''); el.textContent = testo; el.addEventListener('click', () => select(k)); labelsEl.appendChild(el); LAB.push({ el, parent, p, k, small }); }
  // le etichette dei nomi solo nelle viste d'insieme; quelle piccole solo nello spazio a cui appartengono
  const INSIEME = new Set(['edificio', 'quote', 'vie', 'struttura']);
  for (const k of Object.keys(W.ANCORE)) etichetta(SPAZI[k].nome, W.ANCORE[k], k, false);
  W.CHIUSE.forEach((a, i) => etichetta(STANZE_CHIUSE[i], a, 'stanza', true));
  W.APPOGGI.forEach((a, i) => etichetta(ETICHETTE.appoggi[i], a, 'sotto', true));
  W.CORPO.forEach((a, i) => { if (ETICHETTE.corpo[i]) etichetta(ETICHETTE.corpo[i], a, 'fondamenta', true); });

  /* ---------- toccare gli spazi ---------- */
  const picker = createPicker(canvas, camera, W.objectsToIntersect, { onClick: (o) => select(o.userData.pick) });

  /* ---------- Attraversa: in prima persona, si avanza con lo scorrimento ---------- */
  const TOUR = [
    ['edificio', [SX - 120, Q + 1.7, 0.3], [SX, Q + 8, 0], 's'], ['soglia', [SX - 40, Q + 1.7, 0.3], [SX + 10, Q + 10, 0], 's'],
    ['soglia', [SX - 29, Q + 1.7, 0], [SX + 10, Q + 11, 0], 's', 0], ['soglia', [SX - 9, Q + 1.7, 0], [SX + 30, Q + 11, 0], 's', 1], ['soglia', [SX + 11, Q + 1.7, 0], [SX + 50, Q + 11, 0], 's', 2],
    ['vie', [SX + 34, Q + 1.7, 0.5], [GX - 52, Q + 3, 0], 's'], ['anticamera', [GX - 60, Q + 1.9, 0.2], [GX - 40, Q + 2.2, -1], 's'],
    ['stanza', [NC.x - 9, Q + 1.7, NC.z + 7], [NC.x + 4, Q + 12, NC.z - 4], 's'], ['mezzanino', [W.MZ.x + 8, W.MZ.y + 1.5, W.MZ.z + 10], [NC.x, Q + 24, NC.z], 's'],
    (W.MOBIUS ? ['corridoio', [40, Q + 1.7, 0.3], [60, Q + 14, 0], 's'] : ['corridoio', [GX - 22, Q + 13, 30], [GX + 24, Q + 12, 22], 's']), ['vie', [SX + 31, Q + 1.7, W.SCALA.z], [SX - 30, FOND, W.SCALA.z2], 's'],
    ['sotto', [SX - 36, 1.8, 30], [60, 1, -10], 'b'], ['fondamenta', [20, FOND + 5, 46], [20, FOND + 1, 0], 'w'],
  ];
  const TOUR_KEYS = TOUR.map((t) => t[0]);
  let mode = 'racconta', tour = null, TP = null, TT = null; const NST = TOUR.length - 1;
  function buildTour() { TP = new THREE.CatmullRomCurve3(TOUR.map((t) => V(t[1][0], t[1][1] + off(t[3]), t[1][2])), false, 'centripetal'); TT = new THREE.CatmullRomCurve3(TOUR.map((t) => V(t[2][0], t[2][1] + off(t[3]), t[2][2])), false, 'centripetal'); }
  function tourGo(i) { if (!tour) return; tour.pt = Math.max(0, Math.min(NST, i)) / NST; tour.idle = 0; }
  function setMode(m) {
    mode = m; $('mRacconta').setAttribute('aria-pressed', m === 'racconta'); $('mAttraversa').setAttribute('aria-pressed', m === 'attraversa');
    document.body.classList.toggle('attraversa', m === 'attraversa');
    if (m === 'attraversa') { buildTour(); controls.enabled = false; tour = { p: 0, pt: 0, i: -1, spoken: -1, idle: 0 }; fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: TP.getPoint(0), t1: TT.getPoint(0), s: performance.now(), d: 1800 }; }
    else { tour = null; controls.enabled = true; }
  }
  $('mRacconta').addEventListener('click', () => setMode('racconta'));
  $('mAttraversa').addEventListener('click', () => setMode('attraversa'));
  const nudge = (d) => { if (tour) { tour.pt = Math.max(0, Math.min(1, tour.pt + d)); tour.idle = performance.now(); } };
  window.addEventListener('wheel', (e) => { if (!tour || panel.contains(e.target)) return; e.preventDefault(); nudge(e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.0004); }, { passive: false });
  let ty = null;
  canvas.addEventListener('pointerdown', (e) => { if (tour) ty = e.clientY; });
  window.addEventListener('pointermove', (e) => { if (tour && ty !== null) { nudge((ty - e.clientY) * 0.0012); ty = e.clientY; } });
  window.addEventListener('pointerup', () => { ty = null; });
  window.addEventListener('keydown', (e) => { if (!tour || /^(SELECT|INPUT)$/.test(e.target.tagName)) return; const i = Math.round(tour.pt * NST); if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); tourGo(i + 1); } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); tourGo(i - 1); } else if (e.key === 'Escape') setMode('racconta'); });

  /* ---------- lo Smistamento: una voce attraversa i tre passaggi e arriva nel suo spazio ---------- */
  const qtag = $('qtag'), stepsEl = $('steps'), domEl = $('domanda');
  const pausa = (ms) => new Promise((r) => setTimeout(r, REDUCE ? ms / 3 : ms));
  function domanda(q, r) { if (!q) { domEl.classList.remove('on', 'risposta'); return; } $('dq').textContent = q; $('dr').textContent = r || ''; domEl.classList.add('on'); domEl.classList.toggle('risposta', !!r); }
  const fessureT = [0, 0, 0], tremula = [false, false, false]; let segui = null, allinea3T = 1, drone = null;
  // un'inquadratura: stacco netto su p0/t0, poi un movimento lento fino a p1/t1
  function taglio(p0, t0, p1, t1, dur) { fly = { p0, t0, p1, t1, s: performance.now(), d: dur * 1000 }; camera.position.copy(p0); controls.target.copy(t0); }
  // la lama risponde alla risposta: sì accesa, no spenta, in parte tremula
  function lama(i, r) { tremula[i] = /^in parte|parziale/.test(r); fessureT[i] = /^no\b/.test(r) ? 0.05 : 1; }
  let runId = 0, cammino = null, qPos = null;
  const P = (x, y, z, f = 's') => ({ v: V(x, y, z), f });
  function cammina(punti, vel = 3.2) { return new Promise((res) => { cammino = { punti, i: 0, vel, res }; }); }
  function mostra(html, p) { qtag.innerHTML = html; qPos = p; qtag.classList.add('on'); }
  /* ---------- lo Smistamento: storyboard della Soglia (circa 20 secondi), poi «dove va» ----------
     1 la camera scende veloce dall'alto · 2 primo piano: il daemon muta · 3 da dietro: corre ed entra nella prima fessura,
     si fa polvere · 4 controcampo dall'interno della prima fessura · 5 carrello all'indietro veloce: la polvere si ricompone
     · 6 la camera gira e si mette dietro: seconda fessura · 7 dall'alto a tre quarti: muta di nuovo e avanza verso la terza
     · 8 controcampo, primo piano: esce dalla terza nella forma della sua destinazione */
  let ripresa = null, dest = null;
  function gira(shots) { return new Promise((res) => { ripresa = { shots, i: -1, s: 0, res }; }); }
  const FORMA_DI = { stanza: 'cervo', anticamera: 'cervo', corridoio: 'volpe', sotto: 'lepre', mezzanino: 'cicogna', fondamenta: 'polvere', struttura: 'polvere' };
  const lerp = (a, b, u) => a + (b - a) * u, eo = (u) => 1 - Math.pow(1 - u, 3), ei = (u) => u * u;
  const camA = V(0, 0, 0), camT = V(0, 0, 0);
  function inquadra(px, py, pz, tx, ty, tz) { camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); }
  // un tragitto: una curva percorsa a velocità costante; restituisce la funzione che colloca il daemon al tempo e
  function tragitto(punti, vel) { const c = new THREE.CatmullRomCurve3(punti, false, 'centripetal', 0.2), L = c.getLength(), p = V(0, 0, 0), tg = V(0, 0, 0);
    return { durata: L / vel, a(e) { const u = Math.min(1, e * vel / L); c.getPointAt(u, p); c.getTangentAt(Math.min(0.999, u), tg); MUTA.metti(p.x, p.y, p.z, Math.atan2(tg.x, tg.z)); return u >= 1; } }; }
  async function smista(idx) {
    const id = ++runId; zitto(); if (mode !== 'racconta') setMode('racconta');
    const v = VOCI[idx], M = MUTA; allineaT = 0; strutturaT = 0; segueK = null; drone = null; dest = null; ripresa = null; domanda(null); fessureT.fill(0); tremula.fill(false); allinea3T = 1;
    stepsEl.replaceChildren(); const li = [];
    DOMANDE.forEach((d, i) => { const e = document.createElement('li'); const b = document.createElement('b'); b.textContent = d + ' '; e.append(b, v.risposte[i]); stepsEl.appendChild(e); li.push(e); });
    { const e = document.createElement('li'); const b = document.createElement('b'); b.textContent = DOVE_VA + ' '; e.append(b, v.doveVa); stepsEl.appendChild(e); li.push(e); }
    mark('soglia'); qtag.classList.remove('on');
    if (!M) return;
    const X = W.SOGLIA_X, r = v.risposte, s = v.spazio, y = Q, xS = X[0] - 12, E = Math.PI / 2;
    const corrono = ['cervo', 'volpe', 'lepre'], D = FORMA_DI[s];
    const altra = (no) => { const a = corrono.filter((x) => x !== no); return a[Math.floor(Math.random() * a.length)]; };
    const B1 = altra(M.forma), B2 = altra(B1);
    M.prendi(); M.tono(0); M.metti(xS, y, 0, E);
    say(`voce-${String(v.n).padStart(2, '0')}`, v.voce);
    const P = M.pos, dx = (a, b, u) => M.metti(lerp(a, b, u), y, 0, E);
    // attraversare una fessura come nebulosa: si schiaccia mentre è dentro il monolite
    const nebula = (a, b, u, xm) => { dx(a, b, u); M.schiaccia(Math.abs(P.x - xm) < 2 ? 0.35 : 1); };
    const una = (k, fn) => { if (!M['_' + k]) { M['_' + k] = 1; fn(); } };
    await gira([
      // 1 la camera scende veloce dall'alto: il daemon, scuro, fermo davanti alla Soglia
      { d: 2.2, f: (u) => { const e = eo(u); inquadra(lerp(xS - 8, xS - 7, e), lerp(y + 110, y + 4, e), lerp(24, 8, e), xS, y + 1.5, 0); } },
      // 2 primo piano: si volta e parte
      { d: 2.0, f: (u) => { dx(xS, xS + 2.5, ei(u)); inquadra(lerp(xS + 6, xS + 5.5, u), y + 2.3, lerp(4.5, 3.8, u), P.x, y + 1.6, 0); } },
      // 3 da dietro: corre verso la prima fessura e, prima di entrarci, si fa nebulosa
      { d: 2.8, on: () => { li[0].classList.add('on'); domanda(DOMANDE[0], null); },
        f: (u) => { dx(xS + 2.5, X[0] - 4, ei(Math.min(1, u / 0.75))); if (u > 0.55) una('p1', () => M.muta('polvere', 1.1)); inquadra(P.x - 9, y + 3.2, 1.2, P.x + 4, y + 1.6, 0); } },
      // 4 controcampo dall'interno della prima fessura: la nebulosa la attraversa, lenta
      { d: 2.8, f: (u) => { nebula(X[0] - 4, X[0] + 4, u, X[0]); if (u > 0.5) una('r1', () => { domanda(DOMANDE[0], r[0]); fessureT[0] = 1; M.tono(0.35); }); inquadra(X[0] + 1.2, y + 1.8, 0, X[0] - 10, y + 1.4, 0); } },
      // 5 carrello all'indietro veloce: dall'altra parte si ricompone in un altro animale
      { d: 2.4, on: () => { M.schiaccia(1); M.muta(B1, 1.4); }, f: (u) => { const e = eo(u); inquadra(lerp(X[0] + 9, X[0] + 18, e), lerp(y + 2, y + 3.2, e), lerp(1.5, 3.5, e), P.x, y + 1.5, 0); } },
      // 6 la camera gira e si mette dietro: corre verso la seconda fessura e si fa nebulosa
      { d: 3.0, on: () => { li[1].classList.add('on'); domanda(DOMANDE[1], null); },
        f: (u) => { dx(X[0] + 4, X[1] - 4, ei(Math.min(1, u / 0.7))); if (u > 0.55) una('p2', () => M.muta('polvere', 1.1));
          const a = Math.min(1, u / 0.6) * Math.PI; inquadra(P.x + 8 * Math.cos(a), y + 2.6, 6 * Math.sin(a) + 0.8, P.x, y + 1.5, 0); } },
      // 7 dall'alto, a tre quarti: la nebulosa passa la seconda fessura, si ricompone, riparte verso la terza
      { d: 3.6, on: () => { allinea3T = 0; },
        f: (u) => { if (u < 0.45) { nebula(X[1] - 4, X[1] + 4, u / 0.45, X[1]); if (u > 0.25) una('r2', () => { domanda(DOMANDE[1], r[1]); lama(1, r[1]); M.tono(0.7); }); }
          else { una('b2', () => { M.schiaccia(1); M.muta(B2, 1.3); }); if (u > 0.85) { una('q3', () => { li[2].classList.add('on'); domanda(DOMANDE[2], null); }); dx(X[1] + 4, X[1] + 7, (u - 0.85) / 0.15); } }
          inquadra(lerp(X[1] - 6, X[1] - 2, u), y + 40, lerp(28, 25, u), X[1] + 10, y + 1, 0); } },
      // 8 controcampo, primo piano: arriva alla terza fessura, nebulosa, la attraversa ed esce nella forma della destinazione, bianco
      { d: 4.6, f: (u) => {
          if (u < 0.3) dx(X[1] + 7, X[2] - 4, ei(u / 0.3)); else nebula(X[2] - 4, X[2] + 4, Math.min(1, (u - 0.3) / 0.45), X[2]);
          if (u > 0.2) una('p3', () => M.muta('polvere', 0.9));
          if (u > 0.5) una('r3', () => { domanda(DOMANDE[2], r[2]); allinea3T = /^sì/.test(r[2]) ? 1 : /^in parte/.test(r[2]) ? 0.5 : 0; lama(2, r[2]); M.tono(1); });
          if (u > 0.75) una('d', () => { M.schiaccia(1); if (D !== 'polvere') M.muta(D, 1.2); });
          inquadra(lerp(X[2] + 14, X[2] + 11, u), y + 2.2, 0.4, X[2] + 1, y + 1.6, 0); } },
    ]);
    for (const k of Object.keys(M)) if (k[0] === '_') delete M[k];
    if (id !== runId) return;
    domanda(null); li[3].classList.add('on');
    // «dove va»: il tragitto si vede; la camera segue da dietro, poi si ferma sul posto d'arrivo
    const x0 = X[2] + 4, S2 = W.SCALA, tA = V(0, 0, 0), tB = V(0, 0, 0), RN = V(0, 0, 0), RF = V(0, 0, 0), RX = V(0, 0, 0), MM = new THREE.Matrix4();
    const T0 = performance.now() / 1000, el = () => performance.now() / 1000 - T0;
    const neck = (t) => { const p = W.NECK.getPointAt(t); return V(p.x, Q, p.z); };
    let viaggio = null, poi = null; destOff = null;
    if (s === 'stanza') { allineaT = 1; viaggio = tragitto([V(x0, Q, 0), V(W.NECK0.x - 6, Q, 0), neck(0.1), neck(0.5), neck(0.95), V(NC.x - 9, Q, NC.z + 1)], 9);
      poi = (t) => { const a = Math.PI + t * 1.6 / 9; M.metti(NC.x + Math.cos(a) * 9, Q, NC.z + Math.sin(a) * 9, Math.atan2(-Math.sin(a), Math.cos(a))); return [-4, 4, 5]; }; }
    else if (s === 'anticamera') { viaggio = tragitto([V(x0, Q, 0), V(W.NECK0.x - 6, Q, 0), neck(0.12)], 8); poi = () => { M.anima('Idle_Headlow'); return [-13, 4, 7]; }; }
    else if (s === 'corridoio') { const p0 = W.mobius(0, 0, V(0, 0, 0)); viaggio = tragitto([V(x0, Q, 0), V(p0.x - 8, Q, 0), p0], 7);
      poi = (t) => { const th = (t * 1.5 / 13) % (Math.PI * 4); W.mobius(th, 0, tA, RN); W.mobius(th + 0.01, 0, tB); RF.subVectors(tB, tA).normalize(); RX.crossVectors(RN, RF); MM.makeBasis(RX, RN, RF); M.metti(tA.x, tA.y, tA.z); if (M.oggetto) M.oggetto.quaternion.setFromRotationMatrix(MM); return [6, 5, 26]; }; }
    else if (s === 'sotto') { // giù per la scala fino al pavimento, poi sul pavimento
      const fl = ST.sotto, zm = (S2.z + S2.z2) / 2, pts = [V(x0, Q, 0), V(S2.x0 + 3, Q, 8), V(S2.x0, Q, S2.z)];
      if (fl >= S2.ym) { const xs = S2.x0 - (Q - fl) / S2.rise * S2.run; pts.push(V(xs, fl, S2.z), V(xs - 3, fl, 32)); }
      else { const xs = S2.xL + (S2.ym - fl) / S2.rise * S2.run; pts.push(V(S2.xL, S2.ym, S2.z), V(S2.xE + 3, S2.ym, zm), V(S2.xL, S2.ym, S2.z2), V(xs, fl, S2.z2), V(xs + 3, fl, 32)); }
      pts.push(V(60, fl, 36)); viaggio = tragitto(pts, 6); poi = () => { M.anima('Guarding'); M.metti(60, ST.sotto, 36); return [9, 4, 13]; }; }
    else if (s === 'mezzanino') { const tip = V(W.MZ.x, W.MZ.y + 8, W.MZ.z); viaggio = tragitto([V(x0, Q, 0), V(30, Q + 22, 6), V(90, Q + 52, 14), V(tip.x - 14, tip.y + 10, tip.z - 6), tip], 9); poi = () => { M.ferma(0); return [-16, 7, 16]; }; }
    else if (s === 'fondamenta') { const h = 0.6; viaggio = tragitto([V(x0, Q, 0), V(S2.x0, Q + h, S2.z), V(S2.xL, S2.ym + h, S2.z), V(S2.xE + 3, S2.ym + h, (S2.z + S2.z2) / 2), V(S2.xL, S2.ym + h, S2.z2), V(S2.x1, FOND + h, S2.z2), V(S2.x1 + 14, FOND + 0.4, 36)], 9); poi = () => [-22, 14, 38]; }
    else if (s === 'struttura') { strutturaT = 1; M.metti(x0, Q, 0); flyTo('struttura', 4); }
    let arrivo = null;
    if (viaggio) dest = (dt) => {
      const t = el();
      if (!arrivo) { if (viaggio.a(t)) arrivo = t; const yw = M.oggetto ? M.oggetto.rotation.y : 0; destOff = [-Math.sin(yw) * 11 + Math.cos(yw) * 3, 4.5, -Math.cos(yw) * 11 - Math.sin(yw) * 3]; }
      else destOff = poi(t - arrivo) || destOff;
    };
    const arrivato = () => new Promise((res) => { const k = setInterval(() => { if (id !== runId || !viaggio || arrivo !== null) { clearInterval(k); res(); } }, 100); });
    await (s === 'struttura' ? say('voce-struttura', RACCORDI.voceStruttura) : say('voce-arriva', RACCORDI.voceArriva));
    await arrivato(); if (id !== runId) return;
    mark(s); mostra(`${DOVE_VA}<i></i>`, null); qtag.querySelector('i').textContent = v.doveVa;
    await say(`dove-${s}`, v.doveVa);
    // cinque secondi, poi si torna al punto di partenza: il daemon, di nuovo scuro, fuori dalla prima soglia
    await pausa(5000); if (id !== runId) return;
    qtag.classList.remove('on'); dest = null; destOff = null; strutturaT = 0; allineaT = 0; allinea3T = 1; fessureT.fill(0); tremula.fill(false);
    M.lascia(); mark('soglia'); fly = null;
    inquadra(M.pos.x - 10, y + 3.5, M.pos.z + 7, M.pos.x, y + 1.6, M.pos.z); controls.update();
  }
  let destOff = null;
  function liberaDaemon() { if (dest || ripresa) { dest = null; ripresa = null; domanda(null); if (MUTA) MUTA.lascia(); } }
  $('voceGo').addEventListener('click', () => smista(parseInt(sel.value, 10)));

  /* ---------- post e dimensioni ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (!LOW) composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 1024), 0.42, 0.5, 0.78));
  composer.addPass(new OutputPass());
  // vignettatura e grana leggera: la luce si raccoglie al centro, l'immagine smette di essere piatta
  const grana = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D tDiffuse;uniform float uT;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+uT)*43758.5453);}void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 d=vUv-.5;float v=smoothstep(.85,.25,length(d*vec2(1.15,1.)));c.rgb*=mix(.62,1.,v);c.rgb+=(h(vUv*vec2(1600.,900.))-.5)*.035;gl_FragColor=c;}' });
  composer.addPass(grana);
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h);
    const aperto = !panel.classList.contains('closed') && w > 700;
    if (aperto) { const d = 390; camera.aspect = (w + d) / h; camera.setViewOffset(w + d, h, 0, 0, w, h); } else { camera.aspect = w / h; camera.clearViewOffset(); }
    camera.updateProjectionMatrix(); W.motoU.uPR.value = renderer.getPixelRatio() * h / 900;
  }
  window.addEventListener('resize', resize); resize();
  const r0 = RAC.edificio; camera.position.set(...r0[0]); controls.target.set(...r0[1]);

  /* ---------- il loop: nessun oggetto nuovo qui dentro ---------- */
  const T0 = performance.now(); let last = T0, raf = 0, frame = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop); frame++;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; const t = (now - T0) / 1000;
    const k = 1 - Math.exp(-dt * 1.8);
    ST.allinea += (allineaT - ST.allinea) * k; ST.struttura += (strutturaT - ST.struttura) * k;
    for (let f = 0; f < 3; f++) ST.fessure[f] += (fessureT[f] - ST.fessure[f]) * (1 - Math.exp(-dt * 1.2));
    accesa += (accesaT - accesa) * (1 - Math.exp(-dt * 0.9)); vfM.emissiveIntensity = 0.75 * accesa; vfM.color.copy(DARK).lerp(LIGHT, accesa); VF.userData.l.intensity = 5 * accesa; VF.userData.glow.material.opacity = 0.45 * accesa;
    ST.allinea3 += (allinea3T - ST.allinea3) * (1 - Math.exp(-dt * 2.2));
    for (let f = 0; f < 3; f++) if (tremula[f]) fessureT[f] = 0.45 + 0.45 * Math.sin(t * 7 + f);
    W.aggiorna(dt, t, ST);
    const L = ST.liv;
    if (MUTA) MUTA.update(dt, t);
    if (ABIT) ABIT.update(dt, t);
    if (RUM.visible && W.MOBIUS) { // sul nastro: cammina senza fine; i piedi seguono la superficie, anche capovolta
      const th = (t * 1.3 / 13) % (Math.PI * 4); W.mobius(th, 0, tmpA, RN); W.mobius(th + 0.01, 0, tmpB); RF.subVectors(tmpB, tmpA).normalize(); RX.crossVectors(RN, RF);
      RMAT.makeBasis(RX, RN, RF); RUM.quaternion.setFromRotationMatrix(RMAT); RUM.position.set(tmpA.x, tmpA.y + L, tmpA.z);
    } else if (RUM.visible) { const ph = t * 0.25, u = 0.44 + 0.08 * (0.5 - 0.5 * Math.cos(ph)); W.CORR.getPoint(u, tmpA); W.CORR.getTangent(u, tmpB); const dir = Math.sin(ph) >= 0 ? 1 : -1; RUM.position.set(tmpA.x, tmpA.y + L, tmpA.z); RUM.rotation.y = Math.atan2(tmpB.x * dir, tmpB.z * dir); }
    VF.userData.cammina(!!cammino, cammino ? cammino.vel : 1.6);
    for (let f = 0; f < FIG.length; f++) if (FIG[f].userData.mixer && FIG[f].visible) FIG[f].userData.mixer.update(dt);
    // la voce che cammina
    if (cammino) {
      const c = cammino, pt = c.punti[c.i]; tmpA.copy(pt.v); tmpA.y += off(pt.f);
      tmpB.subVectors(tmpA, VF.position); const d = tmpB.length(), stepLen = c.vel * dt * (REDUCE ? 3 : 1);
      if (d > 0.01) VF.rotation.y = Math.atan2(tmpB.x, tmpB.z);
      if (d <= stepLen) { VF.position.copy(tmpA); c.i++; if (c.i >= c.punti.length) { cammino = null; c.res(); } }
      else VF.position.addScaledVector(tmpB, stepLen / d);

    }
    // camera
    if (ripresa) { // lo storyboard: un'inquadratura dopo l'altra
      const r = ripresa;
      if (r.i < 0 || now - r.s >= r.shots[r.i].d * 1000) { r.i++; r.s = now; if (r.i >= r.shots.length) { ripresa = null; r.res(); } else if (r.shots[r.i].on) r.shots[r.i].on(); }
      if (ripresa) { const sh = r.shots[r.i]; sh.f(Math.min(1, (now - r.s) / (sh.d * 1000)), dt); camera.lookAt(controls.target); }
    } else if (dest && MUTA) { // «dove va»: la camera segue il daemon, morbida
      dest(dt); if (destOff) { camA.set(MUTA.pos.x + destOff[0], MUTA.pos.y + destOff[1], MUTA.pos.z + destOff[2]); camT.set(MUTA.pos.x, MUTA.pos.y + 1.2, MUTA.pos.z);
      const kk = 1 - Math.exp(-dt * 2.5); camera.position.lerp(camA, kk); controls.target.lerp(camT, kk); camera.lookAt(controls.target); }
    } else if (drone) {
      const u = Math.min(1, (now - drone.s) / drone.d), e = u * u * (3 - 2 * u); // parte e arriva morbida
      drone.path.getPoint(e, camera.position); camera.position.y += ST.liv - drone.liv;
      drone.path.getPoint(Math.min(1, e + 0.06), controls.target); controls.target.y += ST.liv - drone.liv + 0.3; camera.lookAt(controls.target);
      while (drone.i < drone.battute.length && e >= drone.battute[drone.i].u) drone.battute[drone.i++].f();
      if (u >= 1) { const f = drone.fine; drone = null; if (f) f(); }
    } else if (segui && VF.visible) {
      const kk = 1 - Math.exp(-dt * 0.8);
      tmpA.copy(VF.position).add(segui.dietro); camera.position.lerp(tmpA, kk);
      tmpB.copy(VF.position).add(segui.avanti); controls.target.lerp(tmpB, kk); camera.lookAt(controls.target);
    } else if (fly) { if (segueK && ABIT && ABIT.posizione(segueK, SEG)) { SEG.sub(fly.t1); fly.t1.add(SEG); fly.p1.add(SEG); } const e = ease(Math.min(1, (now - fly.s) / fly.d)); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (e >= 1) fly = null; if (!tour) controls.update(); else camera.lookAt(controls.target); }
    else if (tour) {
      if (tour.idle && now - tour.idle > 900) { tour.pt = Math.round(tour.pt * NST) / NST; tour.idle = 0; }
      tour.p += (tour.pt - tour.p) * (1 - Math.exp(-dt * 1.5)); if (Math.abs(tour.pt - tour.p) < 1e-4) tour.p = tour.pt;
      TP.getPoint(tour.p, camera.position); TT.getPoint(tour.p, controls.target); camera.lookAt(controls.target);
      const i = Math.round(tour.p * NST);
      if (i !== tour.i) { tour.i = i; mark(TOUR_KEYS[i]); RUM.visible = TOUR_KEYS[i] === 'corridoio'; strutturaT = 0; zitto(); const d = TOUR[i][4]; if (d !== undefined) { domanda(DOMANDE[d], null); for (let f = 0; f < 3; f++) fessureT[f] = f === d ? 1 : 0; } else { domanda(null); fessureT.fill(0); } }
      if (tour.p === tour.pt && tour.spoken !== i) { tour.spoken = i; const d = TOUR[i][4]; if (d !== undefined) say(`domanda-${d + 1}`, DOMANDE[d]); else say(`spazio-${TOUR_KEYS[i]}`, testoSpazio(TOUR_KEYS[i])); }
    } else {
      if (segueK && ABIT && ABIT.posizione(segueK, SEG)) { SEG.sub(controls.target); controls.target.add(SEG); camera.position.add(SEG); } // segue l'animale, lasciando girare intorno
      controls.update();
    }
    picker.update(); grana.uniforms.uT.value = (t * 7.3) % 100;
    if (AC && soundOn) { filt.frequency.setTargetAtTime(260 + 22 * (ST.livello + 12), AC.currentTime, 0.4); lfoG.gain.setTargetAtTime(40 + 220 * ST.attivazione, AC.currentTime, 0.4); }
    composer.render();
    // etichette
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (let j = 0; j < LAB.length; j++) {
      const lb = LAB[j]; tmpC.copy(lb.p); tmpC.y += lb.parent.position.y; tmpC.project(camera);
      const vis = tmpC.z < 1 && Math.abs(tmpC.x) < 1.05 && Math.abs(tmpC.y) < 1.05 && !tour && (lb.small ? lb.k === current || (lb.k === 'stanza' && INSIEME.has(current)) : INSIEME.has(current));
      lb.el.style.display = vis ? '' : 'none'; if (vis) { lb.el.style.left = ((tmpC.x + 1) / 2) * w + 'px'; lb.el.style.top = ((1 - tmpC.y) / 2) * h + 'px'; }
    }
    if (qPos) { tmpC.copy(qPos.v); tmpC.y += off(qPos.f); tmpC.project(camera); qtag.style.left = ((tmpC.x + 1) / 2) * w + 'px'; qtag.style.top = ((1 - tmpC.y) / 2) * h + 'px'; }
    else if (qtag.classList.contains('on')) { tmpC.copy(VF.position); tmpC.y += 3; tmpC.project(camera); qtag.style.left = ((tmpC.x + 1) / 2) * w + 'px'; qtag.style.top = ((1 - tmpC.y) / 2) * h + 'px'; }
    // qualità adattiva
    if (frame % 120 === 0) { // qualità adattiva: scende se serve, risale quando torna fluido; mai sotto 1
      if (dt > 1 / 35 && PR > PRMIN) { PR = Math.max(PRMIN, PR - 0.15); renderer.setPixelRatio(PR); resize(); }
      else if (dt < 1 / 55 && PR < PRMAX) { PR = Math.min(PRMAX, PR + 0.15); renderer.setPixelRatio(PR); resize(); } }
  }
  await step(0.95);
  renderer.compile(scene, camera);
  await step(1);
  loader.classList.add('done');
  raf = requestAnimationFrame(loop);
  setTimeout(() => say('00-apertura', RACCORDI.apertura), 1200);

  if (/[?&]debug\b/.test(location.search)) window.__soglia = { renderer, scene, ST, select, smista, setMode, W, camera, controls };
  window.addEventListener('pagehide', (e) => { if (e.persisted) return; cancelAnimationFrame(raf); zitto(); picker.dispose(); controls.dispose(); disposeObject(scene); composer.dispose(); renderer.dispose(); if (AC) AC.close(); });
}
