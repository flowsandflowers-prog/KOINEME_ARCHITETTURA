// Studi del plastico della casa: quattro viste fisse. ?vista=assonometria | sezione | pianta | ingresso
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { costruisciCasa, Y } from '../plastico.js';

const VISTA = new URLSearchParams(location.search).get('vista') || 'assonometria';
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x141416);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3836, 1.1));
const sole = new THREE.DirectionalLight(0xfff6ea, 2.4); sole.position.set(-38, 62, 30); sole.castShadow = true;
sole.shadow.mapSize.set(4096, 4096); Object.assign(sole.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 200 }); sole.shadow.bias = -0.0004; sole.shadow.normalBias = 0.03; sole.shadow.radius = 3;
scene.add(sole);
const W = costruisciCasa(scene);
const caldo = new THREE.PointLight(0xffb877, 60, 14, 2); caldo.position.set(0, Y.primo + 3, 0); scene.add(caldo);

const w = () => canvas.clientWidth, h = () => canvas.clientHeight;
let camera;
const orto = (vis) => { const a = w() / h(); const c = new THREE.OrthographicCamera(-vis * a / 2, vis * a / 2, vis / 2, -vis / 2, 0.1, 500); return c; };
if (VISTA === 'assonometria') { camera = orto(44); camera.position.set(-70 - 14, 62, 70); camera.lookAt(-14, 1, 0); }
else if (VISTA === 'sezione') { // tagliata a metà: si vedono tutti i livelli
  renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.6)];
  camera = orto(30); camera.position.set(-2, 10, 80); camera.lookAt(-12, 2, 0); }
else if (VISTA === 'pianta') { // tagliata sopra il piano primo, vista dall'alto
  renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), Y.primo + 2.2)]; renderer.shadowMap.enabled = false;
  camera = orto(30); camera.up.set(0, 0, -1); camera.position.set(-15, 100, 0); camera.lookAt(-15, 0, 0); }
else { // l'ingresso: sul passaggio, a quota d'occhi, verso la Soglia e la casa
  camera = new THREE.PerspectiveCamera(46, w() / h(), 0.1, 500); camera.position.set(-41, Y.primo + 1.65, -2.2); camera.lookAt(-9, Y.primo + 2.2, -3.25); }
renderer.setSize(w(), h(), false);
if (camera.isPerspectiveCamera) { camera.aspect = w() / h(); camera.updateProjectionMatrix(); }
const controls = new OrbitControls(camera, canvas); controls.target.copy(new THREE.Vector3(-14, 1, 0)); if (VISTA !== 'assonometria') controls.enabled = false;
renderer.setAnimationLoop(() => { if (controls.enabled) controls.update(); renderer.render(scene, camera); });
