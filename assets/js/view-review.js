(function () {
  'use strict';
  var H = UI.esc;

  // ---------------- 今日复习 ----------------
  function renderReview(root) {
    var due = DB.dueList().map(function (id) { return Bank.byId(id); }).filter(Boolean);
    var all = DB.get().reviews;
    var upcoming = [];
    var today = DB.today();
    for (var i = 1; i <= 7; i++) {
      var d = DB.addDays(today, i);
      var n = Object.keys(all).filter(function (id) { return all[id].due === d; }).length;
      if (n) upcoming.push({ date: d, n: n, label: i === 1 ? '明天' : i === 2 ? '后天' : d.slice(5) });
    }
    var pending = Object.keys(all).length;
    var st = DB.stats();
    var pendingList = Object.keys(all)
      .sort(function (a, b) { return String(all[a].due).localeCompare(String(all[b].due)); })
      .map(function (id) { return Bank.byId(id); })
      .filter(Boolean);
    var queue = due.length ? due : pendingList;

    var schedule = '<div class="card"><div class="card__head"><h3 class="card__title">排期规则</h3>' +
      '<span class="small muted">只给没掌握的题排期</span></div>' +
      '<p class="small muted" style="margin-bottom:10px">答错的题当天进入队列，之后按 1 / 2 / 4 / 7 / 15 / 30 天依次回访；连续答对 2 次即判定掌握，自动移出队列。</p>' +
      '<div class="stage-row">' + DB.INTERVALS.map(function (d, i) {
        return '<div class="stage-dot"><b>' + d + '</b><span>第 ' + (i + 1) + ' 阶</span></div>';
      }).join('') + '</div>' +
      '<div class="stat-line" style="margin-top:12px"><span>队列中待掌握</span><b>' + pending + ' 题</b></div>' +
      '<div class="stat-line"><span>累计完成复习</span><b>' + (st.reviewDone || 0) + ' 次</b></div>' +
      '<div class="stat-line"><span>已掌握错题</span><b>' + st.mastered + ' 题</b></div></div>';

    var dueHtml = due.length ? '<div class="card"><div class="card__head"><h3 class="card__title">今天到期的 ' + due.length + ' 道题</h3>' +
      '<button class="btn btn--primary btn--sm" id="startReview">开始复习</button></div>' +
      due.slice(0, 12).map(function (q) {
        var r = DB.reviewOf(q.id) || {};
        return '<a class="todo" href="#/practice?qid=' + q.id + '">' +
          '<div class="todo__ico ' + (q.t === 'blank' ? 'todo__ico--coral' : q.t === 'judge' ? 'todo__ico--blue' : 'todo__ico--gold') + '">' +
          (Bank.TYPE_SHORT[q.t] || '').slice(0, 1) + '</div>' +
          '<div class="todo__body"><b>' + H(String(q.q).slice(0, 46)) + (q.q.length > 46 ? '…' : '') + '</b>' +
          '<span>' + H(q.ch || '') + ' · 第 ' + ((r.stage || 0) + 1) + ' 阶 · 到期 ' + H(r.due || '') + '</span></div>' +
          '<span class="todo__go">练</span></a>';
      }).join('') +
      (due.length > 12 ? '<p class="small muted" style="margin-top:8px">还有 ' + (due.length - 12) + ' 道，开始复习后按顺序出现。</p>' : '') + '</div>'
      : (pendingList.length
        ? '<div class="card"><div class="card__head"><h3 class="card__title">今天没有到期复习</h3>' +
          '<span class="small muted">队列中还有 ' + pendingList.length + ' 题</span></div>' +
          '<p class="small muted" style="margin-bottom:12px">按遗忘曲线，这些题安排在明天及以后回访。想现在就巩固，可以提前复习。</p>' +
          '<button class="btn btn--primary" id="startReview">提前复习 ' + Math.min(pendingList.length, 40) + ' 题</button></div>'
        : UI.empty('空', '今天没有到期复习', '答错的题会自动排进这里。先去练几道，系统会替你安排回访节奏。',
          '<a class="btn btn--primary" href="#/practice">去练习</a>'));

    var upHtml = upcoming.length ? '<div class="card"><div class="card__head"><h3 class="card__title">接下来 7 天</h3></div>' +
      upcoming.map(function (u) {
        return '<div class="stat-line"><span>' + H(u.label) + ' · ' + H(u.date) + '</span><b>' + u.n + ' 题</b></div>';
      }).join('') + '</div>'
      : '<div class="card"><div class="card__head"><h3 class="card__title">接下来 7 天</h3></div>' +
      '<p class="small muted">暂无排期。答错新题后会自动出现。</p></div>';

    root.innerHTML = '<div class="page-head"><div><h2>今日复习</h2>' +
      '<p>按遗忘曲线自动排期，只复习没掌握的题，不把整本题库塞给你。</p></div>' +
      '<div class="row"><a class="btn btn--outline btn--sm" href="#/wrong">错题集</a>' +
      '<a class="btn btn--outline btn--sm" href="#/mastery">知识点地图</a></div></div>' +
      '<div class="grid-2"><div class="stack">' + dueHtml + '</div><div class="stack">' + schedule + upHtml + '</div></div>';

    var btn = UI.el('startReview');
    if (btn) btn.onclick = function () {
      Views._startQuiz(root, queue.slice(0, 40), { title: due.length ? '今日复习' : '提前复习', mode: 'review' });
    };
  }

  // ---------------- 错题集 ----------------
  function renderWrong(root, p) {
    var filter = p.q.f || 'all';
    var list = DB.wrongList();
    var focus = list.filter(function (x) { return x.a.wrong >= 2 && !x.mastered; });
    var mastered = list.filter(function (x) { return x.mastered; });
    var show = filter === 'focus' ? focus : filter === 'mastered' ? mastered : list;

    var seg = '<div class="seg">' +
      '<a href="#/wrong" class="' + (filter === 'all' ? 'is-on' : '') + '">全部 ' + list.length + '</a>' +
      '<a href="#/wrong?f=focus" class="' + (filter === 'focus' ? 'is-on' : '') + '">重点 ' + focus.length + '</a>' +
      '<a href="#/wrong?f=mastered" class="' + (filter === 'mastered' ? 'is-on' : '') + '">已掌握 ' + mastered.length + '</a>' +
      '</div>';

    var groups = {};
    show.forEach(function (x) { (groups[x.q.s] = groups[x.q.s] || []).push(x); });

    var body = '';
    Bank.subjects().forEach(function (s) {
      var arr = groups[s.k];
      if (!arr || !arr.length) return;
      body += '<section class="print-group"><div class="group-title">' +
        '<span class="subj-card__mark" style="background:' + s.c + ';width:26px;height:26px;border-radius:8px;font-size:13px">' + H(s.short) + '</span>' +
        H(s.n) + ' · ' + arr.length + ' 道' +
        '<span class="spacer"></span><button class="btn btn--quiet btn--sm no-print" data-prac="' + s.k + '">练本科错题</button></div>' +
        arr.map(function (x) {
          var q = x.q, a = x.a;
          return '<div class="wrong-item"><div class="wrong-item__head">' + UI.typeChip(q) +
            '<span class="chip chip--coral">错 ' + a.wrong + ' 次</span>' +
            (x.mastered ? '<span class="chip chip--jade">已掌握</span>' : '') +
            '<span class="chip">' + H(q.ch || '') + '</span>' +
            (q.kp ? '<span class="chip">' + H(q.kp) + '</span>' : '') + '</div>' +
            '<div class="wrong-item__stem">' + H(q.q) + '</div>' +
            '<div class="wrong-item__row">' +
            '<span>当时作答：<b>' + H(Bank.userAnswerText(q, a.lastAns)) + '</b></span>' +
            '<span>正确答案：<b style="color:var(--jade)">' + H(Bank.answerText(q)) + '</b></span>' +
            (a.ts ? '<span>' + new Date(a.ts).toLocaleDateString('zh-CN') + '</span>' : '') + '</div>' +
            (a.note ? '<div class="wrong-item__note">笔记：' + H(a.note) + '</div>' : '') +
            '<div class="wrong-item__acts no-print">' +
            '<a class="btn btn--outline btn--sm" href="#/practice?qid=' + q.id + '">再练这题</a>' +
            '<button class="btn btn--quiet btn--sm" data-note="' + q.id + '">' + (a.note ? '改笔记' : '加笔记') + '</button>' +
            (DB.get().shielded[q.id] ? '<button class="btn btn--quiet btn--sm" data-unshield="' + q.id + '">取消屏蔽</button>' : '') +
            '<button class="btn btn--quiet btn--sm" data-fav="' + q.id + '">' +
            (DB.get().favorites[q.id] ? '取消收藏' : '收藏') + '</button></div>' +
            '<div class="print-answer">答案：' + H(Bank.answerText(q)) + (q.e ? '　解析：' + H(q.e) : '') + '</div>' +
            '</div>';
        }).join('') + '</section>';
    });

    root.innerHTML = '<div class="print-title"><h1>错题讲义</h1>' +
      '<p>刷题闭环 · ' + H(DB.user() === '__guest__' ? '游客' : DB.user()) + ' · 生成于 ' + H(DB.today()) + ' · 共 ' + show.length + ' 道</p></div>' +
      '<div class="page-head no-print"><div><h2>错题集</h2>' +
      '<p>记录每次错题、错误次数与当时作答；重点错题 = 错 2 次以上且未掌握。</p></div>' +
      '<div class="row">' + seg + '<button class="btn btn--outline btn--sm" id="printBtn">' + UI.icon('print') + ' 打印讲义</button></div></div>' +
      (show.length ? body : UI.empty('清', '这里还是空的', filter === 'focus' ? '还没有错 2 次以上的重点错题。' : '做错的题会自动出现在这里，附带答案与解析。',
        '<a class="btn btn--primary" href="#/practice">去练几道</a>'));

    UI.el('printBtn').onclick = function () { window.print(); };
    UI.qsa('[data-prac]', root).forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-prac');
        var qs = show.filter(function (x) { return x.q.s === k; }).map(function (x) { return x.q; });
        if (qs.length) Views._startQuiz(root, qs.slice(0, 30), { title: '错题重练', mode: 'review' });
      };
    });
    UI.qsa('[data-note]', root).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-note');
        var q = Bank.byId(id);
        var a = DB.get().answers[id] || {};
        UI.modal('错题笔记', '<p class="small muted" style="margin-bottom:10px">' + H(q.q).slice(0, 120) + '</p>' +
          '<div class="field"><textarea id="noteText" rows="4" placeholder="记录错因、易混点、下次注意什么">' + H(a.note || '') + '</textarea></div>',
          '<button class="btn btn--outline btn--sm" data-close>取消</button>' +
          '<button class="btn btn--primary btn--sm" id="noteSave">保存笔记</button>');
        UI.el('noteSave').onclick = function () {
          DB.setNote(id, UI.el('noteText').value.trim());
          UI.closeModal();
          UI.toast('笔记已保存');
          renderWrong(root, p);
        };
      };
    });
    UI.qsa('[data-unshield]', root).forEach(function (b) {
      b.onclick = function () {
        DB.toggleShield(b.getAttribute('data-unshield'), false);
        UI.toast('已取消屏蔽');
        renderWrong(root, p);
      };
    });
    UI.qsa('[data-fav]', root).forEach(function (b) {
      b.onclick = function () {
        var on = DB.toggleFav(b.getAttribute('data-fav'));
        UI.toast(on ? '已加入收藏' : '已取消收藏');
        renderWrong(root, p);
      };
    });
  }

  // ---------------- 知识点地图 ----------------
  function renderMastery(root, p) {
    var subjects = Bank.subjects();
    var k = p.q.s || (subjects[0] && subjects[0].k);
    var s = Bank.subject(k);
    if (!s) { k = subjects[0].k; s = subjects[0]; }
    var rows = DB.chapterStats(k);
    var kps = DB.kpStats(k);
    var weak = kps.filter(function (x) { return x.acc < 70; }).slice(0, 10);
    var strong = kps.slice().sort(function (a, b) { return b.acc - a.acc; }).slice(0, 6);

    var tabs = subjects.map(function (x) {
      return '<a class="chip ' + (x.k === k ? 'chip--on' : '') + '" href="#/mastery?s=' + x.k + '">' + H(x.n) + '</a>';
    }).join('');

    var grid = rows.map(function (r) {
      return '<a class="heat-cell ' + UI.heatClass(r.acc, r.n) + '" href="#/practice?s=' + k + '&ch=' + encodeURIComponent(r.name) + '&limit=20">' +
        '<b>' + H(r.name) + '</b><span>' + (r.n ? '已练 ' + r.n + ' 次 / 共 ' + r.total + ' 题' : '未练习 · ' + r.total + ' 题') + '</span>' +
        '<em>' + (r.acc == null ? '—' : r.acc + '%') + '</em></a>';
    }).join('');

    root.innerHTML = '<div class="page-head"><div><h2>知识点掌握地图</h2>' +
      '<p>章节按正确率铺热力网格，颜色越暖说明越薄弱；点击直达该章专项练习。</p></div>' +
      '<a class="btn btn--outline btn--sm" href="#/practice?s=' + k + '">整科练习</a></div>' +
      '<div class="row row--wrap" style="gap:8px;margin-bottom:16px">' + tabs + '</div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">' + H(s.n) + ' · 章节热力</h3>' +
      '<div class="legend"><span><i class="heat-1"></i>薄弱</span><span><i class="heat-2"></i>待巩固</span>' +
      '<span><i class="heat-3"></i>较好</span><span><i class="heat-4"></i>扎实</span><span><i class="heat-0"></i>未练</span></div></div>' +
      '<div class="heatmap">' + grid + '</div></div>' +
      '<div class="grid-2" style="margin-top:18px"><div class="card"><div class="card__head"><h3 class="card__title">薄弱知识点</h3>' +
      '<span class="small muted">正确率低于 70%</span></div>' +
      (weak.length ? '<div class="kp-tags">' + weak.map(function (x) {
        return '<a class="kp-tag is-weak" href="#/practice?s=' + k + '&kp=' + encodeURIComponent(x.kp) + '&limit=20">' +
          H(x.kp) + ' · ' + x.acc + '%（' + x.n + '）</a>';
      }).join('') + '</div>' : '<p class="small muted">暂无薄弱标签，多练几道后会自动定位。</p>') + '</div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">掌握较好的知识点</h3></div>' +
      (strong.length ? '<div class="kp-tags">' + strong.map(function (x) {
        return '<span class="kp-tag is-ok">' + H(x.kp) + ' · ' + x.acc + '%</span>';
      }).join('') + '</div>' : '<p class="small muted">还没有足够数据。</p>') + '</div></div>';
  }

  // ---------------- 学习统计 ----------------
  function renderStats(root) {
    var st = DB.stats();
    var days = DB.dayList(14);
    var max = Math.max.apply(null, days.map(function (d) { return d.n; }).concat([1]));

    var cal = DB.dayList(70);
    var startDow = (new Date(cal[0].date.replace(/-/g, '/')).getDay() + 6) % 7;
    var calHtml = ['一', '二', '三', '四', '五', '六', '日'].map(function (d) {
      return '<div class="cal__dow">' + d + '</div>';
    }).join('');
    for (var i = 0; i < startDow; i++) calHtml += '<div class="cal__cell is-out"></div>';
    cal.forEach(function (d) {
      var lv = d.n === 0 ? '' : d.n < 10 ? 'l1' : d.n < 30 ? 'l2' : 'l3';
      calHtml += '<div class="cal__cell ' + lv + '" title="' + d.date + ' · ' + d.n + ' 题">' + (+d.date.slice(8)) + '</div>';
    });

    var subjRows = Bank.subjects().map(function (s) {
      var rows = DB.chapterStats(s.k), n = 0, ok = 0;
      rows.forEach(function (r) { n += r.n; ok += r.ok; });
      if (!n) return null;
      var acc = Math.round(ok / n * 100);
      return '<a class="bar-row" href="#/subject?k=' + s.k + '"><span>' + H(s.n) + '</span>' +
        '<div class="bar-track"><i class="' + (acc < 60 ? 'is-bad' : '') + '" style="width:' + acc + '%"></i></div>' +
        '<span class="small muted">' + acc + '%</span></a>';
    }).filter(Boolean).join('');

    var weak = [];
    Bank.subjects().forEach(function (s) {
      DB.kpStats(s.k).forEach(function (x) {
        if (x.n >= 2) weak.push({ s: s, kp: x.kp, acc: x.acc, n: x.n });
      });
    });
    weak.sort(function (a, b) { return a.acc - b.acc; });
    weak = weak.slice(0, 5);

    var exams = DB.exams().slice(0, 6);
    var examsHtml = exams.length ? exams.map(function (e) {
      return '<a class="todo" href="#/report?id=' + e.id + '"><div class="todo__ico ' +
        (e.score >= 60 ? 'todo__ico--jade' : 'todo__ico--coral') + '">' + Math.round(e.score) + '</div>' +
        '<div class="todo__body"><b>' + H(e.title) + '</b><span>' + H(e.date || '') + ' · ' + e.ok + '/' + e.count + ' 题 · ' + UI.fmtDur(e.used || 0) + '</span></div>' +
        '<span class="todo__go">成绩单</span></a>';
    }).join('') : '<p class="small muted">还没有考试记录，去试试标准卷。</p>';

    var ach = DB.achievements();
    var done = ach.filter(function (a) { return a.done; });
    var achHtml = '<div class="badges">' + ach.slice(0, 8).map(function (a) {
      return '<div class="badge-card ' + (a.done ? 'is-on' : 'is-locked') + '"><div class="badge-card__mark">' + H(a.mark) + '</div>' +
        '<b>' + H(a.n) + '</b><p>' + H(a.d) + '</p>' + (a.done ? '<small>' + H(a.at) + ' 解锁</small>' : '') + '</div>';
    }).join('') + '</div>';

    root.innerHTML = '<div class="page-head"><div><h2>学习统计</h2>' +
      '<p>正确率、连续学习天数、打卡热力图，以及每次模拟考试的成绩轨迹。</p></div>' +
      '<a class="btn btn--outline btn--sm" href="#/achievements">全部成就</a></div>' +
      '<div class="grid-4">' +
      '<div class="card card--flat"><div class="small muted">累计作答</div><b class="num" style="font-size:26px">' + st.total + '</b><div class="small muted">覆盖 ' + st.answered + ' 道题</div></div>' +
      '<div class="card card--flat"><div class="small muted">累计正确率</div><b class="num" style="font-size:26px">' + (st.accuracy || 0) + '%</b><div class="small muted">' + st.ok + ' / ' + st.total + '</div></div>' +
      '<div class="card card--flat"><div class="small muted">连续学习</div><b class="num" style="font-size:26px">' + st.streak + ' 天</b><div class="small muted">今日 ' + st.todayN + ' 题</div></div>' +
      '<div class="card card--flat"><div class="small muted">已掌握</div><b class="num" style="font-size:26px">' + st.mastered + '</b><div class="small muted">答对 2 次以上</div></div></div>' +
      '<div class="grid-2" style="margin-top:18px"><div class="stack">' +
      '<div class="card"><div class="card__head"><h3 class="card__title">近 14 天练习量</h3>' +
      '<span class="small muted">共 ' + days.reduce(function (a, d) { return a + d.n; }, 0) + ' 题</span></div>' +
      '<div class="mini-chart">' + days.map(function (d, i) {
        var h = Math.max(4, Math.round(d.n / max * 76));
        return '<i class="' + (i === days.length - 1 ? 'is-today' : '') + '" style="height:' + h + 'px" title="' + d.date + ' · ' + d.n + ' 题"></i>';
      }).join('') + '</div>' +
      '<div class="row small muted" style="justify-content:space-between;margin-top:6px"><span>' + H(UI.weekLabel(days[0].date)) + '</span><span>今天</span></div></div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">打卡热力图</h3>' +
      '<span class="small muted">最近 10 周</span></div><div class="cal">' + calHtml + '</div>' +
      '<div class="legend" style="margin-top:10px"><span><i class="heat-0"></i>未练</span><span><i class="heat-2"></i>1-9 题</span><span><i class="heat-3"></i>10-29 题</span><span><i class="heat-4"></i>30+ 题</span></div></div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">学科正确率</h3>' +
      '<a class="card__more" href="#/subjects">全部学科 ›</a></div>' +
      (subjRows ? '<div class="bars">' + subjRows + '</div>' : '<p class="small muted">还没有分科练习数据。</p>') + '</div>' +
      '</div><div class="stack">' +
      '<div class="card"><div class="card__head"><h3 class="card__title">薄弱知识点 Top5</h3>' +
      '<a class="card__more" href="#/mastery">知识点地图 ›</a></div>' +
      (weak.length ? weak.map(function (w, i) {
        return '<div class="todo"><div class="todo__ico todo__ico--coral">' + (i + 1) + '</div>' +
          '<div class="todo__body"><b>' + H(w.kp) + '</b><span>' + H(w.s.n) + ' · 正确率 ' + w.acc + '% · 作答 ' + w.n + ' 次</span></div>' +
          '<a class="todo__go" href="#/practice?s=' + w.s.k + '&kp=' + encodeURIComponent(w.kp) + '">专项练</a></div>';
      }).join('') : '<p class="small muted">多练几道后，这里会给出失分归因。</p>') + '</div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">模拟考试</h3>' +
      '<a class="card__more" href="#/exam">去考试 ›</a></div>' + examsHtml + '</div>' +
      '<div class="card"><div class="card__head"><h3 class="card__title">成就</h3>' +
      '<span class="small muted">' + done.length + ' / ' + ach.length + '</span></div>' + achHtml + '</div>' +
      '</div></div>';
  }

  window.Views = window.Views || {};
  window.Views.review = { title: '今日复习', render: renderReview };
  window.Views.wrong = { title: '错题集', render: renderWrong };
  window.Views.mastery = { title: '知识点地图', render: renderMastery };
  window.Views.stats = { title: '学习统计', render: renderStats };
})();
