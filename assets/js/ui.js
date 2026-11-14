(function () {
  'use strict';
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    pencil: '<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5 17.5 10.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    paper: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    star: '<path d="M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 8.5a5 5 0 0 1 0 7"/>',
    note: '<path d="M5 3h9l5 5v13H5z"/><path d="M9 12h6M9 16h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    print: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 16h10v5H7z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
    download: '<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    upload: '<path d="M12 16V4M7 8l5-5 5 5"/><path d="M4 20h16"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  function el(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var toastTimer = null;
  function toast(msg) {
    var t = el('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function closeModal() { el('modal').hidden = true; }
  function modal(title, body, foot) {
    el('modalTitle').textContent = title || '提示';
    el('modalBody').innerHTML = body || '';
    el('modalFoot').innerHTML = foot || '<button class="btn btn--outline btn--sm" data-close>关闭</button>';
    el('modal').hidden = false;
  }
  function confirmBox(title, text, okText) {
    return new Promise(function (resolve) {
      modal(title, '<p>' + esc(text) + '</p>',
        '<button class="btn btn--outline btn--sm" data-close>取消</button>' +
        '<button class="btn btn--primary btn--sm" id="modalOk">' + esc(okText || '确定') + '</button>');
      var ok = el('modalOk');
      if (ok) ok.onclick = function () { closeModal(); resolve(true); };
      el('modal').addEventListener('click', function h(e) {
        if (e.target.hasAttribute('data-close')) { el('modal').removeEventListener('click', h); resolve(false); }
      });
    });
  }

  function ring(pct, center, sub) {
    var r = 52, c = 2 * Math.PI * r;
    var off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
    return '<div class="ring"><svg width="118" height="118" viewBox="0 0 118 118">' +
      '<circle cx="59" cy="59" r="52" fill="none" stroke="var(--paper-2)" stroke-width="9"/>' +
      '<circle cx="59" cy="59" r="52" fill="none" stroke="var(--jade)" stroke-width="9" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><div class="ring__txt"><b>' + esc(center) + '</b><span>' + esc(sub || '') + '</span></div></div>';
  }

  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }
  function weekLabel(dateStr) {
    var p = dateStr.split('-');
    return p[1].replace(/^0/, '') + '/' + p[2].replace(/^0/, '');
  }
  function typeChip(q) {
    var map = { single: 'chip--blue', multi: 'chip--gold', judge: 'chip--jade', blank: 'chip--coral', order: 'chip--gold' };
    return '<span class="chip ' + (map[q.t] || '') + '">' + (window.Bank.TYPE_SHORT[q.t] || '') + '</span>';
  }
  function srcChip(q) {
    if (q.src === 'textbook') return '<span class="chip">教材同步</span>';
    if (q.src === 'derived') return '<span class="chip">操作题客观化</span>';
    if (q.src === 'user') return '<span class="chip">我的题库</span>';
    return '';
  }
  function accClass(acc) {
    if (acc == null) return '';
    if (acc >= 80) return 'acc-good';
    if (acc >= 60) return 'acc-mid';
    return 'acc-bad';
  }
  function heatClass(acc, n) {
    if (!n && acc == null) return 'heat-0';
    if (acc == null) return 'heat-0';
    if (acc < 50) return 'heat-1';
    if (acc < 70) return 'heat-2';
    if (acc < 88) return 'heat-3';
    return 'heat-4';
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function speak(text, rate) {
    if (!window.speechSynthesis) { toast('当前浏览器不支持语音朗读'); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(String(text).replace(/（\s*）/g, ''));
    u.lang = 'zh-CN';
    u.rate = rate || 1;
    window.speechSynthesis.speak(u);
  }
  function stopSpeak() { if (window.speechSynthesis) window.speechSynthesis.cancel(); }

  var actx = null;
  function beep(ok) {
    if (!(window.DB && DB.prefs().sound)) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      o.type = 'sine';
      o.frequency.value = ok ? 880 : 220;
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, actx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (ok ? 0.14 : 0.24));
      o.start(); o.stop(actx.currentTime + (ok ? 0.15 : 0.26));
    } catch (e) { /* 忽略音频异常 */ }
  }

  function empty(mark, title, text, actionHtml) {
    return '<div class="empty"><div class="empty__mark">' + esc(mark) + '</div>' +
      '<b>' + esc(title) + '</b><p>' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
  }

  function params() {
    var h = location.hash.replace(/^#/, '');
    var i = h.indexOf('?');
    var path = i < 0 ? h : h.slice(0, i);
    var obj = {};
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        obj[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    }
    return { path: path || '/home', q: obj };
  }

  window.UI = {
    esc: esc, icon: icon, el: el, qs: qs, qsa: qsa, toast: toast,
    modal: modal, closeModal: closeModal, confirm: confirmBox, ring: ring,
    fmtDur: fmtDur, weekLabel: weekLabel, typeChip: typeChip, srcChip: srcChip,
    accClass: accClass, heatClass: heatClass, shuffle: shuffle,
    speak: speak, stopSpeak: stopSpeak, beep: beep, empty: empty, params: params
  };
})();
