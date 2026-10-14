/* 天空：漸層天幕、太陽光暈、月亮、星星、雲層 */
import * as THREE from 'three';
import { TAU, rand, makeCanvasTexture, cloudTexture, glowTexture } from './util.js';

function createSky(scene){
  const u = {
    uTop:  { value: new THREE.Color(0x3d7cd6) },
    uHor:  { value: new THREE.Color(0xcfe3f2) },
    uSunCol: { value: new THREE.Color(0xfff2df) },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5) },
    uSunI: { value: 1 },
    uFlash:{ value: 0 }
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uSunCol;
      uniform vec3 uSunDir;
      uniform float uSunI, uFlash;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = mix(uHor, uTop, pow(max(d.y, 0.0), 0.6));
        if (d.y < 0.0) col = uHor * 0.92;
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunCol * pow(sd, 180.0) * 0.9 * uSunI;    /* 近暈 */
        col += uSunCol * pow(sd, 7.0) * 0.16 * uSunI;     /* 遠暈 */
        col += uSunCol * smoothstep(0.99966, 0.99985, sd) * 1.7 * uSunI;  /* 日盤 */
        col = mix(col, vec3(1.0), uFlash * 0.6);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
  const anchor = new THREE.Group();   // 跟隨相機
  scene.add(anchor);
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(8500, 32, 20), skyMat);
  skyMesh.renderOrder = -10;
  skyMesh.frustumCulled = false;
  anchor.add(skyMesh);

  /* 星星 */
  {
    const N = 900;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++){
      const th = Math.random() * TAU;
      const ph = Math.acos(rand(0.02, 1));
      const r = 8300;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var starsMat = new THREE.PointsMaterial({
      size: 2, sizeAttenuation: false, color: 0xdfe8ff,
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false
    });
    const stars = new THREE.Points(g, starsMat);
    stars.renderOrder = -9;
    stars.frustumCulled = false;
    anchor.add(stars);
  }

  /* 月亮 */
  const moonTex = makeCanvasTexture(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.82, 'rgba(245,242,232,1)');
    r.addColorStop(1, 'rgba(245,242,232,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(190,190,185,0.5)';
    [[52, 46, 9], [76, 70, 12], [46, 80, 7], [82, 40, 6]].forEach(([x, y, rr]) => {
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    });
  });
  const moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: moonTex, transparent: true, opacity: 0, depthWrite: false, fog: false
  }));
  moonSpr.scale.set(340, 340, 1);
  moonSpr.renderOrder = -8;
  anchor.add(moonSpr);
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xcdd8f0, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  moonHalo.scale.set(760, 760, 1);
  moonHalo.renderOrder = -8;
  anchor.add(moonHalo);

  /* 雲（世界座標，兩組：平常雲 / 風暴雲） */
  const cloudTex = cloudTexture();
  function cloudGroup(n, yMin, yMax, rMin, rMax, sMin, sMax, color){
    const mat = new THREE.SpriteMaterial({
      map: cloudTex, transparent: true, opacity: 0,
      color, depthWrite: false
    });
    const list = [];
    for (let i = 0; i < n; i++){
      const spr = new THREE.Sprite(mat);
      const r = rand(rMin, rMax), ang = Math.random() * TAU;
      spr.userData = { r, ang, sp: rand(0.0015, 0.005) * (Math.random() > 0.5 ? 1 : -1), y: rand(yMin, yMax) };
      const sx = rand(sMin, sMax);
      spr.scale.set(sx, sx * 0.42, 1);
      scene.add(spr);
      list.push(spr);
    }
    return { mat, list };
  }
  const baseClouds = cloudGroup(8, 300, 520, 500, 2700, 300, 620, 0xffffff);
  const stormClouds = cloudGroup(18, 210, 360, 300, 2400, 420, 900, 0x59606c);

  const api = {
    u, starsMat,
    celestial: { sunDir: new THREE.Vector3(0, 1, 0), moonDir: new THREE.Vector3(0, -1, 0) },
    vis: { starOp: 0, moonOp: 0 },
    update(dt, camPos){
      anchor.position.copy(camPos);
      // 月亮
      const md = api.celestial.moonDir;
      moonSpr.position.copy(md).multiplyScalar(7600);
      moonHalo.position.copy(moonSpr.position);
      const mo = api.vis.moonOp;
      moonSpr.material.opacity = mo;
      moonHalo.material.opacity = mo * 0.45;
      moonSpr.visible = moonHalo.visible = mo > 0.02 && md.y > -0.05;
      starsMat.opacity = api.vis.starOp;
      starsMat.visible = api.vis.starOp > 0.02;
      // 雲飄移
      for (const grp of [baseClouds, stormClouds]){
        for (const c of grp.list){
          c.userData.ang += c.userData.sp * dt;
          c.position.set(
            Math.cos(c.userData.ang) * c.userData.r,
            c.userData.y,
            Math.sin(c.userData.ang) * c.userData.r
          );
        }
      }
    },
    setClouds(baseOp, baseCol, stormOp, stormCol){
      baseClouds.mat.opacity = baseOp;
      baseClouds.mat.color.copy(baseCol);
      stormClouds.mat.opacity = stormOp;
      stormClouds.mat.color.copy(stormCol);
    }
  };
  return api;
}

export { createSky };
