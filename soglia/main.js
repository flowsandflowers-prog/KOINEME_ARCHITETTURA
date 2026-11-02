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
import { createPicker } from '../src/lib/picker.js';
import { disposeObject } from '../src/lib/dispose.js';
import { SPAZI, ORDINE, ETICHETTE, DOMANDE, DOVE_VA, VOCI, STANZE_CHIUSE, INTERFACCIA, RACCORDI, MEZZANINO_SPIEGAZIONE } from './testi.js';
import { costruisci, Q, FOND, SX, GX, NC } from './mondo.js';

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
  let PR = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 1.5); renderer.setPixelRatio(PR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.2, 5000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07; controls.maxDistance = 900; controls.minDistance = 2;
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying float h;void main(){vec3 a=vec3(.44,.43,.42);vec3 b=vec3(.78,.73,.64);gl_FragColor=vec4(mix(b,a,smoothstep(0.,.5,h)),1.);}' })));
  scene.fog = new THREE.FogExp2(0xb4ab9c, 0.0014);
  scene.add(new THREE.HemisphereLight(0xd8d2c6, 0x34302b, 0.55));
  // sole basso: ombre lunghe, più contrasto
  const sun = new THREE.DirectionalLight(0xf6e4c8, 3.1); sun.position.set(-230, 80, 170); scene.add(sun);
  if (!LOW) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -240, right: 240, top: 180, bottom: -140, near: 10, far: 900 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5; }
  await step(0.25);
  const W = costruisci(scene, { low: LOW });
  await step(0.75);
  const ST = { ...W.S0, appoggi: [...W.S0.appoggi] };
  let allineaT = 0, strutturaT = 0;

  /* ---------- le figure: pellegrini con mantello e cappuccio; scuri fuori, luminosi dopo la Soglia ---------- */
  const mantoG = (() => {
    const prof = [[0.001, 0], [0.47, 0], [0.45, 0.1], [0.37, 0.55], [0.28, 1.02], [0.26, 1.3], [0.31, 1.41], [0.23, 1.5], [0.13, 1.56], [0.18, 1.63], [0.2, 1.75], [0.16, 1.87], [0.07, 1.94], [0.001, 1.96]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 32); g.scale(1, 1, 0.78); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); const f = 1 + (y < 1.3 ? 0.06 * Math.sin(a * 7 + y * 2.5) * (1.3 - y) : 0); p.setX(i, x * f); p.setZ(i, z * f); }
    g.computeVertexNormals(); return g;
  })();
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(235,242,255,0.9)'); gr.addColorStop(0.35, 'rgba(210,225,255,0.3)'); gr.addColorStop(1, 'rgba(200,215,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const darkM = new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.95 });
  const litM = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, roughness: 0.6, emissive: 0xeef3ff, emissiveIntensity: 0.75 });
  function figura(lit) {
    const g = new THREE.Group(); const m = new THREE.Mesh(mantoG, lit ? litM : darkM); m.castShadow = true; g.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: lit ? 0.8 : 0 })); glow.scale.set(3.2, 4.2, 1); glow.position.y = 1.05; g.add(glow);
    const l = new THREE.PointLight(0xe4ecff, lit ? 5 : 0, 12, 2); l.position.y = 1.2; g.add(l);
    g.userData = { b: m, h: m, l, glow, set(on) { m.material = on ? litM : darkM; l.intensity = on ? 5 : 0; glow.material.opacity = on ? 0.8 : 0; } };
    scene.add(g); return g;
  }
  const attesa = [figura(false), figura(false)], passato = figura(true), VF = figura(false), RUM = figura(false);
  // la figura dello Smistamento: la stoffa si illumina da dentro, piano
  const vfM = new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.8, emissive: 0xeef3ff, emissiveIntensity: 0 }); let accesa = 0, accesaT = 0;
  const DARK = new THREE.Color(0x1b1916), LIGHT = new THREE.Color(0x9aa6b8);
  VF.userData.set = (on) => { VF.userData.b.material = vfM; accesaT = on ? 1 : 0; if (!on) accesa = 0; };
  VF.visible = false; RUM.visible = false;

  /* ---------- le inquadrature del racconto ---------- */
  // f: 's' = sale e scende con il livello; 'w' = fissa
  const RAC = {
    edificio: [[-250, 72, 205], [40, 10, 0], 'w'], quote: [[60, 18, 300], [40, 2, 0], 'w'],
    soglia: [[SX - 84, Q + 1.7, 1.0], [SX + 40, Q + 15, 0], 's'], vie: [[SX + 36, Q + 26, 80], [SX + 14, Q - 12, 8], 's'],
    stanza: [[NC.x - 7, Q + 6, NC.z + 7], [NC.x + 3, Q + 4, NC.z - 3], 's'], anticamera: [[GX - 66, Q + 2.4, 3.5], [GX - 42, Q + 2.2, -1.2], 's'],
    corridoio: [[GX - 20, Q + 34, 84], [GX, Q + 12, -4], 's'], mezzanino: [[W.MZ.x - 8, W.MZ.y + 4, W.MZ.z + 14], [W.MZ.x, W.MZ.y, W.MZ.z], 's'],
    sotto: [[70, 36, 150], [40, -4, -30], 's'], fondamenta: [[10, FOND + 10, 140], [10, FOND + 2, 0], 'w'],
    struttura: [[GX - 50, Q + 230, 40], [GX - 50, Q, 0], 's'],
  };
  const tmpA = V(0, 0, 0), tmpB = V(0, 0, 0), tmpC = V(0, 0, 0), RDIR = V(0, 0, 0);
  const off = (f) => (f === 's' ? ST.liv : 0);
  let fly = null;
  function flyTo(k, dur = 4) { const r = RAC[k]; if (!r) return; controls.autoRotate = false; fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: V(r[0][0], r[0][1] + off(r[2]), r[0][2]), t1: V(r[1][0], r[1][1] + off(r[2]), r[1][2]), s: performance.now(), d: dur * 1000 }; }
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
  let invitato = false;
  function select(k, { noFly = false, parla = true } = {}) {
    if (mode === 'attraversa') { const i = TOUR_KEYS.indexOf(k); if (i >= 0) { tourGo(i); return; } setMode('racconta'); }
    mark(k); strutturaT = k === 'struttura' ? 1 : 0; RUM.visible = k === 'corridoio';
    if (!noFly) flyTo(k);
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
    ['stanza', [NC.x - 9, Q + 1.7, NC.z + 7], [NC.x + 4, Q + 12, NC.z - 4], 's'], ['mezzanino', [W.MZ.x - 2, W.MZ.y + 2, W.MZ.z], [NC.x - 8, Q + 8, NC.z - 6], 's'],
    ['corridoio', [GX - 22, Q + 13, 30], [GX + 24, Q + 12, 22], 's'], ['vie', [SX + 28, Q + 1.7, 21.8], [SX - 30, 0, 21.8], 's'],
    ['sotto', [SX - 36, 1.8, 30], [60, 1, -10], 's'], ['fondamenta', [20, FOND + 5, 46], [20, FOND + 1, 0], 'w'],
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
  const fessureT = [0, 0, 0], tremula = [false, false, false]; let segui = null;
  // un'inquadratura: stacco netto su p0/t0, poi un movimento lento fino a p1/t1
  function taglio(p0, t0, p1, t1, dur) { fly = { p0, t0, p1, t1, s: performance.now(), d: dur * 1000 }; camera.position.copy(p0); controls.target.copy(t0); }
  // la lama risponde alla risposta: sì accesa, no spenta, in parte tremula
  function lama(i, r) { tremula[i] = /^in parte|parziale/.test(r); fessureT[i] = /^no\b/.test(r) ? 0.05 : 1; }
  let runId = 0, cammino = null, qPos = null;
  const P = (x, y, z, f = 's') => ({ v: V(x, y, z), f });
  function cammina(punti, vel = 3.2) { return new Promise((res) => { cammino = { punti, i: 0, vel, res }; }); }
  function mostra(html, p) { qtag.innerHTML = html; qPos = p; qtag.classList.add('on'); }
  async function smista(idx) {
    const id = ++runId; zitto(); if (mode !== 'racconta') setMode('racconta');
    const v = VOCI[idx]; allineaT = 0; strutturaT = 0; RUM.visible = false; segui = null; domanda(null); fessureT.fill(0); tremula.fill(false);
    stepsEl.replaceChildren(); const li = [];
    DOMANDE.forEach((d, i) => { const e = document.createElement('li'); const b = document.createElement('b'); b.textContent = d + ' '; e.append(b, v.risposte[i]); stepsEl.appendChild(e); li.push(e); });
    { const e = document.createElement('li'); const b = document.createElement('b'); b.textContent = DOVE_VA + ' '; e.append(b, v.doveVa); stepsEl.appendChild(e); li.push(e); }
    const X = W.SOGLIA_X, Lv = () => ST.liv;
    mark('soglia'); VF.visible = true; VF.userData.set(false); VF.position.set(X[0] - 12, Q + Lv(), 0); VF.rotation.y = Math.PI / 2; tremula.fill(false);
    // primo passaggio: la camera sull'asse, bassa, dietro la figura
    taglio(V(X[0] - 24, Q + Lv() + 2.0, 0.3), V(X[0], Q + Lv() + 4.5, 0), V(X[0] - 18, Q + Lv() + 1.8, 0.2), V(X[0], Q + Lv() + 4.2, 0), 10);
    say('voce-entra', RACCORDI.voceEntra).then(() => { if (id === runId) say(`voce-${String(v.n).padStart(2, '0')}`, v.voce); });
    await pausa(2200); if (id !== runId) return;
    // secondo: dall'alto e di lato. Terzo: oltre la fessura, rivolta indietro, verso chi ne esce
    const inquadra = [null,
      () => taglio(V(X[1] - 34, Q + Lv() + 64, 52), V(X[1] + 2, Q + Lv() + 2, 0), V(X[1] - 26, Q + Lv() + 60, 46), V(X[1] + 4, Q + Lv() + 2, 0), 9),
      () => taglio(V(X[2] + 16, Q + Lv() + 2.3, 1.6), V(X[2], Q + Lv() + 2.8, 0), V(X[2] + 12, Q + Lv() + 2.0, 1.2), V(X[2], Q + Lv() + 2.6, 0), 9)];
    for (let i = 0; i < 3; i++) {
      const x = X[i];
      if (inquadra[i]) inquadra[i]();
      li[i].classList.add('on'); domanda(DOMANDE[i], null);
      await Promise.all([cammina([P(x - 2.6, Q, 0)], i === 0 ? 2.6 : 4.2), i === 0 ? pausa(0) : (zitto(), say(`domanda-${i + 1}`, DOMANDE[i]))]); if (id !== runId) return;
      if (i === 0) { zitto(); await say('domanda-1', DOMANDE[0]); if (id !== runId) return; }
      domanda(DOMANDE[i], v.risposte[i]); lama(i, v.risposte[i]);
      await Promise.all([cammina([P(x + 4, Q, 0)], 2.4), say(`risposta-${slug(v.risposte[i])}`, v.risposte[i])]); if (id !== runId) return;
      domanda(null);
    }
    VF.userData.set(true); // fuori dalla terza fessura la figura si accende
    li[3].classList.add('on'); await cammina([P(X[2] + 9, Q, 0)], 1.6); await pausa(1200); if (id !== runId) return;
    tremula.fill(false); fessureT.fill(0);
    const N0 = W.NECK0, s = v.spazio, neck = (t) => { const p = W.NECK.getPointAt(t); return P(p.x, Q, p.z); };
    const strada = {
      stanza: [P(N0.x - 4, Q, 0), neck(0.15), neck(0.5), neck(0.95), P(NC.x - 6, Q, NC.z + 2)],
      anticamera: [P(N0.x - 4, Q, 0), neck(0.1)],
      corridoio: [P(N0.x - 4, Q, 0), P(N0.x + 4, Q, -6), ...[0.02, 0.1, 0.2, 0.3, 0.4, 0.5].map((t) => { const p = W.CORR.getPoint(t); return P(p.x, p.y, p.z); })],
      mezzanino: [P(N0.x - 4, Q, 0), neck(0.5), neck(0.95), P(NC.x - 4, Q, NC.z + 2), P(W.MZ.x, W.MZ.y + 0.3, W.MZ.z)],
      sotto: [P(SX + 28, Q, 8), P(SX + 30, Q, 21.8), P(SX - 30, 0.3, 21.8), P(SX - 45, 0.6, 32), P(-10, 0.6, 30)],
      fondamenta: [P(SX + 28, Q, 8), P(SX + 30, Q, 21.8), P(SX - 30, 0.3, 21.8), P(SX - 40, 0.3, 30), P(-10, FOND + 0.6, 40, 'w')],
      struttura: [P(SX + 30, Q, 0)],
    }[s];
    if (s === 'struttura') { strutturaT = 1; flyTo('struttura', 5); await say('voce-struttura', RACCORDI.voceStruttura); }
    else {
      if (s === 'stanza') allineaT = 1; // le componenti si allineano: la porta si apre
      flyTo(s === 'fondamenta' ? 'sotto' : s, 4.5);
      await cammina(strada, 6); if (id !== runId) return;
      if (s === 'fondamenta') flyTo('fondamenta', 3.5);
      await pausa(800);
      await say('voce-arriva', RACCORDI.voceArriva);
    }
    if (id !== runId) return;
    mark(s); mostra(`${DOVE_VA}<i></i>`, null); qtag.querySelector('i').textContent = v.doveVa; // segue la figura
    await say(`dove-${s}`, v.doveVa);
    setTimeout(() => { if (id === runId) qtag.classList.remove('on'); }, 4000);
  }
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
    camera.updateProjectionMatrix();
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
    for (let f = 0; f < 3; f++) if (tremula[f]) fessureT[f] = 0.45 + 0.45 * Math.sin(t * 7 + f);
    W.aggiorna(dt, t, ST);
    const L = ST.liv;
    // le figure in attesa, quella già passata, la ruminazione
    attesa[0].position.set(SX - 58, Q + L, 0.6); attesa[1].position.set(SX - 61, Q + L, -0.7);
    passato.position.set(SX + 70 + 8 * Math.sin(t * 0.08), Q + L, -0.8);
    if (RUM.visible) { const u = 0.44 + 0.08 * (0.5 - 0.5 * Math.cos(t * 0.5)); W.CORR.getPoint(u, tmpA); RUM.position.set(tmpA.x, tmpA.y + L, tmpA.z); }
    // la voce che cammina
    if (cammino) {
      const c = cammino, pt = c.punti[c.i]; tmpA.copy(pt.v); tmpA.y += off(pt.f);
      tmpB.subVectors(tmpA, VF.position); const d = tmpB.length(), stepLen = c.vel * dt * (REDUCE ? 3 : 1);
      if (d > 0.01) VF.rotation.y = Math.atan2(tmpB.x, tmpB.z);
      if (d <= stepLen) { VF.position.copy(tmpA); c.i++; if (c.i >= c.punti.length) { cammino = null; c.res(); } }
      else VF.position.addScaledVector(tmpB, stepLen / d);
      VF.userData.b.position.y = 0.04 * Math.abs(Math.sin(t * 6.5)); VF.userData.b.rotation.z = 0.025 * Math.sin(t * 6.5);
    }
    // camera
    if (segui && VF.visible) {
      const kk = 1 - Math.exp(-dt * 0.8);
      tmpA.copy(VF.position).add(segui.dietro); camera.position.lerp(tmpA, kk);
      tmpB.copy(VF.position).add(segui.avanti); controls.target.lerp(tmpB, kk); camera.lookAt(controls.target);
    } else if (fly) { const e = ease(Math.min(1, (now - fly.s) / fly.d)); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (e >= 1) fly = null; if (!tour) controls.update(); else camera.lookAt(controls.target); }
    else if (tour) {
      if (tour.idle && now - tour.idle > 900) { tour.pt = Math.round(tour.pt * NST) / NST; tour.idle = 0; }
      tour.p += (tour.pt - tour.p) * (1 - Math.exp(-dt * 1.5)); if (Math.abs(tour.pt - tour.p) < 1e-4) tour.p = tour.pt;
      TP.getPoint(tour.p, camera.position); TT.getPoint(tour.p, controls.target); camera.lookAt(controls.target);
      const i = Math.round(tour.p * NST);
      if (i !== tour.i) { tour.i = i; mark(TOUR_KEYS[i]); RUM.visible = TOUR_KEYS[i] === 'corridoio'; strutturaT = 0; zitto(); const d = TOUR[i][4]; if (d !== undefined) { domanda(DOMANDE[d], null); for (let f = 0; f < 3; f++) fessureT[f] = f === d ? 1 : 0; } else { domanda(null); fessureT.fill(0); } }
      if (tour.p === tour.pt && tour.spoken !== i) { tour.spoken = i; const d = TOUR[i][4]; if (d !== undefined) say(`domanda-${d + 1}`, DOMANDE[d]); else say(`spazio-${TOUR_KEYS[i]}`, testoSpazio(TOUR_KEYS[i])); }
    } else controls.update();
    picker.update(); grana.uniforms.uT.value = (t * 7.3) % 100;
    if (AC && soundOn) { filt.frequency.setTargetAtTime(260 + 22 * (L + 12), AC.currentTime, 0.4); lfoG.gain.setTargetAtTime(40 + 220 * ST.attivazione, AC.currentTime, 0.4); }
    composer.render();
    // etichette
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (let j = 0; j < LAB.length; j++) {
      const lb = LAB[j]; tmpC.copy(lb.p); if (lb.parent !== scene) tmpC.y += L; tmpC.project(camera);
      const vis = tmpC.z < 1 && Math.abs(tmpC.x) < 1.05 && Math.abs(tmpC.y) < 1.05 && !tour && (lb.small ? lb.k === current : INSIEME.has(current));
      lb.el.style.display = vis ? '' : 'none'; if (vis) { lb.el.style.left = ((tmpC.x + 1) / 2) * w + 'px'; lb.el.style.top = ((1 - tmpC.y) / 2) * h + 'px'; }
    }
    if (qPos) { tmpC.copy(qPos.v); tmpC.y += off(qPos.f); tmpC.project(camera); qtag.style.left = ((tmpC.x + 1) / 2) * w + 'px'; qtag.style.top = ((1 - tmpC.y) / 2) * h + 'px'; }
    else if (qtag.classList.contains('on')) { tmpC.copy(VF.position); tmpC.y += 3; tmpC.project(camera); qtag.style.left = ((tmpC.x + 1) / 2) * w + 'px'; qtag.style.top = ((1 - tmpC.y) / 2) * h + 'px'; }
    // qualità adattiva
    if (frame % 120 === 0 && dt > 1 / 40 && PR > 0.7) { PR = Math.max(0.7, PR - 0.15); renderer.setPixelRatio(PR); resize(); }
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
