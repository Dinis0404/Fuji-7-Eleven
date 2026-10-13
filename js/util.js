/* 共用小工具 */
'use strict';

const TAU = Math.PI * 2;
/* 啟用正確的 sRGB 色彩管理（r149），讓顏色所見即所得 */
if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
function clamp(x, a, b){ return x < a ? a : (x > b ? b : x); }
function lerp(a, b, t){ return a + (b - a) * t; }
function smoothstep(a, b, x){ const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function rand(a, b){ return a + Math.random() * (b - a); }

function makeCanvasTexture(w, h, draw){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  return t;
}

/* 合併多個 BufferGeometry（僅 position + normal，適用純色材質） */
function mergeGeoms(geoms){
  const flat = geoms.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0;
  for (const g of flat) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of flat){
    pos.set(g.attributes.position.array, o);
    nor.set(g.attributes.normal.array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/* 柔光貼圖（路燈光暈 / 月暈） */
function glowTexture(){
  return makeCanvasTexture(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.42)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });
}

/* 雪花 / 柔點貼圖 */
function softDotTexture(){
  return makeCanvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 1, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
}

/* 雲朵貼圖 */
function cloudTexture(){
  return makeCanvasTexture(256, 128, (g) => {
    g.clearRect(0, 0, 256, 128);
    const blob = (x, y, r, a) => {
      const gr = g.createRadialGradient(x, y, 1, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,' + a + ')');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(128, 70, 62, 0.95);
    blob(80, 78, 44, 0.85);
    blob(180, 80, 46, 0.85);
    blob(56, 86, 30, 0.6);
    blob(210, 88, 30, 0.6);
    blob(120, 50, 40, 0.7);
    blob(160, 55, 34, 0.6);
  });
}

/* 文字招牌貼圖 */
function textTexture(text, bg, fg, w, h, fontSize, vertical){
  return makeCanvasTexture(w || 256, h || 96, (g, cw, ch) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, cw - 6, ch - 6);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (vertical){
      const chars = text.split('');
      const step = ch / (chars.length + 0.6);
      g.font = '700 ' + Math.min(fontSize || 52, step * 0.9) + 'px "Yu Gothic","Meiryo","Microsoft JhengHei",sans-serif';
      chars.forEach((ch2, i) => g.fillText(ch2, cw / 2, step * (i + 0.9)));
    } else {
      g.font = '700 ' + (fontSize || 40) + 'px "Yu Gothic","Meiryo","Microsoft JhengHei",sans-serif';
      g.fillText(text, cw / 2, ch / 2 + 2);
    }
  });
}
