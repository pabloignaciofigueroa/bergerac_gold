/* ============================================================
   Chiloé — construcción de geometría del terreno.
   Port fiel del pipeline aprobado en isla_chiloe.html (NIVEL 3):
   máscara satelital → campo alfa suavizado → tierra → alturas
   reales (tiles Terrarium horneados) → taper costero → geometría
   solo-tierra con costa sub-píxel y UVs protegidos.
   Se añade únicamente: atributo aElevM (metros reales por vértice)
   para las curvas de nivel del modo cartográfico.
   ============================================================ */

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('img fail ' + src));
    i.src = src;
  });
}

function largestComponent(mask, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  const stack = new Int32Array(W * H);
  let best = { size: 0, id: -1 };
  let id = 0;
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    let top = 0; stack[top++] = s; label[s] = id;
    let size = 0;
    while (top > 0) {
      const p = stack[--top]; size++;
      const px = p % W, py = (p / W) | 0;
      if (px > 0 && mask[p - 1] && label[p - 1] === -1) { label[p - 1] = id; stack[top++] = p - 1; }
      if (px < W - 1 && mask[p + 1] && label[p + 1] === -1) { label[p + 1] = id; stack[top++] = p + 1; }
      if (py > 0 && mask[p - W] && label[p - W] === -1) { label[p - W] = id; stack[top++] = p - W; }
      if (py < H - 1 && mask[p + W] && label[p + W] === -1) { label[p + W] = id; stack[top++] = p + W; }
    }
    if (size > best.size) best = { size, id };
    id++;
  }
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  const comp = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (label[p] === best.id) {
      comp[p] = 1;
      const px = p % W, py = (p / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
  }
  return { comp, x0, x1, y0, y1 };
}

export async function buildIsland(THREE, urls, opts = {}) {
  const EXAG = opts.exaggeration || 1; /* exageración vertical de maqueta */
  /* --- Máscara de la isla --- */
  const maskImg = await loadImg(urls.mask);
  const W = maskImg.width, H = maskImg.height;
  const mcv = document.createElement('canvas'); mcv.width = W; mcv.height = H;
  const mctx = mcv.getContext('2d'); mctx.drawImage(maskImg, 0, 0);
  const md = mctx.getImageData(0, 0, W, H).data;
  const F = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) F[i] = md[i * 4] / 255;
  for (let pass = 0; pass < 3; pass++) {
    const src = F.slice();
    for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) {
      const p = iy * W + ix;
      F[p] = (src[p] * 4 + (src[p - 1] + src[p + 1] + src[p - W] + src[p + W]) * 2 + src[p - W - 1] + src[p - W + 1] + src[p + W - 1] + src[p + W + 1]) / 16;
    }
  }
  const land = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) land[i] = F[i] > 0.5 ? 1 : 0;
  {
    const lbl = new Int32Array(W * H).fill(-1);
    const stk = new Int32Array(W * H);
    let id = 0; const sizes = [];
    for (let s = 0; s < W * H; s++) {
      if (!land[s] || lbl[s] !== -1) continue;
      let top = 0; stk[top++] = s; lbl[s] = id; let size = 0;
      while (top > 0) {
        const p = stk[--top]; size++;
        const px = p % W, py = (p / W) | 0;
        if (px > 0 && land[p - 1] && lbl[p - 1] === -1) { lbl[p - 1] = id; stk[top++] = p - 1; }
        if (px < W - 1 && land[p + 1] && lbl[p + 1] === -1) { lbl[p + 1] = id; stk[top++] = p + 1; }
        if (py > 0 && land[p - W] && lbl[p - W] === -1) { lbl[p - W] = id; stk[top++] = p - W; }
        if (py < H - 1 && land[p + W] && lbl[p + W] === -1) { lbl[p + W] = id; stk[top++] = p + W; }
      }
      sizes.push(size); id++;
    }
    for (let p = 0; p < W * H; p++) if (land[p] && sizes[lbl[p]] < 12) land[p] = 0;
  }
  const mb = largestComponent(land, W, H);

  /* --- Elevación real --- */
  let elev = null, EW = 0, EH = 0, eb = null;
  try {
    const eimg = await loadImg(urls.elev);
    EW = eimg.width; EH = eimg.height;
    const ecv = document.createElement('canvas'); ecv.width = EW; ecv.height = EH;
    const ectx = ecv.getContext('2d'); ectx.drawImage(eimg, 0, 0);
    const ed = ectx.getImageData(0, 0, EW, EH).data;
    elev = new Float32Array(EW * EH);
    for (let i = 0; i < EW * EH; i++) elev[i] = ed[i * 4] * 4;
    const eland = new Uint8Array(EW * EH);
    for (let i = 0; i < EW * EH; i++) eland[i] = elev[i] > 2 ? 1 : 0;
    eb = largestComponent(eland, EW, EH);
  } catch (e) {
    console.warn('Sin tiles de elevación; usando relieve procedural', e);
    elev = null;
  }

  /* --- Alturas por píxel de máscara (metros) --- */
  const hgt = new Float32Array(W * H);
  if (elev && eb && mb.x1 > mb.x0 && eb.x1 > eb.x0) {
    const sx = (eb.x1 - eb.x0) / (mb.x1 - mb.x0);
    const sy = (eb.y1 - eb.y0) / (mb.y1 - mb.y0);
    for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
      const p = iy * W + ix;
      if (!land[p]) continue;
      const fx = eb.x0 + (ix - mb.x0) * sx;
      const fy = eb.y0 + (iy - mb.y0) * sy;
      if (fx < 0 || fx > EW - 1.001 || fy < 0 || fy > EH - 1.001) { hgt[p] = 45; continue; }
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      hgt[p] = Math.max(6,
        elev[y0 * EW + x0] * (1 - tx) * (1 - ty) + elev[y0 * EW + x0 + 1] * tx * (1 - ty)
        + elev[(y0 + 1) * EW + x0] * (1 - tx) * ty + elev[(y0 + 1) * EW + x0 + 1] * tx * ty);
    }
  } else {
    const dist = new Float32Array(W * H);
    for (let p = 0; p < W * H; p++) dist[p] = land[p] ? 1e6 : 0;
    for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
      const p = iy * W + ix; if (!land[p]) continue;
      if (ix > 0) dist[p] = Math.min(dist[p], dist[p - 1] + 1);
      if (iy > 0) dist[p] = Math.min(dist[p], dist[p - W] + 1);
    }
    for (let iy = H - 1; iy >= 0; iy--) for (let ix = W - 1; ix >= 0; ix--) {
      const p = iy * W + ix; if (!land[p]) continue;
      if (ix < W - 1) dist[p] = Math.min(dist[p], dist[p + 1] + 1);
      if (iy < H - 1) dist[p] = Math.min(dist[p], dist[p + W] + 1);
    }
    for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
      const p = iy * W + ix; if (!land[p]) continue;
      const t = Math.min(1, Math.max(0, (ix - mb.x0) / Math.max(1, mb.x1 - mb.x0)));
      hgt[p] = Math.max(6, Math.min(830, 60 * dist[p] * (1.5 - t)));
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    const src = hgt.slice();
    for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) {
      const p = iy * W + ix;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += src[p + dy * W + dx];
      hgt[p] = sum / 9;
    }
  }

  /* --- Distancia a costa (chamfer) --- */
  const coast = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) coast[p] = land[p] ? 1e6 : 0;
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const p = iy * W + ix; if (!land[p]) continue;
    if (ix > 0) coast[p] = Math.min(coast[p], coast[p - 1] + 1);
    if (iy > 0) coast[p] = Math.min(coast[p], coast[p - W] + 1);
    if (ix > 0 && iy > 0) coast[p] = Math.min(coast[p], coast[p - W - 1] + 1.414);
    if (ix < W - 1 && iy > 0) coast[p] = Math.min(coast[p], coast[p - W + 1] + 1.414);
  }
  for (let iy = H - 1; iy >= 0; iy--) for (let ix = W - 1; ix >= 0; ix--) {
    const p = iy * W + ix; if (!land[p]) continue;
    if (ix < W - 1) coast[p] = Math.min(coast[p], coast[p + 1] + 1);
    if (iy < H - 1) coast[p] = Math.min(coast[p], coast[p + W] + 1);
    if (ix < W - 1 && iy < H - 1) coast[p] = Math.min(coast[p], coast[p + W + 1] + 1.414);
    if (ix > 0 && iy < H - 1) coast[p] = Math.min(coast[p], coast[p + W - 1] + 1.414);
  }

  /* --- Geometría --- */
  const D = 0.62;
  const WD = D * W / H;
  const vScale = 6 * D / 205000 * EXAG;
  const fringeY = -0.0008;
  const pos = new Float32Array(W * H * 3);
  const uv = new Float32Array(W * H * 2);
  const elevM = new Float32Array(W * H); /* metros reales por vértice (curvas de nivel) */
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const p = iy * W + ix;
    pos[p * 3] = (ix / (W - 1) - 0.5) * WD;
    let y = fringeY;
    if (land[p]) {
      const t = Math.min(1, coast[p] / 6);
      const tt = t * t * (3 - 2 * t);
      y = Math.max(4, hgt[p]) * vScale * tt;
      elevM[p] = Math.max(4, hgt[p]) * tt;
    }
    pos[p * 3 + 1] = y;
    pos[p * 3 + 2] = (iy / (H - 1) - 0.5) * D;
    uv[p * 2] = ix / (W - 1);
    uv[p * 2 + 1] = 1 - iy / (H - 1);
  }
  const idxArr = [];
  for (let iy = 0; iy < H - 1; iy++) for (let ix = 0; ix < W - 1; ix++) {
    const a = iy * W + ix, b = a + 1, c = a + W, d = c + 1;
    if (!(land[a] || land[b] || land[c] || land[d])) continue;
    idxArr.push(a, c, b, c, d, b);
  }
  {
    const used = new Uint8Array(W * H);
    for (const i of idxArr) used[i] = 1;
    const cellX = WD / (W - 1), cellZ = D / (H - 1);
    for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) {
      const p = iy * W + ix;
      if (!used[p]) continue;
      if (land[p] && coast[p] >= 2) continue;
      const gx = (F[p + 1] - F[p - 1]) / 2, gy = (F[p + W] - F[p - W]) / 2;
      const g2 = gx * gx + gy * gy;
      if (g2 < 0.0004) continue;
      let dx = (0.5 - F[p]) * gx / g2, dy = (0.5 - F[p]) * gy / g2;
      const len = Math.hypot(dx, dy);
      const cap = land[p] ? Math.max(0, 1.8 - coast[p]) : 1.8;
      if (len > cap) { if (cap <= 0) continue; dx *= cap / len; dy *= cap / len; }
      pos[p * 3] += dx * cellX;
      pos[p * 3 + 2] += dy * cellZ;
      uv[p * 2] += dx / (W - 1);
      uv[p * 2 + 1] -= dy / (H - 1);
    }
  }
  {
    const FT = new Int32Array(W * H).fill(-1);
    const FD = new Float32Array(W * H).fill(1e12);
    for (let p = 0; p < W * H; p++) if (land[p] && coast[p] >= 6) { FT[p] = p; FD[p] = 0; }
    const relax = (p, q) => {
      const f = FT[q]; if (f === -1) return;
      const dxx = (p % W) - (f % W), dyy = ((p / W) | 0) - ((f / W) | 0);
      const d = dxx * dxx + dyy * dyy;
      if (d < FD[p]) { FD[p] = d; FT[p] = f; }
    };
    for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
      const p = iy * W + ix;
      if (ix > 0) relax(p, p - 1);
      if (iy > 0) { relax(p, p - W); if (ix > 0) relax(p, p - W - 1); if (ix < W - 1) relax(p, p - W + 1); }
    }
    for (let iy = H - 1; iy >= 0; iy--) for (let ix = W - 1; ix >= 0; ix--) {
      const p = iy * W + ix;
      if (ix < W - 1) relax(p, p + 1);
      if (iy < H - 1) { relax(p, p + W); if (ix < W - 1) relax(p, p + W + 1); if (ix > 0) relax(p, p + W - 1); }
    }
    const used = new Uint8Array(W * H);
    for (const i of idxArr) used[i] = 1;
    for (let p = 0; p < W * H; p++) {
      if (!used[p] || FT[p] === -1 || FD[p] > 100) continue;
      let k = land[p] ? Math.max(0, 1 - coast[p] / 6) : 1;
      if (k <= 0) continue;
      k = k * k * (3 - 2 * k);
      const f = FT[p];
      const tu = (f % W) / (W - 1), tv = 1 - ((f / W) | 0) / (H - 1);
      uv[p * 2] += (tu - uv[p * 2]) * k * 0.85;
      uv[p * 2 + 1] += (tv - uv[p * 2 + 1]) * k * 0.85;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('aElevM', new THREE.BufferAttribute(elevM, 1));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idxArr), 1));
  geo.computeVertexNormals();

  const tex = await new THREE.TextureLoader().loadAsync(urls.tex);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;

  return { geo, tex, land, coast, hgt, F, W, H, WD, D, vScale };
}

/* ============================================================
   Lámina cartográfica — generadores de dibujo (no volcado de malla)
   ============================================================ */

/* Marching squares sobre un campo escalar → segmentos [x,y,z,...] en
   coords de modelo. yFor(level) define la altura del trazo. */
export function fieldContour(field, W, H, iso, WD, D, y) {
  const seg = [];
  const X = ix => (ix / (W - 1) - .5) * WD;
  const Z = iy => (iy / (H - 1) - .5) * D;
  const lerp = (a, b) => (iso - a) / (b - a || 1e-9);
  for (let iy = 0; iy < H - 1; iy++) {
    for (let ix = 0; ix < W - 1; ix++) {
      const a = field[iy * W + ix], b = field[iy * W + ix + 1];
      const c = field[(iy + 1) * W + ix + 1], d = field[(iy + 1) * W + ix];
      let code = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
      if (code === 0 || code === 15) continue;
      /* puntos de cruce por arista: top(ab) right(bc) bottom(dc) left(ad) */
      const pts = {
        t: [X(ix + lerp(a, b)), y, Z(iy)],
        r: [X(ix + 1), y, Z(iy + lerp(b, c))],
        b: [X(ix + lerp(d, c)), y, Z(iy + 1)],
        l: [X(ix), y, Z(iy + lerp(a, d))],
      };
      const CASES = {
        1: ['l', 'b'], 2: ['b', 'r'], 3: ['l', 'r'], 4: ['t', 'r'],
        5: ['t', 'l', 'b', 'r'], 6: ['t', 'b'], 7: ['t', 'l'],
        8: ['t', 'l'], 9: ['t', 'b'], 10: ['t', 'r', 'l', 'b'],
        11: ['t', 'r'], 12: ['l', 'r'], 13: ['b', 'r'], 14: ['l', 'b'],
      };
      const e = CASES[code];
      for (let k = 0; k < e.length; k += 2) {
        seg.push(...pts[e[k]], ...pts[e[k + 1]]);
      }
    }
  }
  return new Float32Array(seg);
}

/* Cumbres destacadas: máximos locales del campo de alturas, separados. */
export function findPeaks(hgt, land, W, H, count, minSepPx) {
  const cands = [];
  const R = 8;
  for (let iy = R; iy < H - R; iy += 2) {
    for (let ix = R; ix < W - R; ix += 2) {
      const p = iy * W + ix;
      if (!land[p]) continue;
      const v = hgt[p];
      if (v < 60) continue;
      let isMax = true;
      for (let dy = -R; dy <= R && isMax; dy += 2) {
        for (let dx = -R; dx <= R; dx += 2) {
          if (hgt[(iy + dy) * W + ix + dx] > v) { isMax = false; break; }
        }
      }
      if (isMax) cands.push({ ix, iy, v });
    }
  }
  cands.sort((a, b) => b.v - a.v);
  const picked = [];
  for (const c of cands) {
    if (picked.length >= count) break;
    if (picked.every(q => Math.hypot(q.ix - c.ix, q.iy - c.iy) > minSepPx)) picked.push(c);
  }
  return picked;
}

