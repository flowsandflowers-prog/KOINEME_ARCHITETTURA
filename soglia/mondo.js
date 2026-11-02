// Il mondo 3D di «La Soglia»: costruisce l'edificio e ne aggiorna lo stato a ogni fotogramma.
// Regole (skill del progetto): InstancedMesh per gli oggetti ripetuti; geometrie ferme unite;
// un solo sole con ombra; la luce calda della stanza è l'unica luce calda; nessuna allocazione in aggiorna().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// quote di riferimento (il livello del piano di sotto è 0 quando la quota è a metà)
export const Q = 40, FOND = -34, TAGLIO = 54, SX = -20, GX = 130;
export const NC = V(GX, Q + 24, -4); // centro della camera centrale (la stanza)

export function costruisci(scene, { low = false } = {}) {
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
    top: new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 0.9 }),
    bark: new THREE.MeshStandardMaterial({ map: canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#7d2b1f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 80; i++) { const x = rnd() * w; g.strokeStyle = `rgba(${rnd() < 0.5 ? '35,8,4' : '160,72,48'},${0.25 + rnd() * 0.35})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 6, y); g.stroke(); } }, [2, 4]), roughness: 0.82 }),
    fibre: new THREE.MeshStandardMaterial({ color: 0x5a4b3e, roughness: 0.9, transparent: true, opacity: 1 }),
    collo: new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.85 }),   // l'anticamera: ocra, legata al nido ma riconoscibile
    schermo: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8, side: THREE.DoubleSide }),
    membrana: new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.7, transparent: true, opacity: 0.7 }),
    asse: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe9eef2, emissiveIntensity: 1.0 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xc4b9a6, roughness: 0.7, clippingPlanes: cut }),
    corr: new THREE.MeshStandardMaterial({ color: 0x3b332c, roughness: 0.85, side: THREE.DoubleSide }),
    caldo: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffaa62, emissiveIntensity: 1.5 }),
  };
  const add = (m, parent, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); parent.add(m); return m; };
  const shade = (m) => { m.castShadow = m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, parent, x, y, z) => shade(add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent, x, y, z));

  /* ---------- le fondamenta: il corpo ---------- */
  const FONDA = new THREE.Group(); scene.add(FONDA);
  shade(add(new THREE.Mesh(new THREE.BoxGeometry(3000, 16, 3000), new THREE.MeshStandardMaterial({ color: 0x9c9384, roughness: 0.9, clippingPlanes: cut })), FONDA, 0, FOND - 8, 0));
  box(3000, 16, 1, new THREE.MeshStandardMaterial({ color: 0x857c6f, roughness: 0.95 }), FONDA, 0, FOND - 8, TAGLIO);
  add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x2e2c29, roughness: 1 })), scene, 0, FOND - 16, 0).rotation.x = -Math.PI / 2;
  const OSSA = []; // posizioni per le parole del corpo
  {
    const n = low ? 120 : 220, im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), M.bone, n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { o.position.set(-260 + rnd() * 560, FOND + 0.4, -220 + rnd() * (TAGLIO + 220)); const s = 3 + rnd() * 10; o.scale.set(s * (1 + rnd() * 1.4), s * 0.5, s); o.rotation.y = rnd() * 3; o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (OSSA.length < 7 && o.position.z > 20 && o.position.x > -120 && o.position.x < 200) OSSA.push(o.position.clone().setY(FOND + 4)); }
    shade(im); im.computeBoundingSphere(); FONDA.add(im);
  }

  /* ---------- l'acqua del serbatoio ---------- */
  const ripple = canvasTex(512, 512, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + Math.sin((x + y) * 0.11) * 0.3 + Math.sin(y * 0.19 - x * 0.03) * 0.2; const i = (y * w + x) * 4; img.data[i] = 128 + v * 40; img.data[i + 1] = 128 + Math.cos(y * 0.06 + x * 0.02) * 40; img.data[i + 2] = 255; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, [60, 60], false);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4f6266, roughness: 0.1, metalness: 0.3, normalMap: ripple, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.62, clippingPlanes: cut, depthWrite: false });
  const surf = add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), waterMat), SOTTO, 0, -3, 0); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 2;
  // il corpo d'acqua sul taglio: scurisce in profondità. Altezza 1, scalata a ogni fotogramma fino alle fondamenta
  const faceG = new THREE.PlaneGeometry(3000, 1, 1, 16); faceG.translate(0, -0.5, 0);
  { const col = []; for (let i = 0; i < faceG.attributes.position.count; i++) { const t = faceG.attributes.position.getY(i) + 1; const c = new THREE.Color(0x15202a).lerp(new THREE.Color(0x7b9a9c), Math.pow(t, 1.4)); col.push(c.r, c.g, c.b); } faceG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
  const face = add(new THREE.Mesh(faceG, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false })), scene, 0, 0, TAGLIO + 0.2); face.renderOrder = 3;
  const menisco = add(new THREE.Mesh(new THREE.PlaneGeometry(3000, 0.25), new THREE.MeshBasicMaterial({ color: 0xe9efed })), scene, 0, 0, TAGLIO + 0.25);
  // particelle sospese, vicino al taglio, ben visibili
  const motes = (() => { const pp = []; for (let i = 0; i < (low ? 900 : 2200); i++) pp.push(-220 + rnd() * 500, rnd(), 10 + rnd() * (TAGLIO - 12)); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); return add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8f0ee, size: 0.6, transparent: true, opacity: 0.75, depthWrite: false })), scene, 0, 0, 0); })();

  /* ---------- i quattro appoggi: tronchi rossi; sopra, una pellicola blu che poggia sulle loro cime ---------- */
  const ALBERI = [[-95, 8], [-8, 36], [80, 4], [165, 18]];
  const alberi = ALBERI.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); SOTTO.add(g);
    const trunk = shade(add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.4, 1, 20), M.bark.clone()), g, 0, 0.5, 0));
    trunk.geometry.translate(0, -0.5, 0); trunk.material.clippingPlanes = cut;
    return { g, trunk, x, z, presente: 1 };
  });
  // la pellicola: tesa sulle cime dei tronchi, si affloscia fra l'uno e l'altro
  const FC = V(40, 0, -75), FW = 520, FD = 260;
  const filmG = new THREE.PlaneGeometry(FW, FD, low ? 90 : 140, low ? 46 : 72); filmG.rotateX(-Math.PI / 2);
  const filmBase = Float32Array.from(filmG.attributes.position.array);
  const filmMat = new THREE.MeshStandardMaterial({ color: 0x2f6db5, roughness: 0.18, metalness: 0.15, transparent: false, opacity: 1, side: THREE.DoubleSide, clippingPlanes: cut });
  const film = shade(add(new THREE.Mesh(filmG, filmMat), SOTTO, FC.x, 0, FC.z));
  const filmDeep = new THREE.Color(0x1d3c73), filmLight = new THREE.Color(0x5aa0d6);

  /* ---------- la rupe della Soglia, la Soglia, il passaggio, la scala ---------- */
  { const r = box(70, Q - FOND + 24, 40, M.basalt, SOPRA, SX, (Q + FOND - 24) / 2, 0); r.material = [M.basalt, M.basalt, M.top, M.basalt, M.basalt, M.basalt]; }
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
  // l'unica scala: dritta, lungo la faccia della rupe, fino al livello del piano di sotto
  { const steps = 56, im = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.45, 3.4), M.basalt, steps), o = new THREE.Object3D();
    for (let i = 0; i < steps; i++) { const t = i / (steps - 1); o.position.set(SX + 30 - t * 60, Q - 0.25 - t * (Q - 0.6), 21.8); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    shade(im); im.computeBoundingSphere(); SOPRA.add(im); }

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
  const OTTO = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.25, el = (k % 2 ? -0.42 : -0.66) + 0.06 * Math.sin(k * 1.7);
    const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); if (dir.x < -0.7) dir.x = -0.7; dir.normalize();
    const c = NC.clone().add(V(dir.x * 29, dir.y * 22, dir.z * 29)); /* fuori dalla parete della stanza */ corpo(c, 5 + rnd() * 2.5, 1.15, low ? 36 : 56, dir, 0.9, 0.3); OTTO.push(c);
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
  // le otto camere chiuse: membrane
  const membrane = OTTO.map((c) => add(new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 16), M.membrana), SOPRA, c.x, c.y, c.z));
  // i quattro assi: fibre tese, chiare, fra le opposte
  for (let k = 0; k < 4; k++) { const a = OTTO[k], b = OTTO[k + 4], len = a.distanceTo(b) + 14, mid = a.clone().add(b).multiplyScalar(0.5); const m = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 6), M.asse), SOPRA, mid.x, mid.y, mid.z); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); }
  // il corridoio: una galleria esterna che gira intorno a tutte le camere
  const CORR = new THREE.CatmullRomCurve3([...Array(65)].map((_, i) => { const a = -Math.PI * 0.85 + (i / 64) * Math.PI * 2.1; return V(NC.x + Math.cos(a) * 47, Q + 3 + 14 * Math.sin((i / 64) * Math.PI) + 2 * Math.sin(a * 3), NC.z + Math.sin(a) * 45); }));
  { const pos = [], idx = [], p = V(0, 0, 0), t = V(0, 0, 0), s = V(0, 0, 0), up = V(0, 1, 0);
    for (let i = 0; i <= 200; i++) { CORR.getPoint(i / 200, p); CORR.getTangent(i / 200, t); s.crossVectors(t, up).normalize().multiplyScalar(1.4); pos.push(p.x - s.x, p.y, p.z - s.z, p.x + s.x, p.y, p.z + s.z); if (i < 200) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); shade(add(new THREE.Mesh(g, M.corr), SOPRA)); }
  box(12, 0.8, 2.6, M.basalt, SOPRA, NECK0.x - 4, Q - 0.4, -9);
  // il mezzanino: un ballatoio appeso alle nervature, a mezza quota dentro il nido
  const MZ = V(NC.x + 8, Q + 16, NC.z + 6);
  box(9, 0.6, 6, M.basalt, SOPRA, MZ.x, MZ.y, MZ.z);
  // la struttura: la pianta disegnata, in trasparenza (si accende quando la si chiama)
  const pianta = new THREE.Group(); SOPRA.add(pianta);
  { const lm = new THREE.LineBasicMaterial({ color: 0xf2e6cf, transparent: true, opacity: 0 }); const circ = (cx, cz, rx, rz) => { const pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(V(cx + Math.cos(a) * rx, 0, cz + Math.sin(a) * rz)); } pianta.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm)); };
    circ(NC.x, NC.z, 20, 20); for (const c of OTTO) circ(c.x, c.z, 6, 6); circ(NC.x, NC.z, 34, 30);
    pianta.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(NECK.getPoints(40).map((p) => V(p.x, 0, p.z))), lm));
    const rect = (x, z, w, d) => pianta.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([V(x - w / 2, 0, z - d / 2), V(x + w / 2, 0, z - d / 2), V(x + w / 2, 0, z + d / 2), V(x - w / 2, 0, z + d / 2)]), lm));
    rect(SX, 0, 70, 40); SOGLIA_X.forEach((x) => { rect(x, -6.3, 2.8, 11.4); rect(x, 6.3, 2.8, 11.4); });
    pianta.position.y = Q + 0.3; pianta.userData.mat = lm; }

  /* ---------- bersagli del tocco (invisibili) e punti delle etichette ---------- */
  const objectsToIntersect = [];
  const pmat = new THREE.MeshBasicMaterial();
  function proxy(geo, parent, x, y, z, k, block) { const m = new THREE.Mesh(geo, pmat); m.position.set(x, y, z); m.visible = false; if (block) m.userData.block = true; else m.userData.pick = k; parent.add(m); objectsToIntersect.push(m); return m; }
  proxy(new THREE.BoxGeometry(50, 32, 26), SOPRA, SX, Q + 15, 0, 'soglia');
  proxy(new THREE.SphereGeometry(19, 20, 14), SOPRA, NC.x, NC.y, NC.z, 'stanza');
  proxy(new THREE.CylinderGeometry(5, 5, 32, 10), SOPRA, GX - 36, Q + 2, -1.5, 'anticamera').rotation.z = Math.PI / 2;
  proxy(new THREE.SphereGeometry(4.5, 10, 8), SOPRA, MZ.x, MZ.y, MZ.z, 'mezzanino');
  proxy(new THREE.BoxGeometry(14, 4, 60), SOPRA, SX + 30, Q - 12, 21.8, 'vie');
  proxy(new THREE.BoxGeometry(600, 2, 300), SOTTO, 0, 0, -100, 'sotto');
  proxy(new THREE.BoxGeometry(600, 10, 300), scene, 0, FOND - 2, -100, 'fondamenta');
  for (const k of [0, 16, 32, 48]) { const p = CORR.getPoint(0.15 + k / 64 * 0.7); proxy(new THREE.SphereGeometry(4, 8, 6), SOPRA, p.x, p.y, p.z, 'corridoio'); }

  const ANCORE = {
    soglia: [SOPRA, V(SX, Q + 33, 0)], stanza: [SOPRA, V(NC.x, NC.y + 34, NC.z)], anticamera: [SOPRA, V(GX - 40, Q + 9, 0)],
    corridoio: [SOPRA, CORR.getPoint(0.55).add(V(0, 4, 0))], mezzanino: [SOPRA, V(MZ.x + 12, MZ.y + 2, MZ.z + 10)], vie: [SOPRA, V(SX + 30, Q - 14, 26)],
    sotto: [SOTTO, V(40, 3, 40)], fondamenta: [scene, V(70, FOND + 6, 45)], struttura: [SOPRA, V(NC.x - 50, Q + 2, NC.z + 36)],
  };
  const CHIUSE = OTTO.map((c) => [SOPRA, c.clone().add(V(0, -8, 0))]);
  const APPOGGI = alberi.map((a) => [SOTTO, V(a.x, 4, a.z)]);
  const CORPO = OSSA.map((p) => [scene, p]);

  /* ---------- stato e aggiornamento (nessuna allocazione qui dentro) ---------- */
  const S0 = { quota: 0.5, ampiezza: 0.5, valenza: 0.5, attivazione: 0.4, appoggi: [true, true, true, true], allinea: 0, struttura: 0, liv: 0, fessure: [0, 0, 0], allinea3: 0 };
  const cold = new THREE.Color(0x3e5664), warmW = new THREE.Color(0x6b5a44), tmpC = new THREE.Color();
  let ripT = 0, porte = 0, liv = 0, fframe = 0;
  function aggiorna(dt, t, st) {
    // il livello: la quota lo fissa, ogni appoggio tolto lo fa scendere; una vasca grande cambia meno e più lenta
    let tolti = 0; for (let i = 0; i < 4; i++) { const a = alberi[i]; const target = st.appoggi[i] ? 1 : 0; a.presente += (target - a.presente) * Math.min(1, dt * 1.2); if (!st.appoggi[i]) tolti++; }
    const base = -10 + 20 * st.quota, calo = tolti * 7 * (1.35 - 0.7 * st.ampiezza);
    const k = Math.min(1, dt * (1.6 - 1.1 * st.ampiezza));
    liv += (base - calo - liv) * k; st.liv = liv;
    SOPRA.position.y = liv; SOTTO.position.y = liv;
    face.scale.y = Math.max(0.01, liv - 3 - FOND); face.position.y = liv - 3; menisco.position.y = liv - 3.12;
    motes.scale.y = Math.max(0.01, liv - 5 - FOND); motes.position.y = FOND + 1;
    // i tronchi: dalle fondamenta alla pellicola; quello tolto si ritira verso il basso
    const span = Math.max(1, liv - 2.2 - FOND);
    for (let i = 0; i < 4; i++) { const a = alberi[i]; a.trunk.scale.set(1, span * (0.25 + 0.75 * a.presente), 1); a.trunk.position.y = -2.2 - span * 0.75 * (1 - a.presente); }
    // la pellicola: poggia sulle cime dei tronchi presenti; senza appoggio cede. L'ampiezza la allarga
    if ((fframe++ & 1) === 0) {
      const p = filmG.attributes.position.array, sc = 0.75 + 0.5 * st.ampiezza, sig2 = 2 * 30 * 30, amp = 0.35 * st.attivazione;
      for (let v = 0; v < p.length; v += 3) {
        const x = filmBase[v] * sc, z = filmBase[v + 2] * sc, wx = x + FC.x, wz = z + FC.z;
        let B = 0; for (let i = 0; i < 4; i++) { const a = alberi[i], dx = wx - a.x, dz = wz - a.z; const b = a.presente * Math.exp(-(dx * dx + dz * dz) / sig2); if (b > B) B = b; }
        p[v] = x; p[v + 2] = z; p[v + 1] = 0.5 - 3.4 * (1 - B) + amp * Math.sin(wx * 0.07 + t * 1.1) * Math.cos(wz * 0.06 + t * 0.8);
      }
      filmG.attributes.position.needsUpdate = true; filmG.computeVertexNormals();
    }
    // le fondamenta cedono sotto la riserva: le porte di sopra smettono di chiudere
    const riserva = liv < -9 ? 1 : 0; porte += (riserva - porte) * Math.min(1, dt * 1.5);
    FONDA.position.y = -1.2 * porte;
    for (let i = 0; i < membrane.length; i++) { const s = 1 + porte * 0.25 * Math.sin(t * 2.2 + i); membrane[i].scale.set(s, s, s); }
    // valenza: il colore dell'acqua; attivazione: il moto della superficie e dei rami
    tmpC.copy(cold).lerp(warmW, st.valenza); waterMat.color.copy(tmpC); filmMat.color.copy(filmDeep).lerp(filmLight, st.valenza);
    ripT += dt * (0.02 + 0.18 * st.attivazione); ripple.offset.set(ripT, ripT * 0.6); waterMat.normalScale.set(0.2 + 0.6 * st.attivazione, 0.2 + 0.6 * st.attivazione);
    // il terzo monolite: le due metà sfalsate scorrono fino ad allinearsi quando le componenti si muovono insieme
    META[2][1].position.x = SOGLIA_X[2] + 2.6 * (1 - st.allinea3);
    // gli schermi dell'anticamera: sfalsati, o allineati (la porta si apre)
    for (let i = 0; i < 3; i++) { const s = schermi[i]; s.m.rotation.set(0, Math.PI / 2, s.sfalsa * (1 - st.allinea) + porte * 0.3 * Math.sin(t * 1.7 + i)); }
    // la stanza respira; gli anelli dei passi
    core.material.emissiveIntensity = 1.3 + 0.25 * Math.sin(t * 0.9) + 0.6 * st.allinea;
    for (let i = 0; i < 4; i++) anelli[i].material.opacity = 0.35 + 0.25 * Math.sin(t * 0.8 - i * 0.8);
    // la struttura: la pelle si fa trasparente, compare la pianta
    M.fibre.opacity = 1 - 0.85 * st.struttura; M.fibre.depthWrite = st.struttura < 0.5; pianta.userData.mat.opacity = st.struttura;
    for (let i = 0; i < lame.length; i++) lame[i].material.opacity = Math.min(1, (i % 2 ? 0.4 : 0.32) * (0.85 + 0.15 * Math.sin(t * 0.6 + i)) * (1 + 1.8 * st.fessure[i >> 1]));
  }

  return { SOPRA, SOTTO, aggiorna, S0, objectsToIntersect, ANCORE, CHIUSE, APPOGGI, CORPO, NECK, CORR, SOGLIA_X, NECK0, MZ, alberi };
}
