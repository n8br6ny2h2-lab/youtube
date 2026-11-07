// Ana menü (başlık ekranı) ve menü pencereleri: hesap, ayarlar, sıralama, posta, haberler, hediye kodu, destek, hakkında, profil
import * as D from './data.js';
import { PROVIDERS } from './account.js';
import { CONFIG, FEATURES } from './services.js';
import { drawHero, drawEnemy, drawPet } from './art.js';
import { $, esc, modal, toast, confirmBox, rewardPopup } from './ui.js';

const APPLE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3 0 1.8-.8 3.3-.8s2 .8 3.4.8 2.3-1.3 3.1-2.5c1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4zM13.9 5c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>';
const GOOGLE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
const provIcon = id => id === 'apple' ? APPLE_SVG : id === 'google' ? GOOGLE_SVG : PROVIDERS[id].icon;

export function createMenus(app) {
  const S = () => app.S;
  let bgRaf = 0;

  // ================================================================ BAŞLIK EKRANI
  function showTitle() {
    $('#title').hidden = false; $('#menu').hidden = true;
    refreshTitle();
    app.sfx.music('menu');
    cancelAnimationFrame(bgRaf);
    const loop = t => { if ($('#title').hidden) return; drawTitleBg(t / 1000); bgRaf = requestAnimationFrame(loop); };
    bgRaf = requestAnimationFrame(loop);
  }
  function hideTitle() { $('#title').hidden = true; cancelAnimationFrame(bgRaf); }

  function refreshTitle() {
    const s = S(), links = Object.keys(s.account.links);
    $('#title-acc').dataset.m = FEATURES.accounts ? 'account' : 'profile';
    if (!FEATURES.accounts) $('#title-acc').innerHTML = `<span class="dot on"></span>${esc(s.playerName)}`;
    else $('#title-acc').innerHTML = links.length
      ? `<span class="dot on"></span>${links.map(l => esc(PROVIDERS[l].name)).join(' • ')}`
      : '<span class="dot"></span>Misafir hesap • <u>Bağla</u>';
    const unread = mailCount();
    const b = $('#title [data-m=mail] .mbadge');
    if (b) { b.textContent = unread; b.hidden = !unread; }
    $('#title-ver').textContent = `v${D.GAME.version} • Oyuncu ${s.account.playerId}`;
  }

  function drawTitleBg(t) {
    const cv = $('#title-bg'); if (!cv) return;
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b0820'); sky.addColorStop(0.55, '#2a1650'); sky.addColorStop(1, '#5b2147');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    // yıldızlar
    for (let i = 0; i < 70; i++) { const sx = (i * 97.3) % W, sy = (i * 53.1) % (H * 0.55); x.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + i)); x.fillStyle = '#fff'; x.fillRect(sx, sy, 1.6, 1.6); }
    x.globalAlpha = 1;
    // ay
    const mg = x.createRadialGradient(W * 0.78, H * 0.17, 5, W * 0.78, H * 0.17, 90);
    mg.addColorStop(0, 'rgba(254,243,199,1)'); mg.addColorStop(0.35, 'rgba(254,243,199,0.9)'); mg.addColorStop(0.4, 'rgba(253,230,138,0.25)'); mg.addColorStop(1, 'rgba(253,230,138,0)');
    x.fillStyle = mg; x.beginPath(); x.arc(W * 0.78, H * 0.17, 90, 0, 7); x.fill();
    // uçan ejder silueti
    const dp = ((t * 0.05) % 1.4) - 0.2;
    x.save(); x.globalAlpha = 0.85; x.translate(W * dp, H * 0.22 + Math.sin(t) * 12); x.scale(0.55, 0.55);
    drawEnemy(x, { type: 'boss', key: 'shadowDragon', color: '#1e1033', r: 50, state: 'move', ph: t, look: 0, flash: 0, frozen: 0 }, t);
    x.restore();
    // dağ katmanları
    const layer = (base, amp, col, speed, seed) => {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
      for (let i = 0; i <= 24; i++) { const px = i / 24 * W; const v = Math.sin(i * 1.7 + seed) * 0.5 + Math.sin(i * 0.6 + seed * 2 + t * speed) * 0.5; x.lineTo(px, base - Math.abs(v) * amp); }
      x.lineTo(W, H); x.fill();
    };
    layer(H * 0.47, H * 0.16, '#24123d', 0.02, 1);
    layer(H * 0.53, H * 0.12, '#1a0e2e', 0.03, 4);
    // kale silueti
    x.fillStyle = '#120a20';
    const cx = W * 0.15, cy = H * 0.5;
    x.fillRect(cx - 30, cy - 70, 60, 70); x.fillRect(cx - 45, cy - 40, 15, 40); x.fillRect(cx + 30, cy - 40, 15, 40);
    x.beginPath(); x.moveTo(cx - 34, cy - 70); x.lineTo(cx, cy - 110); x.lineTo(cx + 34, cy - 70); x.fill();
    x.fillStyle = '#fbbf24'; x.globalAlpha = 0.6 + Math.sin(t * 3) * 0.2; x.fillRect(cx - 6, cy - 55, 12, 16); x.globalAlpha = 1;
    // zemin
    const gg = x.createLinearGradient(0, H * 0.55, 0, H);
    gg.addColorStop(0, '#1b2e1f'); gg.addColorStop(1, '#070d09');
    x.fillStyle = gg; x.fillRect(0, H * 0.55, W, H * 0.45);
    // kahramanlar
    const s = S(), order = ['lina', 'kaya', 'zerk', 'nyx'].filter(h => h !== s.hero);
    const gy = H * (H < 700 ? 0.53 : 0.6), sc = Math.min(W / 280, 2);
    const spots = [[-0.33, 0.9], [0.33, 0.9], [-0.17, 0.95], [0.3, 0.9]];
    const ws = { kaya: 'sword', lina: 'bow', zerk: 'sword', nyx: 'staff' };
    order.slice(0, 3).forEach((h, i) => {
      const [ox, k] = spots[[0, 1, 3][i]];
      const hx = W / 2 + ox * W, owned = !!s.heroes[h];
      x.globalAlpha = owned ? 0.95 : 0.45;
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(hx, gy - 4 + 15 * sc * k, 15 * sc * k, 4 * sc * k, 0, 0, 7); x.fill();
      drawHero(x, h, hx, gy - 4, sc * k * 0.95, { t: t + i, walk: 0, moving: false, aim: ox < 0 ? 0.2 : Math.PI - 0.2, atk: ((t + i * 1.3) % 5) < 0.3 ? 1 - ((t + i * 1.3) % 5) / 0.3 : 0, hurt: 0, wtype: ws[h] });
    });
    x.globalAlpha = 1;
    const hx = W / 2, cyc = t % 4, atk = cyc < 0.35 ? 1 - cyc / 0.35 : 0;
    const halo = x.createRadialGradient(hx, gy - 20 * sc, 5, hx, gy - 20 * sc, 90 * sc);
    halo.addColorStop(0, 'rgba(253,230,138,0.35)'); halo.addColorStop(1, 'rgba(253,230,138,0)');
    x.fillStyle = halo; x.beginPath(); x.arc(hx, gy - 20 * sc, 90 * sc, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(hx, gy + 4 * sc + 15 * sc * 1.45, 17 * sc * 1.45, 4.5 * sc * 1.45, 0, 0, 7); x.fill();
    drawHero(x, s.hero, hx, gy + 4 * sc, sc * 1.45, { t, walk: 0, moving: false, aim: -0.2, atk, hurt: 0, wtype: app.stats().wtype });
    if (s.pet) drawPet(x, s.pet, hx + 34 * sc, gy - 34 * sc, sc * 0.95, t, false);
    // kor parçacıkları
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const k = (t * 0.08 + i / 40) % 1, px = (i * 61.7) % W + Math.sin(t + i) * 15, py = H - k * H * 0.9;
      x.globalAlpha = Math.sin(k * Math.PI) * 0.7; x.fillStyle = i % 3 ? '#fb923c' : '#fde68a';
      x.beginPath(); x.arc(px, py, 1.6, 0, 7); x.fill();
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }

  // ================================================================ MENÜ LİSTESİ (lobide ☰)
  function openMenu() {
    const items = [['home', '🏠', 'Ana Menü'], ['profile', '👤', 'Profil'], ['account', FEATURES.accounts ? '🔗' : '💾', FEATURES.accounts ? 'Hesap & Bulut' : 'Hesap & Yedek'], ['leader', '🏆', 'Sıralama'],
      ['mail', '✉️', `Posta${mailCount() ? ` (${mailCount()})` : ''}`], ['news', '📰', 'Haberler'], ['code', '🎁', 'Hediye Kodu'], ['settings', '⚙️', 'Ayarlar'], ['help', '❓', 'Destek & SSS'], ['about', 'ℹ️', 'Hakkında']];
    const m = modal(`<h2>Menü</h2><div class="menu-list">${items.map(([k, i, n]) => `<button data-mm="${k}"><span>${i}</span>${n}<em>›</em></button>`).join('')}</div>`, { cls: 'menusheet' });
    m.el.addEventListener('click', e => { const b = e.target.closest('[data-mm]'); if (!b) return; m.close(); app.play('click'); open(b.dataset.mm); });
  }

  function open(k) {
    const map = { home: () => { app.render(); showTitle(); }, profile, account, leader, mail, news, code, settings, help, about };
    map[k]?.();
  }

  // ================================================================ HESAP
  function account() {
    if (!FEATURES.accounts) return backupOnly();
    const m = modal('', { cls: 'acc', onClose: () => { refreshTitle(); app.render(); } });
    const draw = () => {
      const s = S(), links = s.account.links, av = app.account.available();
      const linked = Object.keys(links);
      const cloudOk = app.account.cloudReady(links);
      m.el.innerHTML = `<button class="x" data-close>✕</button><h2>🔗 Hesap & Bulut</h2>
        <div class="acc-card ${linked.length ? 'ok' : 'warn'}">
          <b>${linked.length ? '✅ Hesabın korunuyor' : '⚠️ Misafir hesap'}</b>
          <small>${linked.length ? 'İlerlemen hesabına bağlı. Telefon değiştirirsen aynı hesapla giriş yap.' : 'İlerlemen sadece bu cihazda. Telefon kaybolursa ya da oyun silinirse ilerleme gider. Bağlanana özel: 🎁 200 💎'}</small>
        </div>
        <div class="prov-list">${av.map(id => {
          const P = PROVIDERS[id], l = links[id];
          return `<div class="prov prov-${id}"><div class="pi">${provIcon(id)}</div><div class="pinfo"><b>${P.name}</b><small>${l ? `${esc(l.name)}${l.test ? ' (test)' : ''}` : P.kind === 'games' ? 'Sıralama, başarımlar ve kimlik' : 'Bulut kaydı ve hesap kurtarma'}</small></div>
            ${l ? `<button class="btn small grey" data-a="unlink" data-id="${id}">Çıkış</button>` : `<button class="btn small ${id === 'apple' ? 'black' : 'blue'}" data-a="link" data-id="${id}">Bağla</button>`}</div>`;
        }).join('')}</div>
        <h3>☁️ Bulut Kaydı</h3>
        ${CONFIG.cloudUrl ? `<p class="muted small">${cloudOk ? `Son eşitleme: ${s.account.lastSync ? new Date(s.account.lastSync).toLocaleString('tr-TR') : 'henüz yok'}` : 'Bulut kaydı için Apple veya Google ile giriş yap.'}</p>
          <div class="row gap"><button class="btn blue" data-a="push" ${cloudOk ? '' : 'disabled'}>☁️ Kaydet</button><button class="btn purple" data-a="pull" ${cloudOk ? '' : 'disabled'}>⬇️ Yükle</button></div>`
        : `<p class="muted small">Bulut kaydı çok yakında. O zamana kadar Ayarlar &gt; Kayıt kodu ile ilerlemeni yedekleyebilirsin.</p>`}
        <div class="pid">Oyuncu kimliği: <b>${s.account.playerId}</b> <button class="btn small grey" data-a="copy">Kopyala</button></div>
        <details class="danger"><summary>Hesabı sil</summary>
          <p class="small">Hesabını silersen bu cihazdaki ve buluttaki tüm ilerlemen, eşyaların ve satın alma ödüllerin <b>kalıcı olarak</b> silinir. Bu işlem geri alınamaz.</p>
          <button class="btn red wide" data-a="delete">Hesabımı kalıcı olarak sil</button></details>`;
    };
    draw();
    m.el.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      const s = S(), a = b.dataset.a, id = b.dataset.id;
      try {
        if (a === 'link') {
          b.disabled = true; b.textContent = '…';
          const r = await app.account.link(id, Object.values(s.account.links).some(l => !l.test));
          if (r) {
            const first = !Object.keys(s.account.links).length && !s.account.bonus;
            s.account.links[id] = r; app.play('legend'); toast(`${PROVIDERS[id].name} bağlandı`, 'good');
            if (first) { s.account.bonus = true; app.grant({ gems: 200 }, 'Hesap bağlama ödülü'); }
            if (PROVIDERS[id].kind === 'games') syncScores();
            if (app.account.cloudReady(s.account.links)) await cloudPull(true);
          }
        }
        if (a === 'unlink') {
          if (!(await confirmBox('Bağlantıyı kes?', `${PROVIDERS[id].name} bağlantısı kaldırılacak. İlerlemen bu cihazda kalır.`, 'Kes'))) return;
          delete s.account.links[id]; await app.account.unlink(id, Object.keys(s.account.links).length);
        }
        if (a === 'push') { await app.account.push(s.account.links, s); s.account.lastSync = Date.now(); toast('Buluta kaydedildi ☁️', 'good'); }
        if (a === 'pull') await cloudPull(false);
        if (a === 'copy') { try { await navigator.clipboard.writeText(s.account.playerId); toast('Kopyalandı', 'good'); } catch (_) { prompt('Oyuncu kimliğin:', s.account.playerId); } }
        if (a === 'delete') {
          if (!(await confirmBox('Emin misin?', 'Tüm ilerlemen kalıcı olarak silinecek.', 'Devam'))) return;
          if (!(await confirmBox('Son onay', 'Bu işlem <b>geri alınamaz</b>. Hesabın ve tüm verilerin silinsin mi?', 'Kalıcı olarak sil'))) return;
          if (app.account.cloudReady(s.account.links)) { try { await app.account.remove(); } catch (err) { toast('Buluttaki veri silinemedi: ' + err.message, 'bad'); return; } }
          try { await app.account.deleteUser(); } catch (err) { /* oturum eskiyse sağlayıcı yeniden giriş isteyebilir */ }
          app.wipeAll();
          return;
        }
      } catch (err) { toast(err.message || 'İşlem başarısız', 'bad'); app.play('error'); }
      app.save(true); draw();
    });
  }

  // Hesap bağlama kapalıyken: ilerlemeyi yedek koduyla koruma
  function backupOnly() {
    const s = S();
    const m = modal(`<h2>💾 Hesap & Yedek</h2>
      <div class="acc-card warn"><b>🔜 Hesap bağlama çok yakında</b><small>Game Center ve Apple ile giriş sonraki güncellemede geliyor. Şimdilik ilerlemen bu telefonda saklanıyor. Telefon değiştirmeden ya da oyunu silmeden önce yedek kodu al ve notlarına kaydet.</small></div>
      <div class="col gap"><button class="btn blue" data-k="export">💾 Yedek kodu al</button><button class="btn grey" data-k="import">📥 Yedekten yükle</button></div>
      <div class="pid">Oyuncu kimliği: <b>${s.account.playerId}</b></div>`, { cls: 'acc' });
    m.el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; if (b.dataset.k === 'export') app.exportCode(); else app.importCode(); });
  }

  async function cloudPull(auto) {
    const s = S();
    const r = await app.account.pull();
    if (!r?.save) { if (!auto) toast('Bulutta kayıt yok, şimdi kaydediliyor'); await app.account.push(s.account.links, s); s.account.lastSync = Date.now(); return; }
    const remote = r.save;
    if ((remote.account?.updated || 0) <= (s.account.updated || 0) && auto) { await app.account.push(s.account.links, s); s.account.lastSync = Date.now(); return; }
    const ok = await confirmBox('Buluttaki kayıt bulundu', `Bölüm ${remote.maxChapter} • ${D.HEROES[remote.hero]?.name || ''} • ${(remote.gems || 0)} 💎<br>Bu cihazdaki ilerlemenin yerine yüklensin mi?`, 'Yükle', 'Bu cihazdakini tut');
    if (ok) { app.replaceSave(remote); toast('Buluttaki ilerleme yüklendi', 'good'); }
    else { await app.account.push(s.account.links, s); s.account.lastSync = Date.now(); }
  }

  function syncScores() {
    const s = S();
    if (!app.account.cloudReady(s.account.links)) return;
    app.account.submitScores({ name: s.playerName, hero: s.hero, chapter: s.maxChapter - 1, power: app.stats().power, kills: s.stats.kills, combo: s.stats.maxCombo || 0 });
  }

  // ================================================================ AYARLAR
  function settings() {
    const m = modal('', { cls: 'settings', onClose: () => { app.applySettings(); app.render(); } });
    const draw = () => {
      const st = S().settings;
      const tg = (k, label) => `<div class="setrow"><span>${label}</span><button class="tgl ${st[k] ? 'on' : ''}" data-t="${k}"></button></div>`;
      m.el.innerHTML = `<button class="x" data-close>✕</button><h2>⚙️ Ayarlar</h2>
        <div class="setgroup"><h4>Ses</h4>
          <div class="setrow"><span>🔊 Efektler</span><input type="range" min="0" max="100" value="${Math.round(st.sfxVol * 100)}" data-r="sfxVol"></div>
          <div class="setrow"><span>🎵 Müzik</span><input type="range" min="0" max="100" value="${Math.round(st.music * 100)}" data-r="music"></div>
          ${tg('sound', '🔈 Ses efektleri açık')}${tg('haptic', '📳 Titreşim')}</div>
        <div class="setgroup"><h4>Oyun</h4>
          ${tg('dmgNumbers', '🔢 Hasar sayıları')}${tg('shake', '💥 Ekran sarsıntısı')}
          <div class="setrow"><span>🎨 Grafik</span><div class="seg"><button class="${st.quality === 'high' ? 'on' : ''}" data-q="high">Yüksek</button><button class="${st.quality === 'low' ? 'on' : ''}" data-q="low">Pil tasarrufu</button></div></div>
          <div class="setrow"><span>🎞️ Kare hızı</span><div class="seg"><button class="${st.fps === 60 ? 'on' : ''}" data-f="60">60</button><button class="${st.fps === 30 ? 'on' : ''}" data-f="30">30</button></div></div></div>
        <div class="setgroup"><h4>Bildirimler</h4>${tg('notify', '⚡ Enerji dolunca haber ver')}</div>
        <div class="setgroup"><h4>Dil</h4><div class="setrow"><span>🌐 Dil</span><div class="seg"><button class="on">Türkçe</button><button disabled>English (yakında)</button></div></div></div>
        <div class="setgroup"><h4>Hesap & Veri</h4><div class="col gap">
          <button class="btn blue" data-b="account">${FEATURES.accounts ? '🔗 Hesap & Bulut' : '💾 Hesap & Yedek'}</button>
          <button class="btn grey" data-b="restore">🧾 Satın alımları geri yükle</button>
          ${app.ads?.privacyRequired ? '<button class="btn grey" data-b="adprivacy">🛡️ Reklam gizlilik seçenekleri</button>' : ''}
          <div class="row gap"><button class="btn grey" data-b="export">💾 Yedek kodu al</button><button class="btn grey" data-b="import">📥 Yedekten yükle</button></div>
          <button class="btn red" data-b="reset">Bu cihazdaki ilerlemeyi sıfırla</button></div></div>
        <div class="setgroup"><h4>Yasal</h4><div class="col gap">
          <button class="btn grey" data-b="privacy">🔐 Gizlilik Politikası</button>
          <button class="btn grey" data-b="terms">📄 Kullanım Şartları</button>
          <button class="btn grey" data-b="about">ℹ️ Hakkında & Lisanslar</button></div></div>
        <p class="muted center small">${D.GAME.name} v${D.GAME.version} • ${S().account.playerId}</p>`;
    };
    draw();
    m.el.addEventListener('input', e => {
      const r = e.target.dataset.r; if (!r) return;
      S().settings[r] = +e.target.value / 100; app.applySettings();
    });
    m.el.addEventListener('change', e => { if (e.target.dataset.r === 'sfxVol') app.play('coin'); app.save(); });
    m.el.addEventListener('click', async e => {
      const st = S().settings, t = e.target.closest('[data-t]'), q = e.target.closest('[data-q]'), f = e.target.closest('[data-f]'), b = e.target.closest('[data-b]');
      if (t) { st[t.dataset.t] = !st[t.dataset.t]; if (t.dataset.t === 'notify') app.notifyEnergy(); }
      if (q) st.quality = q.dataset.q;
      if (f) st.fps = +f.dataset.f;
      if (b) {
        const k = b.dataset.b;
        if (k === 'account') { m.close(); return account(); }
        if (k === 'about') { m.close(); return about(); }
        if (k === 'privacy') return doc(D.GAME.privacyUrl, 'Gizlilik Politikası');
        if (k === 'terms') return doc(D.GAME.termsUrl, 'Kullanım Şartları');
        if (k === 'restore') return app.restore();
        if (k === 'adprivacy') { try { await app.ads.privacyOptions(); } catch (e) { toast('Şu an açılamıyor', 'bad'); } return; }
        if (k === 'export') return app.exportCode();
        if (k === 'import') return app.importCode();
        if (k === 'reset') { if (await confirmBox('Emin misin?', 'Bu cihazdaki tüm ilerleme silinecek. Bağlı bulut kaydın etkilenmez; satın alımlar mağazadan geri yüklenebilir.', 'Sıfırla')) app.wipeAll(); return; }
      }
      if (t || q || f) { app.play('click'); app.applySettings(); app.save(); draw(); }
    });
  }

  // ================================================================ SIRALAMA
  function leader() {
    const s = S(), st = app.stats();
    const boards = [['chapter', '🗺️ Bölüm'], ['power', '⚡ Güç'], ['kills', '💀 Düşman'], ['combo', '🔥 Kombo']];
    let cur = 'chapter';
    const mine = { chapter: s.maxChapter - 1, power: st.power, kills: s.stats.kills, combo: s.stats.maxCombo || 0 };
    const m = modal('', { cls: 'leader' });
    const draw = async () => {
      const linked = app.account.cloudReady(s.account.links);
      m.el.innerHTML = `<button class="x" data-close>✕</button><h2>🏆 Sıralama</h2>
        <div class="subtabs">${boards.map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-b="${k}">${n}</button>`).join('')}</div>
        <div class="lb-list"><p class="muted center">${CONFIG.cloudUrl ? 'Yükleniyor…' : 'Küresel sıralama yakında açılıyor! Şimdilik kişisel rekorlarını geliştir.'}</p></div>
        ${linked || !FEATURES.accounts ? '' : '<button class="btn green wide" data-l="link">🔗 Sıralamaya girmek için hesabını bağla</button>'}
        <div class="lb-me"><span>Senin skorun</span><b>${app.fmt(mine[cur])}</b></div>`;
      if (!CONFIG.cloudUrl) return;
      try {
        const r = await app.account.leaderboard(cur);
        const box = m.el.querySelector('.lb-list'); if (!box) return;
        box.innerHTML = (r?.top || []).length ? r.top.map(e => `<div class="lb-row ${e.me ? 'me' : ''}"><span class="rk">${e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</span>${D.HEROES[e.hero]?.icon || ''}<b>${esc(e.name)}</b><em>${app.fmt(e.value)}</em></div>`).join('') : '<p class="muted center">Henüz kimse yok. İlk sen ol!</p>';
      } catch (err) { const box = m.el.querySelector('.lb-list'); if (box) box.innerHTML = `<p class="muted center">${esc(err.message)}</p>`; }
    };
    draw();
    m.el.addEventListener('click', e => {
      const b = e.target.closest('[data-b]'), l = e.target.closest('[data-l]');
      if (b) { cur = b.dataset.b; app.play('click'); draw(); }
      if (l) { m.close(); account(); }
    });
  }

  // ================================================================ POSTA
  function deliverMail() {
    const s = S();
    for (const ml of [D.WELCOME_MAIL, D.UPDATE_MAIL]) {
      if (s.mailGot.includes(ml.id)) continue;
      s.mailGot.push(ml.id); s.mail.unshift({ ...ml, ts: Date.now(), claimed: false, read: false });
    }
    if (s.mail.length > 50) s.mail = s.mail.slice(0, 50);
  }
  const mailCount = () => S().mail.filter(x => !x.claimed && x.rew || !x.read).length;

  function mail() {
    const m = modal('', { cls: 'mailbox', onClose: () => { refreshTitle(); app.render(); } });
    const draw = (openId) => {
      const list = S().mail;
      m.el.innerHTML = `<button class="x" data-close>✕</button><h2>✉️ Posta Kutusu</h2>
        ${list.length ? list.map(ml => `<div class="mail ${ml.claimed || !ml.rew ? 'done' : ''} ${ml.read ? '' : 'unread'}" data-o="${ml.id}">
          <div class="mhead"><span>${ml.rew && !ml.claimed ? '🎁' : '✉️'}</span><div><b>${esc(ml.title)}</b><small>${esc(ml.from)} • ${new Date(ml.ts).toLocaleDateString('tr-TR')}</small></div></div>
          ${openId === ml.id ? `<p>${esc(ml.body)}</p>${ml.rew ? `<div class="mrew">${app.rewText(ml.rew)}</div><button class="btn ${ml.claimed ? 'grey' : 'green'} small" data-c="${ml.id}" ${ml.claimed ? 'disabled' : ''}>${ml.claimed ? '✓ Alındı' : 'Ödülü al'}</button>` : ''}` : ''}
        </div>`).join('') : '<p class="muted center">Posta kutun boş.</p>'}
        ${list.some(x => x.rew && !x.claimed) ? '<button class="btn green wide" data-all>Tümünü al</button>' : ''}`;
    };
    draw();
    m.el.addEventListener('click', e => {
      const c = e.target.closest('[data-c]'), o = e.target.closest('[data-o]'), all = e.target.closest('[data-all]');
      const s = S();
      if (c) { const ml = s.mail.find(x => x.id === c.dataset.c); ml.claimed = true; app.grant(ml.rew, ml.title); app.save(true); return draw(ml.id); }
      if (all) { const rew = {}; for (const ml of s.mail) if (ml.rew && !ml.claimed) { ml.claimed = ml.read = true; for (const [k, v] of Object.entries(ml.rew)) rew[k] = (rew[k] || 0) + v; } app.grant(rew, 'Posta ödülleri'); app.save(true); return draw(); }
      if (o) { const ml = s.mail.find(x => x.id === o.dataset.o); ml.read = true; app.play('click'); app.save(); draw(ml.id); }
    });
  }

  // ================================================================ HABERLER / KOD / DESTEK / HAKKINDA
  function news() {
    modal(`<h2>📰 Haberler</h2>${D.NEWS.map(n => `<div class="news"><div class="ntag">${n.tag}</div><b>${esc(n.title)}</b><small>${n.date}</small><p>${esc(n.body)}</p></div>`).join('')}`, { cls: 'newsbox' });
  }

  function code() {
    const m = modal(`<h2>🎁 Hediye Kodu</h2><p class="muted center small">Etkinliklerde ve sosyal medya hesaplarımızda paylaşılan kodları buraya gir.</p>
      <div class="row gap"><input id="gcode" placeholder="KODU GİR" maxlength="20" autocapitalize="characters"><button class="btn green" data-g>Kullan</button></div>`);
    m.el.querySelector('[data-g]').onclick = () => {
      const s = S(), v = (m.el.querySelector('#gcode').value || '').trim().toUpperCase().replace(/İ/g, 'I');
      const rew = D.GIFT_CODES[v];
      if (!rew) { app.play('error'); return toast('Geçersiz kod', 'bad'); }
      if (s.codes.includes(v)) { app.play('error'); return toast('Bu kodu zaten kullandın', 'bad'); }
      s.codes.push(v); m.close(); app.grant(rew, 'Kod ödülü'); app.save(true);
    };
  }

  function help() {
    const s = S();
    modal(`<h2>❓ Destek & SSS</h2>
      <div class="faq">${D.FAQ.filter(([q]) => FEATURES.accounts || !q.startsWith('Hesabımı')).map(([q, a]) => [q, !FEATURES.accounts && q.startsWith('İlerlemem') ? 'Şimdilik ilerlemen bu telefonda saklanıyor. Ana Menü > Hesap > Yedek kodu al ile kodunu notlarına kaydet; yeni telefonda Yedekten yükle ile geri getirirsin. Hesap bağlama yakında geliyor.' : a]).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      <div class="pid">Oyuncu kimliğin: <b>${s.account.playerId}</b></div>
      ${CONFIG.supportEmail ? `<a class="btn blue wide" href="mailto:${CONFIG.supportEmail}?subject=${encodeURIComponent('Efsun Avcısı Destek - ' + s.account.playerId)}&body=${encodeURIComponent(`Oyuncu: ${s.account.playerId}\nSürüm: ${D.GAME.version}\nCihaz: ${navigator.userAgent}\n\nSorun:\n`)}">✉️ Destek ekibine yaz</a>` : ''}`, { cls: 'helpbox' });
  }

  function about() {
    modal(`<div class="logo small"><span>EFSUN</span><span>AVCISI</span></div>
      <p class="center">Sürüm ${D.GAME.version}</p>
      <div class="about">
        <p><b>Ebeveynler için:</b> Bu oyun isteğe bağlı uygulama içi satın almalar ve reklamlar içerir. Satın almaları cihazınızın ayarlarından (Ekran Süresi / Google Play ebeveyn denetimleri) kısıtlayabilirsiniz.</p>
        <p><b>Yazı tipleri:</b> Lilita One, Nunito — SIL Open Font License 1.1</p>
        <p><b>Grafik ve sesler:</b> oyun içinde kodla üretilmiştir.</p>
        <div class="row gap"><button class="btn grey small" data-doc="privacy">🔐 Gizlilik</button><button class="btn grey small" data-doc="terms">📄 Şartlar</button></div>
      </div>`, { cls: 'aboutbox' }).el.addEventListener('click', e => { const b = e.target.closest('[data-doc]'); if (b) doc(b.dataset.doc === 'privacy' ? D.GAME.privacyUrl : D.GAME.termsUrl, b.textContent); });
  }

  // Yasal metinleri oyunun içinde açar (telefonda dış bağlantı oyunu terk ettirmesin)
  function doc(url, title) {
    modal(`<h2>${esc(title)}</h2><iframe class="docframe" src="${esc(url)}" title="${esc(title)}"></iframe>`, { cls: 'docbox' });
  }

  // ================================================================ PROFİL
  function profile() {
    const m = modal('', { cls: 'profile', onClose: () => app.render() });
    const draw = () => {
      const s = S(), h = D.HEROES[s.hero], st = app.stats();
      const links = Object.keys(s.account.links);
      m.el.innerHTML = `<button class="x" data-close>✕</button>
        <div class="prof-head" style="--hc:${h.color}"><canvas class="hero-cv" data-hero="${s.hero}" data-w="${st.wtype}" data-color="${h.color}"></canvas>
          <div><input id="pname2" value="${esc(s.playerName)}" maxlength="16" aria-label="Oyuncu adı"><small>${h.name} • ⚡ ${app.fmt(st.power)}</small>
          <small>${!FEATURES.accounts ? '💾 İlerleme bu telefonda' : links.length ? '🔗 ' + links.map(l => PROVIDERS[l].name).join(', ') : '⚠️ Misafir hesap'}</small></div></div>
        <div class="statgrid">${[['🗺️ Bölüm', s.maxChapter], ['⚔️ Savaş', s.stats.runs], ['🏆 Zafer', s.stats.wins], ['💀 Düşman', app.fmt(s.stats.kills)], ['👑 Boss', s.stats.bossKills], ['🔥 En iyi kombo', s.stats.maxCombo || 0],
          ['🎁 Sandık', s.stats.chests], ['✨ Efsun', s.stats.enchants], ['🌟 Mitik eşya', s.stats.mythics], ['⏱️ Oyun süresi', Math.floor((s.stats.playSec || 0) / 60) + ' dk']].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
        <div class="row gap"><button class="btn blue" data-p="account">🔗 Hesap</button><button class="btn purple" data-p="ach">🏆 Başarımlar</button></div>`;
    };
    draw();
    m.el.addEventListener('change', e => { if (e.target.id === 'pname2') { S().playerName = e.target.value.trim().slice(0, 16) || S().playerName; app.save(); } });
    m.el.addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      m.close();
      if (b.dataset.p === 'account') account(); else app.gotoAchievements();
    });
  }

  return { showTitle, hideTitle, refreshTitle, openMenu, open, account, settings, mail, deliverMail, mailCount, syncScores };
}
