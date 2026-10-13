/* 世界場景：道路、7-Eleven、商店街、電線桿、櫻花、河口湖、富士山 */
'use strict';

const FUJI = { x: -150, z: -3800, R: 2250, H: 1300 };

function createWorld(scene){
  const colliders = [];
  const glow = { signMats: [], lampLights: [], lampBulbMat: null, lampGlows: [], windowMats: [] };
  const snowOverlays = [];   // 下雪時淡入的白色覆蓋面
  const A = (m, cast, recv) => { m.castShadow = cast !== false; m.receiveShadow = recv !== false; scene.add(m); return m; };
  const addCol = (x1, x2, z1, z2) => colliders.push({ x1, x2, z1, z2 });

  const world = {
    colliders, glow, snowOverlays,
    spawn: new THREE.Vector3(1.5, 0, 74),
    classic: { pos: new THREE.Vector3(-1.5, 0, 4), yaw: 0.25, pitch: 0.08, dist: 4.2 },
    groundHeightAt,
    fujiUniforms: null
  };

  /* ================= 地面 ================= */
  const groundTex = makeCanvasTexture(512, 512, (g) => {
    g.fillStyle = '#71805c';
    g.fillRect(0, 0, 512, 512);
    const cols = ['#5a6a4a', '#7d8a63', '#82906c', '#657455'];
    for (let i = 0; i < 380; i++){
      g.fillStyle = cols[(Math.random() * cols.length) | 0];
      g.globalAlpha = rand(0.05, 0.16);
      g.beginPath();
      g.arc(Math.random() * 512, Math.random() * 512, rand(8, 42), 0, TAU);
      g.fill();
    }
    g.globalAlpha = 0.12;
    for (let i = 0; i < 1600; i++){
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

  /* 白雪覆蓋層（透明，下雪時淡入） */
  const snowMatGround = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false });
  const snowGround = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), snowMatGround);
  snowGround.rotation.x = -Math.PI / 2;
  snowGround.position.y = 0.008;
  snowGround.receiveShadow = true;
  scene.add(snowGround);
  snowOverlays.push(snowGround);

  /* ================= 馬路 ================= */
  const roadTex = makeCanvasTexture(256, 512, (g) => {
    g.fillStyle = '#34373c';
    g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 900; i++){
      g.fillStyle = Math.random() > 0.5 ? '#3d4046' : '#2c2f34';
      g.globalAlpha = rand(0.2, 0.5);
      g.fillRect(Math.random() * 256, Math.random() * 512, rand(1, 3), rand(1, 3));
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(230,232,235,0.9)';       // 中央虛線
    for (let y = 0; y < 512; y += 64) g.fillRect(124, y, 8, 34);
    g.fillStyle = 'rgba(215,218,222,0.85)';      // 邊線
    g.fillRect(14, 0, 6, 512);
    g.fillRect(236, 0, 6, 512);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 12);
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  world.roadMat = roadMat;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 244), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.012, -4);
  road.receiveShadow = true;
  scene.add(road);

  /* 積雪的道路覆蓋層 */
  const snowMatRoad = new THREE.MeshStandardMaterial({ color: 0xdde4ea, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false });
  const snowRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, 244), snowMatRoad);
  snowRoad.rotation.x = -Math.PI / 2;
  snowRoad.position.set(0, 0.02, -4);
  snowRoad.receiveShadow = true;
  scene.add(snowRoad);
  snowOverlays.push(snowRoad);

  /* 斑馬線 */
  const cwTex = makeCanvasTexture(256, 64, (g) => {
    g.clearRect(0, 0, 256, 64);
    g.fillStyle = 'rgba(235,237,240,0.92)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x + 5, 0, 21, 64);
  });
  for (const cz of [-2, 30]){
    const cw = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 3.4),
      new THREE.MeshStandardMaterial({ map: cwTex, transparent: true, roughness: 0.9, depthWrite: false }));
    cw.rotation.x = -Math.PI / 2;
    cw.position.set(0, 0.026, cz);
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
  walkTex.repeat.set(1.2, 46);
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 1 });
  for (const sx of [-7.65, 7.65]){
    const w = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 244), walkMat);
    w.position.set(sx, 0.07, -4);
    A(w, false, true);
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 244),
      new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false }));
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(sx, 0.148, -4);
    sw.receiveShadow = true;
    scene.add(sw);
    snowOverlays.push(sw);
  }

  /* ================= 停車場（7-11 前庭） ================= */
  const parkTex = makeCanvasTexture(256, 512, (g) => {
    g.fillStyle = '#3b3e43';
    g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 700; i++){
      g.fillStyle = Math.random() > 0.5 ? '#43464c' : '#33363b';
      g.globalAlpha = 0.4;
      g.fillRect(Math.random() * 256, Math.random() * 512, rand(1, 3), rand(1, 3));
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(235,237,240,0.8)';   // 停車格線
    for (let y = 22; y < 512; y += 102) g.fillRect(6, y, 244, 5);
  });
  const parkMat = new THREE.MeshStandardMaterial({ map: parkTex, roughness: 0.95 });
  world.parkMat = parkMat;
  const parking = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 18.5), parkMat);
  parking.rotation.x = -Math.PI / 2;
  parking.position.set(-8.2, 0.152, -12.3);
  parking.receiveShadow = true;
  scene.add(parking);

  /* ================= 7-ELEVEN 本體 ================= */
  function draw7Logo(g, x, y, s){
    // 橘色橫槓 + 紅色斜腿 + 綠色細帶（7 的標誌造型）
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
  const logoTex = makeCanvasTexture(1024, 256, (g) => {
    g.fillStyle = '#fbfbf9';
    g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = '#d8d8d4';
    g.lineWidth = 8;
    g.strokeRect(4, 4, 1016, 248);
    draw7Logo(g, 70, 66, 1.15);
    g.fillStyle = '#009342';
    g.font = '800 italic 96px "Arial Black", Arial, sans-serif';
    g.textBaseline = 'middle';
    g.fillText('ELEVEN', 330, 118);
    g.fillStyle = '#0e5a3c';
    g.font = '700 52px "Yu Gothic","Meiryo",sans-serif';
    g.fillText('セブン-イレブン', 660, 205);
  });

  const facadeTex = makeCanvasTexture(2048, 512, (g) => {
    /* 簷板：白底 + 綠橙紅三色橫帶貫穿全幅（河口湖站東店樣式） */
    g.fillStyle = '#f8f8f6';
    g.fillRect(0, 0, 2048, 130);
    g.fillStyle = '#00a95c';
    g.fillRect(0, 20, 2048, 26);
    g.fillStyle = '#f36f21';
    g.fillRect(0, 54, 2048, 26);
    g.fillStyle = '#e60012';
    g.fillRect(0, 88, 2048, 26);
    g.fillStyle = '#cfd4d2';
    g.fillRect(0, 126, 2048, 8);
    /* 全幅玻璃櫥窗 */
    g.fillStyle = '#152731';
    g.fillRect(0, 134, 2048, 334);
    g.save();
    g.globalAlpha = 0.055;
    g.fillStyle = '#ffffff';
    for (let i = -2; i < 16; i++){
      g.save();
      g.translate(i * 170, 134);
      g.rotate(-0.35);
      g.fillRect(0, -60, 52, 560);
      g.restore();
    }
    g.restore();
    g.fillStyle = '#0a141a';
    for (let x = 0; x <= 2048; x += 186) g.fillRect(x - 5, 134, 10, 334);
    /* 玻璃門（偏左的雙開門） */
    g.fillStyle = '#cfd8dc';
    g.fillRect(700, 138, 290, 330);
    g.fillStyle = '#24404e';
    g.fillRect(712, 150, 128, 318);
    g.fillRect(850, 150, 128, 318);
    g.fillStyle = '#e8eef0';
    g.fillRect(836, 250, 10, 120);
    g.fillRect(852, 250, 10, 120);
    /* 玻璃上的海報 */
    const poster = (x, c1, c2) => {
      g.fillStyle = '#f2f2ee';
      g.fillRect(x, 290, 62, 150);
      g.fillStyle = c1;
      g.fillRect(x + 6, 296, 50, 70);
      g.fillStyle = c2;
      g.fillRect(x + 6, 372, 50, 14);
      g.fillStyle = '#c9cec9';
      g.fillRect(x + 6, 394, 50, 38);
    };
    poster(120, '#e0503a', '#2a6496');
    poster(300, '#2e8b57', '#e0503a');
    poster(480, '#e8a03a', '#333333');
    poster(1120, '#d81b60', '#ffffff');
    poster(1300, '#1e88e5', '#ffffff');
    poster(1480, '#e53935', '#ffd54f');
    poster(1660, '#43a047', '#ffffff');
    poster(1840, '#8e24aa', '#ffffff');
    /* 基座 */
    g.fillStyle = '#6f767b';
    g.fillRect(0, 468, 2048, 44);
    g.fillStyle = '#565c60';
    g.fillRect(0, 468, 2048, 10);
  });
  const interiorTex = makeCanvasTexture(2048, 512, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 2048, 512);
    /* 明亮的店內（傍晚從外面看非常亮） */
    g.fillStyle = '#33271a';
    g.fillRect(0, 134, 2048, 334);
    g.fillStyle = '#fff3cf';
    g.fillRect(0, 140, 2048, 38);
    const items = ['#e5533d', '#f2c94c', '#4aa3df', '#66bb6a', '#efefef', '#f28cb1'];
    for (let x = 30; x < 2020; x += 26){
      for (let y = 247; y < 460; y += 53){
        if (Math.random() < 0.75){
          g.fillStyle = items[(Math.random() * items.length) | 0];
          g.fillRect(x, y - 22, 16, 20);
        }
      }
    }
    for (let y = 225; y < 460; y += 53){
      g.fillStyle = '#ffe3a6';
      g.fillRect(20, y, 2008, 16);
    }
    g.fillStyle = '#0a0a0a';
    for (let x = 0; x <= 2048; x += 186) g.fillRect(x - 5, 134, 10, 334);
    g.fillRect(700, 138, 290, 330);
    g.fillStyle = '#ffdf9e';
    g.fillRect(712, 150, 128, 318);
    g.fillRect(850, 150, 128, 318);
    g.fillStyle = '#0a0a0a';
    g.fillRect(838, 150, 14, 318);
    g.fillRect(712, 300, 266, 20);
  });

  const storeMat = new THREE.MeshStandardMaterial({ color: 0xe9eae6, roughness: 0.8 });
  const storeBox = new THREE.Mesh(new THREE.BoxGeometry(8, 4.3, 17), storeMat);
  storeBox.position.set(-14.4, 2.15, -12.5);
  A(storeBox);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(8.16, 0.5, 17.16), storeMat);
  parapet.position.set(-14.4, 4.3, -12.5);
  A(parapet);
  addCol(-18.6, -10.3, -21.2, -3.8);

  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex, emissive: 0xffffff, emissiveMap: interiorTex,
    emissiveIntensity: 0.08, roughness: 0.55
  });
  facadeMat.userData = { day: 0.1, night: 1.25 };
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(17, 4.15), facadeMat);
  facade.rotation.y = Math.PI / 2;
  facade.position.set(-10.36, 2.17, -12.5);
  A(facade, false, false);
  glow.signMats.push(facadeMat);

  // 簷板中央發燈招牌（7 識別燈箱）
  const roofSignMat = new THREE.MeshStandardMaterial({ map: logoTex, emissive: 0xffffff, emissiveMap: logoTex, emissiveIntensity: 0.35, roughness: 0.6 });
  roofSignMat.userData = { day: 0.35, night: 2.0 };
  glow.signMats.push(roofSignMat);
  const white = new THREE.MeshStandardMaterial({ color: 0xd9dcd8, roughness: 0.8 });
  const faciaSign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 0.22),
    [white, white, white, white, roofSignMat, roofSignMat]);
  faciaSign.rotation.y = Math.PI / 2;
  faciaSign.position.set(-10.24, 3.62, -12.5);
  A(faciaSign);
  // 屋頂設備
  for (let i = 0; i < 3; i++){
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x9aa0a2, roughness: 0.9 }));
    ac.position.set(-16.6 + (i % 2) * 3.4, 4.82, -18.6 + i * 4.6);
    A(ac);
  }

  /* 立柱招牌（停車場入口） */
  const pylonPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x51565c, roughness: 0.7, metalness: 0.4 }));
  pylonPole.position.set(-6.4, 2.2, -3.4);
  A(pylonPole);
  const pylonSign = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.4, 0.24),
    [white, white, white, white, roofSignMat, roofSignMat]);
  pylonSign.position.set(-6.4, 4.9, -3.4);
  A(pylonSign);
  addCol(-6.75, -6.05, -3.75, -3.05);

  /* 販賣機 ×2 + 冰櫃 */
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
  vendingMachine(-9.9, -5.0, Math.PI / 2, '#c62828');
  vendingMachine(-9.9, -6.35, Math.PI / 2, '#1565c0');
  addCol(-10.5, -9.3, -5.7, -4.4);
  const icebox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.05, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 }));
  icebox.position.set(-9.9, 0.53, -7.7);
  A(icebox);
  addCol(-10.5, -9.3, -8.3, -7.1);

  /* 停車場阻車柱 */
  for (const bz of [-19.5, -16.5, -13.5, -10.5, -7.5]){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8b13a, roughness: 0.6 }));
    b.position.set(-6.15, 0.5, bz);
    A(b);
  }

  /* 促銷立牌 */
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.06),
    new THREE.MeshStandardMaterial({ map: textTexture('セール開催中', '#e5511e', '#ffffff', 128, 320, 34, true), roughness: 0.8 }));
  banner.position.set(-5.8, 1.05, -2.6);
  banner.rotation.y = 0.5;
  A(banner);

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
  const winGeoms = [];   // 待合併的窗戶

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
    tri(Ae, R2, Be); tri(Ae, R1, R2);        // 前坡
    tri(Ce, R1, De); tri(Ce, R2, R1);        // 後坡
    tri([-x0, 0, -zd], [-x0, 0, zd], [-x0, h, 0]);   // 山形端
    tri([x0, 0, zd], [x0, 0, -zd], [x0, h, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V), 3));
    geo.computeVertexNormals();
    return geo;
  }

  const houseDefs = [
    // 右側（面朝 -x / 馬路）
    { x: 14.2, z: 46, w: 6.5, d: 9, h: 4.3, rot: -Math.PI / 2, body: 0xd9d2c4, roof: 0x4a5560, sign: null },
    { x: 14.4, z: 30, w: 6.5, d: 9.5, h: 4.6, rot: -Math.PI / 2, body: 0xcfc8bc, roof: 0x3a4652, shop: 'ラーメン 来来', signBg: '#c62828', awning: '#c62828' },
    { x: 14.6, z: 15, w: 7, d: 10, h: 5.8, rot: -Math.PI / 2, body: 0xd6cfc2, roof: 0x55606c, shop: '喫茶 ふじ', signBg: '#1f3a5f', floors: 2 },
    { x: 14.8, z: 0, w: 7.5, d: 11, h: 7.6, rot: -Math.PI / 2, body: 0xb8bcc0, roof: 0x3f4750, shop: '富士見商事', signBg: '#37474f', floors: 3 },
    { x: 14.3, z: -16, w: 6.5, d: 9, h: 4.4, rot: -Math.PI / 2, body: 0xc9cfd4, roof: 0x46525e },
    { x: 14.5, z: -33, w: 7, d: 10, h: 5, rot: -Math.PI / 2, body: 0xc2bfb6, roof: 0x50585e, shop: 'コインランドリー', signBg: '#00796b' },
    { x: 14.2, z: -52, w: 6.5, d: 9, h: 4.2, rot: -Math.PI / 2, body: 0xd8d0c2, roof: 0x5a4632 },
    // 左側（面朝 +x）
    { x: -14.3, z: 46, w: 6.5, d: 9.5, h: 4.5, rot: Math.PI / 2, body: 0xd5cec0, roof: 0x4a5560, shop: '八百屋 秋葉', signBg: '#2e7d32', awning: '#2e7d32' },
    { x: -14.6, z: 30, w: 7, d: 10, h: 6.4, rot: Math.PI / 2, body: 0xcac4b8, roof: 0x3a4652, floors: 2 },
    { x: -14.4, z: 14, w: 6.5, d: 9.5, h: 4.6, rot: Math.PI / 2, body: 0xd2cabd, roof: 0x55606c, shop: '書店 ぶんか', signBg: '#e07b2a', awning: '#e07b2a' },
    { x: -14.7, z: -30, w: 7, d: 10, h: 7.2, rot: Math.PI / 2, body: 0xb4b9be, roof: 0x424a54, floors: 3 },  // 7-11 後方公寓
    { x: -14.4, z: -46, w: 6.5, d: 9, h: 4.5, rot: Math.PI / 2, body: 0xd7cfc1, roof: 0x4a5560, shop: 'クリーニング', signBg: '#eceff1', signFg: '#1565c0' },
    { x: -14.3, z: -62, w: 6.5, d: 9, h: 4.3, rot: Math.PI / 2, body: 0xcfc9bd, roof: 0x50585e }
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
    // 門 + 窗（正面 = local +z）
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
    // 店面玻璃 + 招牌 + 雨棚
    if (hd.shop){
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(hd.d * 0.62, 1.7), shopGlassMat);
      glass.position.set(0.4, 1.05, hd.d / 2 + 0.026);
      grp.add(glass);
      const signMat = new THREE.MeshStandardMaterial({
        map: textTexture(hd.shop, hd.signBg, hd.signFg || '#ffffff', 512, 112, 56),
        roughness: 0.7
      });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(hd.d * 0.72, 6), 1.05), signMat);
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
    // 收集窗戶幾何（合併用）
    for (const ch of grp.children){
      if (ch.material === houseWinMat){
        const g2 = ch.geometry.clone().applyMatrix4(ch.matrixWorld);
        winGeoms.push(g2);
      }
    }
    // 碰撞盒（旋轉皆為 90° 倍數 → 交換 w/d）
    const swap = Math.abs(Math.sin(hd.rot)) > 0.5;
    const ex = (swap ? hd.d : hd.w) / 2 + 0.15;
    const ez = (swap ? hd.w : hd.d) / 2 + 0.15;
    addCol(hd.x - ex, hd.x + ex, hd.z - ez, hd.z + ez);
  }
  if (winGeoms.length){
    const winMesh = new THREE.Mesh(mergeGeoms(winGeoms), houseWinMat);
    scene.add(winMesh);
  }

  /* 遠景城市（富士山腳下的街市剪影） */
  {
    const geoms = [];
    for (let i = 0; i < 46; i++){
      const w = rand(14, 34), h = rand(9, 30), d = rand(12, 26);
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(rand(-420, 420), h / 2, rand(-720, -360));
      geoms.push(g);
    }
    const city = new THREE.Mesh(mergeGeoms(geoms), new THREE.MeshLambertMaterial({ color: 0x5b6875 }));
    scene.add(city);
  }

  /* ================= 電線桿 + 電線 ================= */
  {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.85 });
    const geoms = [];
    const pole = (x, z) => {
      const g1 = new THREE.CylinderGeometry(0.09, 0.12, 7.9, 8);
      g1.translate(x, 3.95, z);
      geoms.push(g1);
      const arm = new THREE.BoxGeometry(1.5, 0.09, 0.09);
      arm.translate(x, 7.3, z);
      geoms.push(arm);
      const arm2 = new THREE.BoxGeometry(1.1, 0.08, 0.08);
      arm2.translate(x, 6.35, z);
      geoms.push(arm2);
      if (Math.random() > 0.4){
        const tr = new THREE.CylinderGeometry(0.3, 0.3, 0.75, 10);
        tr.translate(x + 0.42, 5.7, z);
        geoms.push(tr);
      }
      addCol(x - 0.28, x + 0.34, z - 0.28, z + 0.28);
    };
    const leftZ = [40, 20, -15, -50, -85], rightZ = [55, 20, -15, -50, -85];
    leftZ.forEach(z => pole(-8.9, z));
    rightZ.forEach(z => pole(8.9, z));
    // 懸垂電線（拋物線）
    const wire = (ax, ay, az, bx, by, bz, sag) => {
      const mid = new THREE.Vector3((ax + bx) / 2, (ay + by) / 2 - sag, (az + bz) / 2);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(ax, ay, az), mid, new THREE.Vector3(bx, by, bz));
      geoms.push(new THREE.TubeGeometry(curve, 12, 0.032, 4));
    };
    const chain = (list, x) => {
      for (let i = 0; i < list.length - 1; i++){
        for (const off of [-0.68, 0, 0.68]) wire(x + off, 7.28, list[i], x + off, 7.28, list[i + 1], 1.15);
        wire(x + 0.5, 6.35, list[i], x + 0.5, 6.35, list[i + 1], 0.9);
      }
    };
    chain(leftZ, -8.9);
    chain(rightZ, 8.9);
    for (const off of [-0.5, 0.5]) wire(-8.9, 7.28, 20 + off, 8.9, 7.28, 20 + off, 0.85);  // 跨街線
    const wiresMesh = new THREE.Mesh(mergeGeoms(geoms), darkMat);
    wiresMesh.castShadow = true;
    scene.add(wiresMesh);
  }

  /* ================= 路燈 ================= */
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x6a7076, roughness: 0.6, metalness: 0.5 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xffe9b8, emissiveIntensity: 0.05 });
    glow.lampBulbMat = bulbMat;
    const glowTex = glowTexture();
    const lampDefs = [
      { x: 8.7, z: 45, dir: -1 }, { x: -8.7, z: 26, dir: 1 }, { x: 8.7, z: 2, dir: -1 },
      { x: -8.7, z: -18, dir: 1 }, { x: 8.7, z: -40, dir: -1 }, { x: -8.7, z: -66, dir: 1 }, { x: 8.7, z: -92, dir: -1 }
    ];
    for (const ld of lampDefs){
      const grp = new THREE.Group();
      grp.position.set(ld.x, 0, ld.z);
      grp.rotation.y = ld.dir > 0 ? Math.PI : 0;   // 燈臂朝向馬路
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
      addCol(ld.x - 0.22, ld.x + 0.22, ld.z - 0.22, ld.z + 0.22);
    }
  }

  /* ================= 樹木（櫻花 + 綠樹） ================= */
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
      const col = kind === 'sakura' ? (Math.random() > 0.5 ? 0xf2aecb : 0xeb9cc2) : (Math.random() > 0.5 ? 0x5d7a4a : 0x6b8a52);
      for (let i = 0; i < 3; i++){
        const b = blob(rand(0.85, 1.25) * s);
        b.translate(x + rand(-0.6, 0.6) * s, (2.1 + i * 0.5 + rand(-0.2, 0.2)) * s, z + rand(-0.6, 0.6) * s);
        // 同一樹冠用同色 → 依 kind 分堆即可（色彩差異靠 flatShading 光影）
        arr.push(b);
      }
      addCol(x - 0.45, x + 0.45, z - 0.45, z + 0.45);
    };
    // 街道兩側
    tree(-10.6, 18, 'sakura', 1.15);
    tree(-10.6, 48, 'sakura', 1.0);
    tree(-10.6, -38, 'green', 1.1);
    tree(-10.6, -70, 'green', 1.2);
    tree(10.6, 34, 'sakura', 1.05);
    tree(10.6, -12, 'green', 1.0);
    tree(10.6, -58, 'green', 1.15);
    tree(10.6, -84, 'sakura', 1.0);
    // 湖畔
    tree(140, -30, 'sakura', 1.5);
    tree(150, 60, 'sakura', 1.3);
    tree(160, -120, 'green', 1.6);
    tree(24, 100, 'green', 1.2);
    tree(-30, -108, 'sakura', 1.25);
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
  // 垃圾桶
  for (const [bx, bz] of [[9.7, 7.5], [-6.6, 29.5]]){
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.85, 10),
      new THREE.MeshStandardMaterial({ color: 0x2e5e46, roughness: 0.7 }));
    bin.position.set(bx, 0.43, bz);
    A(bin);
    addCol(bx - 0.34, bx + 0.34, bz - 0.34, bz + 0.34);
  }
  // 交通錐
  for (const [cx, cz] of [[-5.4, -8.5], [5.6, 26]]){
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.2, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8641e, roughness: 0.7 }));
    cone.position.set(cx, 0.28, cz);
    A(cone);
  }
  // 巴士站
  {
    const grp = new THREE.Group();
    grp.position.set(10.4, 0, 8);
    const pm = new THREE.MeshStandardMaterial({ color: 0x596066, roughness: 0.6, metalness: 0.4 });
    for (const pz of [-1.4, 1.4]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), pm);
      post.position.set(0, 1.25, pz);
      post.castShadow = true;
      grp.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xd8dcde, roughness: 0.6 }));
    roof.position.set(0, 2.55, 0);
    roof.castShadow = true;
    grp.add(roof);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }));
    bench.position.set(-0.55, 0.5, 0);
    grp.add(bench);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshStandardMaterial({ map: textTexture('バス', '#2b6cb0', '#ffffff', 96, 96, 40), roughness: 0.7 }));
    sign.position.set(0.55, 2.1, 1.75);
    sign.rotation.y = -Math.PI / 2;
    grp.add(sign);
    scene.add(grp);
    addCol(9.5, 11.3, 6.4, 9.6);
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
    const ex = Math.abs(rotY) > 0.1 ? 2.3 : 1.1;
    const ez = Math.abs(rotY) > 0.1 ? 1.1 : 2.3;
    addCol(x - ex, x + ex, z - ez, z + ez);
  }
  car(0xc9ccd0, -8.3, -16.6, Math.PI / 2);    // 銀色輕型車（照片同款位置）
  car(0x8a1f1f, -8.3, -9.2, -Math.PI / 2);
  car(0x3a5a8a, 4.9, -38, 0);

  /* ================= 東側小路 + 河口湖 ================= */
  {
    const sideRoad = new THREE.Mesh(new THREE.PlaneGeometry(140, 7),
      new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.95 }));
    sideRoad.rotation.x = -Math.PI / 2;
    sideRoad.position.set(76, 0.01, 18);
    sideRoad.receiveShadow = true;
    scene.add(sideRoad);
    // 岸邊沙地
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(760, 460),
      new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(515, 0.02, -80);
    sand.receiveShadow = true;
    scene.add(sand);
    // 湖水
    const water = new THREE.Mesh(new THREE.PlaneGeometry(710, 390),
      new THREE.MeshStandardMaterial({ color: 0x3f6f92, roughness: 0.12, metalness: 0.72 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(520, 0.06, -80);
    scene.add(water);
    // 棧橋
    const pier = new THREE.Mesh(new THREE.BoxGeometry(11, 0.22, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x7a5f42, roughness: 0.95 }));
    pier.position.set(157, 0.5, 30);
    pier.castShadow = true;
    pier.receiveShadow = true;
    scene.add(pier);
    const pm2 = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    for (const [px, pz] of [[153, 29], [153, 31], [161, 29], [161, 31]]){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), pm2);
      post.position.set(px, 0.2, pz);
      scene.add(post);
    }
    // 水域碰撞（留出棧橋走道）
    addCol(150, 900, -280, 27);
    addCol(150, 900, 33, 122);
    addCol(162, 900, 26.5, 33.5);
  }

  /* ================= 遠山 ================= */
  {
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x46584f });
    const hills = [
      [-1600, -200, 950, 270], [-1200, 900, 800, 200], [400, 1800, 1100, 230],
      [1900, -300, 1050, 300], [2400, 700, 900, 220], [-900, -1600, 900, 190], [1500, -1500, 950, 210]
    ];
    for (const [hx, hz, hr, hh] of hills){
      const h = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 24), hillMat);
      h.position.set(hx, hh / 2 - 4, hz);
      scene.add(h);
    }
  }

  /* ================= 富士山 ================= */
  {
    const pts = [];
    for (let i = 0; i <= 26; i++){
      const t = i / 26;
      pts.push(new THREE.Vector2(Math.max(FUJI.R * Math.pow(1 - t, 1.3), 0), t * FUJI.H));
    }
    const fujiGeo = new THREE.LatheGeometry(pts, 72);
    const fujiUniforms = {
      uBody: { value: new THREE.Color(0x647c8a) },
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
          float sl = 0.36 + (n1 - 0.5) * 0.14;
          float snow = smoothstep(sl, sl + 0.10, h + (n1 - 0.5) * 0.12);
          vec3 col = mix(uBody, uSnow, snow);
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
    // 富士山腳的丘陵
    const footMat = new THREE.MeshLambertMaterial({ color: 0x4a5a68 });
    for (const [fx, fz, fr, fh] of [[-2900, -3100, 950, 180], [2800, -3400, 900, 160], [-4100, -2400, 1000, 190], [4000, -2800, 1000, 170]]){
      const f = new THREE.Mesh(new THREE.ConeGeometry(fr, fh, 24), footMat);
      f.position.set(fx, fh / 2 - 4, fz);
      scene.add(f);
    }
  }

  /* ================= 邊界 & 地面高度 ================= */
  addCol(-102, -99.5, -130, 130);        // 西
  addCol(400, 403, -130, 130);           // 東（湖區外）
  addCol(-103, 403, -119.5, -118.2);     // 北
  addCol(-103, 403, 118.2, 119.5);       // 南

  function groundHeightAt(x, z){
    if (x > -10.7 && x < -5.7 && z > -21.7 && z < -2.9) return 0.152;   // 7-11 停車場
    if ((x > 6.0 && x < 9.3) || (x < -6.0 && x > -9.3)) return 0.14;    // 人行道
    if (x > 151.5 && x < 162.5 && z > 28.6 && z < 31.4) return 0.61;    // 棧橋
    return 0;
  }

  return world;
}
