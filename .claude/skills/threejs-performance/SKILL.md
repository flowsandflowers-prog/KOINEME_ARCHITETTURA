---
name: threejs-performance
description: "Three.js performance and optimization rules for 60fps: dispose geometries/materials/textures, InstancedMesh for many identical objects, light budget (DirectionalLight with low-res shadow maps or baked textures instead of many Point/Spot lights with shadows), no allocations inside the requestAnimationFrame loop. Use whenever creating, modifying or refactoring Three.js scenes, meshes, materials or animation loops."
---

# Three.js Performance & Optimization Skill

## Quando usare questa skill
Usa queste linee guida ogni volta che crei, modifichi o fai il refactoring di scene, mesh, materiali e loop di animazione in Three.js per garantire i 60fps.

## Regole Tassative
1. **Memory Management (Dispose):** Ogni volta che rimuovi un oggetto dalla scena, esegui sempre il `.dispose()` su geometrie e materiali, e rimuovi le texture dalla memoria per prevenire memory leak.
2. **Instanced Mesh:** Se l'utente chiede di generare molti oggetti identici (es: alberi, particelle solide, cubi), non usare un ciclo per creare mille `new THREE.Mesh()`. Usa tassativamente `THREE.InstancedMesh`.
3. **Ottimizzazione Luci:** Evita l'uso massiccio di `PointLight` o `SpotLight` con ombre attive. Prediligi `DirectionalLight` con mappe d'ombra a bassa risoluzione ben calibrate o texture pre-renderizzate (Baking).
4. **Animate Loop:** Nel loop `requestAnimationFrame`, non istanziare MAI nuovi vettori o oggetti (es: no `new THREE.Vector3()` dentro la funzione di animazione). Dichiara le variabili fuori dal loop e riutilizzale.
