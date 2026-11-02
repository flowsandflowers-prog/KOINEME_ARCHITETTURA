---
name: threejs-interaction
description: "Three.js interaction and raycasting rules: one shared reusable Raycaster, pointer events (pointermove/pointerdown) instead of mouse events for touch compatibility, and a dedicated objectsToIntersect array instead of raycasting the whole scene. Use when 3D elements must react to hover, click, drag or touch."
---

# Three.js Interaction & Raycasting Skill

## Quando usare questa skill
Usa queste linee guida quando l'utente richiede che gli elementi 3D reagiscano al passaggio del mouse (hover), al clic, al drag o a eventi touch.

## Regole Tassative
1. **Raycaster Centralizzato:** Non creare un nuovo `THREE.Raycaster()` a ogni movimento del mouse. Usa un unico oggetto globale riutilizzabile.
2. **Pointer Events:** Usa sempre `pointermove` e `pointerdown` invece dei vecchi eventi `mousemove` e `mousedown` per garantire la compatibilità nativa con i dispositivi mobile e touch.
3. **Ottimizzazione del Raycast:** Se la scena contiene migliaia di oggetti, non passare l'intera scena a `raycaster.intersectObjects(scene.children)`. Crea un array specifico chiamato `objectsToIntersect` contenente solo le mesh cliccabili.
