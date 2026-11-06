// Efsun Avcısı — prosedürel karakter ve düşman çizimleri (dosya/görsel gerektirmez)
const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };
const ell = (ctx, x, y, a, b, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, a, b, rot, 0, TAU); };

function shade(hex, amt) {
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ====================================================================== KAHRAMANLAR
export const HERO_LOOK = {
  kaya: { skin: '#f2c9a0', main: '#3b82f6', dark: '#1e3a8a', trim: '#facc15', cape: '#1d4ed8', hair: '#5b3a1e', boot: '#3f2a1a', head: 'helm' },
  lina: { skin: '#f6d5b8', main: '#22c55e', dark: '#14532d', trim: '#fde68a', cape: '#166534', hair: '#fcd34d', boot: '#5b3a1e', head: 'elf' },
  zerk: { skin: '#d9a27a', main: '#b91c1c', dark: '#450a0a', trim: '#d6d3d1', cape: '#78350f', hair: '#9a3412', boot: '#292524', head: 'horns' },
  nyx:  { skin: '#ede9fe', main: '#7c3aed', dark: '#2e1065', trim: '#f0abfc', cape: '#3b0764', hair: '#1e1b4b', boot: '#1e1b4b', head: 'witch' },
};

// st: { t, walk, moving, aim, atk(0..1), hurt(0..1), wtype }
export function drawHero(ctx, id, x, y, s, st) {
  const L = HERO_LOOK[id] || HERO_LOOK.kaya;
  const flip = Math.cos(st.aim) < 0;
  const la = flip ? Math.PI - st.aim : st.aim;
  const t = st.t, mv = st.moving ? 1 : 0;
  const sw = Math.sin(st.walk) * mv;
  const bob = -Math.abs(Math.sin(st.walk)) * 2.5 * mv + Math.sin(t * 3) * 0.7 * (1 - mv);
  ctx.save();
  ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  if (st.atk > 0.6) ctx.translate(-(st.atk - 0.6) * 5, 0); // geri tepme

  // pelerin
  const wave = Math.sin(t * 7) * 2 + mv * 4;
  const cg = ctx.createLinearGradient(0, -14, 0, 14);
  cg.addColorStop(0, L.cape); cg.addColorStop(1, shade(L.cape, -0.45));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(-6, -13 + bob);
  ctx.quadraticCurveTo(-15 - wave, -2, -13 - wave * 1.4, 13 + Math.sin(t * 9) * 1.5);
  ctx.lineTo(-7 - wave * 0.6, 11); ctx.lineTo(-2, 13);
  ctx.lineTo(5, -13 + bob); ctx.closePath(); ctx.fill();

  // bacaklar
  if (L.head !== 'witch') {
    ctx.fillStyle = L.boot;
    rr(ctx, -6 - sw * 4, 3 + bob * 0.3, 5.5, 11 + (sw > 0 ? -1 : 0), 2.5); ctx.fill();
    ctx.fillStyle = shade(L.boot, 0.15);
    rr(ctx, 0.5 + sw * 4, 3 + bob * 0.3, 5.5, 11 + (sw < 0 ? -1 : 0), 2.5); ctx.fill();
  }

  // gövde
  const bg = ctx.createLinearGradient(-9, -14, 9, 6);
  bg.addColorStop(0, shade(L.main, 0.25)); bg.addColorStop(1, shade(L.main, -0.25));
  ctx.fillStyle = bg;
  if (L.head === 'witch') {
    ctx.beginPath(); ctx.moveTo(-7, -13 + bob); ctx.lineTo(7, -13 + bob);
    ctx.lineTo(11 + sw * 2, 14); ctx.quadraticCurveTo(0, 17 + Math.sin(t * 6), -11 + sw * 2, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = L.trim; ctx.fillRect(-10, 11, 21, 2);
  } else {
    rr(ctx, -8.5, -13 + bob, 17, 18, 5); ctx.fill();
  }
  ctx.fillStyle = shade(L.dark, 0.1); ctx.fillRect(-8.5, 0 + bob, 17, 3);           // kemer
  ctx.fillStyle = L.trim; rr(ctx, -2, -0.5 + bob, 4, 4, 1); ctx.fill();               // toka
  if (L.head === 'helm') { ctx.fillStyle = L.trim; ctx.fillRect(-1.2, -12 + bob, 2.4, 11); } // zırh çizgisi
  if (L.head === 'horns') { ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -12 + bob); ctx.lineTo(6, 0 + bob); ctx.stroke(); }

  // arka kol
  ctx.fillStyle = shade(L.main, -0.35);
  circ(ctx, -7 + sw * 2, -4 + bob, 3.6); ctx.fill();

  // kafa
  const hy = -23 + bob;
  if (L.head === 'elf') { // at kuyruğu
    ctx.fillStyle = L.hair;
    ctx.beginPath(); ctx.moveTo(-8, hy - 4);
    ctx.quadraticCurveTo(-19 - wave, hy + 2, -15 - wave * 1.2, hy + 14 + Math.sin(t * 8) * 2);
    ctx.quadraticCurveTo(-11, hy + 4, -5, hy + 1); ctx.closePath(); ctx.fill();
  }
  if (L.head === 'witch') { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.moveTo(-10, hy - 2); ctx.quadraticCurveTo(-14, hy + 10, -9 - wave * 0.5, hy + 15); ctx.lineTo(-3, hy + 4); ctx.closePath(); ctx.fill(); }
  const sg = ctx.createRadialGradient(2, hy - 4, 2, 0, hy, 12);
  sg.addColorStop(0, shade(L.skin, 0.15)); sg.addColorStop(1, shade(L.skin, -0.12));
  ctx.fillStyle = sg; circ(ctx, 0, hy, 10.5); ctx.fill();
  if (L.head === 'elf') { ctx.fillStyle = L.skin; ctx.beginPath(); ctx.moveTo(-6, hy - 2); ctx.lineTo(-14, hy - 9); ctx.lineTo(-7, hy + 3); ctx.fill(); }
  // yanaklar
  ctx.fillStyle = 'rgba(244,114,182,0.35)'; ell(ctx, 7.5, hy + 4, 2.4, 1.5); ctx.fill();
  // gözler (göz kırpma)
  const blink = (t + (id.length * 0.7)) % 3.6 < 0.12;
  const eyeC = L.head === 'witch' ? '#a855f7' : L.head === 'horns' ? '#7f1d1d' : '#1e293b';
  if (blink) { ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1.5, hy + 0.5); ctx.lineTo(4.5, hy + 0.5); ctx.moveTo(7, hy + 0.5); ctx.lineTo(9.5, hy + 0.5); ctx.stroke(); }
  else {
    ctx.fillStyle = '#fff'; ell(ctx, 3, hy, 2.4, 3); ctx.fill(); ell(ctx, 8.2, hy, 2, 2.8); ctx.fill();
    ctx.fillStyle = eyeC; circ(ctx, 3.8, hy + 0.4, 1.6); ctx.fill(); circ(ctx, 8.8, hy + 0.4, 1.4); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, 4.3, hy - 0.5, 0.6); ctx.fill();
  }
  // kaşlar ve ağız
  ctx.strokeStyle = shade(L.hair, -0.2); ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (L.head === 'horns') { ctx.moveTo(1, hy - 5); ctx.lineTo(5.5, hy - 3); ctx.moveTo(10, hy - 4.5); ctx.lineTo(7, hy - 3); }
  else { ctx.moveTo(1.5, hy - 4.2); ctx.lineTo(5, hy - 4.6); ctx.moveTo(7, hy - 4.4); ctx.lineTo(9.5, hy - 4); }
  ctx.stroke();
  ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.2; ctx.beginPath();
  if (st.atk > 0.3 || st.hurt > 0) { ctx.fillStyle = '#7f1d1d'; ell(ctx, 6, hy + 5.2, 1.6, 1.3); ctx.fill(); }
  else { ctx.arc(6, hy + 4, 2, 0.2, Math.PI - 0.2); ctx.stroke(); }

  // başlık
  if (L.head === 'helm') {
    const hg = ctx.createLinearGradient(0, hy - 12, 0, hy);
    hg.addColorStop(0, '#e2e8f0'); hg.addColorStop(1, '#64748b');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, hy - 1, 11.5, Math.PI, 0); ctx.lineTo(11.5, hy - 1); ctx.lineTo(-11.5, hy - 1); ctx.fill();
    ctx.fillRect(-11.5, hy - 2, 5, 9);
    ctx.fillStyle = L.trim; ctx.fillRect(-11.5, hy - 3, 23, 2.2);
    ctx.fillStyle = '#ef4444';                                          // sorguç
    ctx.beginPath(); ctx.moveTo(-2, hy - 12); ctx.quadraticCurveTo(-12 - wave, hy - 22, -18 - wave * 1.5, hy - 12 + Math.sin(t * 8) * 2); ctx.quadraticCurveTo(-10, hy - 14, -2, hy - 9); ctx.fill();
  } else if (L.head === 'elf') {
    ctx.fillStyle = L.hair;
    ctx.beginPath(); ctx.arc(0, hy - 1, 11, Math.PI * 1.02, Math.PI * 1.95); ctx.quadraticCurveTo(6, hy - 6, 1, hy - 4); ctx.quadraticCurveTo(-4, hy - 7, -10, hy + 2); ctx.fill();
    ctx.fillStyle = L.main; ctx.fillRect(-10, hy - 7, 20, 2.2);
    ctx.fillStyle = L.trim; circ(ctx, 0, hy - 6, 1.6); ctx.fill();
  } else if (L.head === 'horns') {
    ctx.fillStyle = '#57534e';
    ctx.beginPath(); ctx.arc(0, hy - 1, 11.5, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5f5f4';
    ctx.beginPath(); ctx.moveTo(-9, hy - 6); ctx.quadraticCurveTo(-20, hy - 10, -17, hy - 22); ctx.quadraticCurveTo(-14, hy - 12, -5, hy - 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7, hy - 8); ctx.quadraticCurveTo(16, hy - 14, 13, hy - 24); ctx.quadraticCurveTo(12, hy - 14, 3, hy - 10); ctx.fill();
    ctx.fillStyle = L.hair;                                             // sakal
    ctx.beginPath(); ctx.moveTo(-2, hy + 3); ctx.quadraticCurveTo(4, hy + 15, 11, hy + 4); ctx.quadraticCurveTo(6, hy + 8, 2, hy + 6); ctx.fill();
  } else if (L.head === 'witch') {
    ctx.fillStyle = L.dark;
    ell(ctx, 0, hy - 6, 16, 3.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, hy - 7); ctx.quadraticCurveTo(-2, hy - 22, -10 - wave * 0.8, hy - 30 + Math.sin(t * 4) * 1.5); ctx.quadraticCurveTo(4, hy - 20, 9, hy - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = L.trim; ctx.fillRect(-8.5, hy - 10, 17, 2.4);
    ctx.fillStyle = '#fde047'; circ(ctx, 3, hy - 9, 1.6); ctx.fill();
  }

  // ön kol + silah
  drawWeapon(ctx, st.wtype || 'bow', la, st.atk, L, bob, t);

  ctx.restore();
}

function drawWeapon(ctx, w, la, atk, L, bob, t) {
  const sx = 3, sy = -6 + bob;
  ctx.save(); ctx.translate(sx, sy);
  if (w === 'sword') {
    // savuruş: atk 1 → 0 boyunca yay çizer
    const swing = atk > 0 ? -1.7 + (1 - atk) * 3.2 : -0.5 + Math.sin(t * 3) * 0.05;
    ctx.rotate(la + swing);
    if (atk > 0.05 && atk < 0.95) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * atk})`; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, 0, 24, -1.6, 0); ctx.stroke();
    }
    ctx.fillStyle = L.skin; circ(ctx, 7, 0, 3.2); ctx.fill();
    ctx.fillStyle = '#78350f'; rr(ctx, 4, -1.6, 7, 3.2, 1); ctx.fill();
    ctx.fillStyle = L.trim; rr(ctx, 10, -5, 2.6, 10, 1); ctx.fill();
    const blg = ctx.createLinearGradient(12, -2, 12, 2); blg.addColorStop(0, '#f8fafc'); blg.addColorStop(1, '#94a3b8');
    ctx.fillStyle = blg; ctx.beginPath(); ctx.moveTo(12.6, -2.6); ctx.lineTo(36, -1); ctx.lineTo(39, 0); ctx.lineTo(36, 1); ctx.lineTo(12.6, 2.6); ctx.fill();
  } else if (w === 'staff') {
    ctx.rotate(la * 0.5 - 0.5);
    ctx.fillStyle = L.skin; circ(ctx, 8, 0, 3.2); ctx.fill();
    ctx.strokeStyle = '#7c4a1d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2, 12); ctx.lineTo(14, -20); ctx.stroke();
    ctx.strokeStyle = L.trim; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(14.5, -22, 5, 0.5, Math.PI * 1.6); ctx.stroke();
    const glow = 5 + Math.sin(t * 6) * 1 + atk * 6;
    const gg = ctx.createRadialGradient(14.5, -22, 0, 14.5, -22, glow * 2.2);
    gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.3, '#67e8f9'); gg.addColorStop(1, 'rgba(103,232,249,0)');
    ctx.fillStyle = gg; circ(ctx, 14.5, -22, glow * 2.2); ctx.fill();
  } else {
    ctx.rotate(la);
    const pull = atk > 0.7 ? 0 : 6 - atk * 6; // ip gerilir
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(8, 0, 13, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = L.trim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(8, 0, 13, -0.25, 0.25); ctx.stroke();
    const ex = 8 + Math.cos(1.25) * 13, ey = Math.sin(1.25) * 13;
    ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(ex, -ey); ctx.lineTo(ex - pull, 0); ctx.lineTo(ex, ey); ctx.stroke();
    if (atk < 0.6) { // ok takılı
      ctx.strokeStyle = '#e7e5e4'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ex - pull, 0); ctx.lineTo(24, 0); ctx.stroke();
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(27, 0); ctx.lineTo(23, -2.4); ctx.lineTo(23, 2.4); ctx.fill();
    }
    ctx.fillStyle = L.skin; circ(ctx, 21 - 13, 0, 3.2); ctx.fill();
    ctx.fillStyle = L.skin; circ(ctx, ex - pull, 0, 2.8); ctx.fill();
  }
  ctx.restore();
}

// ====================================================================== DÜŞMANLAR
// o: { t, flash, frozen, look (açı), cd, fuse, state }
export function drawEnemy(ctx, e, t) {
  const col = e.flash > 0 ? '#ffffff' : e.frozen > 0 ? '#bae6fd' : e.color;
  const look = e.look || 0;
  const lx = Math.cos(look), ly = Math.sin(look);
  const r = e.r;
  switch (e.type) {
    case 'slime': return slime(ctx, e, r, col, lx, ly, t);
    case 'bat': return bat(ctx, e, r, col, lx, ly, t);
    case 'archer': return skeleton(ctx, e, r, col, look, t);
    case 'golem': return golem(ctx, e, r, col, lx, ly, t);
    case 'bomber': return bomb(ctx, e, r, col, lx, ly, t);
    case 'mage': return mage(ctx, e, r, col, look, t);
    case 'boss': return boss(ctx, e, r, col, lx, ly, t);
  }
}

function eyes(ctx, x, y, r, lx, ly, color = '#111', angry = true, white = '#fff') {
  const s = r * 0.17, o = r * 0.32;
  ctx.fillStyle = white;
  ell(ctx, x - o + lx * s, y + ly * s, s * 1.25, s * 1.45); ctx.fill();
  ell(ctx, x + o + lx * s, y + ly * s, s * 1.25, s * 1.45); ctx.fill();
  ctx.fillStyle = color;
  circ(ctx, x - o + lx * s * 1.6, y + ly * s * 1.4, s * 0.7); ctx.fill();
  circ(ctx, x + o + lx * s * 1.6, y + ly * s * 1.4, s * 0.7); ctx.fill();
  if (angry) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.beginPath();
    ctx.moveTo(x - o - s * 1.4, y - s * 2.2); ctx.lineTo(x - o + s * 1.2, y - s * 1.3);
    ctx.moveTo(x + o + s * 1.4, y - s * 2.2); ctx.lineTo(x + o - s * 1.2, y - s * 1.3); ctx.stroke();
  }
}

function slime(ctx, e, r, col, lx, ly, t) {
  const hop = Math.abs(Math.sin(e.ph * 5));
  const y = -hop * r * 0.45;
  const sq = 1 + (1 - hop) * 0.18 * (hop < 0.3 ? 1 : 0) + (e.hitS || 0) * 0.25;
  const w = r * sq * (1 + Math.sin(t * 9 + e.ph) * 0.03), h = r / sq;
  const g = ctx.createRadialGradient(-r * 0.3, y - r * 0.4, r * 0.1, 0, y, r * 1.2);
  g.addColorStop(0, shade(col.startsWith('#') ? col : '#ffffff', 0.4)); g.addColorStop(1, col.startsWith('#') ? shade(col, -0.25) : col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w, y + h * 0.6);
  ctx.bezierCurveTo(-w * 1.05, y - h * 0.6, -w * 0.5, y - h * 1.15, 0, y - h * 1.1);
  ctx.bezierCurveTo(w * 0.5, y - h * 1.15, w * 1.05, y - h * 0.6, w, y + h * 0.6);
  ctx.quadraticCurveTo(0, y + h * 0.9, -w, y + h * 0.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ell(ctx, -w * 0.4, y - h * 0.55, w * 0.22, h * 0.14, -0.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; circ(ctx, -w * 0.15, y - h * 0.75, r * 0.07); ctx.fill();
  eyes(ctx, 0, y - h * 0.15, r, lx, ly);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx * 2, y + h * 0.28, r * 0.18, Math.PI + 0.4, -0.4); ctx.stroke();
}

function bat(ctx, e, r, col, lx, ly, t) {
  const f = Math.sin(e.ph * 20);
  const y = Math.sin(e.ph * 6) * 3;
  ctx.fillStyle = col === '#ffffff' ? col : shade(col, -0.35);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.5, y);
    ctx.quadraticCurveTo(s * r * 1.6, y - r * (1.3 + f * 0.9), s * r * 2.4, y - r * (0.3 + f * 0.8));
    ctx.quadraticCurveTo(s * r * 2, y + r * 0.2, s * r * 1.7, y + r * 0.1 - f * r * 0.2);
    ctx.quadraticCurveTo(s * r * 1.4, y + r * 0.5, s * r * 1.1, y + r * 0.2);
    ctx.quadraticCurveTo(s * r * 0.8, y + r * 0.6, s * r * 0.4, y + r * 0.3);
    ctx.fill();
  }
  ctx.fillStyle = col; circ(ctx, 0, y, r * 0.85); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * 0.6, y - r * 0.4); ctx.lineTo(-r * 0.4, y - r * 1.25); ctx.lineTo(-r * 0.1, y - r * 0.7);
  ctx.moveTo(r * 0.6, y - r * 0.4); ctx.lineTo(r * 0.4, y - r * 1.25); ctx.lineTo(r * 0.1, y - r * 0.7); ctx.fill();
  eyes(ctx, 0, y - r * 0.1, r, lx, ly, '#dc2626', true, '#fde047');
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-r * 0.25, y + r * 0.3); ctx.lineTo(-r * 0.15, y + r * 0.6); ctx.lineTo(-r * 0.05, y + r * 0.3);
  ctx.moveTo(r * 0.05, y + r * 0.3); ctx.lineTo(r * 0.15, y + r * 0.6); ctx.lineTo(r * 0.25, y + r * 0.3); ctx.fill();
}

function skeleton(ctx, e, r, col, look, t) {
  const bone = col === '#ffffff' ? '#fff' : e.frozen > 0 ? '#bae6fd' : '#e7e5e4';
  const y = Math.sin(e.ph * 4) * 1.2;
  ctx.strokeStyle = bone; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
  // kaburgalar
  ctx.beginPath(); ctx.moveTo(0, y - r * 0.2); ctx.lineTo(0, y + r * 0.9); ctx.stroke();
  ctx.lineWidth = r * 0.09;
  for (let i = 0; i < 3; i++) { const yy = y + r * (0.05 + i * 0.25); ctx.beginPath(); ctx.moveTo(-r * 0.45, yy); ctx.quadraticCurveTo(0, yy - r * 0.15, r * 0.45, yy); ctx.stroke(); }
  // bacaklar
  const w = Math.sin(e.ph * 8) * r * 0.25;
  ctx.beginPath(); ctx.moveTo(0, y + r * 0.9); ctx.lineTo(-r * 0.3 + w, y + r * 1.4); ctx.moveTo(0, y + r * 0.9); ctx.lineTo(r * 0.3 - w, y + r * 1.4); ctx.stroke();
  // kafatası
  const hy = y - r * 0.65;
  ctx.fillStyle = bone; circ(ctx, 0, hy, r * 0.62); ctx.fill();
  rr(ctx, -r * 0.35, hy + r * 0.3, r * 0.7, r * 0.35, 3); ctx.fill();
  ctx.fillStyle = '#1c1917'; circ(ctx, -r * 0.24, hy, r * 0.17); ctx.fill(); circ(ctx, r * 0.24, hy, r * 0.17); ctx.fill();
  const charge = e.cd > 0 && e.cd < 0.5;
  ctx.fillStyle = charge ? '#f87171' : '#fb923c'; circ(ctx, -r * 0.24, hy, r * 0.07 * (charge ? 1.8 : 1)); ctx.fill(); circ(ctx, r * 0.24, hy, r * 0.07 * (charge ? 1.8 : 1)); ctx.fill();
  ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 1; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.12, hy + r * 0.38); ctx.lineTo(i * r * 0.12, hy + r * 0.6); ctx.stroke(); }
  // yay
  ctx.save(); ctx.translate(0, y + r * 0.2); ctx.rotate(look);
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.arc(r * 0.6, 0, r * 0.85, -1.2, 1.2); ctx.stroke();
  const pull = charge ? (0.5 - e.cd) * r * 1.2 : 0;
  ctx.strokeStyle = charge ? '#fecaca' : '#d6d3d1'; ctx.lineWidth = 1;
  const ex = r * 0.6 + Math.cos(1.2) * r * 0.85, ey = Math.sin(1.2) * r * 0.85;
  ctx.beginPath(); ctx.moveTo(ex, -ey); ctx.lineTo(ex - pull, 0); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.restore();
}

function golem(ctx, e, r, col, lx, ly, t) {
  const stomp = Math.abs(Math.sin(e.ph * 3));
  const y = -stomp * 3;
  const base = col === '#ffffff' ? '#fff' : col;
  const dk = base === '#fff' ? '#ddd' : shade(base, -0.35);
  const sw = Math.sin(e.ph * 3) * r * 0.15;
  // kollar
  ctx.fillStyle = dk;
  ell(ctx, -r * 1.0, y + r * 0.2 + sw, r * 0.38, r * 0.45, 0.3); ctx.fill();
  ell(ctx, r * 1.0, y + r * 0.2 - sw, r * 0.38, r * 0.45, -0.3); ctx.fill();
  // gövde
  const g = ctx.createRadialGradient(-r * 0.3, y - r * 0.4, r * 0.2, 0, y, r * 1.1);
  g.addColorStop(0, base === '#fff' ? '#fff' : shade(base, 0.25)); g.addColorStop(1, dk);
  ctx.fillStyle = g;
  ctx.beginPath();
  const pts = 9;
  for (let i = 0; i < pts; i++) { const a = i * TAU / pts + 0.3, k = 0.88 + ((i * 37) % 10) / 60; ctx.lineTo(Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.95); }
  ctx.closePath(); ctx.fill();
  // parlayan çatlaklar
  const glow = e.accent || '#fbbf24';
  ctx.strokeStyle = glow; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(t * 4 + e.ph) * 0.3;
  ctx.beginPath(); ctx.moveTo(-r * 0.5, y - r * 0.55); ctx.lineTo(-r * 0.15, y - r * 0.1); ctx.lineTo(-r * 0.4, y + r * 0.35);
  ctx.moveTo(r * 0.35, y + r * 0.1); ctx.lineTo(r * 0.6, y + r * 0.45); ctx.stroke();
  ctx.globalAlpha = 1;
  // gözler (parlayan)
  ctx.fillStyle = glow;
  ctx.shadowColor = glow; ctx.shadowBlur = 8;
  rr(ctx, -r * 0.42 + lx * 3, y - r * 0.28 + ly * 2, r * 0.26, r * 0.12, 2); ctx.fill();
  rr(ctx, r * 0.16 + lx * 3, y - r * 0.28 + ly * 2, r * 0.26, r * 0.12, 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function bomb(ctx, e, r, col, lx, ly, t) {
  const fusing = e.fuse > 0;
  const sc = fusing ? 1 + (0.6 - e.fuse) * 0.6 + Math.sin(t * 40) * 0.05 : 1;
  const run = Math.sin(e.ph * 16) * r * 0.3;
  ctx.fillStyle = '#1c1917';
  ell(ctx, -r * 0.4 + run * 0.4, r * 0.95, r * 0.28, r * 0.15); ctx.fill();
  ell(ctx, r * 0.4 - run * 0.4, r * 0.95, r * 0.28, r * 0.15); ctx.fill();
  ctx.save(); ctx.scale(sc, sc);
  const blink = fusing && Math.floor(e.fuse * 20) % 2 === 0;
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, blink ? '#fca5a5' : col === '#ffffff' ? '#fff' : '#6b7280'); g.addColorStop(1, blink ? '#b91c1c' : '#111827');
  ctx.fillStyle = g; circ(ctx, 0, 0, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(ctx, -r * 0.4, -r * 0.45, r * 0.22, r * 0.13, -0.6); ctx.fill();
  ctx.fillStyle = '#57534e'; rr(ctx, -r * 0.25, -r * 1.15, r * 0.5, r * 0.3, 2); ctx.fill();
  ctx.strokeStyle = '#d6d3d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 1.15); ctx.quadraticCurveTo(r * 0.5, -r * 1.6, r * 0.25, -r * 1.85); ctx.stroke();
  const sp = 3 + Math.random() * 3;
  ctx.fillStyle = '#fde047'; circ(ctx, r * 0.25, -r * 1.85, sp); ctx.fill();
  ctx.fillStyle = '#fb923c'; circ(ctx, r * 0.25, -r * 1.85, sp * 0.5); ctx.fill();
  eyes(ctx, 0, r * 0.05, r, lx, ly, '#dc2626', true);
  ctx.restore();
}

function mage(ctx, e, r, col, look, t) {
  const y = Math.sin(t * 3 + e.ph) * 4 - 4;
  const robe = col === '#ffffff' ? '#fff' : col;
  // gölge kuyruğu
  const g = ctx.createLinearGradient(0, y - r, 0, y + r * 1.3);
  g.addColorStop(0, shade(robe.startsWith('#') ? robe : '#ffffff', -0.1)); g.addColorStop(1, 'rgba(76,29,149,0.1)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-r * 0.9, y - r * 0.2); ctx.quadraticCurveTo(-r * 1.1, y + r * 0.9, -r * 0.4 + Math.sin(t * 5) * 3, y + r * 1.4);
  ctx.lineTo(r * 0.4 + Math.sin(t * 5 + 1) * 3, y + r * 1.4); ctx.quadraticCurveTo(r * 1.1, y + r * 0.9, r * 0.9, y - r * 0.2); ctx.closePath(); ctx.fill();
  // başlık
  ctx.fillStyle = shade(robe.startsWith('#') ? robe : '#ffffff', -0.3);
  ctx.beginPath(); ctx.moveTo(-r * 0.85, y); ctx.quadraticCurveTo(-r * 0.9, y - r * 1.2, 0, y - r * 1.9); ctx.quadraticCurveTo(r * 0.9, y - r * 1.2, r * 0.85, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0f0a1e'; ell(ctx, 0, y - r * 0.45, r * 0.55, r * 0.5); ctx.fill();
  ctx.fillStyle = '#f0abfc'; ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 6;
  circ(ctx, -r * 0.2 + Math.cos(look) * 2, y - r * 0.45, r * 0.09); ctx.fill(); circ(ctx, r * 0.2 + Math.cos(look) * 2, y - r * 0.45, r * 0.09); ctx.fill();
  // küre
  const ox = Math.cos(look) * r * 1.1, oy = y + Math.sin(look) * r * 0.6;
  const charge = e.cd > 0 && e.cd < 0.6 ? 1.8 : 1;
  ctx.fillStyle = '#f472b6'; ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 12;
  circ(ctx, ox, oy, r * 0.25 * charge + Math.sin(t * 8) * 1.2); ctx.fill();
  ctx.shadowBlur = 0;
}

// ---------------------------------------------------------------------- BOSSLAR
function boss(ctx, e, r, col, lx, ly, t) {
  const fl = col === '#ffffff';
  const C = fl ? '#ffffff' : e.color;
  if (e.state === 'tele') { ctx.fillStyle = 'rgba(255,60,60,0.18)'; circ(ctx, 0, 0, r * (1.35 + Math.sin(t * 30) * 0.06)); ctx.fill(); }
  switch (e.key) {
    case 'treant': return treant(ctx, e, r, C, lx, ly, t);
    case 'scorpion': return scorpion(ctx, e, r, C, lx, ly, t);
    case 'frostQueen': return frostQueen(ctx, e, r, C, lx, ly, t);
    case 'shadowDragon': return dragon(ctx, e, r, C, lx, ly, t);
    case 'magmaTitan': return titan(ctx, e, r, C, lx, ly, t);
    default: return guardian(ctx, e, r, C, lx, ly, t);
  }
}

function glowEyes(ctx, x, y, r, lx, ly, c = '#fde047') {
  ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 14;
  ell(ctx, x - r * 0.22 + lx * 3, y + ly * 2, r * 0.1, r * 0.07); ctx.fill();
  ell(ctx, x + r * 0.22 + lx * 3, y + ly * 2, r * 0.1, r * 0.07); ctx.fill();
  ctx.shadowBlur = 0;
}

function treant(ctx, e, r, C, lx, ly, t) {
  const sway = Math.sin(t * 1.5) * 0.08;
  const bark = C === '#ffffff' ? '#fff' : '#6b4423';
  // kökler
  ctx.strokeStyle = shade(bark.startsWith('#') ? bark : '#ffffff', -0.2); ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.18, r * 0.5); ctx.quadraticCurveTo(i * r * 0.4, r * 0.85, i * r * 0.55 + Math.sin(t * 2 + i) * 3, r * 0.95); ctx.stroke(); }
  // kollar (dallar)
  ctx.lineWidth = r * 0.16;
  const arm = e.state === 'act' ? -0.6 : Math.sin(t * 2) * 0.15;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.45, -r * 0.1); ctx.quadraticCurveTo(s * r * 1.0, -r * (0.2 - arm), s * r * 1.25, -r * (0.6 + arm)); ctx.stroke(); ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(s * r * 1.05, -r * (0.35 - arm * 0.5)); ctx.lineTo(s * r * 1.35, -r * (0.25 - arm)); ctx.stroke(); ctx.lineWidth = r * 0.16; }
  // gövde
  ctx.save(); ctx.rotate(sway);
  const g = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
  g.addColorStop(0, shade(bark.startsWith('#') ? bark : '#ffffff', -0.3)); g.addColorStop(0.5, bark); g.addColorStop(1, shade(bark.startsWith('#') ? bark : '#ffffff', -0.35));
  ctx.fillStyle = g; rr(ctx, -r * 0.55, -r * 0.7, r * 1.1, r * 1.3, r * 0.3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.25, -r * 0.6); ctx.quadraticCurveTo(i * r * 0.3 + 4, 0, i * r * 0.2, r * 0.5); ctx.stroke(); }
  // yaprak taç
  const leaf = C === '#ffffff' ? '#fff' : e.color;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + i * Math.PI / 6, rx = Math.cos(a) * r * 0.75, ry = -r * 0.85 + Math.sin(a) * r * 0.45;
    ctx.fillStyle = i % 2 ? leaf : shade(leaf.startsWith('#') ? leaf : '#ffffff', -0.2);
    circ(ctx, rx, ry + Math.sin(t * 3 + i) * 1.5, r * 0.42); ctx.fill();
  }
  ctx.fillStyle = shade(leaf.startsWith('#') ? leaf : '#ffffff', 0.15); circ(ctx, 0, -r * 1.25, r * 0.45); ctx.fill();
  // yüz
  ctx.fillStyle = '#1c0f05'; ell(ctx, 0, r * 0.15, r * 0.2, r * (e.state === 'act' ? 0.2 : 0.1)); ctx.fill();
  glowEyes(ctx, 0, -r * 0.2, r * 1.4, lx, ly, '#a3e635');
  ctx.restore();
}

function scorpion(ctx, e, r, C, lx, ly, t) {
  const sand = C === '#ffffff' ? '#fff' : C, dk = C === '#ffffff' ? '#eee' : shade(C, -0.35);
  const walk = Math.sin(t * 10) * 0.25;
  ctx.strokeStyle = dk; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const yy = -r * 0.3 + i * r * 0.2, w = (i % 2 ? walk : -walk) * s;
    ctx.beginPath(); ctx.moveTo(s * r * 0.4, yy); ctx.lineTo(s * r * 0.85, yy - r * 0.15 + w * r); ctx.lineTo(s * r * 1.0, yy + r * 0.25 + w * r); ctx.stroke();
  }
  // kuyruk: arkadan yükselip başın üstüne kıvrılır
  const curl = Math.sin(t * 2) * 0.08 + (e.state === 'tele' ? 0.15 : 0);
  let px = 0, py = -r * 0.45;
  const segs = [];
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * (0.42 + curl); px += Math.cos(a) * r * 0.28; py += Math.sin(a) * r * 0.28; segs.push([px, py, r * (0.24 - i * 0.02)]); }
  segs.forEach(([x, y, rr2], i) => { ctx.fillStyle = i % 2 ? sand : dk; circ(ctx, x, y, rr2); ctx.fill(); });
  const [sx, sy] = segs[segs.length - 1];
  ctx.fillStyle = '#dc2626'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(sx - r * 0.08, sy); ctx.lineTo(sx - r * 0.05, sy + r * 0.38); ctx.lineTo(sx + r * 0.1, sy + r * 0.02); ctx.fill(); ctx.shadowBlur = 0;
  // gövde
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.1, 2, 0, 0, r * 0.7);
  g.addColorStop(0, sand === '#fff' ? '#fff' : shade(sand, 0.25)); g.addColorStop(1, dk);
  ctx.fillStyle = g; ell(ctx, 0, 0, r * 0.55, r * 0.62); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -r * 0.35 + i * r * 0.2, r * 0.5, r * 0.12, 0, 0, Math.PI); ctx.stroke(); }
  // kıskaçlar (önde)
  const snap = e.state === 'act' ? 0.5 : Math.abs(Math.sin(t * 3)) * 0.3;
  for (const s of [-1, 1]) {
    ctx.strokeStyle = dk; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.moveTo(s * r * 0.35, r * 0.35); ctx.lineTo(s * r * 0.7, r * 0.6); ctx.stroke();
    ctx.fillStyle = sand;
    ell(ctx, s * r * 0.75, r * 0.7, r * 0.3, r * 0.22, -s * 0.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * r * 0.85, r * 0.85); ctx.lineTo(s * r * (1.05 + snap * 0.2), r * 1.25); ctx.lineTo(s * r * 0.72, r * 0.98); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * r * 0.95, r * 0.75); ctx.lineTo(s * r * (1.28 - snap * 0.1), r * 0.98); ctx.lineTo(s * r * 1.0, r * 0.62); ctx.fill();
  }
  glowEyes(ctx, 0, r * 0.32, r, lx, ly, '#ef4444');
}

function frostQueen(ctx, e, r, C, lx, ly, t) {
  const ice = C === '#ffffff' ? '#fff' : C;
  // yörüngedeki buz kristalleri
  for (let i = 0; i < 6; i++) {
    const a = t * 1.2 + i * TAU / 6, x = Math.cos(a) * r * 1.3, y = Math.sin(a) * r * 0.9 - r * 0.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2);
    ctx.fillStyle = 'rgba(186,230,253,0.85)'; ctx.beginPath(); ctx.moveTo(0, -r * 0.18); ctx.lineTo(r * 0.07, 0); ctx.lineTo(0, r * 0.18); ctx.lineTo(-r * 0.07, 0); ctx.fill();
    ctx.restore();
  }
  // elbise
  const g = ctx.createLinearGradient(0, -r * 0.4, 0, r);
  g.addColorStop(0, ice); g.addColorStop(1, ice === '#fff' ? '#ddd' : '#1e3a8a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.35); ctx.lineTo(r * 0.3, -r * 0.35);
  ctx.lineTo(r * 0.9, r * 0.9); for (let i = 4; i >= -4; i--) ctx.lineTo(i * r * 0.2, r * (0.9 + (i % 2 ? 0.12 : 0) + Math.sin(t * 4 + i) * 0.03)); ctx.closePath(); ctx.fill();
  // kollar
  ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
  const raise = e.state !== 'move' ? 0.9 : Math.sin(t * 2) * 0.2;
  ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.25); ctx.lineTo(-r * 0.75, -r * (0.1 + raise * 0.6)); ctx.moveTo(r * 0.3, -r * 0.25); ctx.lineTo(r * 0.75, -r * (0.1 + raise * 0.6)); ctx.stroke();
  // kafa
  ctx.fillStyle = '#e0f2fe'; circ(ctx, 0, -r * 0.6, r * 0.3); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(-r * 0.32, -r * 0.65); ctx.quadraticCurveTo(-r * 0.5, -r * 0.1, -r * 0.35, r * 0.1); ctx.lineTo(-r * 0.2, -r * 0.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 0.32, -r * 0.65); ctx.quadraticCurveTo(r * 0.5, -r * 0.1, r * 0.35, r * 0.1); ctx.lineTo(r * 0.2, -r * 0.5); ctx.fill();
  glowEyes(ctx, 0, -r * 0.6, r * 0.9, lx, ly, '#38bdf8');
  // kristal taç
  ctx.fillStyle = '#7dd3fc';
  for (let i = -2; i <= 2; i++) { const h = r * (0.35 - Math.abs(i) * 0.08); ctx.beginPath(); ctx.moveTo(i * r * 0.12 - r * 0.06, -r * 0.82); ctx.lineTo(i * r * 0.14, -r * 0.82 - h); ctx.lineTo(i * r * 0.12 + r * 0.06, -r * 0.82); ctx.fill(); }
}

function dragon(ctx, e, r, C, lx, ly, t) {
  const body = C === '#ffffff' ? '#fff' : C, dk = body === '#fff' ? '#eee' : shade(body, -0.45);
  const flap = Math.sin(t * (e.charging ? 18 : 5));
  // kanatlar
  for (const s of [-1, 1]) {
    ctx.fillStyle = dk;
    ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.2);
    ctx.lineTo(s * r * 1.5, -r * (0.9 + flap * 0.5));
    ctx.lineTo(s * r * 1.7, -r * (0.1 + flap * 0.3));
    ctx.quadraticCurveTo(s * r * 1.3, r * 0.1, s * r * 1.2, r * 0.35);
    ctx.quadraticCurveTo(s * r * 0.9, r * 0.15, s * r * 0.8, r * 0.4);
    ctx.quadraticCurveTo(s * r * 0.6, r * 0.2, s * r * 0.35, r * 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = body; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.2); ctx.lineTo(s * r * 1.5, -r * (0.9 + flap * 0.5)); ctx.stroke();
  }
  // kuyruk
  ctx.strokeStyle = body; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.quadraticCurveTo(r * 0.6 * Math.sin(t * 3), r * 1.0, -r * 0.4 * Math.sin(t * 3 + 1), r * 1.3); ctx.stroke();
  // gövde
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 2, 0, 0, r * 0.75);
  g.addColorStop(0, body === '#fff' ? '#fff' : shade(body, 0.3)); g.addColorStop(1, dk);
  ctx.fillStyle = g; ell(ctx, 0, 0, r * 0.5, r * 0.62); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 4; i++) { rr(ctx, -r * 0.2, -r * 0.3 + i * r * 0.18, r * 0.4, r * 0.08, 3); ctx.fill(); }
  // kafa
  ctx.fillStyle = body; ell(ctx, 0, -r * 0.7, r * 0.38, r * 0.32); ctx.fill();
  ctx.fillStyle = '#e9d5ff';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.2, -r * 0.92); ctx.quadraticCurveTo(s * r * 0.45, -r * 1.2, s * r * 0.35, -r * 1.4); ctx.lineTo(s * r * 0.1, -r * 0.95); ctx.fill(); }
  const mouth = e.state === 'act' || e.state === 'tele' ? r * 0.12 : r * 0.03;
  ctx.fillStyle = '#1e0536'; ell(ctx, 0, -r * 0.55, r * 0.2, mouth); ctx.fill();
  if (mouth > r * 0.05) { ctx.fillStyle = '#f0abfc'; ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 16; circ(ctx, 0, -r * 0.55, r * 0.08); ctx.fill(); ctx.shadowBlur = 0; }
  glowEyes(ctx, 0, -r * 0.75, r * 0.9, lx, ly, '#f0abfc');
}

function titan(ctx, e, r, C, lx, ly, t) {
  const rock = C === '#ffffff' ? '#fff' : '#3f1d1d';
  const lava = C === '#ffffff' ? '#fff' : '#fb923c';
  const pulse = 0.6 + Math.sin(t * 5) * 0.3;
  const slam = e.state === 'tele' ? -0.4 : e.state === 'act' ? 0.4 : Math.sin(t * 2) * 0.1;
  // yumruklar
  for (const s of [-1, 1]) {
    ctx.fillStyle = rock; ell(ctx, s * r * 1.0, r * (0.1 + slam), r * 0.38, r * 0.34); ctx.fill();
    ctx.strokeStyle = lava; ctx.globalAlpha = pulse; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s * r * 0.85, r * (0.0 + slam)); ctx.lineTo(s * r * 1.15, r * (0.25 + slam)); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // gövde
  ctx.fillStyle = rock;
  ctx.beginPath(); ctx.moveTo(-r * 0.75, -r * 0.5); ctx.lineTo(-r * 0.5, -r * 0.85); ctx.lineTo(r * 0.5, -r * 0.85); ctx.lineTo(r * 0.75, -r * 0.5); ctx.lineTo(r * 0.6, r * 0.6); ctx.lineTo(-r * 0.6, r * 0.6); ctx.closePath(); ctx.fill();
  // lav çekirdeği
  const g = ctx.createRadialGradient(0, -r * 0.05, 1, 0, -r * 0.05, r * 0.45);
  g.addColorStop(0, '#fff7cc'); g.addColorStop(0.4, lava); g.addColorStop(1, 'rgba(239,68,68,0)');
  ctx.globalAlpha = pulse + 0.2; ctx.fillStyle = g; circ(ctx, 0, -r * 0.05, r * 0.45); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = lava; ctx.lineWidth = 2.5; ctx.globalAlpha = pulse;
  ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.6); ctx.lineTo(-r * 0.2, -r * 0.2); ctx.moveTo(r * 0.45, -r * 0.55); ctx.lineTo(r * 0.15, -r * 0.15); ctx.moveTo(-r * 0.3, r * 0.5); ctx.lineTo(0, r * 0.2); ctx.stroke();
  ctx.globalAlpha = 1;
  // kafa
  ctx.fillStyle = rock; rr(ctx, -r * 0.3, -r * 1.2, r * 0.6, r * 0.42, 6); ctx.fill();
  glowEyes(ctx, 0, -r * 1.0, r * 0.9, lx, ly, '#fde047');
  // tepe alevleri
  for (let i = -1; i <= 1; i++) { ctx.fillStyle = i ? '#f97316' : '#fde047'; ctx.beginPath(); ctx.moveTo(i * r * 0.15 - r * 0.08, -r * 1.2); ctx.quadraticCurveTo(i * r * 0.15, -r * (1.5 + Math.sin(t * 9 + i) * 0.1), i * r * 0.15 + r * 0.08, -r * 1.2); ctx.fill(); }
}

function guardian(ctx, e, r, C, lx, ly, t) {
  const gold = C === '#ffffff' ? '#fff' : C;
  const steel = C === '#ffffff' ? '#fff' : '#94a3b8';
  // kalkan
  ctx.fillStyle = shade(gold === '#fff' ? '#ffffff' : gold, -0.2);
  ctx.beginPath(); ctx.moveTo(-r * 1.0, -r * 0.4); ctx.lineTo(-r * 0.45, -r * 0.5); ctx.lineTo(-r * 0.45, r * 0.3); ctx.quadraticCurveTo(-r * 0.7, r * 0.7, -r * 0.75, r * 0.7); ctx.quadraticCurveTo(-r * 1.0, r * 0.4, -r * 1.0, -r * 0.4); ctx.fill();
  // mızrak
  ctx.strokeStyle = '#a16207'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.8); ctx.lineTo(r * 0.85, -r * 1.2); ctx.stroke();
  ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(r * 0.85, -r * 1.5); ctx.lineTo(r * 0.75, -r * 1.15); ctx.lineTo(r * 0.95, -r * 1.15); ctx.fill();
  // gövde
  const g = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
  g.addColorStop(0, shade(steel === '#fff' ? '#ffffff' : steel, -0.3)); g.addColorStop(0.5, steel); g.addColorStop(1, shade(steel === '#fff' ? '#ffffff' : steel, -0.4));
  ctx.fillStyle = g; rr(ctx, -r * 0.5, -r * 0.5, r * 1.0, r * 1.1, r * 0.2); ctx.fill();
  ctx.fillStyle = gold; ctx.fillRect(-r * 0.5, r * 0.05, r, r * 0.1);
  // miğfer
  ctx.fillStyle = steel; rr(ctx, -r * 0.35, -r * 1.05, r * 0.7, r * 0.6, r * 0.25); ctx.fill();
  ctx.fillStyle = '#0f172a'; ctx.fillRect(-r * 0.25, -r * 0.8, r * 0.5, r * 0.09);
  glowEyes(ctx, 0, -r * 0.76, r * 0.8, lx, ly, '#fde047');
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(0, -r * 1.05); ctx.quadraticCurveTo(-r * 0.5 - Math.sin(t * 6) * 3, -r * 1.4, -r * 0.6, -r * 0.9); ctx.quadraticCurveTo(-r * 0.3, -r * 1.1, 0, -r * 0.95); ctx.fill();
}

// ====================================================================== EVCİL HAYVANLAR
export function drawPet(ctx, id, x, y, s, t, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const bob = Math.sin(t * 4) * 2;
  if (id === 'owl') {
    const f = Math.sin(t * 14);
    ctx.fillStyle = '#78350f';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 6, bob - 2); ctx.quadraticCurveTo(sd * 18, bob - 8 - f * 6, sd * 16, bob + 6); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#a16207'; ell(ctx, 0, bob, 9, 11); ctx.fill();
    ctx.fillStyle = '#fde68a'; ell(ctx, 0, bob + 4, 5.5, 6); ctx.fill();
    ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.moveTo(-8, bob - 7); ctx.lineTo(-6, bob - 14); ctx.lineTo(-2, bob - 9); ctx.moveTo(8, bob - 7); ctx.lineTo(6, bob - 14); ctx.lineTo(2, bob - 9); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, -3.5, bob - 4, 3.6); ctx.fill(); circ(ctx, 3.5, bob - 4, 3.6); ctx.fill();
    ctx.fillStyle = '#111'; circ(ctx, -3, bob - 4, 1.8); ctx.fill(); circ(ctx, 4, bob - 4, 1.8); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(-1.5, bob - 1); ctx.lineTo(1.5, bob - 1); ctx.lineTo(0, bob + 2); ctx.fill();
  } else if (id === 'fox') {
    ctx.fillStyle = 'rgba(165,243,252,0.25)'; circ(ctx, 0, bob, 16); ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(-6, bob + 4); ctx.quadraticCurveTo(-20, bob + Math.sin(t * 6) * 4, -16, bob - 10); ctx.quadraticCurveTo(-12, bob, -4, bob); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, -16, bob - 9, 2.5); ctx.fill();
    ctx.fillStyle = '#f97316'; ell(ctx, 0, bob + 3, 8, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, bob - 6); ctx.lineTo(12, bob - 2); ctx.lineTo(3, bob + 3); ctx.lineTo(-4, bob - 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2, bob - 6); ctx.lineTo(-1, bob - 14); ctx.lineTo(3, bob - 7); ctx.moveTo(3, bob - 6); ctx.lineTo(6, bob - 13); ctx.lineTo(7, bob - 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(4, bob - 1); ctx.lineTo(12, bob - 2); ctx.lineTo(5, bob + 2); ctx.fill();
    ctx.fillStyle = '#111'; circ(ctx, 5, bob - 4, 1.3); ctx.fill(); circ(ctx, 12, bob - 2, 1); ctx.fill();
  } else {
    const f = Math.sin(t * 10);
    ctx.fillStyle = '#15803d';
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 3, bob - 4); ctx.lineTo(sd * 16, bob - 12 - f * 5); ctx.lineTo(sd * 14, bob + 1); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-3, bob + 6); ctx.quadraticCurveTo(-12, bob + 10, -14, bob + 2 + Math.sin(t * 5) * 3); ctx.stroke();
    ctx.fillStyle = '#22c55e'; ell(ctx, 0, bob + 2, 8, 8); ctx.fill();
    ctx.fillStyle = '#bbf7d0'; ell(ctx, 1, bob + 4, 4, 5); ctx.fill();
    ctx.fillStyle = '#22c55e'; ell(ctx, 5, bob - 7, 7, 6); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(1, bob - 11); ctx.lineTo(-1, bob - 17); ctx.lineTo(4, bob - 12); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, 7, bob - 8, 2.4); ctx.fill(); ctx.fillStyle = '#111'; circ(ctx, 7.8, bob - 8, 1.3); ctx.fill();
    if ((t % 2.5) < 0.4) { ctx.fillStyle = '#fb923c'; circ(ctx, 14, bob - 5, 3 + Math.random() * 2); ctx.fill(); }
  }
  ctx.restore();
}

// ====================================================================== MENÜ PORTRESİ
// Menüdeki <canvas class="hero-cv" data-hero=".." data-w=".." data-pet=".."> öğelerini canlandırır
export function animatePortraits(time, weapons) {
  const t = time / 1000;
  for (const cv of document.querySelectorAll('canvas.hero-cv')) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) continue;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const id = cv.dataset.hero, face = !!cv.dataset.face;
    const s = face ? H / 30 : H / 72;
    const cx = face ? W * 0.42 : W / 2, cy = face ? H * 0.5 + 23 * s : H * 0.66;
    // zemin halkası
    if (!cv.dataset.small) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(ctx, cx, cy + 15 * s, 16 * s, 4.5 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ell(ctx, cx, cy + 15 * s, 18 * s + Math.sin(t * 2) * 2, 5.5 * s); ctx.stroke();
    }
    // ara sıra gösteriş saldırısı
    const cyc = (t + id.length) % 4;
    const atk = cyc < 0.35 ? 1 - cyc / 0.35 : 0;
    drawHero(ctx, id, cx, cy, s, { t, walk: 0, moving: false, aim: -0.25, atk, hurt: 0, wtype: cv.dataset.w || weapons?.[id] || 'bow' });
    if (cv.dataset.pet) drawPet(ctx, cv.dataset.pet, cx + 27 * s, cy - 26 * s, s * 0.8, t, false);
    // büyülü parçacıklar
    if (!cv.dataset.small) {
      for (let i = 0; i < 8; i++) {
        const k = (t * 0.3 + i / 8) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
        ctx.fillStyle = cv.dataset.color || '#fde68a';
        circ(ctx, cx + Math.sin(i * 2.3 + t) * 22 * s, cy + 14 * s - k * 46 * s, 1.6 * s * 0.6); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
