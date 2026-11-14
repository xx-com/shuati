(function () {
  'use strict';
  var H = UI.esc;

  function subjStat(k) {
    var rows = DB.chapterStats(k);
    var n = 0, ok = 0;
    rows.forEach(function (r) { n += r.n; ok += r.ok; });
    var total = rows.reduce(function (a, r) { return a + r.total; }, 0);
    return { n: n, ok: ok, acc: n ? Math.round(ok / n * 100) : null, total: total };
  }

  function weakChapters(limit) {
    var out = [];
    Bank.subjects().forEach(function (s) {
      DB.chapterStats(s.k).forEach(function (r) {
        if (r.n >= 3 && r.acc != null) out.push({ s: s, name: r.name, acc: r.acc, n: r.n });
      });
    });
    out.sort(function (a, b) { return a.acc - b.acc; });
    return out.slice(0, limit || 3);
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  function render(root) {
    var st = DB.stats();
    var days = DB.dayList(14);
    var max = Math.max.apply(null, days.map(function (d) { return d.n; }).concat([1]));
    var name = DB.user() === '__guest__' ? '同学' : DB.user();

    var hero = '<section class="hero">' +
      '<div class="hero__eyebrow">' + H(DB.today()) + '</div>' +
      '<h2 class="hero__title">' + H(greeting()) + '，' + H(name) + '<br>' +
      (st.due ? '先把到期的 ' + st.due + ' 道复习清掉' : '从一张小卷子开始今天的练习') + '</h2>' +
      '<p class="hero__sub">' + (st.due
        ? '这些题按记忆曲线排到了今天，答对 2 次就算掌握，不再打扰你。'
        : '答对的题会自动屏蔽，答错的题会进排期队列——题单会越练越干净。') + '</p>' +
      '<div class="hero__row">' +
      (st.due
        ? '<a class="btn btn--primary" href="#/review">开始今日复习 · ' + st.due + '</a>'
        : '<a class="btn btn--primary" href="#/subjects">选一科开始练</a>') +
      '<a class="btn btn--ghost" href="#/exam">来一套模拟卷</a>' +
      '</div>' +
      '<div class="hero__stats">' +
      '<div><b>' + st.todayN + '</b><span>今日已练</span></div>' +
      '<div><b>' + st.streak + '</b><span>连续天数</span></div>' +
      '<div><b>' + (st.accuracy ? st.accuracy + '%' : '—') + '</b><span>累计正确率</span></div>' +
      '<div><b>' + Bank.total() + '</b><span>题库总量</span></div>' +
      '</div></section>';

    var todo = '<div class="card"><div class="card__head"><h3 class="card__title">今日安排</h3>' +
      '<a class="card__more" href="#/stats">学习统计 ›</a></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--jade">复</div><div class="todo__body"><b>今日复习</b>' +
      '<span>' + (st.due ? st.due + ' 道题到期，按 1/2/4/7/15/30 天排期' : '今天没有到期复习，保持节奏即可') + '</span></div>' +
      '<a class="todo__go" href="#/review">' + (st.due ? '去做' : '看看') + '</a></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--coral">错</div><div class="todo__body"><b>重点错题</b>' +
      '<span>' + (st.focus ? st.focus + ' 道题错了 2 次以上且仍未掌握' : '暂无重点错题，继续保持') + '</span></div>' +
      '<a class="todo__go" href="#/wrong">复习</a></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--gold">卷</div><div class="todo__body"><b>模拟考试</b>' +
      '<span>标准卷 42 题 / 100 分 / 90 分钟' + (st.bestExam ? ' · 历史最好 ' + st.bestExam + ' 分' : '') + '</span></div>' +
      '<a class="todo__go" href="#/exam">开考</a></div>' +
      '<div class="todo"><div class="todo__ico todo__ico--blue">图</div><div class="todo__body"><b>知识点地图</b>' +
      '<span>按章节看正确率热力，一眼找到薄弱章节</span></div>' +
      '<a class="todo__go" href="#/mastery">查看</a></div></div>';

    var chart = '<div class="card"><div class="card__head"><h3 class="card__title">近 14 天练习量</h3>' +
      '<span class="small muted">共 ' + days.reduce(function (a, d) { return a + d.n; }, 0) + ' 题</span></div>' +
      '<div class="mini-chart">' + days.map(function (d, i) {
        var h = Math.max(4, Math.round(d.n / max * 68));
        return '<i class="' + (i === days.length - 1 ? 'is-today' : '') + '" style="height:' + h + 'px" title="' +
          H(d.date) + ' · ' + d.n + ' 题"></i>';
      }).join('') + '</div>' +
      '<div class="row small muted" style="justify-content:space-between;margin-top:6px">' +
      '<span>' + H(UI.weekLabel(days[0].date)) + '</span><span>今天</span></div>' +
      '<div class="stat-line" style="margin-top:12px"><span>累计作答</span><b>' + st.total + ' 题</b></div>' +
      '<div class="stat-line"><span>掌握（答对 2 次以上）</span><b>' + st.mastered + ' 题</b></div>' +
      '<div class="stat-line"><span>已屏蔽</span><b>' + st.shielded + ' 题</b></div></div>';

    var weak = weakChapters(3);
    var weakCard = '<div class="card"><div class="card__head"><h3 class="card__title">薄弱章节</h3>' +
      '<a class="card__more" href="#/mastery">知识点地图 ›</a></div>' +
      (weak.length ? weak.map(function (w, i) {
        return '<div class="todo"><div class="todo__ico todo__ico--coral">' + (i + 1) + '</div>' +
          '<div class="todo__body"><b>' + H(w.name) + '</b><span>' + H(w.s.n) + ' · 正确率 ' + w.acc + '% · 已练 ' + w.n + ' 次</span></div>' +
          '<a class="todo__go" href="#/practice?s=' + w.s.k + '&ch=' + encodeURIComponent(w.name) + '">专项练</a></div>';
      }).join('') : UI.empty('—', '还没有足够的练习数据', '练几道题之后，这里会自动找出正确率最低的章节。', '<a class="btn btn--outline" href="#/subjects">去练习</a>')) +
      '</div>';

    var subjRows = Bank.subjects().map(function (s) {
      var ss = subjStat(s.k);
      var pct = ss.acc == null ? 0 : ss.acc;
      return '<a class="chapter" href="#/subject?k=' + s.k + '">' +
        '<span class="chapter__idx" style="color:' + s.c + '">' + H(s.short) + '</span>' +
        '<span class="chapter__body"><b>' + H(s.n) + '</b><span>' + s.count + ' 题 · 已练 ' + ss.n + ' 次</span>' +
        '<span class="subj-card__bar" style="display:block;margin-top:6px"><i style="width:' + pct + '%;background:' + s.c + '"></i></span></span>' +
        '<span class="chapter__acc ' + UI.accClass(ss.acc) + '">' + (ss.acc == null ? '—' : ss.acc + '%') + '<small>正确率</small></span></a>';
    }).join('');

    root.innerHTML = hero +
      '<div class="grid-2"><div class="stack">' + todo + chart + '</div><div class="stack">' + weakCard +
      '<div class="card"><div class="card__head"><h3 class="card__title">学科进度</h3><a class="card__more" href="#/subjects">全部 ›</a></div>' +
      '<div class="chapter-list">' + subjRows + '</div></div></div></div>';
  }

  // ---------- 学科总览 ----------
  function renderSubjects(root) {
    var st = DB.stats();
    var cards = Bank.subjects().map(function (s) {
      var ss = subjStat(s.k);
      var done = Math.min(100, Math.round(ss.n / Math.max(1, s.count) * 100));
      return '<a class="subj-card" href="#/subject?k=' + s.k + '">' +
        '<div class="subj-card__top"><span class="subj-card__mark" style="background:' + s.c + '">' + H(s.short) + '</span>' +
        '<div><h3>' + H(s.n) + '</h3><span class="subj-card__meta">' + s.count + ' 题 · ' + s.chapters.length + ' 章</span></div>' +
        '<span class="spacer"></span><span class="chip ' + (ss.acc == null ? '' : ss.acc >= 70 ? 'chip--jade' : 'chip--coral') + '">' +
        (ss.acc == null ? '未开始' : ss.acc + '%') + '</span></div>' +
        '<p class="subj-card__desc">' + H(s.desc) + '</p>' +
        '<div class="subj-card__bar"><i style="width:' + done + '%;background:' + s.c + '"></i></div>' +
        '<div class="subj-card__foot"><span>已练 ' + ss.n + ' 次</span><span>' + done + '% 覆盖</span></div></a>';
    }).join('');

    root.innerHTML = '<div class="page-head"><div><h2>分学科体系</h2>' +
      '<p>7 个科目 · ' + Bank.total() + ' 道题。每科按章节与知识点组织，可逐层下钻。</p></div>' +
      '<div class="row"><a class="btn btn--outline btn--sm" href="#/practice">自由练习</a>' +
      '<a class="btn btn--primary btn--sm" href="#/exam">模拟考试</a></div></div>' +
      '<div class="subj-grid">' + cards + '</div>' +
      '<div class="section-title">全部题目构成</div>' +
      '<div class="grid-3">' +
      '<div class="card card--flat"><div class="small muted">内置题库</div><b class="num" style="font-size:26px">' +
      Bank.data.questions.length + '</b><div class="small muted">7 科 · 5 种题型</div></div>' +
      '<div class="card card--flat"><div class="small muted">教材同步题</div><b class="num" style="font-size:26px">' +
      Bank.data.questions.filter(function (q) { return q.src === 'textbook'; }).length + '</b>' +
      '<div class="small muted">按《信息技术应用基础》《办公应用基础》单元分章</div></div>' +
      '<div class="card card--flat"><div class="small muted">操作题客观化</div><b class="num" style="font-size:26px">' +
      Bank.data.questions.filter(function (q) { return q.src === 'derived'; }).length + '</b>' +
      '<div class="small muted">44 道实操拆成排序 / 单选 / 填空 / 判断</div></div></div>';
  }

  // ---------- 单科详情 ----------
  function renderSubject(root, p) {
    var k = p.q.k || 'xxjs';
    var s = Bank.subject(k);
    if (!s) { root.innerHTML = UI.empty('?', '科目不存在', '请从学科列表重新进入。'); return; }
    var rows = DB.chapterStats(k);
    var grouped = {};
    rows.forEach(function (r) {
      var key = r.module || '全部章节';
      (grouped[key] = grouped[key] || []).push(r);
    });
    var ss = subjStat(k);

    function chapterHtml(r) {
      return '<a class="chapter" href="#/practice?s=' + k + '&ch=' + encodeURIComponent(r.name) + '">' +
        '<span class="chapter__idx">' + (r.module ? '' : '') + '</span>' +
        '<span class="chapter__body"><b>' + H(r.name) + '</b><span>' + r.total + ' 题 · 已练 ' + r.n + ' 次</span></span>' +
        '<span class="chapter__acc ' + UI.accClass(r.acc) + '">' + (r.acc == null ? '—' : r.acc + '%') + '<small>正确率</small></span>' +
        '<span class="icon-btn">' + UI.icon('right') + '</span></a>';
    }

    var body = '';
    Object.keys(grouped).forEach(function (g) {
      body += '<div class="section-title">' + H(g) + '</div><div class="chapter-list">' +
        grouped[g].map(chapterHtml).join('') + '</div>';
    });

    root.innerHTML = '<div class="page-head"><div><h2>' + H(s.n) + '</h2>' +
      '<p>' + H(s.desc) + ' · 共 ' + s.count + ' 题</p></div>' +
      '<div class="row"><a class="btn btn--outline btn--sm" href="#/mastery?s=' + k + '">知识点地图</a>' +
      '<a class="btn btn--primary btn--sm" href="#/practice?s=' + k + '">整科练习</a></div></div>' +
      '<div class="grid-3" style="margin-bottom:6px">' +
      '<div class="card card--flat"><div class="small muted">累计练习</div><b class="num" style="font-size:24px">' + ss.n + '</b><div class="small muted">次作答</div></div>' +
      '<div class="card card--flat"><div class="small muted">正确率</div><b class="num" style="font-size:24px">' + (ss.acc == null ? '—' : ss.acc + '%') + '</b><div class="small muted">' + (ss.ok || 0) + ' / ' + (ss.n || 0) + '</div></div>' +
      '<div class="card card--flat"><div class="small muted">章节覆盖</div><b class="num" style="font-size:24px">' +
      rows.filter(function (r) { return r.n > 0; }).length + '/' + rows.length + '</b><div class="small muted">已练章节</div></div></div>' +
      body;
  }

  window.Views = window.Views || {};
  window.Views.home = { title: '首页', render: render };
  window.Views.subjects = { title: '分学科', render: renderSubjects };
  window.Views.subject = { title: '学科详情', render: renderSubject };
  window.Views._subjStat = subjStat;
})();
