(function () {
  'use strict';

  var AUTH = UI.el('auth');
  var APP = UI.el('app');
  var mode = 'login';

  var ROUTES = {
    '/home': 'home',
    '/subjects': 'subjects',
    '/subject': 'subject',
    '/practice': 'practice',
    '/learn': 'learn',
    '/exam': 'exam',
    '/paper': 'paper',
    '/report': 'report',
    '/review': 'review',
    '/wrong': 'wrong',
    '/mastery': 'mastery',
    '/stats': 'stats',
    '/mine': 'mine',
    '/bank': 'bank',
    '/shielded': 'shielded',
    '/favorites': 'favorites',
    '/achievements': 'achievements',
    '/settings': 'settings'
  };

  var NAV = [
    { v: 'home', h: '#/home', t: '首页', i: 'home' },
    { v: 'subjects', h: '#/subjects', t: '分学科', i: 'grid' },
    { v: 'practice', h: '#/practice', t: '练习', i: 'pencil' },
    { v: 'learn', h: '#/learn', t: '互动学习', i: 'bolt' },
    { v: 'exam', h: '#/exam', t: '模拟考试', i: 'paper' },
    { v: 'review', h: '#/review', t: '今日复习', i: 'clock' },
    { v: 'wrong', h: '#/wrong', t: '错题集', i: 'refresh' },
    { v: 'mastery', h: '#/mastery', t: '知识点地图', i: 'map' },
    { v: 'stats', h: '#/stats', t: '学习统计', i: 'chart' },
    { v: 'achievements', h: '#/achievements', t: '成就', i: 'star' },
    { v: 'mine', h: '#/mine', t: '我的', i: 'user' }
  ];
  var TABS = [
    { v: 'home', h: '#/home', t: '首页', i: 'home' },
    { v: 'practice', h: '#/practice', t: '练习', i: 'pencil' },
    { v: 'review', h: '#/review', t: '复习', i: 'clock' },
    { v: 'exam', h: '#/exam', t: '考试', i: 'paper' },
    { v: 'mine', h: '#/mine', t: '我的', i: 'user' }
  ];
  var ALIAS = {
    subject: 'subjects', bank: 'mine', shielded: 'mine', favorites: 'mine',
    settings: 'mine', paper: 'exam', report: 'exam'
  };

  // ---------------- 主题 / 字号 ----------------
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = UI.el('themeBtn');
    if (btn) btn.innerHTML = UI.icon(t === 'dark' ? 'sun' : 'moon');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#000000' : '#007AFF');
  }
  function fontPx(p) { return Math.round(16 * (p || 100) / 100 * 2) / 2; }
  function applyPrefs() {
    if (!DB.user()) return;
    var p = DB.prefs();
    setTheme(p.theme || 'light');
    document.documentElement.style.setProperty('--fs', fontPx(p.font) + 'px');
  }

  // ---------------- 导航 ----------------
  function activeKey(view) { return ALIAS[view] || view; }

  function renderNav(view) {
    var st = DB.user() ? DB.stats() : { due: 0 };
    var cur = activeKey(view);
    UI.el('railNav').innerHTML = NAV.map(function (n) {
      return '<a class="rail__link' + (n.v === cur ? ' is-on' : '') + '" href="' + n.h + '">' +
        UI.icon(n.i) + '<span>' + n.t + '</span>' +
        (n.v === 'review' && st.due ? '<span class="badge">' + st.due + '</span>' : '') + '</a>';
    }).join('');
    UI.el('tabbar').innerHTML = TABS.map(function (n) {
      return '<a class="tabbar__link' + (n.v === cur ? ' is-on' : '') + '" href="' + n.h + '">' +
        UI.icon(n.i) + '<span>' + n.t + '</span>' +
        (n.v === 'review' && st.due ? '<span class="badge">' + st.due + '</span>' : '') + '</a>';
    }).join('');
  }

  function renderUser() {
    if (!DB.user()) return;
    var guest = DB.isGuest();
    var name = guest ? '游客同学' : DB.user();
    UI.el('railName').textContent = name;
    UI.el('railAvatar').textContent = name.slice(0, 1);
    UI.el('railStreak').textContent = '连续 ' + DB.stats().streak + ' 天';
  }

  // ---------------- 路由 ----------------
  function route() {
    if (!DB.user()) return;
    var p = UI.params();
    var view = ROUTES[p.path] || 'home';
    var v = window.Views && window.Views[view];
    if (!v) { view = 'home'; v = window.Views.home; p = { path: '/home', q: {} }; }

    UI.stopSpeak();
    var root = UI.el('view');
    root.innerHTML = '';
    try {
      v.render(root, p);
    } catch (e) {
      console.error(e);
      root.innerHTML = UI.empty('!', '页面渲染出错', String((e && e.message) || e), '<a class="btn btn--outline" href="#/home">回首页</a>');
    }
    UI.el('topTitle').textContent = p.q.title || v.title || '刷题闭环';
    renderNav(view);
    renderUser();
    APP.classList.remove('is-nav');
    window.scrollTo(0, 0);
  }

  // ---------------- 登录 / 注册 ----------------
  function setMode(m) {
    mode = m;
    UI.qsa('.auth__tab').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === m); });
    UI.el('pass2Wrap').hidden = m !== 'reg';
    UI.el('authSubmit').textContent = m === 'reg' ? '创建账号并开始' : '进入学习台';
    UI.el('authErr').textContent = '';
  }

  function enterApp() {
    AUTH.hidden = true;
    APP.hidden = false;
    applyPrefs();
    renderUser();
    renderNav('home');
    if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/home';
    else route();
    UI.toast(DB.isGuest() ? '已进入游客体验，数据保存在本机' : '欢迎回来，' + DB.user());
  }

  function showLogin() {
    APP.hidden = true;
    AUTH.hidden = false;
    UI.el('authPass').value = '';
    UI.el('authPass2').value = '';
    UI.el('authErr').textContent = '';
    setMode('login');
  }

  function bindAuth() {
    UI.qsa('.auth__tab').forEach(function (b) {
      b.onclick = function () { setMode(b.getAttribute('data-tab')); };
    });
    UI.el('authForm').onsubmit = function (e) {
      e.preventDefault();
      var u = UI.el('authUser').value.trim();
      var pw = UI.el('authPass').value;
      var pw2 = UI.el('authPass2').value;
      var err = UI.el('authErr');
      if (mode === 'reg' && pw !== pw2) { err.textContent = '两次输入的密码不一致'; return; }
      var btn = UI.el('authSubmit');
      btn.disabled = true;
      btn.textContent = mode === 'reg' ? '正在创建账号…' : '正在登录…';
      var p = mode === 'reg' ? DB.register(u, pw) : DB.login(u, pw);
      p.then(function (res) {
        btn.disabled = false;
        btn.textContent = mode === 'reg' ? '创建账号并开始' : '进入学习台';
        if (!res.ok) { err.textContent = res.msg; return; }
        err.textContent = '';
        enterApp();
      });
    };
    UI.el('guestBtn').onclick = function () {
      DB.loginGuest();
      enterApp();
    };
    UI.el('logoutBtn').onclick = function () {
      var cloud = DB.isCloud() && !DB.isGuest();
      UI.confirm('退出登录？', cloud ? '学习进度已同步到服务器，下次登录同一账号可继续。' : '学习记录保存在本机，下次登录同一账号可继续。', '退出').then(function (ok) {
        if (!ok) return;
        DB.logout();
        location.hash = '';
        showLogin();
      });
    };
  }

  // ---------------- 全局交互 ----------------
  function bindChrome() {
    UI.el('themeBtn').onclick = function () {
      var t = (DB.prefs().theme === 'dark') ? 'light' : 'dark';
      DB.setPref('theme', t);
      setTheme(t);
      UI.toast(t === 'dark' ? '已切换深色主题' : '已切换浅色主题');
    };
    UI.el('fontBtn').onclick = function () {
      var seq = [100, 112, 125];
      var cur = DB.prefs().font || 100;
      var next = seq[(seq.indexOf(cur) + 1) % seq.length];
      if (seq.indexOf(cur) < 0) next = 100;
      DB.setPref('font', next);
      document.documentElement.style.setProperty('--fs', fontPx(next) + 'px');
      UI.toast('字号 ' + next + '%');
    };
    UI.el('menuBtn').innerHTML = UI.icon('menu');
    UI.el('menuBtn').onclick = function () { APP.classList.toggle('is-nav'); };
    APP.addEventListener('click', function (e) {
      if (!APP.classList.contains('is-nav')) return;
      if (e.target.closest('.rail__link')) APP.classList.remove('is-nav');
    });
    UI.el('modal').addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) UI.closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        UI.closeModal();
        APP.classList.remove('is-nav');
      }
    });
    window.addEventListener('hashchange', function () { route(); });
  }

  // ---------------- 启动 ----------------
  window.App = {
    setTheme: setTheme,
    setFont: function (p) { document.documentElement.style.setProperty('--fs', fontPx(p) + 'px'); },
    applyPrefs: applyPrefs
  };

  bindAuth();
  bindChrome();
  DB.boot().then(function (ok) {
    if (ok) {
      enterApp();
    } else {
      setMode('login');
      AUTH.hidden = false;
      APP.hidden = true;
    }
  });
})();
