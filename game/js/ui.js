// Arayüz yardımcıları: modal, bildirim, ödül penceresi, eşya kartı
import { RARITIES, SETS, AFFIX } from './data.js';
import { itemIcon, itemName, itemMain, affixText } from './economy.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let modalStack = [];

export function modal(html, { cls = '', onClose, closable = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal ${cls}">${closable ? '<button class="x" data-close aria-label="Kapat">✕</button>' : ''}${html}</div>`;
  $('#modals').appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 180);
    modalStack = modalStack.filter(m => m !== api);
    onClose?.();
  };
  wrap.addEventListener('click', e => {
    if (closable && (e.target === wrap || e.target.closest('[data-close]'))) close();
  });
  const api = { el: wrap.firstElementChild, close };
  modalStack.push(api);
  return api;
}
export const closeAllModals = () => [...modalStack].forEach(m => m.close());

export function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 1900);
  setTimeout(() => t.remove(), 2300);
}

export function confirmBox(title, text, okText = 'Tamam', cancelText = 'Vazgeç') {
  return new Promise(res => {
    let done = false;
    const m = modal(`<h2>${title}</h2><p class="muted center">${text}</p>
      <div class="row gap"><button class="btn grey" data-no>${cancelText}</button><button class="btn green" data-ok>${okText}</button></div>`,
    { onClose: () => { if (!done) res(false); } });
    m.el.querySelector('[data-ok]').onclick = () => { done = true; res(true); m.close(); };
    m.el.querySelector('[data-no]').onclick = () => { done = true; res(false); m.close(); };
  });
}

export function rewardPopup(list, title = 'Ödüller', sub = '') {
  if (!list.length) return;
  const best = Math.max(-1, ...list.map(r => r.rarity ?? -1));
  const m = modal(`<div class="reward-burst r${best}"></div><h2 class="glow">${title}</h2>${sub ? `<p class="muted center">${sub}</p>` : ''}
    <div class="reward-grid">${list.map((r, i) => `<div class="reward-cell ${r.rarity !== undefined ? 'rar' + r.rarity : ''}" style="animation-delay:${i * 70}ms">
      <div class="ri">${r.icon}</div><div class="rt">${esc(r.text)}</div>${r.rarity !== undefined ? `<div class="rr" style="color:${RARITIES[r.rarity].color}">${RARITIES[r.rarity].name}</div>` : ''}</div>`).join('')}</div>
    <button class="btn green wide" data-close>Harika!</button>`, { cls: 'rewards' });
  return m;
}

export function itemCell(it, { equipped = false, small = false, mergeable = false } = {}) {
  const r = RARITIES[it.rarity];
  return `<div class="item r${it.rarity} ${small ? 'small' : ''}" data-uid="${it.uid}" style="--rc:${r.color}">
    <div class="ii">${itemIcon(it)}</div>
    <div class="il">Sv${it.lvl}</div>
    ${it.set ? `<div class="iset" style="background:${SETS[it.set].color}">${SETS[it.set].icon}</div>` : ''}
    ${equipped ? '<div class="ieq">✓</div>' : ''}
    ${it.isNew ? '<div class="inew">YENİ</div>' : ''}
    ${mergeable ? '<div class="imerge">⇧</div>' : ''}
  </div>`;
}

export function itemStatsHtml(it) {
  const m = itemMain(it);
  const main = Object.entries(m).map(([k, v]) => `<div class="stat main"><span>${{ atk: '⚔️ Saldırı', hp: '❤️ Can', moveP: '👟 Hareket Hızı', crit: '🎯 Kritik' }[k]}</span><b>+${v}${k === 'moveP' || k === 'crit' ? '%' : ''}</b></div>`).join('');
  return main;
}

export function affixRow(a, i, { lockable = false, locked = false } = {}) {
  const d = AFFIX[a.id];
  const qcls = a.q >= 0.95 ? 'perfect' : a.q >= 0.85 ? 'great' : '';
  return `<div class="affix ${d.special ? 'special' : ''} ${qcls}" data-ai="${i}">
    <span>${affixText(a)}</span>
    <span class="aq">${d.int ? '★' : Math.round(a.q * 100) + '%'}</span>
    ${lockable ? `<button class="lock ${locked ? 'on' : ''}" data-lock="${i}">${locked ? '🔒' : '🔓'}</button>` : ''}
  </div>`;
}

export function bar(v, max, cls = '') {
  return `<div class="bar ${cls}"><div style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></div></div>`;
}

export { itemName, itemIcon };
