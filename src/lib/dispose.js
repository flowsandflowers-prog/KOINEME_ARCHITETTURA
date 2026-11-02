// Liberare la memoria della GPU quando un oggetto esce dalla scena
// (skill threejs-performance, regola 1). Ogni geometria, materiale e texture
// viene liberata una volta sola anche se è condivisa da più mesh.

function disposeTextures(holder, seen) {
  for (const key in holder) {
    const v = holder[key];
    if (v && v.isTexture && !seen.has(v)) { seen.add(v); v.dispose(); }
  }
}

export function disposeObject(root, { textures = true } = {}) {
  const geos = new Set(), mats = new Set(), texs = new Set();
  root.traverse((o) => {
    if (o.geometry && !geos.has(o.geometry)) { geos.add(o.geometry); o.geometry.dispose(); }
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) {
      if (mats.has(m)) continue;
      mats.add(m);
      if (textures) {
        disposeTextures(m, texs);
        if (m.uniforms) for (const k in m.uniforms) {
          const v = m.uniforms[k] && m.uniforms[k].value;
          if (v && v.isTexture && !texs.has(v)) { texs.add(v); v.dispose(); }
        }
      }
      m.dispose();
    }
    if (o.isInstancedMesh) o.dispose();
    if (o.shadow && o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
  });
}

// Togliere dalla scena e liberare, sempre insieme
export function removeAndDispose(obj, opts) {
  if (obj.parent) obj.parent.remove(obj);
  disposeObject(obj, opts);
}
