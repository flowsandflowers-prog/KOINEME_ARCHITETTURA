// Gli animali che non hanno l'animazione che serve: la posa e il movimento li diamo noi, muovendo le ossa.
import * as THREE from 'three';

const ossa = (root) => { const b = {}; root.traverse((o) => { if (o.isBone) b[o.name] = o; }); return b; };

// la scimmia appesa per la mano destra (modello dell'utente: «monkey», rig senza animazioni).
// Restituisce un gruppo il cui punto d'origine è la mano: lo si appende alla fune.
export function posaAppesa(root, altezza = 1.2) {
  const B = ossa(root);
  B.b_Right_UpperArm.rotation.z += -2.75; B.b_Right_ForeArm && (B.b_Right_ForeArm.rotation.z += -0.15);
  B.b_Left_UpperArm.rotation.z += -0.9; B.b_Left_Leg01.rotation.x += 0.25; B.b_Right_Leg01.rotation.x += -0.15;
  const box = new THREE.Box3().setFromObject(root), s = altezza / box.getSize(new THREE.Vector3()).y; root.scale.setScalar(s);
  root.updateMatrixWorld(true); const mano = B.b_Right_Hand.getWorldPosition(new THREE.Vector3());
  const g = new THREE.Group(); g.add(root); root.position.sub(mano);
  const coda = [1, 2, 3, 4, 5, 6, 7].map((i) => B['b_Tail0' + i]).filter(Boolean), base = coda.map((c) => c.rotation.z);
  const gl = [B.b_Left_Leg01.rotation.x, B.b_Right_Leg01.rotation.x];
  return { g, oscilla(t) { coda.forEach((c, i) => { c.rotation.z = base[i] + 0.12 * Math.sin(t * 1.6 - i * 0.5); }); B.b_Left_Leg01.rotation.x = gl[0] + 0.12 * Math.sin(t * 1.3); B.b_Right_Leg01.rotation.x = gl[1] + 0.12 * Math.sin(t * 1.3 + 1.2); } };
}

// l'averla (modello dell'utente: «bird_shrike1»): le texture si applicano qui, le ali battono muovendo le ossa
export async function vesteAverla(root, dir) {
  const tl = new THREE.TextureLoader(); const [map, nm] = await Promise.all([tl.loadAsync(dir + 'averla_colore.webp'), tl.loadAsync(dir + 'averla_normale.webp')]);
  map.flipY = false; nm.flipY = false; map.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map, normalMap: nm, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  root.traverse((o) => { if (o.isMesh) o.material = mat; });
  const B = ossa(root); root.userData.ali = [B.WingL, B.WingR, B.Wing001L, B.Wing001R].map((b) => b && { b, y: b.rotation.y });
}
export function alaAverla(root, t) {
  const a = root.userData.ali; if (!a) return; const f = Math.sin(t * 7.5), g = Math.sin(t * 7.5 - 0.6);
  if (a[0]) a[0].b.rotation.y = a[0].y + 0.75 * f; if (a[1]) a[1].b.rotation.y = a[1].y - 0.75 * f;
  if (a[2]) a[2].b.rotation.y = a[2].y + 0.35 * g; if (a[3]) a[3].b.rotation.y = a[3].y - 0.35 * g;
}
