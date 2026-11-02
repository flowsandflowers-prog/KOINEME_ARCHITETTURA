import { Raycaster, Vector2 } from 'three';

// Hover e clic sugli oggetti 3D (skill threejs-interaction):
// - un solo Raycaster, creato qui una volta e riusato;
// - solo eventi pointer, così mouse, penna e dito funzionano allo stesso modo;
// - il raggio interroga solo l'array objectsToIntersect, mai l'intera scena.
//
// Negli oggetti dell'array:
//   userData.pick  = qualunque valore → l'oggetto si può toccare
//   userData.block = true             → ferma il raggio (un pavimento davanti a ciò che sta sotto)
//
// update() va chiamata una volta per fotogramma: fa al massimo un raycast,
// e non alloca nulla (il vettore e l'array dei risultati sono riusati).

export function createPicker(dom, camera, objectsToIntersect, { onHover, onClick, dragTolerance = 6 } = {}) {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hits = [];
  let inside = false, enabled = true, current = null;
  let downX = 0, downY = 0, downT = 0, downId = -1;

  function setNdc(e) {
    const r = dom.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function pick() {
    hits.length = 0;
    // il raycaster può essere condiviso con altri usi (es. occlusione dei nomi): ripristinare la portata
    raycaster.near = 0; raycaster.far = Infinity;
    raycaster.setFromCamera(ndc, camera);
    raycaster.intersectObjects(objectsToIntersect, false, hits);
    for (let i = 0; i < hits.length; i++) {
      const o = hits[i].object;
      if (o.userData.block) return null;
      if (o.userData.pick !== undefined) return o;
    }
    return null;
  }
  function setHover(o) {
    if (o === current) return;
    current = o;
    dom.style.cursor = o ? 'pointer' : '';
    if (onHover) onHover(o);
  }

  // il dito non ha "passaggio sopra": per il touch conta solo il tocco
  const onMove = (e) => { if (e.pointerType === 'touch') return; setNdc(e); inside = true; };
  const onDown = (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); downId = e.pointerId; };
  const onUp = (e) => {
    if (!enabled || e.pointerId !== downId) return;
    downId = -1;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > dragTolerance || performance.now() - downT > 600) return; // era un trascinamento
    setNdc(e);
    const o = pick();
    if (o && onClick) onClick(o, e);
  };
  const onLeave = () => { inside = false; setHover(null); };

  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointerleave', onLeave);

  return {
    raycaster,
    get hovered() { return current; },
    update() { if (enabled && inside) setHover(pick()); },
    setEnabled(v) { enabled = v; if (!v) setHover(null); },
    dispose() {
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointerleave', onLeave);
      setHover(null);
      hits.length = 0;
    },
  };
}
