// Il mondo 3D di «La Soglia»: costruisce l'edificio e ne aggiorna lo stato a ogni fotogramma.
// Regole (skill del progetto): InstancedMesh per gli oggetti ripetuti; geometrie ferme unite;
// un solo sole con ombra; la luce calda della stanza è l'unica luce calda; nessuna allocazione in aggiorna().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// quote di riferimento (il livello del piano di sotto è 0 quando la quota è a metà)
export const Q = 40, FOND = -34, TAGLIO = 54, SX = -20, GX = 130;
// il pavimento del piano di sotto, a quota e appoggi medi: a due terzi del parallelepipedo (fra le fondamenta e il passaggio).
// L'edificio di sopra resta fermo: quando la quota scende o si toglie un appoggio, è il pavimento che si allontana
export const PIANO = 15;
export const NC = V(GX, Q + 24, -4); // centro della camera centrale (la stanza)

export function costruisci(scene, { low = false, env = null, corridoio = 'nastro' } = {}) {
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cut = [new THREE.Plane(V(0, 0, -1), TAGLIO)];
  const SOPRA = new THREE.Group(); scene.add(SOPRA);   // tutto quello che sale e scende con il livello
  const SOTTO = new THREE.Group(); scene.add(SOTTO);   // il piano di sotto (segue il livello)

  /* ---------- materia ---------- */
  function canvasTex(w, h, draw, rep, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
  const S = low ? 256 : 512;
  const basaltTex = canvasTex(S, S, (g, w, h) => { g.fillStyle = '#26262a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 6) { g.fillStyle = `rgba(0,0,0,${0.12 + 0.12 * Math.sin(x * 0.3)})`; g.fillRect(x, 0, 2, h); } for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '215,210,200' : '0,0,0'},${0.02 + rnd() * 0.05})`; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); } }, [8, 3]);
  const M = {
    basalt: new THREE.MeshStandardMaterial({ map: basaltTex, roughness: 0.72, metalness: 0.05 }),
    // il parallelepipedo: basalto nero, lucido (riflette il cielo)
    lucido: new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.16, metalness: 0.35, envMapIntensity: 1.4 }),
    top: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.3, metalness: 0.3, envMapIntensity: 1.2 }),
    alzata: new THREE.MeshStandardMaterial({ color: 0x8a2e20, roughness: 0.55 }),   // rosso come i tronchi
    pedata: new THREE.MeshStandardMaterial({ color: 0x2f6db5, roughness: 0.3, metalness: 0.1 }), // blu come la pellicola
    bark: new THREE.MeshStandardMaterial({ map: canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#7d2b1f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const x = rnd() * w; g.strokeStyle = `rgba(${rnd() < 0.5 ? '35,8,4' : '160,72,48'},${0.25 + rnd() * 0.35})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 6, y); g.stroke(); } }, [2, 4]), roughness: 0.82 }),
    fibre: new THREE.MeshStandardMaterial({ color: 0x5a4b3e, roughness: 0.9, transparent: true, opacity: 1 }),
    collo: new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.85 }),   // l'anticamera: ocra, legata al nido ma riconoscibile
    schermo: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8, side: THREE.DoubleSide }),
    membrana: new THREE.MeshStandardMaterial({ color: 0x9b8b74, roughness: 0.5, transparent: true, opacity: 1 }),
    asse: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe9eef2, emissiveIntensity: 1.0 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xc4b9a6, roughness: 0.7 }), // mai sezionate: restano tutte dietro il taglio
    corr: new THREE.MeshStandardMaterial({ color: 0x3b332c, roughness: 0.85, side: THREE.DoubleSide }),
    caldo: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffaa62, emissiveIntensity: 1.5 }),
  };
  const add = (m, parent, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); parent.add(m); return m; };
  const shade = (m) => { m.castShadow = m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, parent, x, y, z) => shade(add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent, x, y, z));

  // il serbatoio e le fondamenta: lo stesso rettangolo in pianta, centrato sull'asse del passaggio fra la Soglia e il nido
  const BC = V(55, 0, 0), BX = 170, BZ = 60; // centro e mezze misure a ampiezza media (l'ampiezza le scala da 0.75 a 1.25)
  /* ---------- le fondamenta: il corpo, grandi quanto il pavimento ---------- */
  const FONDA = new THREE.Group(); scene.add(FONDA);
  const fondaBox = shade(add(new THREE.Mesh(new THREE.BoxGeometry(1, 16, 1), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial({ color: i === 4 ? 0x857c6f : 0x9c9384, roughness: 0.9 }))), FONDA, BC.x, FOND - 8, 0));
  add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x2e2c29, roughness: 1 })), scene, 0, FOND - 16, 0).rotation.x = -Math.PI / 2;
  const OSSA = []; // posizioni per le parole del corpo
  {
    const n = low ? 70 : 110, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), M.bone, n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const s = 2.5 + rnd() * 6, sx = s * (1 + rnd() * 1.2); o.scale.set(sx, s * 0.5, s); o.rotation.y = rnd() * 3;
      // intere e dentro le fondamenta anche all'ampiezza minima: il punto più vicino al taglio resta almeno 1.5 m dietro
      const r = Math.max(sx, s), hx = BX * 0.75 - r, z0 = -BZ * 0.75 + r, zMax = Math.min(TAGLIO, BZ * 0.75) - 1.5 - r;
      o.position.set(BC.x - hx + rnd() * 2 * hx, FOND + 0.4, z0 + rnd() * (zMax - z0));
      o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (OSSA.length < 7 && o.position.z > 10) OSSA.push(o.position.clone().setY(FOND + 4)); }
    shade(im); im.computeBoundingSphere(); FONDA.add(im);
  }

  /* ---------- l'acqua del serbatoio ---------- */
  const ripple = canvasTex(512, 512, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin((x + y) * 0.11) * 0.3 + Math.sin(y * 0.19 - x * 0.03) * 0.2; const i = (y * w + x) * 4; img.data[i] = 128 + v * 40; img.data[i + 1] = 128 + Math.cos(y * 0.06 + x * 0.02) * 40; img.data[i + 2] = 255; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, [60, 60], false);
  // l'acqua: ben sotto la pellicola (niente sfarfallio fra le due) e quasi opaca: dall'alto il fondo non traspare
  const WY = 0; // la superficie dell'acqua coincide con il pavimento blu
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4f6266, roughness: 0.1, metalness: 0.3, normalMap: ripple, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.9, clippingPlanes: cut, depthWrite: false });
  // il serbatoio: un rettangolo in pianta centrato sull'asse del passaggio, fra la Soglia e il nido. L'ampiezza lo allarga
  const surf = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), waterMat), SOTTO, BC.x, WY, BC.z); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 2; surf.visible = false; // la superficie è il pavimento stesso
  // il corpo d'acqua sul taglio: scurisce in profondità. Altezza 1, scalata a ogni fotogramma fino alle fondamenta
  const faceG = new THREE.PlaneGeometry(1, 1, 1, 16); faceG.translate(0, -0.5, 0);
  { const col = []; for (let i = 0; i < faceG.attributes.position.count; i++) { const t = faceG.attributes.position.getY(i) + 1; const c = new THREE.Color(0x15202a).lerp(new THREE.Color(0x7b9a9c), Math.pow(t, 1.4)); col.push(c.r, c.g, c.b); } faceG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  // le quattro pareti d'acqua del serbatoio (davanti coincide con il taglio), scalate a ogni fotogramma
  const faceM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const pareti = [0, 1, 2, 3].map((k) => { const m = add(new THREE.Mesh(faceG, faceM), scene); m.rotation.y = [0, Math.PI, -Math.PI / 2, Math.PI / 2][k]; m.renderOrder = 3; return m; });
  const menisco = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), new THREE.MeshBasicMaterial({ color: 0xe9efed })), scene, 0, 0, TAGLIO + 0.25);
  // particelle sospese: in tutta l'acqua e, rade, nell'aria intorno all'edificio. Moto browniano calcolato nella GPU
  // (somma di oscillazioni con fasi casuali: ogni particella vaga senza meta, nessun calcolo per fotogramma)
  const motoU = { uBox: { value: new THREE.Vector4(-1e4, 1e4, -1e4, 1e4) }, uT: { value: 0 }, uAtt: { value: 0.4 }, uBot: { value: FOND + 1 }, uTop: { value: -10 }, uPR: { value: 1 } };
  const dot = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, null, false);
  function polvere(n, box, acqua, col, size) {
    const pos = [], ph = [];
    for (let i = 0; i < n; i++) { pos.push(box[0] + rnd() * (box[1] - box[0]), acqua ? rnd() : box[2] + rnd() * (box[3] - box[2]), box[4] + rnd() * (box[5] - box[4])); ph.push(rnd() * 100, rnd() * 100, rnd() * 100, 0.5 + rnd()); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.Float32BufferAttribute(ph, 4));
    g.boundingSphere = new THREE.Sphere(V(0, 0, 0), 4000);
    const mat = new THREE.ShaderMaterial({ uniforms: { ...motoU, uMap: { value: dot }, uCol: { value: new THREE.Color(col) }, uSize: { value: size }, uAcqua: { value: acqua ? 1 : 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uT,uAtt,uBot,uTop,uPR,uSize,uAcqua;uniform vec4 uBox;attribute vec4 ph;varying float vA;
        vec3 vaga(vec4 p,float t){return vec3(sin(t*.23+p.x)+.5*sin(t*.61+p.y*1.3)+.25*sin(t*1.37+p.z*1.7),sin(t*.19+p.y)+.5*sin(t*.53+p.z*1.1)+.25*sin(t*1.21+p.x*1.9),sin(t*.27+p.z)+.5*sin(t*.67+p.x*.9)+.25*sin(t*1.43+p.y*1.5));}
        void main(){vec3 q=position;if(uAcqua>.5)q.y=mix(uBot,uTop,q.y);
          float t=uT*(.35+1.4*uAtt)*ph.w;q+=vaga(ph,t)*(1.2+2.5*uAtt);
          if(uAcqua>.5){q.y=clamp(q.y,uBot,uTop);q.x=clamp(q.x,uBox.x,uBox.y);q.z=clamp(q.z,uBox.z,uBox.w);}
          vec4 mv=modelViewMatrix*vec4(q,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uSize*uPR*(300./-mv.z);
          vA=(.55+.45*sin(t*1.7+ph.x))*smoothstep(4000.,300.,-mv.z);}`,
      fragmentShader: `uniform sampler2D uMap;uniform vec3 uCol;varying float vA;void main(){float a=texture2D(uMap,gl_PointCoord).a;gl_FragColor=vec4(uCol*a*vA,a*vA);}` });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 4; scene.add(pts); return pts;
  }
  polvere(low ? 1600 : 4000, [BC.x - BX * 0.75, BC.x + BX * 0.75, 0, 0, -BZ * 0.75, TAGLIO - 0.5], true, 0xdde8e6, 1.5);       // nell'acqua
  const aria = polvere(low ? 500 : 1300, [-200, 260, -10, 110, -140, 110], false, 0xf3e3c4, 1.6); // nell'aria, segue il livello
  SOPRA.attach(aria);

  /* ---------- i quattro appoggi: tronchi rossi; sopra, una pellicola blu che poggia sulle loro cime ---------- */
  const ALBERI = [[-70, -30], [-82, 30], [30, -30], [39, 30]]; // a sinistra del parallelepipedo e fra lui e il corridoio, sfalsati: di fianco si vedono tutti e quattro
  const alberi = ALBERI.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); SOTTO.add(g);
    const trunk = shade(add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.4, 1, 20), M.bark.clone()), g, 0, 0.5, 0));
    trunk.geometry.translate(0, -0.5, 0); trunk.material.clippingPlanes = cut;
    return { g, trunk, x, z, presente: 1 };
  });
  // la pellicola: tesa sulle cime dei tronchi, si affloscia fra l'uno e l'altro
  const FC = V(BC.x, 0, BC.z), FW = 2 * BX - 20, FD = 2 * BZ - 8;
  const filmG = new THREE.PlaneGeometry(1, 1); filmG.rotateX(-Math.PI / 2); // piano: combacia con il volume d'acqua, si scala con l'ampiezza
  const filmMat = new THREE.MeshStandardMaterial({ color: 0x2f6db5, roughness: 0.18, metalness: 0.15, transparent: false, opacity: 1, side: THREE.DoubleSide, clippingPlanes: cut });
  // un'onda di luce attraversa la pellicola a ritmo: più rapida con l'attivazione, il colore segue la valenza
  const ondaU = { uT: { value: 0 }, uOndaCol: { value: new THREE.Color(0x9fd4ff) } };
  filmMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, ondaU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'uniform float uT;uniform vec3 uOndaCol;varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float fr=dot(vWP.xz,vec2(.8,.6))*.018-uT;
      float on=pow(.5+.5*sin(fr),14.)+.45*pow(.5+.5*sin(fr*.5+1.7+vWP.z*.004),22.);
      totalEmissiveRadiance+=uOndaCol*on*.55;`);
  };
  const film = shade(add(new THREE.Mesh(filmG, filmMat), SOTTO, FC.x, 0, FC.z));
  const filmDeep = new THREE.Color(0x1d3c73), filmLight = new THREE.Color(0x5aa0d6);

  /* ---------- la rupe della Soglia, la Soglia, il passaggio, la scala ---------- */
  if (env) { M.lucido.envMap = env; M.top.envMap = env; }
  // il parallelepipedo: pieno fino a z = ZS; davanti, la fascia della scala, scavata per sottrazione
  const ZS = 13, ZF = 20, YB = FOND - 24; // ZS: fondo dello scavo; ZF: la faccia
  { const r = box(70, Q - YB, ZS + 20, M.lucido, SOPRA, SX, (Q + YB) / 2, (ZS - 20) / 2); r.material = [M.lucido, M.lucido, M.top, M.lucido, M.lucido, M.lucido]; }
  const bladeTex = canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(250,244,232,0.95)'); gr.addColorStop(0.35, 'rgba(240,232,215,0.35)'); gr.addColorStop(1, 'rgba(235,225,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,.7)'); v.addColorStop(0.15, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); });
  const bladeMat = (op) => new THREE.MeshBasicMaterial({ map: bladeTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const SOGLIA_X = [-20, 0, 20].map((d) => SX + d); // tutti e tre dentro il profilo della rupe
  const lame = [], META = []; // META: le due metà di ogni monolite (al terzo scorrono per allinearsi)
  SOGLIA_X.forEach((x) => {
    const H = 30, W = 24, slit = 1.3, half = (W - slit) / 2;
    const a = box(2.8, H, half, M.basalt, SOPRA, x, Q + H / 2, -(slit / 2 + half / 2)), b = box(2.8, H, half, M.basalt, SOPRA, x, Q + H / 2, slit / 2 + half / 2); META.push([a, b]);
    const bl = new THREE.PlaneGeometry(20, H - 4); bl.translate(10, 0, 0); const m = add(new THREE.Mesh(bl, bladeMat(0.38)), SOPRA, x - 1.4, Q + (H - 4) / 2, 0); m.rotation.y = Math.PI;
    const f = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 1.4), bladeMat(0.45)), SOPRA, x - 11.4, Q + 0.06, 0); f.rotation.x = -Math.PI / 2; f.scale.x = -1;
    lame.push(m, f);
  });
  const NECK0 = V(GX - 52, Q, 0);
  box(400, 1.0, 3.0, M.basalt, SOPRA, SX - 36 - 200, Q - 0.5, 0);
  box(NECK0.x - (SX + 36), 1.0, 3.0, M.basalt, SOPRA, (SX + 36 + NECK0.x) / 2, Q - 0.5, 0);
  // l'unica scala: dritta, un pieno svuotato. La fascia davanti al parallelepipedo è tolta sopra la linea dei gradini:
  // resta il pieno sotto, gradinato. Alzate rosse come i tronchi, pedate blu come il piano di sotto
  // la scala a tornante: due rampe uguali e, fra le due, il pianerottolo a metà altezza, profondo il doppio.
  // La prima rampa è scavata nella fascia del parallelepipedo e scende verso sinistra; dal pianerottolo la seconda torna
  // indietro, verso il nido, nella corsia accanto (un pieno gradinato appoggiato alla faccia) fino alle fondamenta
  const YM = (Q + FOND) / 2, PL = 10, ZO = ZF + (ZF - ZS); // quota e lunghezza del pianerottolo; ZO: bordo esterno della seconda corsia
  const SCALA = { z: (ZS + ZF) / 2, z2: (ZF + ZO) / 2, x0: SX + 30, xL: SX - 35 + PL, xE: SX - 35, n: 92 };
  SCALA.run = (SCALA.x0 - SCALA.xL) / SCALA.n; SCALA.rise = (Q - YM) / SCALA.n; SCALA.x1 = SCALA.xL + SCALA.run * SCALA.n; SCALA.ym = YM;
  { const { x0, xL, xE, x1, n, run, rise } = SCALA, dep = ZF - ZS;
    const a = new THREE.Shape(); a.moveTo(SX - 35, YB); a.lineTo(SX + 35, YB); a.lineTo(SX + 35, Q); a.lineTo(x0, Q);
    for (let i = 0; i < n; i++) { const y = Q - (i + 1) * rise, x = x0 - i * run; a.lineTo(x, y); a.lineTo(x - run, y); }
    a.lineTo(xE, YM); a.closePath();
    const b = new THREE.Shape(); b.moveTo(xE, FOND); b.lineTo(xE, YM); b.lineTo(xL, YM);
    for (let i = 0; i < n; i++) { const y = YM - (i + 1) * rise, x = xL + i * run; b.lineTo(x, y); b.lineTo(x + run, y); }
    b.closePath();
    const ga = new THREE.ExtrudeGeometry(a, { depth: dep, bevelEnabled: false, curveSegments: 1 }); ga.translate(0, 0, ZS); shade(add(new THREE.Mesh(ga, M.lucido), SOPRA));
    const gb = new THREE.ExtrudeGeometry(b, { depth: ZO - ZF, bevelEnabled: false, curveSegments: 1 }); gb.translate(0, 0, ZF); shade(add(new THREE.Mesh(gb, M.lucido), SOPRA));
    // il pianerottolo nella prima corsia
    box(PL, YM - YB, dep, M.lucido, SOPRA, xE + PL / 2, (YM + YB) / 2, SCALA.z);
    const w = dep - 0.02, o = new THREE.Object3D();
    const ped = new THREE.InstancedMesh(new THREE.BoxGeometry(run, 0.06, w), M.pedata, 2 * n + 1), alz = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, rise, w), M.alzata, 2 * n);
    for (let i = 0; i < n; i++) { let y = Q - (i + 1) * rise, x = x0 - i * run;
      o.position.set(x - run / 2, y + 0.03, SCALA.z); o.updateMatrix(); ped.setMatrixAt(i, o.matrix);
      o.position.set(x - 0.03, y + rise / 2, SCALA.z); o.updateMatrix(); alz.setMatrixAt(i, o.matrix);
      y = YM - (i + 1) * rise; x = xL + i * run;
      o.position.set(x + run / 2, y + 0.03, SCALA.z2); o.updateMatrix(); ped.setMatrixAt(n + i, o.matrix);
      o.position.set(x + 0.03, y + rise / 2, SCALA.z2); o.updateMatrix(); alz.setMatrixAt(n + i, o.matrix); }
    o.scale.set(PL / run, 1, (ZO - ZS) / w); o.position.set(xE + PL / 2, YM + 0.03, (ZS + ZO) / 2); o.updateMatrix(); ped.setMatrixAt(2 * n, o.matrix); // il pianerottolo: blu, profondo due corsie
    for (const im of [ped, alz]) { im.receiveShadow = true; im.computeBoundingSphere(); SOPRA.add(im); } }

  /* ---------- il nido: un uovo in piedi, intrecciato ---------- */
  const fibre = [];
  function corpo(center, R, sy, n, lobe, lobeAmt, thick) {
    const ax = V(0, 0, 0), u = V(0, 0, 0), w = V(0, 0, 0), d = V(0, 0, 0);
    for (let k = 0; k < n; k++) {
      ax.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); u.set(1, 0, 0); if (Math.abs(ax.x) > 0.8) u.set(0, 1, 0); u.cross(ax).normalize(); w.crossVectors(ax, u);
      const pts = [], ph = rnd() * 6.28, span = 2.2 + rnd() * 2.5;
      for (let i = 0; i <= 26; i++) {
        const a = ph + (i / 26) * span; d.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a));
        // uovo: più largo in basso, punta in alto; un lobo asimmetrico
        const egg = 1 - 0.16 * d.y, r = R * egg * (1 + lobeAmt * Math.pow(Math.max(0, d.dot(lobe)), 2)) * (1 + (rnd() - 0.5) * 0.05);
        pts.push(V(center.x + d.x * r, center.y + d.y * r * sy, center.z + d.z * r));
      }
      fibre.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, thick * (0.6 + rnd() * 0.8), 4, false));
    }
  }
  corpo(NC, 20, 1.45, low ? 160 : 260, V(0.4, 0.5, -0.7).normalize(), 0.28, 0.42);
  // le otto camere chiuse: otto semi uguali, a passo regolare intorno alla metà bassa dell'uovo, le opposte una di fronte all'altra.
  // Il collo d'ingresso passa fra due di loro. Guscio liscio, sei nervature: si leggono una per una
  const OTTO = [], PODS = [];
  const podL = 15, podProf = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; podProf.push(new THREE.Vector2(Math.max(0.001, 6.2 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04)), 0.75) * (0.5 + 0.5 * u)), u * podL)); }
  const podG = new THREE.LatheGeometry(podProf, 40);
  for (let k = 0; k < 8; k++) {
    const a = Math.PI + Math.PI / 8 + (k / 8) * Math.PI * 2, el = -0.32;
    const d = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const r = 20 * (1 - 0.16 * d.y) * 0.9, base = NC.clone().add(V(d.x * r, d.y * r * 1.45, d.z * r));
    const ax = V(d.x, d.y * 0.5, d.z).normalize(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), ax);
    PODS.push({ base, q }); OTTO.push(base.clone().addScaledVector(ax, podL * 0.55));
    // le nervature: meridiani del seme, appena fuori dal guscio, nel colore delle fibre del nido
    for (let m = 0; m < 6; m++) { const ph = (m / 6) * Math.PI * 2 + k * 0.3, pts = [];
      for (const v of podProf) { const rr = v.x + 0.18; pts.push(V(Math.cos(ph) * rr, v.y, Math.sin(ph) * rr).applyQuaternion(q).add(base)); }
      fibre.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.22, 4, false)); }
  }
  const nest = shade(add(new THREE.Mesh(mergeGeometries(fibre), M.fibre), SOPRA)); fibre.forEach((f) => f.dispose());
  // il collo d'ingresso: l'anticamera, ocra
  const NECK = new THREE.CatmullRomCurve3([NECK0, V(GX - 42, Q + 0.2, -1), V(GX - 32, Q + 0.6, -2.5), V(GX - 20, Q + 2, -4)]);
  { const fc = [], c = V(0, 0, 0), t3 = V(0, 0, 0), n1 = V(0, 0, 0), n2 = V(0, 0, 0), up = V(0, 1, 0);
    for (let k = 0; k < (low ? 50 : 80); k++) { const ph = rnd() * 6.28, tw = (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.8), pts = [];
      for (let i = 0; i <= 30; i++) { const t = 0.02 + 0.98 * (i / 30); NECK.getPointAt(t, c); NECK.getTangentAt(t, t3); n1.crossVectors(t3, up).normalize(); n2.crossVectors(n1, t3).normalize(); const a = ph + tw * t * 6.28, r = 3.6 + 1.4 * t * t; pts.push(c.clone().addScaledVector(n1, Math.cos(a) * r).addScaledVector(n2, Math.sin(a) * r + 2)); }
      fc.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.2 + rnd() * 0.16, 4, false)); }
    shade(add(new THREE.Mesh(mergeGeometries(fc), M.collo), SOPRA)); fc.forEach((f) => f.dispose()); }
  // i tre schermi nel collo: una fessura fuori centro; ruotando si allineano
  const schermi = [0.18, 0.36, 0.54].map((t, i) => {
    const s = new THREE.Shape(); s.absarc(0, 0, 3.5, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.moveTo(-0.45, 0.4); hole.lineTo(0.45, 0.4); hole.lineTo(0.45, 3.0); hole.lineTo(-0.45, 3.0); hole.closePath(); s.holes.push(hole);
    const m = shade(add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false }), M.schermo), SOPRA));
    const c = NECK.getPointAt(t); m.position.set(c.x, c.y + 2, c.z); m.rotation.y = Math.PI / 2;
    return { m, sfalsa: [0, 1.1, -1.4][i] };
  });
  // la stanza: la luce calda; sul pavimento i quattro anelli dei passi
  const core = add(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), M.caldo), SOPRA, NC.x, NC.y - 4, NC.z); core.scale.set(11, 13, 11);
  const warm = new THREE.PointLight(0xffaa62, 700, 130, 1.6); warm.position.copy(NC); SOPRA.add(warm);
  add(new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.6, 48), M.basalt), SOPRA, NC.x, Q - 0.3, NC.z);
  const anelli = [0, 1, 2, 3].map((i) => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(3 + i * 3, 0.14, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffd6a8, transparent: true, opacity: 0.6 })), SOPRA, NC.x, Q + 0.05, NC.z); m.rotation.x = Math.PI / 2; return m; });
  // le otto camere chiuse: i gusci
  // ognuna diversa: il colore della ruota di Plutchik, smorzato verso la materia del nido (gioia, fiducia, paura, sorpresa, tristezza, disgusto, rabbia, anticipazione)
  const TINTE = [0xe8c547, 0x9cc35a, 0x3f8a5c, 0x52a9c9, 0x3c5fa0, 0x8a62a3, 0xb8402f, 0xd9823a], nido = new THREE.Color(0x9b8b74);
  const podMats = TINTE.map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).lerp(nido, 0.3), roughness: 0.5, transparent: true, opacity: 1 }));
  const membrane = PODS.map(({ base, q }, k) => { const m = shade(add(new THREE.Mesh(podG, podMats[k]), SOPRA, base.x, base.y, base.z)); m.quaternion.copy(q); return m; });
  // i quattro assi: fibre tese, chiare, fra le opposte
  for (let k = 0; k < 4; k++) { const a = OTTO[k], b = OTTO[k + 4], len = a.distanceTo(b) + 14, mid = a.clone().add(b).multiplyScalar(0.5); const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 6), M.asse), SOPRA, mid.x, mid.y, mid.z); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); }
  // il corridoio. Due versioni a confronto: ?corridoio=anello (la galleria intorno al nido) e, di base, il nastro di Möbius:
  // un anello verticale, inclinato, che tocca il passaggio in quota prima dell'anticamera. Chi ci sale lo percorre
  // all'infinito: dopo un giro passa dallo stesso punto capovolto, sotto il passaggio; dopo due torna dov'era.
  const MOB = { P0: V(56, Q, 0), R: 13, d: V(Math.cos(0.52), 0, -Math.sin(0.52)), b: V(0, 0, 0), c: V(0, 0, 0) };
  MOB.b.crossVectors(MOB.d, V(0, 1, 0)).normalize(); MOB.c.copy(MOB.P0).add(V(0, MOB.R, 0));
  const _nr = V(0, 0, 0), _w = V(0, 0, 0), _tg = V(0, 0, 0);
  // punto del nastro: th = angolo lungo l'anello (0 = sul passaggio), v = di quanto ci si sposta di traverso
  function mobius(th, v, out, nrm) {
    _nr.copy(MOB.d).multiplyScalar(Math.sin(th)).addScaledVector(V0Y, -Math.cos(th));
    _w.copy(MOB.b).multiplyScalar(Math.cos(th / 2)).addScaledVector(_nr, Math.sin(th / 2));
    out.copy(MOB.c).addScaledVector(_nr, MOB.R).addScaledVector(_w, v);
    if (nrm) { _tg.copy(MOB.d).multiplyScalar(Math.cos(th)).addScaledVector(V0Y, Math.sin(th)); nrm.crossVectors(_w, _tg).normalize(); }
    return out;
  }
  const V0Y = V(0, 1, 0);
  let CORR;
  if (corridoio === 'anello') {
    CORR = new THREE.CatmullRomCurve3([...Array(65)].map((_, i) => { const a = -Math.PI * 0.85 + (i / 64) * Math.PI * 2.1; return V(NC.x + Math.cos(a) * 47, Q + 3 + 14 * Math.sin((i / 64) * Math.PI) + 2 * Math.sin(a * 3), NC.z + Math.sin(a) * 45); }));
    const pos = [], idx = [], p = V(0, 0, 0), t = V(0, 0, 0), s = V(0, 0, 0), up = V(0, 1, 0);
    for (let i = 0; i <= 200; i++) { CORR.getPoint(i / 200, p); CORR.getTangent(i / 200, t); s.crossVectors(t, up).normalize().multiplyScalar(1.4); pos.push(p.x - s.x, p.y, p.z - s.z, p.x + s.x, p.y, p.z + s.z); if (i < 200) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); shade(add(new THREE.Mesh(g, M.corr), SOPRA));
  } else {
    // il nastro: largo come il passaggio, con un bordo appena rilevato perché si legga la torsione
    const N = 320, VS = [-1.5, -1.35, 1.35, 1.5], LIFT = [0.25, 0, 0, 0.25], pos = [], idx = [], p = V(0, 0, 0), n = V(0, 0, 0);
    for (let i = 0; i <= N; i++) { const th = (i / N) * Math.PI * 2; for (let j = 0; j < 4; j++) { mobius(th, VS[j], p, n); p.addScaledVector(n, LIFT[j]); pos.push(p.x, p.y, p.z); } if (i < N) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    shade(add(new THREE.Mesh(g, M.corr), SOPRA));
    CORR = new THREE.CatmullRomCurve3([...Array(49)].map((_, i) => mobius((i / 48) * Math.PI * 2, 0, V(0, 0, 0))), true);
  }
  if (corridoio === 'anello') box(12, 0.8, 2.6, M.basalt, SOPRA, NECK0.x - 4, Q - 0.4, -9); // il raccordo alla galleria ad anello
  // il mezzanino: una canna esile, una sola curva. Sale inclinata dalle fondamenta, attraversa il nido, esce oltre
  // la sommità e si piega all'ingiù come una canna da pesca sotto un peso. Dalla punta pende una fune: ci si appende.
  // La brezza (che cresce e cala, più forte con l'attivazione) fa ondeggiare la parte fuori dal nido, la punta di più
  const dirO = V(0.6, 0, 0.8), R0 = V(NC.x + 15, 0, NC.z + 7);
  const RC = new THREE.CatmullRomCurve3([[-16, FOND], [-11, Q - 5], [-6, Q + 20], [-1, Q + 42], [4, Q + 56], [11, Q + 63], [18, Q + 61], [24, Q + 53], [27, Q + 43]]
    .map(([sx, y]) => V(R0.x + dirO.x * sx, y, R0.z + dirO.z * sx)), false, 'centripetal');
  const rodM = new THREE.MeshStandardMaterial({ color: 0xc4b9a6, roughness: 0.6 });
  const TA = 0.4, TB = 0.74; // gli snodi: all'uscita dal nido e a metà dell'arco
  const tratto = (t0, t1, o, r) => { const pts = []; for (let i = 0; i <= 24; i++) pts.push(RC.getPoint(t0 + (t1 - t0) * (i / 24)).sub(o)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 8, false); };
  const PA = RC.getPoint(TA), PB = RC.getPoint(TB), TIPW = RC.getPoint(1);
  shade(add(new THREE.Mesh(tratto(0, TA, V(0, 0, 0), 0.42), rodM), SOPRA));
  const piv1 = add(new THREE.Group(), SOPRA, PA.x, PA.y, PA.z);
  shade(add(new THREE.Mesh(tratto(TA, TB, PA, 0.3), rodM), piv1));
  const piv2 = add(new THREE.Group(), piv1, PB.x - PA.x, PB.y - PA.y, PB.z - PA.z);
  shade(add(new THREE.Mesh(tratto(TB, 1, PB, 0.17), rodM), piv2));
  const ROPE = 8;
  const corda = add(new THREE.Group(), piv2, TIPW.x - PB.x, TIPW.y - PB.y, TIPW.z - PB.z);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, ROPE, 6).translate(0, -ROPE / 2, 0), new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.9 })), corda);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 24), new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.9 })), corda, 0, -ROPE - 0.4, 0);
  const MZ = V(TIPW.x, TIPW.y - ROPE, TIPW.z);
  const axO = V(0, 0, 0).crossVectors(V0Y, dirO).normalize(); // asse di flessione: perpendicolare alla direzione della punta
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qw = new THREE.Quaternion(), axL = V(0, 0, 0);
  let pend = 0, pendV = 0;
  // la struttura: la pianta disegnata, in trasparenza (si accende quando la si chiama)
  const pianta = new THREE.Group(); SOPRA.add(pianta);
  { const lm = new THREE.LineBasicMaterial({ color: 0xf2e6cf, transparent: true, opacity: 0 }); const circ = (cx, cz, rx, rz) => { const pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(V(cx + Math.cos(a) * rx, 0, cz + Math.sin(a) * rz)); } pianta.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm)); };
    circ(NC.x, NC.z, 20, 20); for (const c of OTTO) circ(c.x, c.z, 6, 6); circ(NC.x, NC.z, 34, 30);
    pianta.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(NECK.getPoints(40).map((p) => V(p.x, 0, p.z))), lm));
    const rect = (x, z, w, d) => pianta.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([V(x - w / 2, 0, z - d / 2), V(x + w / 2, 0, z - d / 2), V(x + w / 2, 0, z + d / 2), V(x - w / 2, 0, z + d / 2)]), lm));
    rect(SX, 0, 70, 40); rect((SCALA.xE + SCALA.x0) / 2, 16.5, SCALA.x0 - SCALA.xE, 7); rect((SCALA.xE + SCALA.x1) / 2, SCALA.z2, SCALA.x1 - SCALA.xE, 7); SOGLIA_X.forEach((x) => { rect(x, -6.3, 2.8, 11.4); rect(x, 6.3, 2.8, 11.4); });
    pianta.position.y = Q + 0.3; pianta.userData.mat = lm; }

  /* ---------- bersagli del tocco (invisibili) e punti delle etichette ---------- */
  const objectsToIntersect = [];
  const pmat = new THREE.MeshBasicMaterial();
  function proxy(geo, parent, x, y, z, k, block) { const m = new THREE.Mesh(geo, pmat); m.position.set(x, y, z); m.visible = false; if (block) m.userData.block = true; else m.userData.pick = k; parent.add(m); objectsToIntersect.push(m); return m; }
  proxy(new THREE.BoxGeometry(50, 32, 26), SOPRA, SX, Q + 15, 0, 'soglia');
  proxy(new THREE.SphereGeometry(19, 20, 14), SOPRA, NC.x, NC.y, NC.z, 'stanza');
  proxy(new THREE.CylinderGeometry(5, 5, 32, 10), SOPRA, GX - 36, Q + 2, -1.5, 'anticamera').rotation.z = Math.PI / 2;
  proxy(new THREE.SphereGeometry(4.5, 10, 8), SOPRA, MZ.x, MZ.y, MZ.z, 'mezzanino');
  proxy(new THREE.BoxGeometry(62, 8, 8), SOPRA, SX, Q / 2, 16.5, 'vie').rotation.z = Math.atan2(Q, 60);
  proxy(new THREE.BoxGeometry(2 * BX, 2, 2 * BZ), SOTTO, BC.x, 0, BC.z, 'sotto');
  proxy(new THREE.BoxGeometry(600, 10, 300), scene, 0, FOND - 2, -100, 'fondamenta');
  for (const k of [0, 16, 32, 48]) { const p = CORR.getPoint(0.15 + k / 64 * 0.7); proxy(new THREE.SphereGeometry(4, 8, 6), SOPRA, p.x, p.y, p.z, 'corridoio'); }
  for (const t of [0.5, 0.65, 0.8, 0.92]) { const p = RC.getPoint(t); proxy(new THREE.SphereGeometry(3, 8, 6), SOPRA, p.x, p.y, p.z, 'mezzanino'); }

  const ANCORE = {
    soglia: [SOPRA, V(SX, Q + 33, 0)], stanza: [SOPRA, V(NC.x, NC.y + 34, NC.z)], anticamera: [SOPRA, V(GX - 40, Q + 9, 0)],
    corridoio: [SOPRA, CORR.getPoint(0.5).add(V(0, 4, 0))], mezzanino: [SOPRA, V(MZ.x + 12, MZ.y + 2, MZ.z + 10)], vie: [SOPRA, V(SX + 6, Q / 2 + 8, 22)],
    sotto: [SOTTO, V(BC.x, 3, 40)], fondamenta: [scene, V(70, FOND + 6, 45)], struttura: [SOPRA, V(NC.x - 50, Q + 2, NC.z + 36)],
  };
  const CHIUSE = OTTO.map((c) => [SOPRA, c.clone().add(V(0, -8, 0))]);
  const APPOGGI = alberi.map((a) => [SOTTO, V(a.x, 4, a.z)]);
  const CORPO = OSSA.map((p) => [scene, p]);

  /* ---------- stato e aggiornamento (nessuna allocazione qui dentro) ---------- */
  const S0 = { quota: 0.5, ampiezza: 0.5, valenza: 0.5, attivazione: 0.4, appoggi: [true, true, true, true], allinea: 0, struttura: 0, liv: 0, sotto: PIANO, livello: 0, fessure: [0, 0, 0], allinea3: 1 };
  const cold = new THREE.Color(0x3e5664), warmW = new THREE.Color(0x6b5a44), tmpC = new THREE.Color();
  let ripT = 0, porte = 0, liv = 0, fframe = 0, ondaT = 0; const ondaFredda = new THREE.Color(0x7fc4ff), ondaCalda = new THREE.Color(0xffd9a0);
  function aggiorna(dt, t, st) {
    let tolti = 0; for (let i = 0; i < 4; i++) { const a = alberi[i]; const target = st.appoggi[i] ? 1 : 0; a.presente += (target - a.presente) * Math.min(1, dt * 1.2); if (!st.appoggi[i]) tolti++; }
    // la quota e gli appoggi decidono dove arriva il pavimento; l'ampiezza decide solo quanto in fretta ci arriva
    // (una vasca grande cambia più lenta). Quota a zero e nessun appoggio: il pavimento tocca il fondo, a secco
    const base = -10 + 20 * st.quota, calo = tolti * 10;
    const k = Math.min(1, dt * (1.6 - 1.1 * st.ampiezza));
    liv += (base - calo - liv) * k;
    // sopra resta fermo; il pavimento (e l'acqua, i tronchi) segue il livello, senza scendere sotto le fondamenta
    // a zero il pavimento scende fino al fondo: il serbatoio è a secco
    const yS = Math.max(FOND + 0.05, PIANO + liv); st.liv = 0; st.sotto = yS; st.livello = liv;
    SOPRA.position.y = 0; SOTTO.position.y = yS;
    { const sc = 0.75 + 0.5 * st.ampiezza, hx = BX * sc, hz = BZ * sc, zf = Math.min(TAGLIO, hz), h = Math.max(0.01, yS + WY - FOND), y = yS + WY;
      surf.scale.set(2 * hx, 2 * hz, 1);
      pareti[0].position.set(BC.x, y, zf + 0.2); pareti[0].scale.set(2 * hx, h, 1);
      pareti[1].position.set(BC.x, y, -hz); pareti[1].scale.set(2 * hx, h, 1);
      pareti[2].position.set(BC.x - hx, y, (zf - hz) / 2); pareti[2].scale.set(zf + hz, h, 1);
      pareti[3].position.set(BC.x + hx, y, (zf - hz) / 2); pareti[3].scale.set(zf + hz, h, 1);
      menisco.position.set(BC.x, y - 0.12, zf + 0.25); menisco.scale.x = 2 * hx; film.scale.set(2 * hx, 1, zf + hz); film.position.set(BC.x, 0, (zf - hz) / 2); fondaBox.scale.set(2 * hx, 1, zf + hz); fondaBox.position.z = (zf - hz) / 2; motoU.uBox.value.set(BC.x - hx, BC.x + hx, -hz, zf - 0.5); }
    motoU.uT.value = t; motoU.uAtt.value = st.attivazione; motoU.uTop.value = yS + WY - 0.6;
    // i tronchi: dalle fondamenta alla pellicola; quello tolto si ritira verso il basso
    const span = Math.max(0.5, yS - FOND);
    for (let i = 0; i < 4; i++) { const a = alberi[i]; a.trunk.scale.set(1, span * (0.25 + 0.75 * a.presente), 1); a.trunk.position.y = -0.05 - span * 0.75 * (1 - a.presente); }
    // la canna del mezzanino: dalle fondamenta (ferme) fino al nido (che sale e scende); la brezza cresce e cala
    const brezza = (0.25 + 0.75 * st.attivazione) * (0.55 + 0.45 * Math.sin(t * 0.13)) * (1 + 0.25 * Math.sin(t * 1.7));
    const f = Math.sin(t * 0.85) + 0.35 * Math.sin(t * 2.1 + 1);
    piv1.rotation.set(0, 0, 0); piv1.quaternion.setFromAxisAngle(axO, 0.035 * brezza * f);
    qb.setFromAxisAngle(axO, 0.12 * brezza * Math.sin(t * 0.85 - 0.7)); qa.setFromAxisAngle(dirO, 0.06 * brezza * Math.sin(t * 0.6)); piv2.quaternion.multiplyQuaternions(qa, qb);
    // la fune: un pendolo che insegue la punta, sempre verso il basso
    pendV += (-(pend - 0.25 * brezza * f) * 2.2 - pendV * 0.6) * dt; pend += pendV * dt;
    piv2.getWorldQuaternion(qw).invert(); axL.copy(axO); corda.quaternion.copy(qw).multiply(qa.setFromAxisAngle(axL, pend));
    // le fondamenta cedono sotto la riserva: le porte di sopra smettono di chiudere
    const riserva = liv < -9 ? 1 : 0; porte += (riserva - porte) * Math.min(1, dt * 1.5);
    FONDA.position.y = -1.2 * porte;
    for (let i = 0; i < membrane.length; i++) { const s = 1 + porte * 0.12 * Math.sin(t * 2.2 + i); membrane[i].scale.set(s, s, s); }
    // valenza: il colore dell'acqua; attivazione: il moto della superficie e dei rami
    tmpC.copy(cold).lerp(warmW, st.valenza); waterMat.color.copy(tmpC); filmMat.color.copy(filmDeep).lerp(filmLight, st.valenza);
    ondaT += dt * (0.5 + 2.2 * st.attivazione); ondaU.uT.value = ondaT; ondaU.uOndaCol.value.copy(ondaFredda).lerp(ondaCalda, st.valenza);
    ripT += dt * (0.02 + 0.18 * st.attivazione); ripple.offset.set(ripT, ripT * 0.6); waterMat.normalScale.set(0.2 + 0.6 * st.attivazione, 0.2 + 0.6 * st.attivazione);
    // il terzo monolite: a riposo è simmetrico come gli altri; durante lo Smistamento le metà si sfalsano e, se la risposta è sì, si riallineano
    META[2][1].position.x = SOGLIA_X[2] + 2.6 * (1 - st.allinea3);
    // gli schermi dell'anticamera: sfalsati, o allineati (la porta si apre)
    for (let i = 0; i < 3; i++) { const s = schermi[i]; s.m.rotation.set(0, Math.PI / 2, s.sfalsa * (1 - st.allinea) + porte * 0.3 * Math.sin(t * 1.7 + i)); }
    // la stanza respira; gli anelli dei passi
    core.material.emissiveIntensity = 1.3 + 0.25 * Math.sin(t * 0.9) + 0.6 * st.allinea;
    for (let i = 0; i < 4; i++) anelli[i].material.opacity = 0.35 + 0.25 * Math.sin(t * 0.8 - i * 0.8);
    // la struttura: la pelle si fa trasparente, compare la pianta
    M.fibre.opacity = 1 - 0.85 * st.struttura; M.fibre.depthWrite = st.struttura < 0.5; for (const pm of podMats) { pm.opacity = 1 - 0.85 * st.struttura; pm.depthWrite = st.struttura < 0.5; } pianta.userData.mat.opacity = st.struttura;
    for (let i = 0; i < lame.length; i++) lame[i].material.opacity = Math.min(1, (i % 2 ? 0.4 : 0.32) * (0.85 + 0.15 * Math.sin(t * 0.6 + i)) * (1 + 1.8 * st.fessure[i >> 1]));
  }

  return { motoU, mobius, MOBIUS: corridoio !== 'anello', SOPRA, SOTTO, aggiorna, S0, objectsToIntersect, ANCORE, CHIUSE, APPOGGI, CORPO, NECK, CORR, SOGLIA_X, NECK0, MZ, alberi, SCALA };
}
