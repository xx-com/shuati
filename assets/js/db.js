(function () {
  'use strict';
  var INTERVALS = [1, 2, 4, 7, 15, 30];
  var USERS = 'zk:users';
  var SESS = 'zk:session';
  var PREFIX = 'zk:state:';
  var user = null;
  var guest = false;
  var state = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); }
  function today() { return dateStr(new Date()); }

  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36);
  }
  function readJSON(k, def) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; }
  }

  function blankState() {
    return {
      v: 1,
      created: today(),
      answers: {},
      shielded: {},
      favorites: {},
      reviews: {},
      exams: [],
      days: {},
      userQ: [],
      achievements: {},
      reviewDone: 0,
      prefs: { theme: 'light', font: 100, rate: 1, sound: true, autoShield: true, autoNext: true, instant: true }
    };
  }

  function normalize() {
    var d = blankState();
    Object.keys(d).forEach(function (k) { if (state[k] == null) state[k] = d[k]; });
    if (!state.prefs || typeof state.prefs !== 'object') state.prefs = d.prefs;
    Object.keys(d.prefs).forEach(function (k) { if (state.prefs[k] == null) state.prefs[k] = d.prefs[k]; });
    if (window.Bank) window.Bank.restoreUser(state.userQ || []);
  }
  function loadState() {
    state = readJSON(PREFIX + user, null) || blankState();
    normalize();
  }
  function save() {
    if (!user) return;
    if (window.Bank) state.userQ = window.Bank.userAll();
    state.updated = Date.now();
    try { localStorage.setItem(PREFIX + user, JSON.stringify(state)); } catch (e) { /* 存储已满 */ }
    scheduleSync();
  }

  // ---------- 账号（云端 API 可用时优先，否则自动回退本机模式） ----------
  var TOKEN = 'zk:token';
  var CLOUD = false;
  var PROBE = null;
  function isCloudResp(j) { return !!(j && typeof j.ok === 'boolean'); }
  function probe() {
    if (PROBE) return PROBE;
    if (!/^https?:$/.test(location.protocol)) { PROBE = Promise.resolve(false); return PROBE; }
    PROBE = api('me').then(function (res) {
      CLOUD = isCloudResp(res.j);
      return CLOUD;
    }, function () { CLOUD = false; return false; });
    return PROBE;
  }
  function demote() { CLOUD = false; PROBE = Promise.resolve(false); }
  var syncTimer = null;

  function api(pathname, body, method) {
    return fetch('/api/' + pathname, {
      method: method || (body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem(TOKEN) || '')
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, j: j };
      });
    });
  }
  function setSession(u, isGuest) {
    try { localStorage.setItem(SESS, JSON.stringify({ u: u, guest: !!isGuest })); } catch (e) { /* ignore */ }
  }
  function clearSession() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(SESS);
    user = null; state = null; guest = false;
    if (window.Bank) window.Bank.restoreUser([]);
  }
  function pickState(a, b) {
    if (!a) return b;
    if (!b) return a;
    return (b.updated || 0) > (a.updated || 0) ? b : a;
  }
  function adopt(j) {
    user = j.user; guest = false;
    try { localStorage.setItem(TOKEN, j.token); } catch (e) { /* ignore */ }
    state = pickState(j.state || null, readJSON(PREFIX + user, null));
    if (!state) state = blankState();
    normalize();
    setSession(user, false);
    save();
  }
  function scheduleSync() {
    if (!CLOUD || guest || !user || !localStorage.getItem(TOKEN)) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      api('state', { state: state }, 'PUT').catch(function () { /* 离线时静默，下次保存再同步 */ });
    }, 800);
  }
  function checkForm(name, pass) {
    if (!/^[\u4e00-\u9fa5A-Za-z0-9_]{2,20}$/.test(name)) return '账号需为 2-20 位中文、字母、数字或下划线';
    if (String(pass).length < 4) return '密码至少 4 位';
    return null;
  }

  function init() {
    var s = readJSON(SESS, null);
    if (s && s.u) {
      user = s.u;
      guest = !!s.guest;
      loadState();
      return true;
    }
    return false;
  }
  // 启动引导：先探测云端 API；可用则校验令牌并拉取最新进度，否则走本机模式
  function boot() {
    return probe().then(function (on) {
      if (!on) return init();
      var s = readJSON(SESS, null);
      if (s && s.guest) return init();
      if (!localStorage.getItem(TOKEN)) return false;
      return api('me').then(function (res) {
        if (!isCloudResp(res.j)) { demote(); return init(); }
        if (!res.j.ok) { clearSession(); return false; }
        return api('state').then(function (r2) {
          user = res.j.user; guest = false;
          state = pickState(r2.j && r2.j.ok ? r2.j.state : null, readJSON(PREFIX + user, null)) || blankState();
          normalize();
          setSession(user, false);
          save();
          return true;
        });
      }, function () {
        demote();
        return init(); // 服务器不可达：退回本机模式
      });
    });
  }
  function localRegister(name, pass) {
    var users = readJSON(USERS, {});
    if (users[name]) return { ok: false, msg: '该账号已存在，请直接登录' };
    users[name] = { pw: hash(pass), at: today() };
    localStorage.setItem(USERS, JSON.stringify(users));
    user = name; guest = false;
    state = readJSON(PREFIX + user, null) || blankState();
    save();
    setSession(user, false);
    return { ok: true };
  }
  function localLogin(name, pass) {
    var users = readJSON(USERS, {});
    if (!users[name]) return { ok: false, msg: '账号不存在，请先注册' };
    if (users[name].pw !== hash(pass)) return { ok: false, msg: '密码不正确' };
    user = name; guest = false;
    loadState();
    save();
    setSession(user, false);
    return { ok: true };
  }
  function register(name, pass) {
    name = String(name || '').trim();
    var bad = checkForm(name, pass);
    if (bad) return Promise.resolve({ ok: false, msg: bad });
    return probe().then(function (on) {
      if (!on) return localRegister(name, pass);
      return api('register', { u: name, p: pass }).then(function (res) {
        if (isCloudResp(res.j)) {
          if (res.j.ok) { adopt(res.j); return { ok: true }; }
          return { ok: false, msg: res.j.msg || '注册失败，请稍后再试' };
        }
        demote(); // 托管环境没有后端：回退本机注册
        return localRegister(name, pass);
      }, function () {
        demote();
        return localRegister(name, pass);
      });
    });
  }
  function login(name, pass) {
    name = String(name || '').trim();
    if (!name) return Promise.resolve({ ok: false, msg: '请输入账号' });
    return probe().then(function (on) {
      if (!on) return localLogin(name, pass);
      return api('login', { u: name, p: pass }).then(function (res) {
        if (isCloudResp(res.j)) {
          if (res.j.ok) { adopt(res.j); return { ok: true }; }
          return { ok: false, msg: res.j.msg || '登录失败，请稍后再试' };
        }
        demote();
        return localLogin(name, pass);
      }, function () {
        demote();
        return localLogin(name, pass);
      });
    });
  }
  function loginGuest() {
    user = '__guest__'; guest = true;
    state = readJSON(PREFIX + user, null) || blankState();
    if (window.Bank) window.Bank.restoreUser(state.userQ || []);
    setSession(user, true);
    return true;
  }
  function logout() {
    save();
    if (CLOUD && !guest && localStorage.getItem(TOKEN)) {
      api('logout', {}, 'POST').catch(function () { /* ignore */ });
    }
    clearSession();
  }

  // ---------- 作答与排期 ----------
  function record(q, correct, ans, opt) {
    opt = opt || {};
    var a = state.answers[q.id] || (state.answers[q.id] = { n: 0, wrong: 0, ok: 0, note: '' });
    a.n++;
    a.lastAns = ans;
    a.lastCorrect = !!correct;
    a.ts = Date.now();
    if (correct) a.ok++; else a.wrong++;

    var d = state.days[today()] || (state.days[today()] = { n: 0, ok: 0 });
    d.n++;
    if (correct) d.ok++;

    var out = { mastered: false };
    if (!correct) {
      var r = state.reviews[q.id];
      if (!r) state.reviews[q.id] = { stage: 0, due: addDays(today(), 1), streak: 0, created: today() };
      else { r.stage = 0; r.streak = 0; r.due = addDays(today(), 1); }
    } else {
      var r2 = state.reviews[q.id];
      if (r2) {
        r2.streak++;
        r2.stage = Math.min(r2.stage + 1, INTERVALS.length - 1);
        if (r2.streak >= 2) { delete state.reviews[q.id]; out.mastered = true; }
        else r2.due = addDays(today(), INTERVALS[r2.stage]);
      }
      if (opt.shield !== false) state.shielded[q.id] = 1;
    }
    if (opt.isReview) state.reviewDone = (state.reviewDone || 0) + 1;
    save();
    out.unlocked = evalAchievements();
    if (out.unlocked.length) save();
    return out;
  }

  function toggleShield(id, val) {
    if (val) state.shielded[id] = 1; else delete state.shielded[id];
    save();
  }
  function toggleFav(id) {
    if (state.favorites[id]) delete state.favorites[id];
    else state.favorites[id] = 1;
    save();
    return !!state.favorites[id];
  }
  function setNote(id, text) {
    var a = state.answers[id] || (state.answers[id] = { n: 0, wrong: 0, ok: 0 });
    a.note = text;
    save();
  }

  // ---------- 查询统计 ----------
  function dueList() {
    var t = today();
    return Object.keys(state.reviews)
      .filter(function (id) { return state.reviews[id].due <= t; })
      .sort(function (a, b) { return state.reviews[a].due < state.reviews[b].due ? -1 : 1; });
  }
  function reviewOf(id) { return state.reviews[id] || null; }

  function wrongList() {
    var out = [];
    Object.keys(state.answers).forEach(function (id) {
      var a = state.answers[id];
      var q = window.Bank.byId(id);
      if (!q || !a.wrong) return;
      out.push({ q: q, a: a, mastered: !state.reviews[id] && a.lastCorrect === true });
    });
    out.sort(function (x, y) { return (y.a.wrong - x.a.wrong) || (y.a.ts - x.a.ts); });
    return out;
  }

  function activeSubjects() {
    var set = {};
    Object.keys(state.answers).forEach(function (id) {
      var q = window.Bank.byId(id);
      if (q) set[q.s] = 1;
    });
    return Object.keys(set);
  }
  function streak() {
    var t = today();
    var d = state.days[t] && state.days[t].n ? t : addDays(t, -1);
    var n = 0;
    while (state.days[d] && state.days[d].n > 0) { n++; d = addDays(d, -1); }
    return n;
  }
  function bestExam() {
    return state.exams.reduce(function (m, e) { return Math.max(m, e.score); }, 0);
  }
  function stats() {
    var total = 0, ok = 0, wrong = 0, mastered = 0, fav = 0;
    Object.keys(state.answers).forEach(function (id) {
      var a = state.answers[id];
      total += a.n; ok += a.ok; wrong += a.wrong;
      if (a.ok >= 2) mastered++;
    });
    fav = Object.keys(state.favorites).length;
    var t = state.days[today()] || { n: 0, ok: 0 };
    var wl = wrongList();
    return {
      total: total, ok: ok, wrong: wrong,
      accuracy: total ? Math.round(ok / total * 100) : 0,
      todayN: t.n, todayOk: t.ok,
      streak: streak(),
      due: dueList().length,
      wrongCount: wl.length,
      focus: wl.filter(function (x) { return x.a.wrong >= 2 && !x.mastered; }).length,
      mastered: mastered,
      bestExam: bestExam(),
      subjectCount: activeSubjects().length,
      reviewDone: state.reviewDone || 0,
      shielded: Object.keys(state.shielded).length,
      favorites: fav,
      answered: Object.keys(state.answers).length,
      examCount: state.exams.length
    };
  }
  function chapterStats(subjectK) {
    var chs = window.Bank.chaptersOf(subjectK);
    var rows = chs.map(function (c) {
      return { name: c.name, module: c.module, total: c.count, n: 0, ok: 0, acc: null, kps: c.kps };
    });
    var map = {};
    rows.forEach(function (r) { map[r.name] = r; });
    Object.keys(state.answers).forEach(function (id) {
      var q = window.Bank.byId(id);
      if (!q || q.s !== subjectK) return;
      var r = map[q.ch];
      if (!r) return;
      r.n += state.answers[id].n;
      r.ok += state.answers[id].ok;
    });
    rows.forEach(function (r) { r.acc = r.n ? Math.round(r.ok / r.n * 100) : null; });
    return rows;
  }
  function kpStats(subjectK) {
    var map = {};
    window.Bank.query({ subject: subjectK }).forEach(function (q) {
      var key = q.ch + '|' + q.kp;
      if (!map[key]) map[key] = { kp: q.kp, ch: q.ch, n: 0, ok: 0, total: 0 };
      map[key].total++;
    });
    Object.keys(state.answers).forEach(function (id) {
      var q = window.Bank.byId(id);
      if (!q || q.s !== subjectK) return;
      var key = q.ch + '|' + q.kp;
      if (!map[key]) return;
      map[key].n += state.answers[id].n;
      map[key].ok += state.answers[id].ok;
    });
    return Object.keys(map).map(function (k) {
      var v = map[k];
      v.acc = v.n ? Math.round(v.ok / v.n * 100) : null;
      return v;
    }).filter(function (v) { return v.n > 0; })
      .sort(function (a, b) { return (a.acc - b.acc) || (b.n - a.n); });
  }
  function dayList(days) {
    var out = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = addDays(today(), -i);
      out.push({ date: d, n: (state.days[d] || {}).n || 0, ok: (state.days[d] || {}).ok || 0 });
    }
    return out;
  }

  // ---------- 考试 ----------
  function saveExam(rec) {
    rec.id = 'e' + Date.now().toString(36);
    state.exams.unshift(rec);
    if (state.exams.length > 60) state.exams.length = 60;
    save();
    var un = evalAchievements();
    if (un.length) save();
    return rec;
  }
  function exams() { return state.exams.slice(); }
  function examById(id) { return state.exams.filter(function (e) { return e.id === id; })[0] || null; }

  // ---------- 成就 ----------
  var ACH = [
    { id: 'first', n: '开卷', d: '完成第 1 道练习', mark: '初', test: function (s) { return s.total >= 1; } },
    { id: 'd100', n: '百题', d: '累计作答 100 道', mark: '百', test: function (s) { return s.total >= 100; } },
    { id: 'd500', n: '五百', d: '累计作答 500 道', mark: '五', test: function (s) { return s.total >= 500; } },
    { id: 'd1000', n: '千题', d: '累计作答 1000 道', mark: '千', test: function (s) { return s.total >= 1000; } },
    { id: 'streak7', n: '七日不辍', d: '连续学习 7 天', mark: '七', test: function (s) { return s.streak >= 7; } },
    { id: 'streak30', n: '月满', d: '连续学习 30 天', mark: '月', test: function (s) { return s.streak >= 30; } },
    { id: 'review10', n: '复习闭环', d: '完成 10 次错题复习', mark: '复', test: function (s) { return s.reviewDone >= 10; } },
    { id: 'exam60', n: '及格线', d: '模拟考试达到 60 分', mark: '及', test: function (s) { return s.bestExam >= 60; } },
    { id: 'exam90', n: '优秀卷', d: '模拟考试达到 90 分', mark: '优', test: function (s) { return s.bestExam >= 90; } },
    { id: 'exam100', n: '满分卷', d: '模拟考试达到 100 分', mark: '满', test: function (s) { return s.bestExam >= 100; } },
    { id: 'subj7', n: '七科通吃', d: '7 个科目都有作答记录', mark: '全', test: function (s) { return s.subjectCount >= 7; } },
    { id: 'wrong50', n: '错题清道夫', d: '掌握 50 道错题', mark: '清', test: function (s) { return s.mastered >= 50; } }
  ];
  function evalAchievements() {
    var st = stats();
    var un = [];
    ACH.forEach(function (a) {
      if (!state.achievements[a.id] && a.test(st)) {
        state.achievements[a.id] = today();
        un.push(a);
      }
    });
    return un;
  }
  function achievements() {
    var st = stats();
    return ACH.map(function (a) {
      return { id: a.id, n: a.n, d: a.d, mark: a.mark, at: state.achievements[a.id] || null, done: !!state.achievements[a.id], ready: a.test(st) };
    });
  }

  // ---------- 偏好 ----------
  function setPref(k, v) { state.prefs[k] = v; save(); }
  function prefs() { return state.prefs; }

  window.DB = {
    init: init, boot: boot, register: register, login: login, loginGuest: loginGuest, logout: logout,
    isCloud: function () { return CLOUD; },
    user: function () { return user; }, isGuest: function () { return guest; },
    get: function () { return state; }, save: save,
    today: today, addDays: addDays, dateStr: dateStr,
    record: record, toggleShield: toggleShield, toggleFav: toggleFav, setNote: setNote,
    dueList: dueList, reviewOf: reviewOf, wrongList: wrongList, stats: stats,
    chapterStats: chapterStats, kpStats: kpStats, dayList: dayList, streak: streak,
    saveExam: saveExam, exams: exams, examById: examById,
    achievements: achievements, setPref: setPref, prefs: prefs,
    INTERVALS: INTERVALS
  };
})();
