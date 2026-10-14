/* 主程式：渲染器、bloom 後處理、相機、輸入、UI 綁定、主循環 */
import * as THREE from 'three';
import { EffectComposer } from '../libs/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../libs/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../libs/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../libs/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from '../libs/addons/shaders/GammaCorrectionShader.js';
import { createWorld } from './world.js';
import { createSky } from './sky.js';
import { createCharacter } from './character.js';
import { createEnvironment } from './environment.js';

const app = document.getElementById('app');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e){
  document.querySelector('#loading .box').textContent = '⚠ 此瀏覽器不支援 WebGL';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 30000);

const world = createWorld(scene);
const sky = createSky(scene);
const player = createCharacter(scene);

/* 手機 / 平板自動降載：粒子減量、陰影降解析度、關閉 bloom */
const isLowEnd = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '') ||
  (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const env = createEnvironment(scene, { world, sky, quality: isLowEnd ? 'low' : 'high' });

/* 後處理：場景 → 泛光（霓虹/招牌夜間光暈）→ sRGB 輸出 */
let composer = null;
if (!isLowEnd){
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GammaCorrectionShader));
}

/* 玩家初始位置：經典機位（店正面 + 背後富士山） */
player.state.pos.copy(world.classic.pos);
player.state.yaw = 0;
env.follow.copy(world.classic.pos).setY(1.4);

/* ---------- 相機軌道 ---------- */
let camYaw = world.classic.yaw, camPitch = world.classic.pitch, camDist = world.classic.dist;
const camTarget = new THREE.Vector3().copy(player.state.pos).setY(1.42);
const camPos = new THREE.Vector3();
{
  const cp = Math.cos(camPitch);
  camPos.set(
    camTarget.x + Math.sin(camYaw) * cp * camDist,
    camTarget.y + Math.sin(camPitch) * camDist,
    camTarget.z + Math.cos(camYaw) * cp * camDist
  );
}

/* ---------- 輸入 ---------- */
const input = { f: false, b: false, l: false, r: false, run: false, jump: false, yaw: 0 };
const KEYMAP = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
  ShiftLeft: 'run', ShiftRight: 'run'
};
window.addEventListener('keydown', (e) => {
  const m = KEYMAP[e.code];
  if (m){ input[m] = true; e.preventDefault(); }
  if (e.code === 'Space'){ input.jump = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  const m = KEYMAP[e.code];
  if (m) input[m] = false;
});

let dragging = false, lastX = 0, lastY = 0;
const dom = renderer.domElement;
dom.addEventListener('pointerdown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  dom.setPointerCapture(e.pointerId);
});
dom.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.0056;
  camPitch += (e.clientY - lastY) * 0.0045;
  camPitch = Math.max(-0.45, Math.min(1.25, camPitch));
  lastX = e.clientX; lastY = e.clientY;
});
dom.addEventListener('pointerup', () => { dragging = false; });
dom.addEventListener('wheel', (e) => {
  camDist = Math.max(2.2, Math.min(16, camDist * (1 + e.deltaY * 0.001)));
  e.preventDefault();
}, { passive: false });

/* ---------- UI ---------- */
const $ = (id) => document.getElementById(id);
const clockEl = $('clock'), slider = $('timeSlider');
let sliderHeld = false;

function fmtTime(h){
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
env.onTime((h) => {
  clockEl.textContent = fmtTime(h);
  if (!sliderHeld) slider.value = h;
});
slider.addEventListener('pointerdown', () => { sliderHeld = true; });
window.addEventListener('pointerup', () => { sliderHeld = false; });
slider.addEventListener('input', () => {
  if (autoTime.checked){ autoTime.checked = false; env.state.auto = false; }
  env.setTime(parseFloat(slider.value));
  clockEl.textContent = fmtTime(parseFloat(slider.value));
});
const autoTime = $('autoTime');
autoTime.addEventListener('change', () => { env.state.auto = autoTime.checked; });
document.querySelectorAll('.timePreset').forEach((b) => {
  b.addEventListener('click', () => {
    env.setTime(parseFloat(b.dataset.t));
    b.blur();
  });
});
document.querySelectorAll('.wx').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.wx').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    env.setWeather(b.dataset.w);
    b.blur();
  });
});
$('classicBtn').addEventListener('click', (e) => {
  player.state.pos.copy(world.classic.pos);
  player.state.vy = 0;
  camYaw = world.classic.yaw; camPitch = world.classic.pitch; camDist = world.classic.dist;
  e.target.blur();
});
$('resetBtn').addEventListener('click', (e) => {
  player.state.pos.copy(world.spawn);
  player.state.vy = 0;
  camYaw = 0; camPitch = 0.3; camDist = 5.5;
  e.target.blur();
});
$('collapseBtn').addEventListener('click', () => {
  $('panel').classList.toggle('collapsed');
  $('collapseBtn').textContent = $('panel').classList.contains('collapsed') ? '☰' : '—';
});

/* ---------- 視窗縮放 ---------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- 主循環 ---------- */
const clock = new THREE.Clock();
const desired = new THREE.Vector3();
let frames = 0;

function loop(){
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  input.yaw = camYaw;
  player.update(dt, input, world.colliders, world.groundHeightAt);

  desired.copy(player.state.pos);
  desired.y += 1.42;
  camTarget.lerp(desired, 1 - Math.exp(-dt * 12));
  env.follow.copy(camTarget);

  env.update(dt);

  const cp = Math.cos(camPitch);
  desired.set(
    camTarget.x + Math.sin(camYaw) * cp * camDist,
    Math.max(camTarget.y + Math.sin(camPitch) * camDist, 0.3),
    camTarget.z + Math.cos(camYaw) * cp * camDist
  );
  camPos.lerp(desired, 1 - Math.exp(-dt * 14));
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  sky.update(dt, camera.position);
  if (composer) composer.render();
  else renderer.render(scene, camera);

  if (++frames === 3) $('loading').classList.add('hide');
}
loop();
