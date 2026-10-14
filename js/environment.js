/* 環境系統：晝夜光照、天氣、雨雪花瓣粒子、閃電 */
import * as THREE from 'three';
import { TAU, clamp, lerp, smoothstep, rand, makeCanvasTexture, softDotTexture } from './util.js';

const WEATHERS = {
  clear:  { sunDim: 1.00, fogNear: 60,  fogFar: 6000, gray: 0.00, rain: 0, snow: 0, wet: 0.00, gSnow: 0, cloudA: 0.55, stormA: 0.00, thunder: 0, petals: 0 },
  cloudy: { sunDim: 0.55, fogNear: 40,  fogFar: 2800, gray: 0.50, rain: 0, snow: 0, wet: 0.10, gSnow: 0, cloudA: 1.00, stormA: 0.35, thunder: 0, petals: 0 },
  rain:   { sunDim: 0.34, fogNear: 20,  fogFar: 1500, gray: 0.72, rain: 1, snow: 0, wet: 1.00, gSnow: 0, cloudA: 0.90, stormA: 0.85, thunder: 0, petals: 0 },
  storm:  { sunDim: 0.22, fogNear: 15,  fogFar: 1000, gray: 0.85, rain: 1, snow: 0, wet: 1.00, gSnow: 0, cloudA: 0.80, stormA: 1.00, thunder: 1, petals: 0 },
  snow:   { sunDim: 0.55, fogNear: 15,  fogFar: 1100, gray: 0.55, rain: 0, snow: 1, wet: 0.25, gSnow: 1, cloudA: 0.90, stormA: 0.55, thunder: 0, petals: 0 },
  fog:    { sunDim: 0.62, fogNear: 6,   fogFar: 430,  gray: 0.42, rain: 0, snow: 0, wet: 0.35, gSnow: 0, cloudA: 0.70, stormA: 0.15, thunder: 0, petals: 0 },
  sakura: { sunDim: 1.00, fogNear: 60,  fogFar: 5200, gray: 0.00, rain: 0, snow: 0, wet: 0.00, gSnow: 0, cloudA: 0.60, stormA: 0.00, thunder: 0, petals: 1 }
};

function createEnvironment(scene, refs){
  const { world, sky } = refs;
  const low = refs.quality === 'low';
  const state = { time: 17.8, weather: 'clear', auto: false, speed: 24 / 300 };  // 5 分鐘 = 一天
  const P = Object.assign({}, WEATHERS.clear);
  let onTimeCb = null;

  scene.fog = new THREE.Fog(0xcfe3f2, 60, 5200);

  /* 燈光 */
  const hemi = new THREE.HemisphereLight(0xbfd7f0, 0x59544a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  const shadowRes = low ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowRes, shadowRes);
  const sc = sun.shadow.camera;
  sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 20; sc.far = 560;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  /* ============ 雨（線段雨絲） ============ */
  const RAIN_N = low ? 700 : 1300;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_N * 6);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage));
  const rainMat = new THREE.LineBasicMaterial({ color: 0x9db8cf, transparent: true, opacity: 0, depthWrite: false });
  const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
  rainMesh.frustumCulled = false;
  rainMesh.visible = false;
  scene.add(rainMesh);
  const rainDrops = [];
  for (let i = 0; i < RAIN_N; i++){
    rainDrops.push({ x: rand(-35, 35), y: rand(0, 30), z: rand(-35, 35), v: rand(16, 25) });
  }
  function updateRain(dt, amount, cx, cz){
    if (amount < 0.02){ rainMesh.visible = false; return; }
    rainMesh.visible = true;
    rainMat.opacity = amount * 0.38;
    const windX = 1.6;
    for (let i = 0; i < RAIN_N; i++){
      const d = rainDrops[i];
      d.y -= d.v * dt;
      d.x += windX * dt;
      if (d.y < 0){ d.y = rand(22, 32); d.x = cx + rand(-35, 35); d.z = cz + rand(-35, 35); }
      if (d.x - cx > 35) d.x -= 70; else if (d.x - cx < -35) d.x += 70;
      if (d.z - cz > 35) d.z -= 70; else if (d.z - cz < -35) d.z += 70;
      const o = i * 6;
      const L = 0.35 + d.v * 0.014;
      rainPos[o] = d.x; rainPos[o + 1] = d.y; rainPos[o + 2] = d.z;
      rainPos[o + 3] = d.x - windX * 0.045; rainPos[o + 4] = d.y - L; rainPos[o + 5] = d.z;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  /* ============ 雪（點粒子） ============ */
  const SNOW_N = low ? 500 : 900;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(SNOW_N * 3);
  const snowSeeds = new Float32Array(SNOW_N);
  for (let i = 0; i < SNOW_N; i++){
    snowPos[i * 3] = rand(-35, 35);
    snowPos[i * 3 + 1] = rand(0, 26);
    snowPos[i * 3 + 2] = rand(-35, 35);
    snowSeeds[i] = Math.random();
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3).setUsage(THREE.DynamicDrawUsage));
  const snowMat = new THREE.PointsMaterial({
    size: 0.28, map: softDotTexture(), transparent: true, opacity: 0,
    depthWrite: false, sizeAttenuation: true
  });
  const snowMesh = new THREE.Points(snowGeo, snowMat);
  snowMesh.frustumCulled = false;
  snowMesh.visible = false;
  scene.add(snowMesh);
  let snowTime = 0;
  function updateSnow(dt, amount, cx, cz){
    if (amount < 0.02){ snowMesh.visible = false; return; }
    snowMesh.visible = true;
    snowMat.opacity = amount * 0.95;
    snowTime += dt;
    for (let i = 0; i < SNOW_N; i++){
      const sd = snowSeeds[i];
      const o = i * 3;
      snowPos[o + 1] -= (1.0 + sd * 1.5) * dt;
      snowPos[o] += Math.sin(snowTime * 0.8 + sd * 40) * dt * 1.4;
      if (snowPos[o + 1] < 0){
        snowPos[o + 1] = rand(20, 28);
        snowPos[o] = cx + rand(-35, 35);
        snowPos[o + 2] = cz + rand(-35, 35);
      }
      if (snowPos[o] - cx > 35) snowPos[o] -= 70; else if (snowPos[o] - cx < -35) snowPos[o] += 70;
      if (snowPos[o + 2] - cz > 35) snowPos[o + 2] -= 70; else if (snowPos[o + 2] - cz < -35) snowPos[o + 2] += 70;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  /* ============ 櫻花花瓣 ============ */
  const PET_N = low ? 300 : 600;
  const petalGeo = new THREE.BufferGeometry();
  const petalPos = new Float32Array(PET_N * 3);
  const petalSeeds = new Float32Array(PET_N);
  for (let i = 0; i < PET_N; i++){
    petalPos[i * 3] = rand(-35, 35);
    petalPos[i * 3 + 1] = rand(0, 24);
    petalPos[i * 3 + 2] = rand(-35, 35);
    petalSeeds[i] = Math.random();
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3).setUsage(THREE.DynamicDrawUsage));
  const petalMat = new THREE.PointsMaterial({
    size: 0.36, color: 0xffa8c6,
    map: makeCanvasTexture(64, 64, (g) => {
      g.translate(32, 32);
      g.rotate(0.6);
      const gr = g.createRadialGradient(0, 0, 2, 0, 0, 26);
      gr.addColorStop(0, '#ffe6f0');
      gr.addColorStop(0.55, '#ffb7d5');
      gr.addColorStop(1, 'rgba(255,155,195,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(0, 0, 26, 15, 0, 0, TAU);
      g.fill();
    }),
    transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true
  });
  const petalMesh = new THREE.Points(petalGeo, petalMat);
  petalMesh.frustumCulled = false;
  petalMesh.visible = false;
  scene.add(petalMesh);
  let petalTime = 0;
  function updatePetals(dt, amount, cx, cz){
    if (amount < 0.02){ petalMesh.visible = false; return; }
    petalMesh.visible = true;
    petalMat.opacity = amount * 0.95;
    petalTime += dt;
    for (let i = 0; i < PET_N; i++){
      const sd = petalSeeds[i];
      const o = i * 3;
      petalPos[o + 1] -= (0.9 + sd * 1.2) * dt;
      petalPos[o] += (Math.sin(petalTime * 0.9 + sd * 50) * 1.5 + 0.8) * dt;
      petalPos[o + 2] += Math.cos(petalTime * 0.7 + sd * 30) * dt * 0.9;
      if (petalPos[o + 1] < 0){
        petalPos[o + 1] = rand(18, 26);
        petalPos[o] = cx + rand(-35, 35);
        petalPos[o + 2] = cz + rand(-35, 35);
      }
      if (petalPos[o] - cx > 35) petalPos[o] -= 70; else if (petalPos[o] - cx < -35) petalPos[o] += 70;
      if (petalPos[o + 2] - cz > 35) petalPos[o + 2] -= 70; else if (petalPos[o + 2] - cz < -35) petalPos[o + 2] += 70;
    }
    petalGeo.attributes.position.needsUpdate = true;
  }

  /* ============ 調色盤 ============ */
  const C = {
    dayTop: new THREE.Color(0x3d7cd6), nightTop: new THREE.Color(0x070b18), goldTop: new THREE.Color(0x5a5f8f),
    dayHor: new THREE.Color(0xcfe3f2), nightHor: new THREE.Color(0x141d33), goldHor: new THREE.Color(0xe8a8bc),
    grayDayTop: new THREE.Color(0x8e99a4), grayNightTop: new THREE.Color(0x232830),
    grayDayHor: new THREE.Color(0xaab3bc), grayNightHor: new THREE.Color(0x2a2f38),
    sunHigh: new THREE.Color(0xfff2df), sunLow: new THREE.Color(0xff9d78),
    moonCol: new THREE.Color(0x8fa3d6),
    fujiSnowDay: new THREE.Color(0xffffff), fujiSnowGold: new THREE.Color(0xf2c8d8), fujiSnowNight: new THREE.Color(0x2c3752),
    fujiBodyDay: new THREE.Color(0x5d7484), fujiBodyGold: new THREE.Color(0x66587a), fujiBodyNight: new THREE.Color(0x101a2e),
    cloudDay: new THREE.Color(0xffffff), cloudGold: new THREE.Color(0xf0c0d0), cloudNight: new THREE.Color(0x39445c),
    stormDay: new THREE.Color(0x59606c), stormNight: new THREE.Color(0x1a1f2a),
    groundDay: new THREE.Color(0x59544a), groundNight: new THREE.Color(0x0d1016),
    white: new THREE.Color(0xffffff), roadSnow: new THREE.Color(0x828a90)
  };
  const tmp = new THREE.Color(), tmp2 = new THREE.Color(), topCol = new THREE.Color(), horCol = new THREE.Color(), sunColC = new THREE.Color();
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
  const follow = new THREE.Vector3(0, 1.4, 25);
  let flash = 0, nextBolt = 6;

  function update(dt){
    if (state.auto){
      state.time = (state.time + dt * state.speed) % 24;
      if (onTimeCb) onTimeCb(state.time, false);
    }

    /* 天氣參數漸變 */
    const T = WEATHERS[state.weather];
    const k = 1 - Math.exp(-dt * 1.5);
    for (const key in P) P[key] = lerp(P[key], T[key], k);

    /* 太陽 / 月亮方位 */
    const th = Math.PI * (state.time - 6) / 12;
    const elev = Math.sin((state.time - 6) / 12 * Math.PI) * 1.12;
    const ce = Math.cos(elev);
    sunDir.set(Math.cos(th) * ce, Math.sin(elev), Math.sin(th) * ce).normalize();
    const em = -elev * 0.85;
    moonDir.set(Math.cos(th + Math.PI) * Math.cos(em), Math.sin(em), Math.sin(th + Math.PI) * Math.cos(em)).normalize();

    const sunH = sunDir.y;
    const day = smoothstep(-0.07, 0.24, sunH);
    const night = 1 - day;
    const golden = Math.max(0, 1 - Math.abs(sunH - 0.05) / 0.17) * smoothstep(-0.1, 0.0, sunH);

    /* 主光（白天太陽 / 夜晚月亮，共用投影） */
    const sunI = day * 2.9 * P.sunDim;
    const moonI = night * 0.55 * (1 - P.gray * 0.55) * (1 - P.rain * 0.3);
    sunColC.copy(C.sunLow).lerp(C.sunHigh, clamp(sunH * 2.4, 0, 1));
    if (sunI >= moonI){
      sun.color.copy(sunColC);
      sun.intensity = sunI;
      sun.position.copy(follow).addScaledVector(sunDir, 260);
    } else {
      sun.color.copy(C.moonCol);
      sun.intensity = moonI;
      sun.position.copy(follow).addScaledVector(moonDir, 260);
    }
    sun.target.position.copy(follow);

    /* 天空與霧顏色 */
    topCol.copy(C.nightTop).lerp(C.dayTop, day).lerp(C.goldTop, golden * 0.55);
    horCol.copy(C.nightHor).lerp(C.dayHor, day).lerp(C.goldHor, golden * 0.75);
    tmp.copy(C.grayNightTop).lerp(C.grayDayTop, day); topCol.lerp(tmp, P.gray * 0.8);
    tmp.copy(C.grayNightHor).lerp(C.grayDayHor, day); horCol.lerp(tmp, P.gray * 0.82);
    scene.fog.color.copy(horCol);
    scene.fog.near = P.fogNear;
    scene.fog.far = P.fogFar;

    sky.u.uTop.value.copy(topCol);
    sky.u.uHor.value.copy(horCol);
    sky.u.uSunCol.value.copy(sunColC);
    sky.u.uSunDir.value.copy(sunDir);
    sky.u.uSunI.value = (0.22 + day) * P.sunDim;

    sky.celestial.sunDir.copy(sunDir);
    sky.celestial.moonDir.copy(moonDir);
    sky.vis.starOp = night * (1 - P.gray * 0.85);
    sky.vis.moonOp = night * (1 - P.gray * 0.8);

    tmp.copy(C.stormNight).lerp(C.stormDay, day);
    tmp2.copy(C.cloudNight).lerp(C.cloudDay, day).lerp(C.cloudGold, golden * 0.6);
    sky.setClouds(P.cloudA * 0.9, tmp2, P.stormA * 0.95, tmp);

    /* 半球環境光 */
    hemi.color.copy(topCol).lerp(horCol, 0.5);
    hemi.groundColor.copy(C.groundNight).lerp(C.groundDay, day);

    /* 閃電 */
    if (P.thunder > 0.5){
      nextBolt -= dt;
      if (nextBolt <= 0){ flash = rand(0.8, 1.4); nextBolt = rand(2.5, 8); }
    }
    flash = Math.max(0, flash - dt * 3.2);
    sky.u.uFlash.value = Math.min(flash, 1) * 0.7;
    hemi.intensity = (0.25 + 1.05 * day) * (0.45 + 0.55 * P.sunDim) + flash * 1.5;

    /* 富士山顏色（白天蒼藍 / 朝昏染紅 / 夜晚深藍） */
    const FU = world.fujiUniforms;
    if (FU){
      FU.uSnow.value.copy(C.fujiSnowNight).lerp(C.fujiSnowDay, day).lerp(C.fujiSnowGold, golden * 0.85).lerp(horCol, P.gray * 0.35);
      FU.uBody.value.copy(C.fujiBodyNight).lerp(C.fujiBodyDay, day).lerp(C.fujiBodyGold, golden * 0.6).lerp(horCol, P.gray * 0.4);
      FU.uHaze.value.copy(horCol);
      FU.uHazeK.value = clamp(1.35 - P.fogFar / 5200, 0.28, 0.94);
      FU.uSunDir.value.copy(sunI >= moonI ? sunDir : moonDir);
    }

    /* 燈火（黃昏華燈初上 / 夜晚 / 暴雨白天也會亮） */
    const lampF = clamp(Math.max(smoothstep(0.42, 0.8, night), golden * 0.55, P.rain * P.gray * 0.5), 0, 1);
    for (const l of world.glow.lampLights) l.intensity = lampF * l.userData.base;
    if (world.glow.lampBulbMat) world.glow.lampBulbMat.emissiveIntensity = 0.05 + lampF * 2.4;
    for (const s of world.glow.lampGlows) s.material.opacity = lampF * 0.8;
    for (const m of world.glow.signMats) m.emissiveIntensity = m.userData.day + lampF * m.userData.night;
    for (const m of world.glow.windowMats) m.emissiveIntensity = 0.02 + lampF * 1.15;

    /* 雨天濕路面 */
    const roadMat = world.roadMat, parkMat = world.parkMat;
    if (roadMat){
      roadMat.roughness = lerp(0.95, 0.28, P.wet);
      tmp.setScalar(1).lerp(C.roadSnow, P.gSnow * 0.5).multiplyScalar(lerp(1, 0.58, P.wet));
      roadMat.color.copy(tmp);
    }
    if (parkMat) parkMat.roughness = lerp(0.95, 0.35, P.wet);

    /* 積雪覆蓋 */
    for (const s of world.snowOverlays) s.material.opacity = P.gSnow * 0.9;

    /* 粒子 */
    updateRain(dt, P.rain, follow.x, follow.z);
    updateSnow(dt, P.snow, follow.x, follow.z);
    updatePetals(dt, P.petals, follow.x, follow.z);
  }

  return {
    state, update, follow, P,
    setWeather(w){ state.weather = w; },
    setTime(h){ state.time = ((h % 24) + 24) % 24; if (onTimeCb) onTimeCb(state.time, true); },
    onTime(cb){ onTimeCb = cb; }
  };
}

export { createEnvironment };
