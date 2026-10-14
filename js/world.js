/* 世界場景：7-Eleven 河口湖站東店、商店街、河口湖、富士山
   佈局（對應實際拍照點）：馬路東西向，店在路北正面朝南，
   停車場在店與馬路之間，富士山從店正後方升起。 */
import * as THREE from 'three';
import { TAU, rand, makeCanvasTexture, mergeGeoms, glowTexture, textTexture } from './util.js';

const FUJI = { x: -350, z: -3700, R: 2200, H: 2600 };

function createWorld(scene){
  const colliders = [];
  const glow = { signMats: [], lampLights: [], lampBulbMat: null, lampGlows: [], windowMats: [] };
  const snowOverlays = [];
  const A = (m, cast, recv) => { m.castShadow = cast !== false; m.receiveShadow = recv !== false; scene.add(m); return m; };
  const addCol = (x1, x2, z1, z2) => colliders.push({ x1, x2, z1, z2 });

  const world = {
    colliders, glow, snowOverlays,
    spawn: new THREE.Vector3(6, 0, 4),
    classic: { pos: new THREE.Vector3(0.6, 0, 7.2), yaw: 0.02, pitch: 0.1, dist: 4.4 },
    groundHeightAt,
    fujiUniforms: null
  };

  /* ================= 地面 ================= */
  const groundTex = makeCanvasTexture(512, 512, (g) => {
    g.fillStyle = '#74805e';
    g.fillRect(0, 0, 512, 512);
    const cols = ['#5c6b4c', '#7d8a63', '#82906c', '#68775a', '#8a9270'];
    for (let i = 0; i < 420; i++){
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.globalAlpha = rand(0.05, 0.15);
      g.beginPath();
      g.arc(Math.random() * 512, Math.random() * 512, rand(8, 46), 0, TAU);
      g.fill();
    }
    g.globalAlpha = 0.1;
    for (let i = 0; i < 1700; i++){
      g.fillStyle = Math.random() > 0.5 ? '#4d5c40' : '#8b9470';
      g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    g.globalAlpha = 1;
  });
  groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(16, 16);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  A(ground, false, true);

  const snowMatGround = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false });
  const snowGround = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), snowMatGround);
  snowGround.rotation.x = -Math.PI / 2;
  snowGround.position.y = 0.008;
  snowGround.receiveShadow = true;
  scene.add(snowGround);
  snowOverlays.push(snowGround);

  /* ================= 馬路（東西向） ================= */
  const roadTex = makeCanvasTexture(512, 256, (g) => {
    g.fillStyle = '#34373c';
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 900; i++){
      g.fillStyle = Math.random() > 0.5 ? '#3d4046' : '#2c2f34';
      g.globalAlpha = rand(0.2, 0.5);
      g.fillRect(Math.random() * 512, Math.random() * 256, rand(1, 3), rand(1, 3));
    }
    /* 車道磨亮的輪跡 */
    g.globalAlpha = 0.06;
    g.fillStyle = '#4a4e55';
    g.fillRect(0, 78, 512, 34);
    g.fillRect(0, 148, 512, 34);
    g.globalAlpha = 1;
    /* 修補痕跡 */
    g.fillStyle = '#3c4046';
    g.globalAlpha = 0.5;
    g.fillRect(300, 60, 70, 26);
    g.fillRect(90, 170, 46, 20);
    g.globalAlpha = 1;
    /* 人孔蓋 */
    g.fillStyle = '#2a2d31';
    g.beginPath(); g.arc(420, 190, 11, 0, TAU); g.fill();
    g.strokeStyle = '#3e4247'; g.lineWidth = 2;
    g.beginPath(); g.arc(420, 190, 8, 0, TAU); g.stroke();
    /* 中央虛線與邊線 */
    g.fillStyle = 'rgba(230,232,235,0.9)';
    for (let x = 0; x < 512; x += 64) g.fillRect(x, 124, 34, 8);
    g.fillStyle = 'rgba(215,218,222,0.85)';
    g.fillRect(0, 14, 512, 6);
    g.fillRect(0, 236, 512, 6);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(12, 1);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  world.roadMat = roadMat;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(244, 12), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.012, 0);
  road.receiveShadow = true;
  scene.add(road);

  const snowMatRoad = new THREE.MeshStandardMaterial({ color: 0xdde4ea, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false });
  const snowRoad = new THREE.Mesh(new THREE.PlaneGeometry(244, 12), snowMatRoad);
  snowRoad.rotation.x = -Math.PI / 2;
  snowRoad.position.set(0, 0.02, 0);
  snowRoad.receiveShadow = true;
  scene.add(snowRoad);
  snowOverlays.push(snowRoad);

  /* 斑馬線（店門口正前方 + 西側） */
  const cwTex = makeCanvasTexture(128, 512, (g) => {
    g.clearRect(0, 0, 128, 512);
    g.fillStyle = 'rgba(235,237,240,0.92)';
    for (let y = 0; y < 512; y += 96) g.fillRect(0, y + 12, 128, 56);
  });
  for (const cx of [-55, 45]){
    const cw = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 11.4),
      new THREE.MeshStandardMaterial({ map: cwTex, transparent: true, roughness: 0.9, depthWrite: false }));
    cw.rotation.x = -Math.PI / 2;
    cw.position.set(cx, 0.026, 0);
    cw.receiveShadow = true;
    scene.add(cw);
  }

  /* ================= 人行道 ================= */
  const walkTex = makeCanvasTexture(256, 256, (g) => {
    g.fillStyle = '#a2a7ab';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(70,75,80,0.4)';
    g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64){
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    for (let i = 0; i < 500; i++){
      g.fillStyle = Math.random() > 0.5 ? '#979ca0' : '#adb2b6';
      g.globalAlpha = 0.4;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.globalAlpha = 1;
  });
  walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
  walkTex.repeat.set(46, 1.2);
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1 });
  for (const sz of [7.65, -7.65]){
    const w = new THREE.Mesh(new THREE.BoxGeometry(244, 0.14, 3.3), walkMat);
    w.position.set(0, 0.07, sz);
    A(w, false, true);
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(244, 3.3),
      new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false }));
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(0, 0.148, sz);
    sw.receiveShadow = true;
    scene.add(sw);
    snowOverlays.push(sw);
  }

  /* ================= 停車場（店前） ================= */
  const parkTex = makeCanvasTexture(256, 512, (g) => {
    g.fillStyle = '#3b3e43';
    g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 700; i++){
      g.fillStyle = Math.random() > 0.5 ? '#43464c' : '#33363b';
      g.globalAlpha = 0.4;
      g.fillRect(Math.random() * 256, Math.random() * 512, rand(1, 3), rand(1, 3));
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(235,237,240,0.8)';   // 斜角停車格線
    g.lineWidth = 4;
    for (let x = 34; x < 256; x += 52){
      g.beginPath();
      g.moveTo(x, 10);
      g.lineTo(x + 62, 502);
      g.stroke();
    }
  });
  const parkMat = new THREE.MeshStandardMaterial({ map: parkTex, roughness: 0.95 });
  world.parkMat = parkMat;
  const parking = new THREE.Mesh(new THREE.PlaneGeometry(17, 7.6), parkMat);
  parking.rotation.x = -Math.PI / 2;
  parking.position.set(0, 0.152, -10.3);
  parking.receiveShadow = true;
  scene.add(parking);

  const snowPark = new THREE.Mesh(new THREE.PlaneGeometry(17, 7.6),
    new THREE.MeshStandardMaterial({ color: 0xe6ebef, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false }));
  snowPark.rotation.x = -Math.PI / 2;
  snowPark.position.set(0, 0.158, -10.3);
  snowPark.receiveShadow = true;
  scene.add(snowPark);
  snowOverlays.push(snowPark);

  /* ================= 7-ELEVEN 河口湖站東店 ================= */
  function draw7Logo(g, x, y, s){
    g.fillStyle = '#f36f21';
    g.fillRect(x, y, 150 * s, 42 * s);
    g.strokeStyle = '#e60012';
    g.lineWidth = 40 * s;
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(x + 148 * s, y + 6 * s);
    g.lineTo(x + 82 * s, y + 120 * s);
    g.stroke();
    g.strokeStyle = '#009342';
    g.lineWidth = 13 * s;
    g.beginPath();
    g.moveTo(x + 160 * s, y + 12 * s);
    g.lineTo(x + 99 * s, y + 118 * s);
    g.stroke();
  }
  const logoTex = makeCanvasTexture(768, 256, (g) => {
    g.fillStyle = '#fbfbf9';
    g.fillRect(0, 0, 768, 256);
    g.strokeStyle = '#d8d8d4';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 762, 250);
    draw7Logo(g, 40, 52, 1.15);
    g.fillStyle = '#009342';
    g.font = '800 italic 100px "Arial Black", Arial, sans-serif';
    g.textBaseline = 'middle';
    g.fillText('ELEVEN', 300, 136);
  });

  /* 三色橫帶（簷板）—— 實景：白底，上下緣各一條細三色線（橘上綠下） */
  const fasciaTex = makeCanvasTexture(2048, 176, (g) => {
    g.fillStyle = '#f8f8f6';
    g.fillRect(0, 0, 2048, 176);
    g.fillStyle = '#f36f21';
    g.fillRect(0, 8, 2048, 14);
    g.fillStyle = '#00a95c';
    g.fillRect(0, 26, 2048, 14);
    g.fillStyle = '#f36f21';
    g.fillRect(0, 136, 2048, 14);
    g.fillStyle = '#00a95c';
    g.fillRect(0, 154, 2048, 14);
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fillRect(0, 170, 2048, 6);
  });
  /* 玻璃櫥窗（門在中央偏右 ~57%） */
  const glassTex = makeCanvasTexture(2048, 512, (g) => {
    g.fillStyle = '#152731';
    g.fillRect(0, 0, 2048, 512);
    g.save();
    g.globalAlpha = 0.055;
    g.fillStyle = '#ffffff';
    for (let i = -2; i < 16; i++){
      g.save();
      g.translate(i * 170, 0);
      g.rotate(-0.35);
      g.fillRect(0, -60, 52, 640);
      g.restore();
    }
    g.restore();
    g.fillStyle = '#0a141a';
    for (let x = 0; x <= 2048; x += 186) g.fillRect(x - 5, 0, 10, 512);
    /* 玻璃門（中央偏右） */
    g.fillStyle = '#cfd8dc';
    g.fillRect(1020, 6, 310, 506);
    g.fillStyle = '#24404e';
    g.fillRect(1032, 18, 136, 494);
    g.fillRect(1182, 18, 136, 494);
    g.fillStyle = '#e8eef0';
    g.fillRect(1160, 210, 10, 120);
    g.fillRect(1176, 210, 10, 120);
    /* 海報（兩側群組） */
    const poster = (x, c1, c2) => {
      g.fillStyle = '#f2f2ee';
      g.fillRect(x, 220, 62, 220);
      g.fillStyle = c1;
      g.fillRect(x + 6, 228, 50, 100);
      g.fillStyle = c2;
      g.fillRect(x + 6, 336, 50, 20);
      g.fillStyle = '#c9cec9';
      g.fillRect(x + 6, 364, 50, 62);
    };
    poster(120, '#e0503a', '#2a6496');
    poster(300, '#2e8b57', '#e0503a');
    poster(480, '#e8a03a', '#333333');
    poster(660, '#d81b60', '#ffffff');
    poster(1420, '#e53935', '#ffd54f');
    poster(1600, '#1e88e5', '#ffffff');
    poster(1780, '#43a047', '#ffffff');
  });
  const interiorTex = makeCanvasTexture(2048, 512, (g) => {
    g.fillStyle = '#2a2a28';
    g.fillRect(0, 0, 2048, 512);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 8, 2048, 40);
    const items = ['#e5533d', '#f2c94c', '#4aa3df', '#66bb6a', '#efefef', '#f28cb1'];
    for (let x = 30; x < 2020; x += 26){
      for (let y = 130; y < 500; y += 56){
        if (Math.random() < 0.75){
          g.fillStyle = items[(Math.random() * items.length) | 0];
          g.fillRect(x, y - 22, 16, 20);
        }
      }
    }
    for (let y = 106; y < 500; y += 56){
      g.fillStyle = '#ffffff';
      g.fillRect(20, y, 2008, 16);
    }
    g.fillStyle = '#0a0a0a';
    for (let x = 0; x <= 2048; x += 186) g.fillRect(x - 5, 0, 10, 512);
    g.fillRect(1020, 6, 310, 506);
    g.fillStyle = '#fffdf6';
    g.fillRect(1032, 18, 136, 494);
    g.fillRect(1182, 18, 136, 494);
    g.fillStyle = '#0a0a0a';
    g.fillRect(1168, 18, 14, 494);
    g.fillRect(1032, 260, 286, 20);
  });

  /* 店體（寬:高 ≈ 4.2:1 的扁長單層建築） */
  const storeMat = new THREE.MeshStandardMaterial({ color: 0xe9eae6, roughness: 0.8 });
  const storeBox = new THREE.Mesh(new THREE.BoxGeometry(17, 4.0, 8), storeMat);
  storeBox.position.set(0, 2.0, -18);
  A(storeBox);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(17.16, 0.3, 8.16), storeMat);
  parapet.position.set(0, 4.15, -18);
  A(parapet);
  /* 屋頂邊緣深色壓邊（實景特徵） */
  const roofCapMat = new THREE.MeshStandardMaterial({ color: 0x35393e, roughness: 0.85 });
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(17.24, 0.1, 8.24), roofCapMat);
  roofCap.position.set(0, 4.33, -18);
  A(roofCap);
  addCol(-8.7, 8.7, -22.2, -13.3);

  /* 玻璃（含夜間發光的店內） */
  const facadeMat = new THREE.MeshStandardMaterial({
    map: glassTex, emissive: 0xffffff, emissiveMap: interiorTex,
    emissiveIntensity: 0.1, roughness: 0.45, metalness: 0.1
  });
  facadeMat.userData = { day: 0.1, night: 1.3 };
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(17, 2.9), facadeMat);
  facade.position.set(0, 1.52, -13.94);
  A(facade, false, false);
  glow.signMats.push(facadeMat);

  /* 三色橫帶簷板（外凸，有立體感） */
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTex, emissive: 0xffffff, emissiveMap: fasciaTex,
    emissiveIntensity: 0.06, roughness: 0.6
  });
  fasciaMat.userData = { day: 0.06, night: 0.6 };
  glow.signMats.push(fasciaMat);
  const white = new THREE.MeshStandardMaterial({ color: 0xd9dcd8, roughness: 0.8 });
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(17.2, 1.03, 0.7),
    [white, white, white, white, fasciaMat, white]);
  fascia.position.set(0, 3.48, -13.72);
  A(fascia);
  /* 簷板底發光燈槽 */
  const soffitMat = new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff3da, emissiveIntensity: 0.15, roughness: 0.8 });
  soffitMat.userData = { day: 0.15, night: 1.5 };
  glow.signMats.push(soffitMat);
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.06, 0.66), soffitMat);
  soffit.position.set(0, 2.94, -13.74);
  A(soffit, false, false);

  /* 7 識別燈箱（中央偏左 ~42%） */
  const roofSignMat = new THREE.MeshStandardMaterial({ map: logoTex, emissive: 0xffffff, emissiveMap: logoTex, emissiveIntensity: 0.35, roughness: 0.6 });
  roofSignMat.userData = { day: 0.35, night: 2.2 };
  glow.signMats.push(roofSignMat);
  const faciaSign = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.95, 0.22),
    [white, white, white, white, roofSignMat, roofSignMat]);
  faciaSign.position.set(-1.4, 3.48, -13.3);
  A(faciaSign);

  /* 屋頂設備與天線 */
  for (const [ax, az] of [[-6, -20], [-3, -16.8], [5, -19.6]]){
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x9aa0a2, roughness: 0.9 }));
    ac.position.set(ax, 4.66, az);
    A(ac);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a7076, roughness: 0.6, metalness: 0.5 }));
  antenna.position.set(7.6, 5.6, -20.5);
  A(antenna);

  /* 販賣機（店右側）＋ 冰櫃 */
  function vendingMachine(x, z, rotY, color){
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.75),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    body.position.y = 0.95;
    A(body);
    grp.add(body);
    const frontTex = makeCanvasTexture(96, 192, (g) => {
      g.fillStyle = color;
      g.fillRect(0, 0, 96, 192);
      g.fillStyle = '#10151b';
      g.fillRect(8, 14, 80, 86);
      const drinks = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#ffffff', '#8e24aa'];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++){
        g.fillStyle = drinks[(Math.random() * drinks.length) | 0];
        g.fillRect(12 + c * 15, 22 + r * 20, 10, 14);
      }
      g.fillStyle = '#1c2126';
      g.fillRect(14, 118, 68, 34);
      g.fillStyle = '#3a4148';
      g.fillRect(20, 128, 56, 8);
      g.fillStyle = '#ffffff';
      g.font = '700 14px sans-serif';
      g.fillText('ドリンク', 22, 170);
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex, emissive: 0xffffff, emissiveMap: frontTex,
      emissiveIntensity: 0.05, roughness: 0.4
    });
    frontMat.userData = { day: 0.05, night: 1.15 };
    glow.signMats.push(frontMat);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.8), frontMat);
    front.position.set(0, 0.95, 0.38);
    grp.add(front);
    grp.position.set(x, 0, z);
    grp.rotation.y = rotY;
    scene.add(grp);
    return grp;
  }
  vendingMachine(9.3, -13.05, 0, '#c62828');
  vendingMachine(10.5, -13.05, 0, '#1565c0');
  addCol(8.7, 11.1, -13.5, -12.5);
  const icebox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 }));
  icebox.position.set(11.9, 0.53, -13.2);
  A(icebox);
  addCol(11.3, 12.5, -13.6, -12.8);

  /* 店前綠色低護欄（實景特徵，門口留通道） */
  {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x2f7d4a, roughness: 0.6, metalness: 0.3 });
    const fgeoms = [];
    const seg = (x1, x2) => {
      const len = x2 - x1;
      for (let px = x1; px <= x2 + 0.01; px += 2.6){
        const p = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6);
        p.translate(Math.min(px, x2), 0.31, -13.35);
        fgeoms.push(p);
      }
      for (const ry of [0.18, 0.36, 0.54]){
        const r = new THREE.BoxGeometry(len, 0.05, 0.03);
        r.translate((x1 + x2) / 2, ry, -13.35);
        fgeoms.push(r);
      }
      addCol(x1 - 0.05, x2 + 0.05, -13.44, -13.26);
    };
    seg(-8.2, -0.5);
    seg(3.5, 8.2);
    const fence = new THREE.Mesh(mergeGeoms(fgeoms), fenceMat);
    fence.castShadow = true;
    scene.add(fence);
  }

  /* 阻車柱 */
  for (const bx of [-6, -3, 0, 3, 6]){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8b13a, roughness: 0.6 }));
    b.position.set(bx, 0.5, -6.7);
    A(b);
  }

  /* 停車場繳費機柱（左側，實景細節） */
  {
    const pmMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.5, metalness: 0.4 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 8), pmMat);
    post.position.set(-8.4, 1.15, -7.4);
    A(post);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.6 }));
    box.position.set(-8.4, 1.75, -7.4);
    A(box);
    const pSign = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshStandardMaterial({ map: textTexture('P', '#1565c0', '#ffffff', 96, 96, 64), roughness: 0.7 }));
    pSign.position.set(-8.4, 2.75, -7.4);
    scene.add(pSign);
    addCol(-8.75, -8.05, -7.75, -7.05);
  }

  /* 立柱招牌（路口東側） */
  const pylonPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x51565c, roughness: 0.7, metalness: 0.4 }));
  pylonPole.position.set(13.2, 2.2, -6.2);
  A(pylonPole);
  const pylonSign = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.4, 0.24),
    [white, white, white, white, roofSignMat, roofSignMat]);
  pylonSign.position.set(13.2, 4.9, -6.2);
  A(pylonSign);
  addCol(12.85, 13.55, -6.55, -5.85);

  /* ================= 商店街房屋 ================= */
  const houseWinMat = new THREE.MeshStandardMaterial({
    color: 0x1c2530, roughness: 0.35, metalness: 0.1,
    emissive: 0xffc98a, emissiveIntensity: 0.02
  });
  glow.windowMats.push(houseWinMat);
  const shopGlassMat = new THREE.MeshStandardMaterial({
    color: 0x16202a, roughness: 0.3, metalness: 0.2,
    emissive: 0xffcf96, emissiveIntensity: 0.02
  });
  glow.windowMats.push(shopGlassMat);
  const winGeoms = [];

  const awningTex = makeCanvasTexture(128, 64, (g) => {
    for (let x = 0; x < 128; x += 16){
      g.fillStyle = (x / 16) % 2 ? '#e3e6e2' : '#d5453a';
      g.fillRect(x, 0, 16, 64);
    }
  });

  function gableRoofGeom(w, d, h, oh){
    const x0 = w / 2, ze = d / 2 + oh, zd = d / 2;
    const V = [];
    const tri = (a, b, c) => V.push(...a, ...b, ...c);
    const Ae = [-x0, 0, -ze], Be = [x0, 0, -ze], Ce = [x0, 0, ze], De = [-x0, 0, ze];
    const R1 = [-x0, h, 0], R2 = [x0, h, 0];
    tri(Ae, R2, Be); tri(Ae, R1, R2);
    tri(Ce, R1, De); tri(Ce, R2, R1);
    tri([-x0, 0, -zd], [-x0, 0, zd], [-x0, h, 0]);
    tri([x0, 0, zd], [x0, 0, -zd], [x0, h, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V), 3));
    geo.computeVertexNormals();
    return geo;
  }

  /* rot 0 = 面朝南（+z，路北側）；rot π = 面朝北（路南側） */
  const houseDefs = [
    // 店的左右鄰房（北側）
    { x: 13.5, z: -17.5, w: 9, d: 8, h: 6.4, rot: 0, body: 0xb4b9be, roof: 0x4a5560, floors: 2 },
    { x: -13.8, z: -18, w: 10, d: 8.5, h: 7.4, rot: 0, body: 0xcac4b8, roof: 0x3a4652, floors: 3 },
    { x: 24.5, z: -17, w: 8.5, d: 9, h: 4.6, rot: 0, body: 0xd8d0c2, roof: 0x5a4632, shop: 'ラーメン 来来', signBg: '#c62828', awning: '#c62828' },
    { x: -25.5, z: -17.5, w: 8.5, d: 9, h: 5.2, rot: 0, body: 0xd6cfc2, roof: 0x55606c, shop: '喫茶 ふじ', signBg: '#1f3a5f', awning: '#1f3a5f', floors: 2 },
    { x: 36.5, z: -17.5, w: 8, d: 8, h: 4.3, rot: 0, body: 0xd9d2c4, roof: 0x4a5560 },
    { x: -37.5, z: -17.5, w: 8, d: 8.5, h: 4.4, rot: 0, body: 0xc9cfd4, roof: 0x46525e, shop: 'コインランドリー', signBg: '#00796b' },
    { x: 48, z: -17, w: 8.5, d: 9, h: 4.2, rot: 0, body: 0xd5cec0, roof: 0x4a5560 },
    { x: -50, z: -17.5, w: 9, d: 9, h: 4.5, rot: 0, body: 0xd2cabd, roof: 0x55606c, shop: '書店 ぶんか', signBg: '#e07b2a', awning: '#e07b2a' },
    { x: 60.5, z: -17.5, w: 8, d: 8.5, h: 5.6, rot: 0, body: 0xbfc4c9, roof: 0x424a54, floors: 2 },
    { x: -62, z: -17, w: 8.5, d: 9, h: 4.3, rot: 0, body: 0xd7cfc1, roof: 0x50585e },
    // 南側
    { x: 14.5, z: 16.5, w: 9, d: 8, h: 4.6, rot: Math.PI, body: 0xd5cec0, roof: 0x4a5560, shop: '八百屋 秋葉', signBg: '#2e7d32', awning: '#2e7d32' },
    { x: -15.5, z: 17, w: 8, d: 9, h: 6.2, rot: Math.PI, body: 0xcac4b8, roof: 0x3a4652, floors: 2 },
    { x: 27, z: 17, w: 8.5, d: 9, h: 4.4, rot: Math.PI, body: 0xe0dad0, roof: 0x50585e, shop: 'クリーニング', signBg: '#eceff1', signFg: '#1565c0' },
    { x: -28.5, z: 16.5, w: 9, d: 9, h: 4.3, rot: Math.PI, body: 0xd8d2c6, roof: 0x4a5560 },
    { x: 40, z: 17, w: 8, d: 8.5, h: 5.4, rot: Math.PI, body: 0xc5beb2, roof: 0x55606c, floors: 2 },
    { x: -42, z: 17, w: 8.5, d: 9, h: 4.5, rot: Math.PI, body: 0xd0cabd, roof: 0x4a5560, shop: 'カフェ もり', signBg: '#00695c', awning: '#00695c' },
    { x: 53, z: 16.5, w: 8.5, d: 9, h: 4.2, rot: Math.PI, body: 0xd9d2c4, roof: 0x5a4632 },
    { x: -55, z: 17, w: 8, d: 8.5, h: 4.4, rot: Math.PI, body: 0xcdc7bb, roof: 0x46525e }
  ];

  for (const hd of houseDefs){
    const grp = new THREE.Group();
    grp.position.set(hd.x, 0, hd.z);
    grp.rotation.y = hd.rot;
    const body = new THREE.Mesh(new THREE.BoxGeometry(hd.w, hd.h, hd.d),
      new THREE.MeshStandardMaterial({ color: hd.body, roughness: 0.9 }));
    body.position.y = hd.h / 2;
    A(body);
    grp.add(body);
    const roof = new THREE.Mesh(gableRoofGeom(hd.w + 0.2, hd.d, hd.h * 0.34, 0.4),
      new THREE.MeshStandardMaterial({ color: hd.roof, roughness: 0.85 }));
    roof.position.y = hd.h;
    A(roof);
    grp.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x3a2f28, roughness: 0.85 }));
    door.position.set(hd.d > 9 ? -1.6 : -0.8, 1.05, hd.d / 2 + 0.02);
    grp.add(door);
    const floors = hd.floors || 1;
    for (let f = 0; f < floors; f++){
      const wy = 1.5 + f * 2.6;
      if (wy > hd.h - 0.7) break;
      for (const wx of [hd.d / 2 > 4.6 ? 1.8 : 1.2, hd.d / 2 > 4.6 ? -0.2 : 2.4]){
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), houseWinMat);
        win.position.set(wx, wy, hd.d / 2 + 0.025);
        grp.add(win);
      }
    }
    if (floors >= 2){
      for (const wx of [-1.8, 0.6, 2.2]){
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), houseWinMat);
        win.position.set(wx, hd.h - 1.3 > 4 ? hd.h - 1.4 : 4.6, hd.d / 2 + 0.025);
        if (win.position.y < hd.h - 0.6) grp.add(win);
      }
    }
    if (hd.shop){
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(hd.d * 0.62, 1.7), shopGlassMat);
      glass.position.set(0.4, 1.05, hd.d / 2 + 0.026);
      grp.add(glass);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(hd.d * 0.72, 6), 1.05),
        new THREE.MeshStandardMaterial({
          map: textTexture(hd.shop, hd.signBg, hd.signFg || '#ffffff', 512, 112, 56),
          roughness: 0.7
        }));
      sign.position.set(0.2, 3.1, hd.d / 2 + 0.03);
      grp.add(sign);
      if (hd.awning){
        const aw = new THREE.Mesh(new THREE.BoxGeometry(hd.d * 0.62, 0.06, 1.0),
          new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.8 }));
        aw.position.set(0.4, 2.15, hd.d / 2 + 0.5);
        aw.rotation.x = 0.28;
        aw.castShadow = true;
        grp.add(aw);
      }
    }
    scene.add(grp);
    grp.updateMatrixWorld(true);
    for (const ch of grp.children){
      if (ch.material === houseWinMat){
        winGeoms.push(ch.geometry.clone().applyMatrix4(ch.matrixWorld));
      }
    }
    const swap = Math.abs(Math.sin(hd.rot)) > 0.5;
    const ex = (swap ? hd.d : hd.w) / 2 + 0.15;
    const ez = (swap ? hd.w : hd.d) / 2 + 0.15;
    addCol(hd.x - ex, hd.x + ex, hd.z - ez, hd.z + ez);
  }
  if (winGeoms.length){
    scene.add(new THREE.Mesh(mergeGeoms(winGeoms), houseWinMat));
  }

  /* ================= 電線桿（藏在北側屋後，不擋富士山） ================= */
  {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.85 });
    const geoms = [];
    const pole = (x, z) => {
      const g1 = new THREE.CylinderGeometry(0.09, 0.12, 7.9, 8);
      g1.translate(x, 3.95, z);
      geoms.push(g1);
      const arm = new THREE.BoxGeometry(0.09, 0.09, 1.5);
      arm.translate(x, 7.3, z);
      geoms.push(arm);
      const arm2 = new THREE.BoxGeometry(0.08, 0.08, 1.1);
      arm2.translate(x, 6.35, z);
      geoms.push(arm2);
      if (Math.random() > 0.4){
        const tr = new THREE.CylinderGeometry(0.3, 0.3, 0.75, 10);
        tr.translate(x, 5.7, z + 0.42);
        geoms.push(tr);
      }
      addCol(x - 0.28, x + 0.28, z - 0.28, z + 0.34);
    };
    const zs = [-90, -55, -25, 25, 55, 90];
    zs.forEach(x => pole(x, -34));
    const wire = (ax, ay, az, bx, by, bz, sag) => {
      const mid = new THREE.Vector3((ax + bx) / 2, (ay + by) / 2 - sag, (az + bz) / 2);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(ax, ay, az), mid, new THREE.Vector3(bx, by, bz));
      geoms.push(new THREE.TubeGeometry(curve, 12, 0.032, 4));
    };
    for (let i = 0; i < zs.length - 1; i++){
      for (const off of [-0.68, 0, 0.68]) wire(zs[i] + off, 7.28, -34, zs[i + 1] + off, 7.28, -34, 1.15);
      wire(zs[i], 6.35, -34 + 0.5, zs[i + 1], 6.35, -34 + 0.5, 0.9);
    }
    const wiresMesh = new THREE.Mesh(mergeGeoms(geoms), darkMat);
    wiresMesh.castShadow = true;
    scene.add(wiresMesh);
  }

  /* ================= 右側電線桿（實景：電線向左橫越畫面右半部） ================= */
  {
    const poleMat2 = new THREE.MeshStandardMaterial({ color: 0x565b62, roughness: 0.9 });
    const poleAt = (x, z) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 8.6, 8), poleMat2);
      p.position.set(x, 4.3, z);
      p.castShadow = true;
      scene.add(p);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.09), poleMat2);
      arm.position.set(x, 7.9, z);
      scene.add(arm);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), poleMat2);
      arm2.position.set(x, 7.1, z);
      scene.add(arm2);
      addCol(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
    };
    poleAt(15.5, -15.5);
    poleAt(-19, -15.8);
    const wgeoms = [];
    const wire2 = (ax, ay, az, bx, by, bz, sag) => {
      const mid = new THREE.Vector3((ax + bx) / 2, (ay + by) / 2 - sag, (az + bz) / 2);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(ax, ay, az), mid, new THREE.Vector3(bx, by, bz));
      wgeoms.push(new THREE.TubeGeometry(curve, 14, 0.028, 4));
    };
    for (const off of [-0.9, 0, 0.9]) wire2(15.5 + off, 7.88, -15.5, -19 + off, 7.7, -15.8, 1.3);
    wire2(15.5, 7.08, -15.5, -19, 6.9, -15.8, 1.0);
    const wires2 = new THREE.Mesh(mergeGeoms(wgeoms), poleMat2);
    scene.add(wires2);
  }

  /* ================= 路燈（南側） ================= */
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x6a7076, roughness: 0.6, metalness: 0.5 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffe9b8, emissiveIntensity: 0.05 });
    glow.lampBulbMat = bulbMat;
    const glowTex = glowTexture();
    for (const lx of [-70, -30, 30, 70]){
      const grp = new THREE.Group();
      grp.position.set(lx, 0, 8.4);
      grp.rotation.y = -Math.PI / 2;   // 燈臂朝北（馬路）
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 5.2, 8), poleMat);
      p.position.y = 2.6;
      p.castShadow = true;
      grp.add(p);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-0.7, 5.05, 0);
      grp.add(arm);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.24), poleMat);
      head.position.set(-1.35, 5.05, 0);
      grp.add(head);
      const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), bulbMat);
      bulb.rotation.x = Math.PI / 2;
      bulb.position.set(-1.35, 4.97, 0);
      grp.add(bulb);
      const light = new THREE.PointLight(0xffd9a8, 0, 22, 2);
      light.position.set(-1.35, 4.85, 0);
      light.userData.base = 2.4;
      grp.add(light);
      glow.lampLights.push(light);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xffd9a8, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      spr.scale.set(3.6, 3.6, 1);
      spr.position.set(-1.35, 4.9, 0);
      grp.add(spr);
      glow.lampGlows.push(spr);
      scene.add(grp);
      addCol(lx - 0.22, lx + 0.22, 8.18, 8.62);
    }
  }

  /* ================= 樹木 ================= */
  {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf2aecb, roughness: 1, flatShading: true });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x5d7a4a, roughness: 1, flatShading: true });
    const trunks = [], pinks = [], greens = [];
    const blob = (r) => {
      const g = new THREE.IcosahedronGeometry(r, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++){
        const k = 0.82 + Math.random() * 0.36;
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const tree = (x, z, kind, s) => {
      const t = new THREE.CylinderGeometry(0.1 * s, 0.17 * s, 1.7 * s, 7);
      t.translate(x, 0.85 * s, z);
      trunks.push(t);
      const arr = kind === 'sakura' ? pinks : greens;
      for (let i = 0; i < 3; i++){
        const b = blob(rand(0.85, 1.25) * s);
        b.translate(x + rand(-0.6, 0.6) * s, (2.1 + i * 0.5 + rand(-0.2, 0.2)) * s, z + rand(-0.6, 0.6) * s);
        arr.push(b);
      }
      addCol(x - 0.45, x + 0.45, z - 0.45, z + 0.45);
    };
    tree(-48, 10.6, 'sakura', 1.15);
    tree(-32, 10.6, 'green', 1.1);
    tree(-14, 10.6, 'sakura', 1.0);
    tree(14, 10.6, 'sakura', 1.05);
    tree(32, 10.6, 'green', 1.0);
    tree(48, 10.6, 'sakura', 1.1);
    tree(-75, 10.6, 'green', 1.2);
    tree(75, 10.6, 'green', 1.15);
    tree(140, -40, 'sakura', 1.5);
    tree(150, 60, 'sakura', 1.3);
    tree(160, -120, 'green', 1.6);
    const trunkMesh = new THREE.Mesh(mergeGeoms(trunks), trunkMat);
    trunkMesh.castShadow = true;
    scene.add(trunkMesh);
    const pinkMesh = new THREE.Mesh(mergeGeoms(pinks), pinkMat);
    pinkMesh.castShadow = true;
    scene.add(pinkMesh);
    const greenMesh = new THREE.Mesh(mergeGeoms(greens), greenMat);
    greenMesh.castShadow = true;
    scene.add(greenMesh);
  }

  /* ================= 路邊小物 ================= */
  for (const [bx, bz] of [[-18, 8.7], [28, -8.7]]){
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.85, 10),
      new THREE.MeshStandardMaterial({ color: 0x2e5e46, roughness: 0.7 }));
    bin.position.set(bx, 0.43, bz);
    A(bin);
    addCol(bx - 0.34, bx + 0.34, bz - 0.34, bz + 0.34);
  }
  for (const [cx, cz] of [[-5, -7.6], [14, 4]]){
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.2, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8641e, roughness: 0.7 }));
    cone.position.set(cx, 0.28, cz);
    A(cone);
  }
  /* 巴士站（南側） */
  {
    const grp = new THREE.Group();
    grp.position.set(-24, 0, 10.4);
    const pm = new THREE.MeshStandardMaterial({ color: 0x596066, roughness: 0.6, metalness: 0.4 });
    for (const px of [-1.6, 1.6]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), pm);
      post.position.set(px, 1.25, -0.4);
      post.castShadow = true;
      grp.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.07, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xd8dcde, roughness: 0.6 }));
    roof.position.set(0, 2.55, -0.3);
    roof.castShadow = true;
    grp.add(roof);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }));
    bench.position.set(0, 0.5, -1.0);
    grp.add(bench);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshStandardMaterial({ map: textTexture('バス', '#2b6cb0', '#ffffff', 96, 96, 40), roughness: 0.7 }));
    sign.position.set(1.6, 2.1, 0.48);
    grp.add(sign);
    scene.add(grp);
    addCol(-26, -22, 9.2, 11.6);
  }

  /* ================= 停放的車 ================= */
  function car(color, x, z, rotY){
    const grp = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.2, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 4.1), bodyMat);
    body.position.y = 0.56;
    body.castShadow = true;
    grp.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.1), glassMat);
    cabin.position.set(0, 1.05, -0.25);
    cabin.castShadow = true;
    grp.add(cabin);
    const wm = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 });
    for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]){
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), wm);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(wx, 0.32, wz);
      grp.add(wh);
    }
    grp.position.set(x, 0, z);
    grp.rotation.y = rotY;
    scene.add(grp);
    const ex = Math.abs(Math.sin(rotY)) > 0.5 ? 1.1 : 2.3;
    const ez = Math.abs(Math.sin(rotY)) > 0.5 ? 2.3 : 1.1;
    addCol(x - ex, x + ex, z - ez, z + ez);
  }
  car(0xe8eaea, -5.0, -10.4, 1.07);     // 白色輕型車（照片同款：左側、車頭朝右）
  car(0x8a1f1f, 1.3, -10.4, 1.07);
  car(0x3a5a8a, -35, 4.6, Math.PI / 2); // 路邊停車

  /* ================= 東側小路 + 河口湖 ================= */
  {
    const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(140, 7),
      new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.95 }));
    sideRoad.rotation.x = -Math.PI / 2;
    sideRoad.position.set(79, 0.01, 0);
    sideRoad.receiveShadow = true;
    scene.add(sideRoad);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(760, 440),
      new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(515, 0.02, 0);
    sand.receiveShadow = true;
    scene.add(sand);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(710, 390),
      new THREE.MeshStandardMaterial({ color: 0x3f6f92, roughness: 0.12, metalness: 0.72 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(520, 0.06, 0);
    scene.add(water);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(11, 0.22, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x7a5f42, roughness: 0.95 }));
    pier.position.set(157, 0.5, 12);
    pier.castShadow = true;
    pier.receiveShadow = true;
    scene.add(pier);
    const pm2 = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    for (const [px, pz] of [[153, 11], [153, 13], [161, 11], [161, 13]]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), pm2);
      post.position.set(px, 0.2, pz);
      scene.add(post);
    }
    addCol(150, 900, -195, 10.6);
    addCol(150, 900, 13.4, 195);
    addCol(162, 900, 10, 14);
  }

  /* ================= 遠山 ================= */
  {
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x46584f });
    const hills = [
      [-1600, -200, 950, 270], [400, 1800, 1100, 230], [1900, -300, 1050, 300],
      [2400, 700, 900, 220], [-3200, -1000, 900, 190], [2600, -900, 950, 210], [1500, 1900, 950, 200]
    ];
    for (const [hx, hz, hr, hh] of hills){
      const h = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 24), hillMat);
      h.position.set(hx, hh / 2 - 4, hz);
      scene.add(h);
    }
  }

  /* ================= 富士山（從店正後方升起） ================= */
  {
    const pts = [];
    for (let i = 0; i <= 26; i++){
      const t = i / 26;
      pts.push(new THREE.Vector2(Math.max(FUJI.R * Math.pow(1 - t, 1.3), 0), t * FUJI.H));
    }
    /* 山頂的小凹口（破火山口緣） */
    pts.push(new THREE.Vector2(32, FUJI.H - 5));
    pts.push(new THREE.Vector2(0, FUJI.H - 14));
    const fujiGeo = new THREE.LatheGeometry(pts, 72);
    /* 東側（畫面右側）山肩較低且平緩 —— 實景山脊線向右緩降 */
    {
      const p = fujiGeo.attributes.position;
      for (let i = 0; i < p.count; i++){
        const x = p.getX(i);
        if (x > 0){
          const t = Math.min(x / (FUJI.R * 0.95), 1);
          const f = t * t * (3 - 2 * t);
          p.setY(i, p.getY(i) * (1 - 0.24 * f));
        }
      }
      fujiGeo.computeVertexNormals();
    }
    const fujiUniforms = {
      uBody: { value: new THREE.Color(0x5d7484) },
      uSnow: { value: new THREE.Color(0xffffff) },
      uHaze: { value: new THREE.Color(0xcfe3f2) },
      uHazeK: { value: 0.5 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.5) },
      uH: { value: FUJI.H }
    };
    world.fujiUniforms = fujiUniforms;
    const fujiMat = new THREE.ShaderMaterial({
      uniforms: fujiUniforms,
      vertexShader: `
        varying vec3 vW;
        varying vec3 vN;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uBody, uSnow, uHaze;
        uniform float uHazeK, uH;
        uniform vec3 uSunDir;
        varying vec3 vW;
        varying vec3 vN;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main(){
          float h = clamp(vW.y / uH, 0.0, 1.0);
          float n1 = noise(vW.xz * 0.012) * 0.6 + noise(vW.xz * 0.06) * 0.4;
          float sl = 0.55 + (n1 - 0.5) * 0.1;
          float snow = smoothstep(sl, sl + 0.09, h + (n1 - 0.5) * 0.08);
          vec3 col = mix(uBody, uSnow, snow);
          col *= (0.92 + 0.16 * noise(vW.xz * 0.02));
          float l = clamp(dot(normalize(vN), normalize(uSunDir)), 0.0, 1.0);
          col *= (0.72 + 0.4 * l);
          float haze = uHazeK * (0.28 + 0.55 * (1.0 - h));
          col = mix(col, uHaze, clamp(haze, 0.0, 0.9));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
    });
    const fuji = new THREE.Mesh(fujiGeo, fujiMat);
    fuji.position.set(FUJI.x, 0, FUJI.z);
    scene.add(fuji);
    /* 山腰丘陵 */
    const footMat = new THREE.MeshLambertMaterial({ color: 0x4a5a68 });
    for (const [fx, fz, fr, fh] of [[-2900, -3100, 950, 180], [2800, -3400, 900, 160], [-4100, -2400, 1000, 190], [4000, -2800, 1000, 170]]){
      const f = new THREE.Mesh(new THREE.ConeGeometry(fr, fh, 24), footMat);
      f.position.set(fx, fh / 2 - 4, fz);
      scene.add(f);
    }
  }

  /* ================= 邊界 & 地面高度 ================= */
  addCol(-122, -119.5, -110, 110);
  addCol(400, 403, -110, 110);
  addCol(-125, 403, -111.5, -109.5);
  addCol(-125, 403, 109.5, 111.5);

  function groundHeightAt(x, z){
    if (x > -8.6 && x < 8.6 && z > -14.2 && z < -6.4) return 0.152;   // 店前停車場
    if ((z > 6 && z < 9.3) || (z < -6 && z > -9.3)) return 0.14;      // 人行道
    if (x > 151.5 && x < 162.5 && z > 10.6 && z < 13.4) return 0.61;  // 棧橋
    return 0;
  }

  return world;
}

export { createWorld };
