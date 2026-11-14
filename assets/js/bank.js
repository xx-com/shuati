(function () {
  'use strict';
  var DATA = window.BANK_DATA;
  var builtin = DATA.questions.slice();
  var extra = [];
  var QMAP = {};

  var TYPE = { single: '单选题', multi: '多选题', judge: '判断题', blank: '填空题', order: '排序题' };
  var TYPE_SHORT = { single: '单选', multi: '多选', judge: '判断', blank: '填空', order: '排序' };
  var LETTER = 'ABCDEFGH';

  function rebuild() {
    QMAP = {};
    builtin.concat(extra).forEach(function (q) { QMAP[q.id] = q; });
  }
  rebuild();

  function subjects() {
    var list = DATA.subjects.slice();
    if (extra.length) {
      list.push({ k: 'my', n: '我的题库', short: '我', c: '#6b6f6b', desc: '自己录入与导入的题目', count: extra.length, chapters: chaptersOf('my') });
    }
    return list;
  }
  function subject(k) {
    return subjects().filter(function (s) { return s.k === k; })[0] || null;
  }
  function all() { return builtin.concat(extra); }
  function byId(id) { return QMAP[id] || null; }

  function chaptersOf(k) {
    if (k === 'my') {
      return groupChapters(extra);
    }
    var s = DATA.subjects.filter(function (x) { return x.k === k; })[0];
    return s ? s.chapters : [];
  }
  function groupChapters(list) {
    var map = {};
    var arr = [];
    list.forEach(function (q) {
      if (!map[q.ch]) {
        map[q.ch] = { name: q.ch, module: q.md || null, count: 0, kps: [] };
        arr.push(map[q.ch]);
      }
      map[q.ch].count++;
      if (q.kp && map[q.ch].kps.indexOf(q.kp) < 0) map[q.ch].kps.push(q.kp);
    });
    return arr;
  }

  function query(f) {
    f = f || {};
    return all().filter(function (q) {
      if (f.subject && q.s !== f.subject) return false;
      if (f.chapter && q.ch !== f.chapter) return false;
      if (f.module && q.md !== f.module) return false;
      if (f.type && q.t !== f.type) return false;
      if (f.kp && q.kp !== f.kp) return false;
      if (f.diff && q.d !== Number(f.diff)) return false;
      return true;
    });
  }

  function optText(q, i) {
    var t = q.o && q.o[i];
    return t == null ? '' : String(t);
  }

  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/\s+/g, '')
      .replace(/[，。；：、"'']/g, '')
      .toLowerCase();
  }

  function check(q, ans) {
    if (!q) return false;
    switch (q.t) {
      case 'single': return ans === q.a;
      case 'multi': {
        if (!Array.isArray(ans)) return false;
        var a = ans.slice().sort().join(',');
        var b = q.a.slice().sort().join(',');
        return a === b;
      }
      case 'judge': return ans === q.a;
      case 'blank': {
        if (ans == null) return false;
        var val = norm(ans);
        if (!val) return false;
        return q.a.some(function (x) { return norm(x) === val; });
      }
      case 'order': {
        if (!Array.isArray(ans)) return false;
        if (ans.length !== q.a.length) return false;
        return ans.every(function (v, i) { return v === q.a[i]; });
      }
      default: return false;
    }
  }

  function answerText(q) {
    if (!q) return '';
    if (q.t === 'single') return LETTER[q.a] + '. ' + optText(q, q.a);
    if (q.t === 'multi') return q.a.map(function (i) { return LETTER[i]; }).join('、');
    if (q.t === 'judge') return q.a ? '正确' : '错误';
    if (q.t === 'blank') return q.a.join(' / ');
    if (q.t === 'order') return q.a.map(function (i, k) { return (k + 1) + '.' + optText(q, i); }).join(' → ');
    return '';
  }

  function userAnswerText(q, ans) {
    if (ans == null) return '未作答';
    if (q.t === 'single') return LETTER[ans] + '. ' + optText(q, ans);
    if (q.t === 'multi') return (ans.length ? ans.map(function (i) { return LETTER[i]; }).join('、') : '未选');
    if (q.t === 'judge') return ans ? '正确' : '错误';
    if (q.t === 'blank') return ans || '（空）';
    if (q.t === 'order') return ans.map(function (i, k) { return (k + 1) + '.' + optText(q, i); }).join(' → ');
    return String(ans);
  }

  function addUser(list) {
    var added = 0, dup = 0;
    list.forEach(function (q) {
      var key = norm(q.q);
      var exists = all().some(function (x) { return norm(x.q) === key; });
      if (exists) { dup++; return; }
      q.id = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      q.s = 'my';
      q.src = 'user';
      q.ch = q.ch || '我的题目';
      q.kp = q.kp || '自定义';
      q.d = q.d || 2;
      extra.push(q);
      added++;
    });
    rebuild();
    return { added: added, dup: dup };
  }
  function removeUser(id) {
    extra = extra.filter(function (q) { return q.id !== id; });
    rebuild();
  }
  function userAll() { return extra.slice(); }
  function restoreUser(list) {
    extra = (list || []).slice();
    rebuild();
  }

  window.Bank = {
    data: DATA, TYPE: TYPE, TYPE_SHORT: TYPE_SHORT, LETTER: LETTER,
    subjects: subjects, subject: subject, all: all, byId: byId, chaptersOf: chaptersOf,
    query: query, optText: optText, check: check, answerText: answerText,
    userAnswerText: userAnswerText, norm: norm,
    addUser: addUser, removeUser: removeUser, userAll: userAll, restoreUser: restoreUser,
    total: function () { return all().length; }
  };
})();
