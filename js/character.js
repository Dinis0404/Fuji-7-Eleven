/* 玩家角色：低多邊形小旅人 + 行走動畫 + 碰撞 */
'use strict';

function createCharacter(scene){
  const M = {
    jacket: new THREE.MeshStandardMaterial({ color: 0x3a6ea8, roughness: 0.85 }),
    pants:  new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.9 }),
    skin:   new THREE.MeshStandardMaterial({ color: 0xe8b48c, roughness: 0.7 }),
    hair:   new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.9 }),
    shoe:   new THREE.MeshStandardMaterial({ color: 0x26221f, roughness: 0.9 }),
    cap:    new THREE.MeshStandardMaterial({ color: 0xd84b40, roughness: 0.85 }),
    pack:   new THREE.MeshStandardMaterial({ color: 0xc65b4e, roughness: 0.9 })
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const legL = new THREE.Group(); legL.position.set(-0.1, 0.52, 0);
  const legR = new THREE.Group(); legR.position.set(0.1, 0.52, 0);
  for (const [leg, sx] of [[legL, -1], [legR, 1]]){
    const lm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.5, 0.2), M.pants);
    lm.position.y = -0.25;
    leg.add(lm);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.31), M.shoe);
    shoe.position.set(0, -0.48, 0.04);
    leg.add(shoe);
    body.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), M.jacket);
  torso.position.y = 0.8;
  body.add(torso);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.14), M.pack);
  pack.position.set(0, 0.84, 0.19);
  body.add(pack);
  const armL = new THREE.Group(); armL.position.set(-0.28, 1.03, 0);
  const armR = new THREE.Group(); armR.position.set(0.28, 1.03, 0);
  for (const arm of [armL, armR]){
    const am = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.48, 0.13), M.jacket);
    am.position.y = -0.2;
    arm.add(am);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.1), M.skin);
    hand.position.y = -0.46;
    arm.add(hand);
    body.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), M.skin);
  head.position.y = 1.27;
  body.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 10), M.hair);
  hair.position.set(0, 1.3, 0.025);
  hair.scale.set(1, 0.85, 1);
  body.add(hair);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.178, 0.09, 14), M.cap);
  capTop.position.y = 1.37;
  body.add(capTop);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.15), M.cap);
  brim.position.set(0, 1.335, -0.17);
  body.add(brim);

  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);

  const S = {
    pos: new THREE.Vector3(0, 0, 60),
    vy: 0, grounded: true, yaw: 0, phase: 0, speedSm: 0
  };

  function update(dt, inp, colliders, groundAt){
    // 輸入 → 相機相對移動方向
    const f = (inp.f ? 1 : 0) - (inp.b ? 1 : 0);
    const r = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    let mx = 0, mz = 0, moving = false;
    if (f || r){
      const fx = -Math.sin(inp.yaw), fz = -Math.cos(inp.yaw);
      const rx = -fz, rz = fx;
      mx = fx * f + rx * r;
      mz = fz * f + rz * r;
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      moving = true;
    }
    const sp = inp.run ? 7.2 : 3.6;
    S.speedSm = lerp(S.speedSm, moving ? sp : 0, 1 - Math.exp(-dt * 9));
    S.pos.x += mx * S.speedSm * dt;
    S.pos.z += mz * S.speedSm * dt;

    // 跳躍與重力
    if (inp.jump && S.grounded){ S.vy = 6.8; S.grounded = false; }
    inp.jump = false;
    S.vy -= 18 * dt;
    S.pos.y += S.vy * dt;
    const g = groundAt(S.pos.x, S.pos.z);
    if (S.pos.y <= g){ S.pos.y = g; S.vy = 0; S.grounded = true; }
    else if (S.pos.y > g + 0.03) S.grounded = false;

    // 圓形碰撞推離
    const RR = 0.38;
    for (let it = 0; it < 2; it++){
      for (const c of colliders){
        const nx = clamp(S.pos.x, c.x1, c.x2), nz = clamp(S.pos.z, c.z1, c.z2);
        const dx = S.pos.x - nx, dz = S.pos.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < RR * RR){
          if (d2 > 1e-6){
            const d = Math.sqrt(d2);
            S.pos.x = nx + dx / d * RR;
            S.pos.z = nz + dz / d * RR;
          } else {
            const pl = S.pos.x - c.x1, pr = c.x2 - S.pos.x, pt = S.pos.z - c.z1, pb = c.z2 - S.pos.z;
            const m = Math.min(pl, pr, pt, pb);
            if (m === pl) S.pos.x = c.x1 - RR;
            else if (m === pr) S.pos.x = c.x2 + RR;
            else if (m === pt) S.pos.z = c.z1 - RR;
            else S.pos.z = c.z2 + RR;
          }
        }
      }
    }

    // 朝向
    if (moving){
      const ty = Math.atan2(-mx, -mz);
      let d = ty - S.yaw;
      d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
      S.yaw += d * (1 - Math.exp(-dt * 11));
    }
    root.position.copy(S.pos);
    root.rotation.y = S.yaw;

    // 行走動畫
    S.phase += S.speedSm * dt * 2.7;
    const k = Math.min(S.speedSm / 7, 1);
    const a = Math.sin(S.phase) * k;
    if (S.grounded){
      legL.rotation.x = a * 0.62;
      legR.rotation.x = -a * 0.62;
      armL.rotation.x = -a * 0.5;
      armR.rotation.x = a * 0.5;
      body.position.y = Math.abs(Math.cos(S.phase)) * 0.05 * k;
    } else {
      legL.rotation.x = -0.5;
      legR.rotation.x = 0.3;
      armL.rotation.x = -0.7;
      armR.rotation.x = -0.7;
      body.position.y = 0.02;
    }
  }

  return { root, state: S, update };
}
