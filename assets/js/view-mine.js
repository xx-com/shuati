(function () {
  'use strict';
  var H = UI.esc;

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 120);
  }

  function statOf(s) {
    var rows = DB.chapterStats(s);
    var n = 0, ok = 0;
    rows.forEach(function (r) { n += r.n; ok += r.ok; });
    return { n: n, ok: ok };
  }

  // ---------------- 我的 ----------------
  function renderMine(root) {
    var st = DB.stats();
    var guest = DB.isGuest();
    var name = guest ? '游客同学' : DB.user();
    var ach = DB.achievements();
    var done = ach.filter(function (a) { return a.done; }).length;
    var uq = Bank.userAll().length;

    var links = [
      { h: '#/bank', t: '我的题库', d: '粘贴批量录入 · 导入导出 JSON', meta: uq + ' 道', i: 'folder' },
      { h: '#/shielded', t: '屏蔽管理', d: '答对自动屏蔽的题在这里集中取消', meta: st.shielded + ' 道', i: 'shield' },
      { h: '#/favorites', t: '收藏夹', d: '随时回看的重点题', meta: st.favorites + ' 道', i: 'star' },
      { h: '#/achievements', t: '成就激励', d: '12 个里程碑，记录坚持的痕迹', meta: done + '/' + ach.length, i: 'bolt' },
      { h: '#/stats', t: '学习统计', d: '正确率、打卡热力图、考试轨迹', meta: st.total + ' 次作答', i: 'chart' },
      { h: '#/settings', t: '设置', d: '主题、字号、朗读语速与答题偏好', meta: '', i: 'user' }
    ];

    root.innerHTML = '<div class="page-head"><div><h2>我的</h2>' +
      '<p>账号与学习数据都保存在本机浏览器，可随时导出备份。</p></div>' +
      '<button class="btn btn--outline btn--sm" id="exportAll">' + UI.icon('download') + ' 导出全部数据</button></div>' +
      '<div class="card mine-hero"><div class="avatar avatar--lg">' + H(name.slice(0, 1)) + '</div>' +
      '<div class="mine-hero__body"><h3>' + H(name) + (guest ? ' <span class="chip">游客体验</span>' : '') + '</h3>' +
      '<p class="small muted">' + (guest ? '游客数据仅保存在本机，建议注册账号长期使用。' : '加入于 ' + H(DB.get().created || '') + ' · 连续学习 ' + st.streak + ' 天') + '</p>' +
      '<div class="mine-hero__stats">' +
      '<div><b>' + st.total + '</b><span>累计作答</span></div>' +
      '<div><b>' + (st.accuracy || 0) + '%</b><span>正确率</span></div>' +
      '<div><b>' + st.mastered + '</b><span>已掌握</span></div>' +
      '<div><b>' + st.bestExam + '</b><span>考试最高分</span></div></div></div></div>' +
      '<div class="mine-grid">' + links.map(function (l) {
        return '<a class="card mine-link" href="' + l.h + '"><span class="mine-link__ico">' + UI.icon(l.i) + '</span>' +
          '<span class="mine-link__body"><b>' + l.t + '</b><span>' + l.d + '</span></span>' +
          (l.meta ? '<span class="chip">' + l.meta + '</span>' : '') + '</a>';
      }).join('') + '</div>' +
      '<div class="section-title">本科进度</div>' +
      '<div class="card"><div class="stack" style="gap:0">' + Bank.subjects().map(function (s) {
        if (s.k === 'my') return '';
        var ss = statOf(s.k);
        var pct = Math.min(100, Math.round(ss.n / Math.max(1, s.count) * 100));
        return '<a class="chapter" href="#/subject?k=' + s.k + '">' +
          '<span class="chapter__idx" style="color:' + s.c + '">' + H(s.short) + '</span>' +
          '<span class="chapter__body"><b>' + H(s.n) + '</b><span>' + ss.n + ' 次作答 · ' + s.count + ' 题</span>' +
          '<span class="subj-card__bar" style="display:block;margin-top:6px"><i style="width:' + pct + '%;background:' + s.c + '"></i></span></span>' +
          '<span class="chapter__acc">' + pct + '%<small>覆盖</small></span></a>';
      }).join('') + '</div></div>';

    UI.el('exportAll').onclick = function () {
      var data = {
        app: '刷题闭环', version: 1, exportedAt: new Date().toISOString(),
        user: DB.user(), state: DB.get(), questions: Bank.userAll()
      };
      download('刷题闭环-备份-' + DB.today() + '.json', JSON.stringify(data, null, 2));
      UI.toast('备份文件已导出');
    };
  }

  // ---------------- 我的题库 ----------------
  function normalizeAns(t, ansText) {
    var s = String(ansText || '').trim();
    if (/^(对|正确|√|T|true)$/i.test(s)) return { t: 'judge', a: true };
    if (/^(错|错误|×|F|false)$/i.test(s)) return { t: 'judge', a: false };
    var letters = s.replace(/[\s,，、]/g, '').toUpperCase();
    if (/^[A-H]{1,8}$/.test(letters)) {
      return { t: letters.length > 1 ? 'multi' : 'single', letters: letters.split('') };
    }
    return { t: 'blank', a: [s] };
  }

  function parseBlock(lines) {
    var q = { d: 2, ch: '我的题目', kp: '自定义' };
    var stem = '', opts = [], ansLine = '', exp = '', kp = '';
    lines.forEach(function (line, i) {
      var m;
      if ((m = line.match(/^([A-H])[.、．)）]\s*(.+)$/))) { opts.push({ k: m[1], v: m[2].trim() }); return; }
      if ((m = line.match(/^(答案|正确答案|answer)\s*[:：]\s*(.+)$/i))) { ansLine = m[2].trim(); return; }
      if ((m = line.match(/^(解析|说明|分析)\s*[:：]\s*(.+)$/i))) { exp = m[2].trim(); return; }
      if ((m = line.match(/^(知识点)\s*[:：]\s*(.+)$/))) { kp = m[2].trim(); return; }
      if ((m = line.match(/^(类型|题型)\s*[:：]\s*(.+)$/))) { return; }
      if (!stem) stem = line.replace(/^\d+\s*[.、．)）]\s*/, '');
    });
    if (!stem || !ansLine) return null;

    var norm = normalizeAns('', ansLine);
    q.q = stem;
    q.e = exp;
    q.kp = kp || '自定义';
    if (norm.t === 'judge') { q.t = 'judge'; q.a = norm.a; return q; }
    if (norm.t === 'single' || norm.t === 'multi') {
      if (opts.length < 2) return null;
      var map = {};
      opts.forEach(function (o, i) { map[o.k] = i; });
      var idxs = norm.letters.map(function (L) { return map[L]; }).filter(function (x) { return x != null; });
      if (!idxs.length) return null;
      q.o = opts.map(function (o) { return o.v; });
      if (norm.t === 'multi') { q.t = 'multi'; q.a = idxs.sort(); }
      else { q.t = 'single'; q.a = idxs[0]; }
      return q;
    }
    q.t = 'blank';
    q.a = String(ansLine).split(/[\/|]|或/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!q.a.length) return null;
    return q;
  }

  function parsePipe(line) {
    var parts = line.split('|').map(function (x) { return x.trim(); });
    if (parts.length < 3) return null;
    var stem = parts[0], ansText = '', exp = '', opts = [];
    if (parts.length >= 6) {
      opts = parts.slice(1, 5);
      ansText = parts[5];
      exp = parts[6] || '';
    } else {
      ansText = parts[1];
      exp = parts[2] || '';
    }
    var norm = normalizeAns('', ansText);
    var q = { q: stem, e: exp, d: 2, ch: '我的题目', kp: '自定义' };
    if (norm.t === 'judge') { q.t = 'judge'; q.a = norm.a; return q; }
    if (norm.t === 'single' || norm.t === 'multi') {
      if (opts.length < 2) return null;
      q.o = opts;
      var idxs = norm.letters.map(function (L) { return Bank.LETTER.indexOf(L); }).filter(function (i) { return i >= 0 && i < opts.length; });
      if (!idxs.length) return null;
      q.t = norm.t === 'multi' ? 'multi' : 'single';
      q.a = norm.t === 'multi' ? idxs.sort() : idxs[0];
      return q;
    }
    q.t = 'blank';
    q.a = String(ansText).split(/[\/|]|或/).map(function (x) { return x.trim(); }).filter(Boolean);
    return q.a.length ? q : null;
  }

  function parseText(text) {
    var blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/);
    var list = [], bad = 0;
    blocks.forEach(function (block) {
      var lines = block.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!lines.length) return;
      if (lines.length === 1 && lines[0].indexOf('|') >= 0) {
        var q = parsePipe(lines[0]);
        if (q) list.push(q); else bad++;
        return;
      }
      var q2 = parseBlock(lines);
      if (q2) list.push(q2); else bad++;
    });
    return { list: list, bad: bad };
  }

  function normImport(arr) {
    var out = [];
    (arr || []).forEach(function (raw) {
      if (!raw || typeof raw !== 'object') return;
      var q = {
        q: raw.q || raw.question || raw.stem,
        o: raw.o || raw.options,
        e: raw.e || raw.explain || raw.explanation || '',
        kp: raw.kp || raw.knowledge || '自定义',
        ch: raw.ch || raw.chapter || '我的题目',
        d: raw.d || raw.diff || 2
      };
      var a = raw.a != null ? raw.a : raw.answer;
      if (!q.q || a == null) return;
      var t = raw.t || raw.type;
      if (!t) {
        var norm = normalizeAns('', a);
        t = norm.t;
        if (norm.letters) a = norm.t === 'multi' ? norm.letters.map(function (L) { return Bank.LETTER.indexOf(L); }) : Bank.LETTER.indexOf(norm.letters[0]);
        else if (norm.t === 'blank') a = norm.a;
        else a = norm.a;
      }
      if (t === 'single' && !Array.isArray(q.o)) return;
      if (t === 'multi' && !Array.isArray(q.o)) return;
      if (t === 'blank' && !Array.isArray(a)) a = [String(a)];
      q.t = t;
      q.a = a;
      if (t === 'judge') q.a = !!a;
      out.push(q);
    });
    return out;
  }

  function renderBank(root) {
    var mine = Bank.userAll();
    var chapters = Bank.chaptersOf('my');

    var listHtml = mine.length ? chapters.map(function (c) {
      var arr = mine.filter(function (q) { return q.ch === c.name; });
      return '<div class="group-title">' + H(c.name) + ' · ' + arr.length + ' 道</div>' +
        arr.map(function (q) {
          return '<div class="wrong-item"><div class="wrong-item__head">' + UI.typeChip(q) +
            '<span class="chip">' + H(q.kp || '') + '</span><span class="spacer"></span>' +
            '<a class="btn btn--quiet btn--sm" href="#/practice?qid=' + q.id + '">练</a>' +
            '<button class="btn btn--quiet btn--sm" data-del="' + q.id + '">删除</button></div>' +
            '<div class="wrong-item__stem">' + H(q.q) + '</div>' +
            '<div class="wrong-item__row"><span>答案：<b style="color:var(--jade)">' + H(Bank.answerText(q)) + '</b></span></div></div>';
        }).join('');
    }).join('') : '<p class="small muted">还没有自建题目。用上方文本框粘贴，或导入 JSON 备份。</p>';

    var sample = '下列哪个是计算机的输入设备？\nA. 显示器\nB. 键盘\nC. 打印机\nD. 音箱\n答案：B\n解析：键盘用于向计算机输入字符与指令。\n\n' +
      'Excel 中求和函数的名称是（　）|SUM|AVERAGE|MAX|MIN|A|SUM 用于求和。';

    root.innerHTML = '<div class="page-head"><div><h2>我的题库</h2>' +
      '<p>粘贴文本批量录入，或导入 JSON；题干相同的题会自动去重。</p></div>' +
      '<div class="row"><button class="btn btn--outline btn--sm" id="exportQ">' + UI.icon('download') + ' 导出</button>' +
      '<button class="btn btn--outline btn--sm" id="importBtn">' + UI.icon('upload') + ' 导入 JSON</button></div></div>' +
      '<div class="grid-2"><div class="card"><div class="card__head"><h3 class="card__title">批量录入</h3>' +
      '<span class="small muted">题干 + 选项 + 答案</span></div>' +
      '<div class="field"><textarea id="pasteBox" rows="9" placeholder="' + H(sample) + '"></textarea></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn btn--primary btn--sm" id="addBtn">录入题目</button>' +
      '<button class="btn btn--quiet btn--sm" id="sampleBtn">填入示例</button>' +
      '<span class="spacer"></span><span class="small muted" id="parseTip"></span></div></div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">格式说明</h3></div>' +
      '<ul class="list-plain small muted">' +
      '<li>每道题之间用<b>空行</b>分隔</li>' +
      '<li>选项行以 <b>A.</b> <b>B.</b> 开头，最多到 H</li>' +
      '<li>答案行写 <b>答案：A</b>；多选写 <b>答案：AC</b></li>' +
      '<li>判断写 <b>答案：对</b> / <b>答案：错</b></li>' +
      '<li>填空直接写答案，多个可接受答案用 <b>/</b> 分隔</li>' +
      '<li>单行竖线格式：<b>题干|A|B|C|D|答案|解析</b></li>' +
      '</ul>' +
      '<div class="field" style="margin-top:10px"><span>当前状态</span><div class="small muted">' +
      mine.length + ' 道自建题 · ' + chapters.length + ' 个章节 · 与内置题库合并后可参与练习与考试</div></div>' +
      '<input type="file" id="fileInput" accept=".json,application/json" hidden></div></div>' +
      '<div class="section-title">自建题目</div><div class="card">' + listHtml + '</div>';

    UI.el('sampleBtn').onclick = function () { UI.el('pasteBox').value = sample; };

    UI.el('addBtn').onclick = function () {
      var text = UI.el('pasteBox').value;
      var res = parseText(text);
      if (!res.list.length) {
        UI.toast(res.bad ? '有 ' + res.bad + ' 段无法识别，请检查格式' : '请先粘贴题目');
        return;
      }
      var r = Bank.addUser(res.list);
      DB.save();
      UI.toast('录入 ' + r.added + ' 道' + (r.dup ? '，去重 ' + r.dup + ' 道' : '') + (res.bad ? '，' + res.bad + ' 段格式有误' : ''));
      renderBank(root);
    };

    UI.el('exportQ').onclick = function () {
      if (!mine.length) { UI.toast('还没有自建题目'); return; }
      download('我的题库-' + DB.today() + '.json', JSON.stringify(mine, null, 2));
      UI.toast('已导出 ' + mine.length + ' 道题');
    };

    UI.el('importBtn').onclick = function () { UI.el('fileInput').click(); };
    UI.el('fileInput').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var arr = Array.isArray(data) ? data : (data.questions || data.list || []);
          var qs = normImport(arr);
          if (!qs.length) { UI.toast('文件里没有可识别的题目'); return; }
          var r = Bank.addUser(qs);
          DB.save();
          UI.toast('导入 ' + r.added + ' 道' + (r.dup ? '，去重 ' + r.dup + ' 道' : ''));
          renderBank(root);
        } catch (e) {
          UI.toast('JSON 解析失败：' + e.message);
        }
      };
      reader.readAsText(f, 'utf-8');
    };

    UI.qsa('[data-del]', root).forEach(function (b) {
      b.onclick = function () {
        UI.confirm('删除这道题？', '删除后无法恢复，已产生的作答记录会保留。', '删除').then(function (ok) {
          if (!ok) return;
          Bank.removeUser(b.getAttribute('data-del'));
          DB.save();
          renderBank(root);
        });
      };
    });
  }

  // ---------------- 屏蔽管理 ----------------
  function renderShielded(root) {
    var shielded = DB.get().shielded;
    var ids = Object.keys(shielded).map(function (id) { return Bank.byId(id); }).filter(Boolean);
    var groups = {};
    ids.forEach(function (q) { (groups[q.s] = groups[q.s] || []).push(q); });

    var body = Bank.subjects().map(function (s) {
      var arr = groups[s.k];
      if (!arr || !arr.length) return '';
      return '<div class="card"><div class="card__head"><h3 class="card__title">' + H(s.n) + ' · ' + arr.length + ' 道</h3>' +
        '<button class="btn btn--quiet btn--sm" data-unall="' + s.k + '">全部取消屏蔽</button></div>' +
        arr.map(function (q) {
          return '<div class="todo"><div class="todo__ico todo__ico--jade">' + (Bank.TYPE_SHORT[q.t] || '').slice(0, 1) + '</div>' +
            '<div class="todo__body"><b>' + H(String(q.q).slice(0, 52)) + (q.q.length > 52 ? '…' : '') + '</b>' +
            '<span>' + H(q.ch || '') + ' · ' + H(q.kp || '') + '</span></div>' +
            '<button class="btn btn--quiet btn--sm" data-un="' + q.id + '">取消屏蔽</button></div>';
        }).join('') + '</div>';
    }).join('');

    root.innerHTML = '<div class="page-head"><div><h2>屏蔽管理</h2>' +
      '<p>练习中答对的题会自动勾选「屏蔽此题」，不再出现在题单里；在这里可以集中恢复。</p></div>' +
      '<a class="btn btn--outline btn--sm" href="#/practice">去练习</a></div>' +
      (ids.length ? body : UI.empty('空', '没有屏蔽中的题目', '练习时答对就会自动屏蔽，题单会越来越干净。',
        '<a class="btn btn--primary" href="#/practice">去练习</a>'));

    UI.qsa('[data-un]', root).forEach(function (b) {
      b.onclick = function () {
        DB.toggleShield(b.getAttribute('data-un'), false);
        UI.toast('已取消屏蔽');
        renderShielded(root);
      };
    });
    UI.qsa('[data-unall]', root).forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-unall');
        var arr = groups[k] || [];
        UI.confirm('取消该科全部屏蔽？', '这 ' + arr.length + ' 道题会重新出现在练习与考试中。', '取消屏蔽').then(function (ok) {
          if (!ok) return;
          arr.forEach(function (q) { DB.toggleShield(q.id, false); });
          UI.toast('已恢复 ' + arr.length + ' 道题');
          renderShielded(root);
        });
      };
    });
  }

  // ---------------- 收藏夹 ----------------
  function renderFavorites(root) {
    var favs = Object.keys(DB.get().favorites).map(function (id) { return Bank.byId(id); }).filter(Boolean);
    var groups = {};
    favs.forEach(function (q) { (groups[q.s] = groups[q.s] || []).push(q); });

    var body = Bank.subjects().map(function (s) {
      var arr = groups[s.k];
      if (!arr || !arr.length) return '';
      return '<div class="card"><div class="card__head"><h3 class="card__title">' + H(s.n) + ' · ' + arr.length + ' 道</h3></div>' +
        arr.map(function (q) {
          return '<div class="todo"><div class="todo__ico todo__ico--gold">' + (Bank.TYPE_SHORT[q.t] || '').slice(0, 1) + '</div>' +
            '<div class="todo__body"><b>' + H(String(q.q).slice(0, 52)) + (q.q.length > 52 ? '…' : '') + '</b>' +
            '<span>' + H(q.ch || '') + ' · ' + H(q.kp || '') + '</span></div>' +
            '<a class="btn btn--quiet btn--sm" href="#/practice?qid=' + q.id + '">练</a>' +
            '<button class="btn btn--quiet btn--sm" data-unfav="' + q.id + '">取消收藏</button></div>';
        }).join('') + '</div>';
    }).join('');

    root.innerHTML = '<div class="page-head"><div><h2>收藏夹</h2>' +
      '<p>练习与考试中收藏的题，集中回看。</p></div><span class="chip">' + favs.length + ' 道</span></div>' +
      (favs.length ? body : UI.empty('星', '还没有收藏', '练习时点「收藏」，重要题目会集中在这里。',
        '<a class="btn btn--primary" href="#/practice">去练习</a>'));

    UI.qsa('[data-unfav]', root).forEach(function (b) {
      b.onclick = function () {
        DB.toggleFav(b.getAttribute('data-unfav'));
        UI.toast('已取消收藏');
        renderFavorites(root);
      };
    });
  }

  // ---------------- 成就 ----------------
  function renderAchievements(root) {
    var ach = DB.achievements();
    var done = ach.filter(function (a) { return a.done; });

    root.innerHTML = '<div class="page-head"><div><h2>成就激励</h2>' +
      '<p>12 个里程碑，记录累计题量、连续学习、复习闭环与考试表现。</p></div>' +
      '<span class="chip chip--gold">已解锁 ' + done.length + ' / ' + ach.length + '</span></div>' +
      '<div class="card" style="margin-bottom:18px"><div class="row" style="justify-content:space-between">' +
      '<b>解锁进度</b><span class="small muted">' + Math.round(done.length / ach.length * 100) + '%</span></div>' +
      '<div class="bar-track" style="margin-top:10px;height:9px"><i style="width:' + Math.round(done.length / ach.length * 100) + '%"></i></div></div>' +
      '<div class="badges">' + ach.map(function (a) {
        return '<div class="badge-card ' + (a.done ? 'is-on' : 'is-locked') + '">' +
          '<div class="badge-card__mark">' + H(a.mark) + '</div>' +
          '<b>' + H(a.n) + '</b><p>' + H(a.d) + '</p>' +
          (a.done ? '<small>' + H(a.at) + ' 解锁</small>' : (a.ready ? '<small>条件已满足，去触发一次</small>' : '<small>未解锁</small>')) + '</div>';
      }).join('') + '</div>';
  }

  // ---------------- 设置 ----------------
  function setRow(title, desc, control) {
    return '<div class="set-row"><div class="set-row__body"><b>' + title + '</b><span>' + desc + '</span></div>' + control + '</div>';
  }
  function seg(key, opts, cur) {
    return '<div class="seg" data-key="' + key + '">' + opts.map(function (o) {
      return '<button data-val="' + o.v + '" class="' + (String(o.v) === String(cur) ? 'is-on' : '') + '">' + o.t + '</button>';
    }).join('') + '</div>';
  }
  function switchRow(key, on) {
    return '<button class="switch ' + (on ? 'is-on' : '') + '" data-sw="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '"><i></i></button>';
  }

  function renderSettings(root) {
    var p = DB.prefs();
    root.innerHTML = '<div class="page-head"><div><h2>设置</h2>' +
      '<p>偏好保存在本机，切换账号互不影响。</p></div>' +
      '<a class="btn btn--outline btn--sm" href="#/mine">返回我的</a></div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">外观</h3></div>' +
      setRow('主题', '默认浅色，深色适合夜间刷题', seg('theme', [{ v: 'light', t: '浅色' }, { v: 'dark', t: '深色' }], p.theme)) +
      setRow('字号', '整体界面字号，考试与练习同步', seg('font', [{ v: 100, t: '标准' }, { v: 112, t: '较大' }, { v: 125, t: '特大' }], p.font)) +
      '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card__head"><h3 class="card__title">答题</h3></div>' +
      setRow('题干朗读语速', '使用浏览器语音合成（Web Speech API）', seg('rate', [{ v: 0.8, t: '慢速' }, { v: 1, t: '标准' }, { v: 1.2, t: '快速' }], p.rate)) +
      '<div class="row" style="margin-top:10px"><button class="btn btn--outline btn--sm" id="testSpeak">' + UI.icon('sound') + ' 试听朗读</button></div>' +
      setRow('答题音效', '答对 / 答错播放提示音', switchRow('sound', p.sound)) +
      setRow('答对自动屏蔽', '练习时默认勾选「屏蔽此题」', switchRow('autoShield', p.autoShield)) +
      setRow('即时判题', '单选题选完立刻判定，无需再点提交', switchRow('instant', p.instant)) +
      '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card__head"><h3 class="card__title">数据</h3></div>' +
      '<div class="set-row"><div class="set-row__body"><b>导出全部数据</b><span>含作答记录、错题笔记、自建题库与考试记录</span></div>' +
      '<button class="btn btn--outline btn--sm" id="exportData">' + UI.icon('download') + ' 导出</button></div>' +
      '<div class="set-row"><div class="set-row__body"><b>清空学习数据</b><span>仅清除当前账号，账号本身保留</span></div>' +
      '<button class="btn btn--danger btn--sm" id="resetData">清空</button></div></div>';

    UI.qsa('.seg[data-key]', root).forEach(function (box) {
      var key = box.getAttribute('data-key');
      UI.qsa('button', box).forEach(function (b) {
        b.onclick = function () {
          var raw = b.getAttribute('data-val');
          var val = key === 'font' || key === 'rate' ? Number(raw) : raw;
          DB.setPref(key, val);
          UI.qsa('button', box).forEach(function (x) { x.classList.remove('is-on'); });
          b.classList.add('is-on');
          if (key === 'theme') window.App.setTheme(val);
          if (key === 'font') window.App.setFont(val);
          UI.toast('已保存');
        };
      });
    });

    UI.qsa('.switch[data-sw]', root).forEach(function (b) {
      b.onclick = function () {
        var key = b.getAttribute('data-sw');
        var on = !DB.prefs()[key];
        DB.setPref(key, on);
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        UI.toast('已' + (on ? '开启' : '关闭'));
      };
    });

    UI.el('testSpeak').onclick = function () {
      UI.speak('请把题干读一遍，再选择答案。', DB.prefs().rate);
    };
    UI.el('exportData').onclick = function () {
      var data = { app: '刷题闭环', version: 1, exportedAt: new Date().toISOString(), user: DB.user(), state: DB.get(), questions: Bank.userAll() };
      download('刷题闭环-备份-' + DB.today() + '.json', JSON.stringify(data, null, 2));
      UI.toast('备份文件已导出');
    };
    UI.el('resetData').onclick = function () {
      UI.confirm('清空当前账号的学习数据？', '作答记录、错题、复习排期、考试记录都会被删除，此操作不可撤销。', '清空').then(function (ok) {
        if (!ok) return;
        localStorage.removeItem('zk:state:' + DB.user());
        UI.toast('已清空，正在重新载入');
        setTimeout(function () { location.reload(); }, 500);
      });
    };
  }

  window.Views = window.Views || {};
  window.Views.mine = { title: '我的', render: renderMine };
  window.Views.bank = { title: '我的题库', render: renderBank };
  window.Views.shielded = { title: '屏蔽管理', render: renderShielded };
  window.Views.favorites = { title: '收藏夹', render: renderFavorites };
  window.Views.achievements = { title: '成就', render: renderAchievements };
  window.Views.settings = { title: '设置', render: renderSettings };
})();
